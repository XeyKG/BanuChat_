import type { Pool, QueryResultRow } from 'pg';
import type { ApprovedSourceSnapshot } from '../approval/source.js';
import { databaseError } from '../db/errors.js';
import { DATASET_ID, WRITER_LOCK_NAMESPACE } from '../db/writer-lock.js';
import type { RuntimeContext } from '../runtime/provenance.js';
import { IngestionStatusError } from './status-errors.js';

export type IngestionStatusOutcome =
  | 'not_started'
  | 'running'
  | 'failed'
  | 'succeeded'
  | 'already_current'
  | 'already_ready_not_current';

export interface IngestionItemCounts {
  pending: number;
  processed: number;
  skipped: number;
  failed: number;
}

export interface IngestionStatus {
  outcome: IngestionStatusOutcome;
  release_id: string | null;
  run_id: string | null;
  attempt_no: number | null;
  workflow_ref: string | null;
  recovery_required: boolean;
  source_git_revision: string | null;
  manifest_sha256: string | null;
  pipeline_sha256: string | null;
  embedding_config_id: string | null;
  embedding_config_sha256: string | null;
  item_counts: IngestionItemCounts | null;
}

interface StatusRow extends QueryResultRow {
  release_id: unknown;
  release_status: unknown;
  run_id: unknown;
  run_status: unknown;
  attempt_no: unknown;
  workflow_ref: unknown;
  current_release_id: unknown;
  source_git_revision: unknown;
  manifest_sha256: unknown;
  pipeline_sha256: unknown;
  embedding_config_id: unknown;
  embedding_config_sha256: unknown;
}

const RELEASE_COLUMNS = `
  dr.id AS release_id, dr.status AS release_status,
  ir.id AS run_id, ir.status AS run_status, ir.attempt_no, ir.workflow_ref,
  d.current_release_id, dr.git_revision AS source_git_revision,
  dr.manifest_sha256, dr.pipeline_sha256, dr.embedding_config_id,
  ec.config_sha256 AS embedding_config_sha256`;

async function query<R extends QueryResultRow>(
  pool: Pool,
  sql: string,
  values: readonly unknown[],
): Promise<R[]> {
  try {
    return (await pool.query<R>(sql, [...values])).rows;
  } catch (error) {
    throw databaseError(error);
  }
}

function text(value: unknown): string | null | undefined {
  return value === null ? null : typeof value === 'string' ? value : undefined;
}

