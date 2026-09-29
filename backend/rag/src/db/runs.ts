import type { ManifestItem } from '../types.js';
import type { WriterLease } from './writer-lock.js';
import { DatabaseError, invariant } from './errors.js';

export function provenance(item: Readonly<ManifestItem>): [string, string, string] {
  return [item.path, item.locator, item.sha256];
}
export async function openRun(lease: WriterLease, release: string, workflow: string,
  items: readonly ManifestItem[], trigger: 'manual' | 'retry' = 'manual'): Promise<string> {
  invariant(trigger === 'manual' || trigger === 'retry');
  invariant(items.length === 76);
  invariant((await lease.query('SELECT id FROM banuchat.datasets WHERE id=1 FOR UPDATE')).rowCount === 1);
  const candidate = await lease.query<{ status: string }>(
    'SELECT status FROM banuchat.dataset_releases WHERE id=$1 AND dataset_id=1 FOR UPDATE', [release]);
  invariant(candidate.rows[0]?.status === 'staging');
  const prior = await lease.query(
    "SELECT id FROM banuchat.ingestion_runs WHERE status='running' LIMIT 1");
  if (prior.rowCount) throw new DatabaseError('DATABASE_CONFLICT');
  const run = await lease.query<{ id: string }>(
    `INSERT INTO banuchat.ingestion_runs (dataset_release_id,attempt_no,workflow_ref,trigger_type,status,finished_at)
     SELECT $1,coalesce(max(attempt_no),0)+1,$2,$3,'running',NULL
     FROM banuchat.ingestion_runs WHERE dataset_release_id=$1 RETURNING id`, [release, workflow, trigger]);
  invariant(run.rows[0]);
  const id = run.rows[0].id;
  for (const item of items) {
    await lease.query(`INSERT INTO banuchat.ingestion_items
      (dataset_release_id,ingestion_run_id,source_kind,record_key,source_path,source_locator,source_sha256,status,finished_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NULL)`, [release, id, item.kind, item.key, ...provenance(item)]);
  }
  return id;
}
export async function finishItem(lease: WriterLease, run: string, item: ManifestItem,
  status: 'processed' | 'skipped' = 'processed'): Promise<void> {
  invariant(status === 'processed' || (status === 'skipped' && item.kind !== 'document'));
  const result = await lease.query(`UPDATE banuchat.ingestion_items SET status=$4,result_code=$5,finished_at=clock_timestamp()
    WHERE ingestion_run_id=$1 AND source_kind=$2 AND record_key=$3 AND status='pending'`,
  [run, item.kind, item.key, status, status === 'skipped' ? 'REUSED_EXACT' : null]);
  invariant(result.rowCount === 1);
}
