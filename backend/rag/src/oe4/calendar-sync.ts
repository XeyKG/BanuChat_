import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { parseStrictJson } from "../preflight/json.js";
import { SafeReader } from "../source/safe-reader.js";

const STABLE_KEY = /^[a-z0-9][a-z0-9_-]{0,127}$/u;
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const FIXTURE_SOURCE_PATH = "calendars/google-sheets-fixture.json";

type EventType = "course_session" | "announcement_deadline" | "general";
type RowStatus = "active" | "cancelled" | "deleted";

export interface CalendarSheetRow {
  event_id: string;
  status: RowStatus;
  modified_at: string;
  title?: string;
  description?: string;
  event_type?: EventType;
  starts_at?: string;
  ends_at?: string | null;
  course_key?: string | null;
  announcement_key?: string | null;
}

export interface CalendarSheetFixture {
  schema_version: "oe4-calendar-sheet-fixture-1";
  synthetic: true;
  source_id: string;
  timezone: "America/Bogota";
  rows: CalendarSheetRow[];
}

export interface CalendarStoredEvent {
  event_key: string;
  title: string;
  description: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string | null;
  course_key: string | null;
  announcement_key: string | null;
  source_path: string;
  source_locator: string;
  source_sha256: string;
}

export interface CalendarChangeCounts {
  created: number;
  modified: number;
  cancelled: number;
  deleted: number;
  unchanged: number;
}

export interface CalendarSyncResult {
  outcome: "published" | "unchanged";
  source_kind: "google_sheets_fixture";
  source_id: string;
  source_sha256: string;
  source_modified_at: string;
  synchronized_at: string;
  base_release_id: string;
  release_id: string;
  changes: CalendarChangeCounts;
  publication_lag_ms: number;
  publication_lag_verifiable: false;
  publication_lag_reason: "fixture_source";
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("OE4_CALENDAR_INVALID_FIXTURE");
  }
  return value as Record<string, unknown>;
}

function timestamp(value: unknown): string {
  if (typeof value !== "string" || !RFC3339.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error("OE4_CALENDAR_INVALID_TIMESTAMP");
  }
  return value;
}

function nullableStableKey(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !STABLE_KEY.test(value)) {
    throw new Error("OE4_CALENDAR_INVALID_FIELD");
  }
  return value;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  if (Object.keys(value).length !== expected.length || Object.keys(value).some(key => !expected.includes(key))) {
    throw new Error("OE4_CALENDAR_INVALID_FIELD");
  }
}

export function parseCalendarSheetFixture(bytes: Buffer, expectedSourceId: string): CalendarSheetFixture {
  const root = object(parseStrictJson(bytes));
  exactKeys(root, ["schema_version", "synthetic", "source_id", "timezone", "rows"]);
  if (
    root.schema_version !== "oe4-calendar-sheet-fixture-1" ||
    root.synthetic !== true ||
    root.source_id !== expectedSourceId ||
    root.timezone !== "America/Bogota" ||
    !Array.isArray(root.rows)
  ) {
    throw new Error("OE4_CALENDAR_INVALID_FIXTURE");
  }
  const seen = new Set<string>();
  const rows = root.rows.map((raw, index): CalendarSheetRow => {
    const row = object(raw);
    const eventId = row.event_id;
    if (typeof eventId !== "string" || !STABLE_KEY.test(eventId) || seen.has(eventId)) {
      throw new Error("OE4_CALENDAR_DUPLICATE_OR_INVALID_ID");
    }
    seen.add(eventId);
    if (row.status !== "active" && row.status !== "cancelled" && row.status !== "deleted") {
      throw new Error("OE4_CALENDAR_INVALID_FIELD");
    }
    const modifiedAt = timestamp(row.modified_at);
    if (row.status !== "active") {
      exactKeys(row, ["event_id", "status", "modified_at"]);
      return { event_id: eventId, status: row.status, modified_at: modifiedAt };
    }
    exactKeys(row, ["event_id", "status", "modified_at", "title", "description", "event_type",
      "starts_at", "ends_at", "course_key", "announcement_key"]);
    if (
      typeof row.title !== "string" || row.title.trim().length === 0 ||
      typeof row.description !== "string" || row.description.trim().length === 0 ||
      !["course_session", "announcement_deadline", "general"].includes(String(row.event_type))
    ) throw new Error("OE4_CALENDAR_INVALID_FIELD");
    const startsAt = timestamp(row.starts_at);
    const endsAt = row.ends_at === null ? null : timestamp(row.ends_at);
    if (endsAt !== null && Date.parse(endsAt) < Date.parse(startsAt)) {
      throw new Error("OE4_CALENDAR_INVALID_INTERVAL");
    }
    const courseKey = nullableStableKey(row.course_key);
    const announcementKey = nullableStableKey(row.announcement_key);
    const type = row.event_type as EventType;
    if (
      (type === "course_session" && (courseKey === null || announcementKey !== null)) ||
      (type === "announcement_deadline" && (announcementKey === null || courseKey !== null)) ||
      (type === "general" && (courseKey !== null || announcementKey !== null))
    ) throw new Error("OE4_CALENDAR_INVALID_RELATION");
    return {
      event_id: eventId, status: "active", modified_at: modifiedAt,
      title: row.title, description: row.description, event_type: type,
      starts_at: startsAt, ends_at: endsAt, course_key: courseKey,
      announcement_key: announcementKey,
    };
  });
  if (rows.length === 0) throw new Error("OE4_CALENDAR_INVALID_FIXTURE");
  return { schema_version: "oe4-calendar-sheet-fixture-1", synthetic: true,
    source_id: expectedSourceId, timezone: "America/Bogota", rows };
}