function integer(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value
    : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function validateRow(row: StatusRow): {
  releaseId: string;
  releaseStatus: string;
  runId: string | null;
  runStatus: string | null;
  attemptNo: number | null;
  workflowRef: string | null;
  currentReleaseId: string | null;
  sourceGitRevision: string;
  manifestSha256: string;
  pipelineSha256: string;
  embeddingConfigId: string;
  embeddingConfigSha256: string;
} {
  const releaseId = text(row.release_id);
  const releaseStatus = text(row.release_status);
  const runId = text(row.run_id);
  const runStatus = text(row.run_status);
  const attemptNo = row.attempt_no === null ? null : integer(row.attempt_no);
  const workflowRef = text(row.workflow_ref);
  const currentReleaseId = text(row.current_release_id);
  const sourceGitRevision = text(row.source_git_revision);
  const manifestSha256 = text(row.manifest_sha256);
  const pipelineSha256 = text(row.pipeline_sha256);
  const embeddingConfigId = text(row.embedding_config_id);
  const embeddingConfigSha256 = text(row.embedding_config_sha256);
  if (!releaseId || !releaseStatus || runId === undefined || runStatus === undefined
    || attemptNo === undefined || workflowRef === undefined || currentReleaseId === undefined
    || !sourceGitRevision || !manifestSha256 || !pipelineSha256
    || !embeddingConfigId || !embeddingConfigSha256
    || (runId === null) !== (runStatus === null)
    || (runId === null) !== (attemptNo === null)
    || (runId === null) !== (workflowRef === null)) {
    throw new IngestionStatusError('invalid_database_result');
  }
  return { releaseId, releaseStatus, runId, runStatus, attemptNo: attemptNo ?? null,
    workflowRef, currentReleaseId, sourceGitRevision, manifestSha256, pipelineSha256,
    embeddingConfigId, embeddingConfigSha256 };
}

async function itemCounts(pool: Pool, runId: string): Promise<IngestionItemCounts> {
  const rows = await query<QueryResultRow>(pool, `/* status:item-counts */
    SELECT
      count(*) FILTER (WHERE status='pending') AS pending,
      count(*) FILTER (WHERE status='processed') AS processed,
      count(*) FILTER (WHERE status='skipped') AS skipped,
      count(*) FILTER (WHERE status='failed') AS failed
    FROM banuchat.ingestion_items
    WHERE ingestion_run_id=$1`, [runId]);
  const row = rows[0];
  const counts = row === undefined ? [] : [row['pending'], row['processed'], row['skipped'], row['failed']].map(integer);
  if (rows.length !== 1 || counts.length !== 4 || counts.some((count) => count === undefined)) {
    throw new IngestionStatusError('invalid_database_result');
  }
  return { pending: counts[0]!, processed: counts[1]!, skipped: counts[2]!, failed: counts[3]! };
}

export async function isDatasetWriterLeaseHeld(pool: Pool): Promise<boolean> {
  const rows = await query<QueryResultRow>(pool, `/* status:writer-lock */
    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_locks
      WHERE locktype='advisory' AND granted
        AND classid=$1::integer::oid AND objid=$2::integer::oid AND objsubid=2
    ) AS held`, [WRITER_LOCK_NAMESPACE, DATASET_ID]);
  if (rows.length !== 1 || typeof rows[0]?.['held'] !== 'boolean') {
    throw new IngestionStatusError('invalid_database_result');
  }
  return rows[0]['held'];
}

async function assemble(
  pool: Pool,
  raw: StatusRow,
  selector: 'run' | 'release',
): Promise<IngestionStatus> {
  const row = validateRow(raw);
  let outcome: IngestionStatusOutcome;
  if (selector === 'run') {
    if (row.runStatus !== 'running' && row.runStatus !== 'failed' && row.runStatus !== 'succeeded') {
      throw new IngestionStatusError('state_inconsistent');
    }
    outcome = row.runStatus;
  } else if (row.releaseStatus === 'ready' && row.runStatus === 'succeeded') {
    outcome = row.currentReleaseId === row.releaseId
      ? 'already_current' : 'already_ready_not_current';
  } else if (row.releaseStatus === 'failed' && row.runStatus === 'failed') {
    outcome = 'failed';
  } else if (row.releaseStatus === 'staging' && row.runStatus === 'running') {
    outcome = 'running';
  } else {
    throw new IngestionStatusError('state_inconsistent');
  }
  const counts = row.runId === null ? null : await itemCounts(pool, row.runId);
  const recoveryRequired = row.runStatus === 'running'
    ? !(await isDatasetWriterLeaseHeld(pool)) : false;
  return {
    outcome,
    release_id: row.releaseId,
    run_id: row.runId,
    attempt_no: row.attemptNo,
    workflow_ref: row.workflowRef,
    recovery_required: recoveryRequired,
    source_git_revision: row.sourceGitRevision,
    manifest_sha256: row.manifestSha256,
    pipeline_sha256: row.pipelineSha256,
    embedding_config_id: row.embeddingConfigId,
    embedding_config_sha256: row.embeddingConfigSha256,
    item_counts: counts,
  };
}

export async function getIngestionStatusByRun(pool: Pool, runId: string): Promise<IngestionStatus> {
  const rows = await query<StatusRow>(pool, `/* status:run */
    SELECT ${RELEASE_COLUMNS}
    FROM banuchat.ingestion_runs ir
    JOIN banuchat.dataset_releases dr ON dr.id=ir.dataset_release_id AND dr.dataset_id=$2
    JOIN banuchat.datasets d ON d.id=dr.dataset_id
    JOIN banuchat.embedding_configs ec ON ec.id=dr.embedding_config_id
    WHERE ir.id=$1`, [runId, DATASET_ID]);
  if (rows.length === 0) throw new IngestionStatusError('run_not_found');
  if (rows.length !== 1) throw new IngestionStatusError('invalid_database_result');
  return assemble(pool, rows[0]!, 'run');
}

export async function getIngestionStatusByRelease(pool: Pool, releaseId: string): Promise<IngestionStatus> {
  const rows = await query<StatusRow>(pool, `/* status:release */
    SELECT ${RELEASE_COLUMNS}
    FROM banuchat.dataset_releases dr
    JOIN banuchat.datasets d ON d.id=dr.dataset_id
    JOIN banuchat.embedding_configs ec ON ec.id=dr.embedding_config_id
    LEFT JOIN LATERAL (
      SELECT id, status, attempt_no, workflow_ref
      FROM banuchat.ingestion_runs
      WHERE dataset_release_id=dr.id
      ORDER BY attempt_no DESC
      LIMIT 1
    ) ir ON true
    WHERE dr.id=$1 AND dr.dataset_id=$2`, [releaseId, DATASET_ID]);
  if (rows.length === 0) throw new IngestionStatusError('release_not_found');
  if (rows.length !== 1) throw new IngestionStatusError('invalid_database_result');
  return assemble(pool, rows[0]!, 'release');
}

export async function findCompatibleReleaseIds(
  pool: Pool,
  snapshot: ApprovedSourceSnapshot,
  runtime: RuntimeContext,
): Promise<string[]> {
  const rows = await query<QueryResultRow>(pool, `/* status:identity */
    SELECT id
    FROM banuchat.dataset_releases
    WHERE dataset_id=$1 AND git_revision=$2
      AND manifest=$3::jsonb AND pipeline_config=$4::jsonb
    LIMIT 2`, [DATASET_ID, snapshot.source_git_revision,
    JSON.stringify(snapshot.validated.manifest), JSON.stringify(runtime.pipeline_config)]);
  const ids = rows.map((row) => text(row['id']));
  if (ids.some((id) => !id)) throw new IngestionStatusError('invalid_database_result');
  return ids as string[];
}

export function notStartedStatus(): IngestionStatus {
  return {
    outcome: 'not_started', release_id: null, run_id: null, attempt_no: null,
    workflow_ref: null, recovery_required: false, source_git_revision: null,
    manifest_sha256: null, pipeline_sha256: null, embedding_config_id: null,
    embedding_config_sha256: null, item_counts: null,
  };
}

