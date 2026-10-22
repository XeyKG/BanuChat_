import { createHash } from "node:crypto";
import type { SqlQueryClient } from "../data/sql-client.js";
import type { QueryEmbeddingClient } from "../retrieval/query-embedding-client.js";
import { validateQueryEmbeddingConfig } from "./document-query-retrieval.js";
import { normalizeDocumentRow } from "./document-lookup.js";
import { COURSE_CATALOG_QUERY_BASE, normalizeCourseRow } from "./course-catalog.js";
import { CALENDAR_QUERY_BASE, validateCalendarInput, normalizeCalendarRow, type CalendarEventsInput } from "./calendar-events.js";
import { ANNOUNCEMENTS_QUERY_BASE, validateAnnouncementsInput, normalizeAnnouncementRow, type AnnouncementsInput } from "./announcements.js";
import { PROFILE_QUERY, PROGRESS_QUERY_BASE, validateProgressInput, normalizeProgressResult, type ProfileProgressInput } from "./profile-progress.js";

export class McpReadError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR") { super(code); }
}

// This predicate is repeated in each statement, not trusted from startup alone.
const CURRENT = `SELECT r.id AS release_id, r.embedding_config_id
FROM banuchat.datasets d JOIN banuchat.dataset_releases r
 ON r.id=d.current_release_id AND r.dataset_id=d.id AND r.status='ready'
WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.manifest->'synthetic'='true'::jsonb`;

type Snapshot = { release_id: string; items: unknown[] };
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new McpReadError("INTERNAL_ERROR");
  return value as Record<string, unknown>;
}
function release(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new McpReadError("INTERNAL_ERROR");
  return value;
}

/** One READ COMMITTED statement for current pointer and all returned records. */
async function snapshot(sql: SqlQueryClient, body: string, values: readonly unknown[]): Promise<Snapshot> {
  const result = await sql.query<unknown>(`WITH current AS MATERIALIZED (${CURRENT})
SELECT mcp_current.release_id, COALESCE((SELECT jsonb_agg(item) FROM (${body}) item),'[]'::jsonb) AS items FROM current mcp_current`, values);
  if (result.rows.length === 0) throw new McpReadError("NOT_FOUND");
  if (result.rows.length !== 1) throw new McpReadError("INTERNAL_ERROR");
  const row = record(result.rows[0]);
  if (!Array.isArray(row.items)) throw new McpReadError("INTERNAL_ERROR");
  return { release_id: release(row.release_id), items: row.items };
}
// Reuse existing projections and domain validators. $1 was the old separate release lookup.
function atCurrent(base: string): string {
  return base.replace(/\$(\d+)/g, (_token, n: string) => Number(n) === 1 ? "mcp_current.release_id" : `$${Number(n)-1}`);
}

export async function findSyntheticDocuments(sql: SqlQueryClient, input: {query: string; retrieval_mode?: string; limit?: number}) {
  const snap = await snapshot(sql, `SELECT d.document_key,d.retrieval_mode,v.id AS document_version_id,
 v.title,v.mime_type,v.version_label,v.source_path,v.source_locator,v.source_sha256
FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id=v.document_id AND d.dataset_id=v.dataset_id
WHERE v.dataset_release_id=mcp_current.release_id AND v.processing_status='ready'
 AND (strpos(lower(v.title COLLATE "C.utf8"),lower($1::text COLLATE "C.utf8"))>0
  OR strpos(lower(d.document_key COLLATE "C.utf8"),lower($1::text COLLATE "C.utf8"))>0)
 AND ($2::text IS NULL OR d.retrieval_mode=$2)
ORDER BY d.document_key LIMIT $3`, [input.query, input.retrieval_mode ?? null, input.limit ?? 10]);
  return { release_id: snap.release_id, documents: snap.items.map(value => {
    const row = record(value);
    if (row.version_label !== null && (typeof row.version_label !== "string" || !row.version_label.trim())) throw new McpReadError("INTERNAL_ERROR");
    return {...normalizeDocumentRow(row), version_label: row.version_label};
  }) };
}

export async function getSyntheticCourses(sql: SqlQueryClient, input: {query?: string; statuses?: readonly string[]; limit?: number}) {
  const snap = await snapshot(sql, `${atCurrent(COURSE_CATALOG_QUERY_BASE)}
 AND ($1::text IS NULL OR strpos(lower(name COLLATE "C.utf8"),lower($1 COLLATE "C.utf8"))>0
  OR strpos(lower(description COLLATE "C.utf8"),lower($1 COLLATE "C.utf8"))>0)
 AND ($2::text[] IS NULL OR status=ANY($2)) ORDER BY course_key LIMIT $3`, [input.query ?? null, input.statuses ?? null, input.limit ?? 20]);
  return {release_id:snap.release_id, courses:snap.items.map(normalizeCourseRow)};
}

export async function getSyntheticCalendar(sql: SqlQueryClient, input: CalendarEventsInput) {
  const {eventTypes,limit} = validateCalendarInput(input);
  const snap = await snapshot(sql, `${atCurrent(CALENDAR_QUERY_BASE)}
 AND ($3::text[] IS NULL OR ce.event_type=ANY($3)) ORDER BY ce.starts_at,ce.event_key LIMIT $4`, [input.date_from,input.date_to,eventTypes ?? null,limit]);
  return {release_id:snap.release_id,events:snap.items.map(normalizeCalendarRow)};
}