function sameEvent(left: CalendarStoredEvent, right: CalendarStoredEvent): boolean {
  return ["title", "description", "event_type", "starts_at", "ends_at", "course_key", "announcement_key"]
    .every(key => left[key as keyof CalendarStoredEvent] === right[key as keyof CalendarStoredEvent]);
}

export function applyCalendarSheetRows(
  current: readonly CalendarStoredEvent[], fixture: CalendarSheetFixture, sourceSha256: string,
): { events: CalendarStoredEvent[]; changes: CalendarChangeCounts; source_modified_at: string } {
  const events = new Map(current.map(event => [event.event_key, { ...event }]));
  const changes: CalendarChangeCounts = { created: 0, modified: 0, cancelled: 0, deleted: 0, unchanged: 0 };
  let sourceModifiedAt = fixture.rows[0]!.modified_at;
  fixture.rows.forEach((row, index) => {
    if (Date.parse(row.modified_at) > Date.parse(sourceModifiedAt)) sourceModifiedAt = row.modified_at;
    const previous = events.get(row.event_id);
    if (row.status !== "active") {
      if (previous === undefined) throw new Error("OE4_CALENDAR_UNKNOWN_REMOVAL");
      events.delete(row.event_id);
      changes[row.status] += 1;
      return;
    }
    const next: CalendarStoredEvent = {
      event_key: row.event_id,
      title: row.title!, description: row.description!, event_type: row.event_type!,
      starts_at: row.starts_at!, ends_at: row.ends_at!, course_key: row.course_key!,
      announcement_key: row.announcement_key!, source_path: FIXTURE_SOURCE_PATH,
      source_locator: `row:${index + 2}`, source_sha256: sourceSha256,
    };
    if (previous === undefined) changes.created += 1;
    else if (sameEvent(previous, next)) changes.unchanged += 1;
    else changes.modified += 1;
    events.set(row.event_id, next);
  });
  return { events: [...events.values()].sort((a, b) => a.event_key.localeCompare(b.event_key)),
    changes, source_modified_at: sourceModifiedAt };
}

interface CurrentReleaseRow {
  id: string;
  git_revision: string;
  dataset_schema_version: string;
  manifest: Record<string, unknown>;
  pipeline_config: Record<string, unknown>;
  embedding_config_id: string;
}

function manifestForCalendarSync(input: { base: Record<string, unknown>; events: readonly CalendarStoredEvent[];
  sourceId: string; sourceSha256: string; sourceModifiedAt: string; synchronizedAt: string }): Record<string, unknown> {
  const oldItems = Array.isArray(input.base.items) ? input.base.items : [];
  const nonCalendar = oldItems.filter(item => object(item).kind !== "calendar_event");
  const calendar = input.events.map(event => ({ kind: "calendar_event", key: event.event_key,
    path: event.source_path, locator: event.source_locator, sha256: event.source_sha256 }));
  const oldFiles = Array.isArray(input.base.files) ? input.base.files : [];
  const files = oldFiles.filter(file => object(file).path !== FIXTURE_SOURCE_PATH);
  files.push({ path: FIXTURE_SOURCE_PATH, kind: "calendar_events",
    schema: "oe4-calendar-sheet-fixture-1", sha256: input.sourceSha256 });
  return { ...input.base, files, items: [...nonCalendar, ...calendar], calendar_sync: {
    source_kind: "google_sheets_fixture", source_id: input.sourceId,
    source_sha256: input.sourceSha256, source_modified_at: input.sourceModifiedAt,
    synchronized_at: input.synchronizedAt, status: "valid",
  } };
}

