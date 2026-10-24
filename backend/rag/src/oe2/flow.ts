import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256 } from '../crypto/sha256.js';
import { parseStrictJson } from '../preflight/json.js';
import { SafeReader } from '../source/safe-reader.js';
import { resolveOe2Source } from './registry.js';
import type { Oe2Category, Oe2ChangeCounts, Oe2ExecutionRecord, Oe2Record, Oe2RunResult,
  Oe2Snapshot, Oe2StateStore } from './types.js';

type JsonObject = Record<string, unknown>;

const CATEGORY_FIELDS: Record<Oe2Category, readonly string[]> = {
  academic_offer: ['period', 'course_code', 'mode', 'start_date', 'end_date'],
  calls: ['audience', 'opens_at', 'closes_at'],
  news: ['summary'],
};
const COMMON_FIELDS = ['id', 'title', 'published_at', 'source_version'] as const;

function object(value: unknown): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('OE2_INVALID_RECORD');
  return value as JsonObject;
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new Error('OE2_INVALID_FIELD');
  }
  return value;
}

function timestamp(value: unknown): string {
  const text = requiredString(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)
    || !Number.isFinite(Date.parse(text))) throw new Error('OE2_INVALID_TIMESTAMP');
  return text;
}

function canonicalRecord(value: Omit<Oe2Record, 'content_sha256'>): string {
  const fields = Object.fromEntries(Object.entries(value.fields).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({ ...value, fields });
}

export function extractOe2Fixture(bytes: Buffer, category: Oe2Category, sourceId: string): Oe2Record[] {
  const parsed = object(parseStrictJson(bytes));
  if (Object.keys(parsed).some(key => !['schema_version', 'category', 'records'].includes(key))
    || parsed.schema_version !== 'oe2-fixture-1' || parsed.category !== category
    || !Array.isArray(parsed.records)) throw new Error('OE2_INVALID_FIXTURE');

  const seen = new Set<string>();
  return parsed.records.map(raw => {
    const record = object(raw);
    const categoryFields = CATEGORY_FIELDS[category];
    const allowed = new Set([...COMMON_FIELDS, ...categoryFields]);
    if (Object.keys(record).length !== allowed.size || Object.keys(record).some(key => !allowed.has(key))) {
      throw new Error('OE2_INVALID_RECORD');
    }
    const sourceRecordId = requiredString(record.id);
    if (seen.has(sourceRecordId)) throw new Error('OE2_DUPLICATE_RECORD');
    seen.add(sourceRecordId);
    const fields: Record<string, string> = {};
    for (const field of categoryFields) fields[field] = requiredString(record[field]);
    for (const field of categoryFields.filter(field => field.endsWith('_at') || field.endsWith('_date'))) {
      const value = fields[field]!;
      if (field.endsWith('_at')) timestamp(value);
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) {
        throw new Error('OE2_INVALID_DATE');
      }
    }
    if (category === 'academic_offer' && fields.start_date! > fields.end_date!) throw new Error('OE2_INVALID_INTERVAL');
    if (category === 'calls' && Date.parse(fields.opens_at!) > Date.parse(fields.closes_at!)) {
      throw new Error('OE2_INVALID_INTERVAL');
    }
    const withoutHash = {
      category, source_id: sourceId, source_record_id: sourceRecordId,
      title: requiredString(record.title), published_at: timestamp(record.published_at),
      source_version: requiredString(record.source_version), fields,
    } satisfies Omit<Oe2Record, 'content_sha256'>;
    return { ...withoutHash, content_sha256: sha256(Buffer.from(canonicalRecord(withoutHash))) };
  }).sort((a, b) => a.source_record_id.localeCompare(b.source_record_id));
}

export function compareOe2Snapshots(previous: Oe2Snapshot | undefined,
  records: readonly Oe2Record[]): Oe2ChangeCounts {
  const before = new Map((previous?.records ?? []).map(record => [record.source_record_id, record.content_sha256]));
  const after = new Map(records.map(record => [record.source_record_id, record.content_sha256]));
  let created = 0; let modified = 0; let unchanged = 0; let deleted = 0;
  for (const [id, hash] of after) {
    if (!before.has(id)) created++;
    else if (before.get(id) === hash) unchanged++;
    else modified++;
  }
  for (const id of before.keys()) if (!after.has(id)) deleted++;
  return { created, modified, deleted, unchanged };
}

export async function runOe2FixtureFlow(input: { category: Oe2Category; sourceId: string;
  fixtureRoot: string; store: Oe2StateStore; now?: () => Date }): Promise<Oe2RunResult> {
  const clock = input.now ?? (() => new Date());
  const runId = randomUUID(); const startedAt = clock().toISOString();
  const record = async (entry: Omit<Oe2ExecutionRecord, 'schema_version' | 'run_id' | 'category'
    | 'source_id' | 'started_at'>): Promise<void> => {
    await input.store.recordRun?.({ schema_version: 'oe2-execution-1', run_id: runId,
      category: input.category, source_id: input.sourceId, started_at: startedAt, ...entry });
  };
  try {
    const source = resolveOe2Source(input.category, input.sourceId);
    const reader = await SafeReader.create(input.fixtureRoot);
    const bytes = await reader.read(source.fixture_path!);
    const records = extractOe2Fixture(bytes, input.category, source.source_id);
    const previous = await input.store.load(input.category);
    const changes = compareOe2Snapshots(previous, records);
    const snapshot: Oe2Snapshot = {
      schema_version: 'oe2-snapshot-1', category: input.category, source_id: source.source_id,
      source_sha256: sha256(bytes), available_at: clock().toISOString(), records,
    };
    const changed = changes.created + changes.modified + changes.deleted > 0;
    if (changed || previous === undefined) await input.store.save(snapshot);
    await record({ finished_at: clock().toISOString(), outcome: 'succeeded' });
    return {
      outcome: changed ? 'updated' : 'unchanged', category: input.category, source_id: source.source_id,
      source_sha256: snapshot.source_sha256, available_at: snapshot.available_at,
      record_count: records.length, changes,
      publication_lag_verifiable: false, publication_lag_reason: 'fixture_source', published_to_ccd: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const errorCode = message === 'OE2_SOURCE_NOT_AUTHORIZED' ? 'SOURCE_NOT_AUTHORIZED'
      : message.startsWith('OE2_') ? 'SOURCE_INVALID' : 'INTERNAL_ERROR';
    try { await record({ finished_at: clock().toISOString(), outcome: 'failed', error_code: errorCode }); } catch { /* preserve original */ }
    throw error;
  }
}

export class FileOe2StateStore implements Oe2StateStore {
  constructor(private readonly root: string) {}
  private file(category: Oe2Category): string { return path.join(this.root, `${category}.json`); }
  async load(category: Oe2Category): Promise<Oe2Snapshot | undefined> {
    try { return JSON.parse(await readFile(this.file(category), 'utf8')) as Oe2Snapshot; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }
  async save(snapshot: Oe2Snapshot): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const target = this.file(snapshot.category);
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, target);
  }
  async recordRun(record: Oe2ExecutionRecord): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await appendFile(path.join(this.root, 'executions.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');
  }
}