export async function getSyntheticAnnouncements(sql: SqlQueryClient, input: AnnouncementsInput) {
  // MCP's schema counts Unicode code points; preserve REST's original query validation.
  // All other temporal/default/limit rules remain shared with REST.
  const {query,...rest}=input;
  if(query!==undefined && ([...query].length<2 || [...query].length>500 || !query.trim())) throw Object.assign(new Error("invalid_argument"),{reason:"invalid_argument"});
  const v = validateAnnouncementsInput(rest);
  const snap = await snapshot(sql, `${atCurrent(ANNOUNCEMENTS_QUERY_BASE)}
 AND ($1::text IS NULL OR strpos(lower(a.title COLLATE "C.utf8"),lower($1 COLLATE "C.utf8"))>0
  OR strpos(lower(a.description COLLATE "C.utf8"),lower($1 COLLATE "C.utf8"))>0)
 AND ($2::text='all' OR ($2='active' AND a.valid_from<=$3::timestamptz AND (a.valid_until IS NULL OR a.valid_until>=$3::timestamptz))
 OR ($2='upcoming' AND a.valid_from>$3::timestamptz) OR ($2='expired' AND a.valid_until<$3::timestamptz))
 ORDER BY a.valid_from,a.announcement_key LIMIT $4`, [query ?? null,v.temporalStatus,v.referenceTime,v.limit]);
  return {release_id:snap.release_id,reference_time:v.referenceTime,announcements:snap.items.map(row=>normalizeAnnouncementRow(row,v.referenceInstant))};
}

export async function getSyntheticProgress(sql: SqlQueryClient, input: ProfileProgressInput) {
  const {statuses,limit} = validateProgressInput(input);
  const snap = await snapshot(sql, `SELECT
 COALESCE((SELECT jsonb_agg(p) FROM (${atCurrent(PROFILE_QUERY)}) p),'[]'::jsonb) AS profiles,
 COALESCE((SELECT jsonb_agg(p) FROM (${atCurrent(PROGRESS_QUERY_BASE)}
 AND ($2::text[] IS NULL OR pc.status=ANY($2)) ORDER BY pc.course_key LIMIT $3) p),'[]'::jsonb) AS courses`, [input.profile_key,statuses ?? null,limit]);
  const row = record(snap.items[0]);
  if (!Array.isArray(row.profiles) || !Array.isArray(row.courses)) throw new McpReadError("INTERNAL_ERROR");
  return normalizeProgressResult(snap.release_id,input.profile_key,row.profiles,row.courses);
}

export async function searchSyntheticKnowledge(sql: SqlQueryClient, embedding: QueryEmbeddingClient, input: {query:string;top_k?:number}) {
  for (let attempt=0; attempt<2; attempt++) {
    const context = await sql.query<unknown>(`WITH current AS MATERIALIZED (${CURRENT})
SELECT x.* FROM current c CROSS JOIN LATERAL banuchat.current_retrieval_context() x
WHERE x.dataset_release_id=c.release_id AND x.embedding_config_id=c.embedding_config_id`);
    if (context.rows.length===0) throw new McpReadError("NOT_FOUND");
    if (context.rows.length!==1) throw new McpReadError("INTERNAL_ERROR");
    const row=record(context.rows[0]);
    const id=release(row.dataset_release_id);
    const config=validateQueryEmbeddingConfig(row);
    const vector=await embedding.embedQuery(input.query,config);
    if (vector.length!==1024 || vector.some(n=>!Number.isFinite(n)) || !vector.some(n=>n!==0)) throw new McpReadError("INTERNAL_ERROR");
    // The CTE snapshot gates both dataset and current pointer before calling the existing function.
    const result=await sql.query<unknown>(`WITH current AS MATERIALIZED (${CURRENT})
SELECT c.release_id,c.embedding_config_id,COALESCE((SELECT jsonb_agg(m) FROM
 banuchat.search_chunks_cosine($1::public.vector,$2,$3::uuid) m),'[]'::jsonb) AS items
FROM current c WHERE c.release_id=$3::uuid AND c.embedding_config_id=$4::uuid`, [JSON.stringify(vector),input.top_k ?? 5,id,row.embedding_config_id]);
    if(result.rows.length===0) continue; // Entire embedding/config is regenerated once, never reused.
    if(result.rows.length!==1) throw new McpReadError("INTERNAL_ERROR");
    const found=record(result.rows[0]);
    if(found.release_id!==id || !Array.isArray(found.items)) throw new McpReadError("INTERNAL_ERROR");
    const items=found.items;
    const matches=items.map((value, i)=>{
      const m=record(value);
      if(m.dataset_release_id!==id || m.embedding_config_id!==row.embedding_config_id || typeof m.content!=="string") throw new McpReadError("INTERNAL_ERROR");
      if(i>0) {
        const previous=record(items[i-1]);
        if(typeof m.document_key!=="string" || typeof previous.document_key!=="string" ||
          (previous.cosine_distance as number)>(m.cosine_distance as number) ||
          (previous.cosine_distance===m.cosine_distance && (previous.document_key>m.document_key ||
            (previous.document_key===m.document_key && (previous.ordinal as number)>=(m.ordinal as number))))) throw new McpReadError("INTERNAL_ERROR");
      }
      return {rank:i+1,chunk_id:m.chunk_id,document_key:m.document_key,document_version_id:m.document_version_id,
        document_title:m.document_title,content:m.content,content_sha256:createHash("sha256").update(m.content,"utf8").digest("hex"),
        cosine_distance:m.cosine_distance,locator:m.locator,page_start:m.page_start,page_end:m.page_end,
        source:{source_kind:"document",source_path:m.source_path,source_locator:m.locator,source_sha256:m.source_sha256}};
    });
    return {release_id:id,evidence:{status:matches.length?"found":"not_found",match_count:matches.length},matches};
  }
  throw new McpReadError("DEPENDENCY_UNAVAILABLE");
}