async function cloneRelease(
  client: PoolClient, base: CurrentReleaseRow, manifest: Record<string, unknown>,
  events: readonly CalendarStoredEvent[], workflowRef: string,
): Promise<{ releaseId: string; runId: string }> {
  const release = await client.query<{ id: string }>(`INSERT INTO banuchat.dataset_releases
    (dataset_id,git_revision,dataset_schema_version,manifest,pipeline_config,embedding_config_id,status)
    VALUES (1,$1,$2,$3::jsonb,$4::jsonb,$5,'staging') RETURNING id`,
    [base.git_revision, base.dataset_schema_version, JSON.stringify(manifest),
      JSON.stringify(base.pipeline_config), base.embedding_config_id]);
  const releaseId = release.rows[0]!.id;
  const run = await client.query<{ id: string }>(`INSERT INTO banuchat.ingestion_runs
    (dataset_release_id,attempt_no,workflow_ref,trigger_type,status)
    VALUES ($1,1,$2,'scheduled','running') RETURNING id`, [releaseId, workflowRef]);
  const runId = run.rows[0]!.id;

  await client.query(`CREATE TEMP TABLE oe4_version_map(old_id uuid PRIMARY KEY,new_id uuid NOT NULL) ON COMMIT DROP`);
  await client.query(`INSERT INTO oe4_version_map
    SELECT id,gen_random_uuid() FROM banuchat.document_versions WHERE dataset_release_id=$1`, [base.id]);
  await client.query(`INSERT INTO banuchat.document_versions
    (id,dataset_id,dataset_release_id,document_id,version_label,title,source_path,source_locator,
     source_sha256,content_sha256,mime_type,processing_status,ingested_at,ingestion_run_id)
    SELECT m.new_id,v.dataset_id,$2,v.document_id,v.version_label,v.title,v.source_path,v.source_locator,
      v.source_sha256,v.content_sha256,v.mime_type,'ready',clock_timestamp(),$3
    FROM banuchat.document_versions v JOIN oe4_version_map m ON m.old_id=v.id
    WHERE v.dataset_release_id=$1`, [base.id, releaseId, runId]);
  await client.query(`INSERT INTO banuchat.document_chunks
    (id,dataset_release_id,document_version_id,ordinal,content,locator,page_start,page_end,
     embedding,embedding_generated_at,generation_run_id)
    SELECT gen_random_uuid(),$2,m.new_id,c.ordinal,c.content,c.locator,c.page_start,c.page_end,
      c.embedding,clock_timestamp(),$3
    FROM banuchat.document_chunks c JOIN oe4_version_map m ON m.old_id=c.document_version_id
    WHERE c.dataset_release_id=$1`, [base.id, releaseId, runId]);

  for (const table of ["courses", "announcements", "synthetic_profiles", "profile_courses"] as const) {
    const columns = {
      courses: "course_key,name,description,status,source_path,source_locator,source_sha256",
      announcements: "announcement_key,title,description,valid_from,valid_until,source_path,source_locator,source_sha256",
      synthetic_profiles: "profile_key,alias,source_path,source_locator,source_sha256",
      profile_courses: "profile_key,course_key,status,progress_percent,started_at,completed_at,source_path,source_locator,source_sha256",
    }[table];
    await client.query(`INSERT INTO banuchat.${table}(dataset_release_id,${columns})
      SELECT $2,${columns} FROM banuchat.${table} WHERE dataset_release_id=$1`, [base.id, releaseId]);
  }
  await client.query(`INSERT INTO banuchat.calendar_events
    (dataset_release_id,event_key,title,description,event_type,starts_at,ends_at,course_key,
     announcement_key,source_path,source_locator,source_sha256)
    SELECT $1,e.event_key,e.title,e.description,e.event_type,e.starts_at::timestamptz,
      e.ends_at::timestamptz,e.course_key,e.announcement_key,e.source_path,e.source_locator,e.source_sha256
    FROM jsonb_to_recordset($2::jsonb) AS e(event_key text,title text,description text,event_type text,
      starts_at text,ends_at text,course_key text,announcement_key text,source_path text,source_locator text,source_sha256 text)`,
    [releaseId, JSON.stringify(events)]);
  await client.query(`INSERT INTO banuchat.ingestion_items
    (dataset_release_id,ingestion_run_id,source_kind,record_key,source_path,source_locator,
     source_sha256,document_version_id,status,finished_at)
    SELECT $1,$2,r.source_kind::banuchat.source_kind,r.record_key,r.source_path,r.source_locator,
      r.source_sha256,r.document_version_id,'processed',clock_timestamp()
    FROM banuchat.release_records($1) r`, [releaseId, runId]);
  await client.query(`UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=clock_timestamp()
    WHERE id=$1 AND status='running'`, [runId]);
  await client.query("SELECT banuchat.assert_release_complete($1)", [releaseId]);
  await client.query("SELECT banuchat.publish_release($1)", [releaseId]);
  return { releaseId, runId };
}

export interface CalendarSyncInput {
  pool: Pool;
  fixture_root: string;
  source_id: "fixture-calendar-sheet-v1";
  workflow_ref: string;
  now?: () => Date;
}

export async function runCalendarFixtureSync(input: CalendarSyncInput): Promise<CalendarSyncResult> {
  if (input.source_id !== "fixture-calendar-sheet-v1" || input.workflow_ref.trim().length === 0) {
    throw new Error("OE4_CALENDAR_SOURCE_NOT_AUTHORIZED");
  }
  const reader = await SafeReader.create(input.fixture_root);
  const bytes = await reader.read("calendar-sheet.json");
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const fixture = parseCalendarSheetFixture(bytes, input.source_id);
  const synchronizedAt = (input.now ?? (() => new Date()))().toISOString();
  const client = await input.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(64001004)");
    const current = await client.query<CurrentReleaseRow>(`SELECT r.id,r.git_revision,r.dataset_schema_version,
      r.manifest,r.pipeline_config,r.embedding_config_id
      FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
      WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready'
        AND r.manifest->'synthetic'='true'::jsonb AND current_database() !~* 'ccd'
      FOR UPDATE OF d,r`);
    const base = current.rows[0];
    if (base === undefined || current.rows.length !== 1) throw new Error("OE4_CALENDAR_NO_CURRENT_RELEASE");
    const priorSync = object(base.manifest.calendar_sync ?? {});
    if (priorSync.source_sha256 === sourceSha256 && priorSync.source_id === input.source_id) {
      await client.query("COMMIT");
      const modified = timestamp(priorSync.source_modified_at);
      return { outcome: "unchanged", source_kind: "google_sheets_fixture", source_id: input.source_id,
        source_sha256: sourceSha256, source_modified_at: modified, synchronized_at: synchronizedAt,
        base_release_id: base.id, release_id: base.id,
        changes: { created: 0, modified: 0, cancelled: 0, deleted: 0, unchanged: fixture.rows.length },
        publication_lag_ms: Math.max(0, Date.parse(synchronizedAt) - Date.parse(modified)),
        publication_lag_verifiable: false, publication_lag_reason: "fixture_source" };
    }
    const stored = await client.query<CalendarStoredEvent>(`SELECT event_key,title,description,event_type,
      starts_at::text,ends_at::text,course_key,announcement_key,source_path,source_locator,source_sha256
      FROM banuchat.calendar_events WHERE dataset_release_id=$1 ORDER BY event_key`, [base.id]);
    const applied = applyCalendarSheetRows(stored.rows, fixture, sourceSha256);
    const manifest = manifestForCalendarSync({ base: base.manifest, events: applied.events,
      sourceId: input.source_id, sourceSha256, sourceModifiedAt: applied.source_modified_at, synchronizedAt });
    const cloned = await cloneRelease(client, base, manifest, applied.events, input.workflow_ref);
    await client.query("COMMIT");
    return { outcome: "published", source_kind: "google_sheets_fixture", source_id: input.source_id,
      source_sha256: sourceSha256, source_modified_at: applied.source_modified_at,
      synchronized_at: synchronizedAt, base_release_id: base.id, release_id: cloned.releaseId,
      changes: applied.changes,
      publication_lag_ms: Math.max(0, Date.parse(synchronizedAt) - Date.parse(applied.source_modified_at)),
      publication_lag_verifiable: false, publication_lag_reason: "fixture_source" };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
