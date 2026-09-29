import type { ManifestItem } from '../types.js';
import type { WriterLease } from './writer-lock.js';
import { DatabaseError, invariant } from './errors.js';

export function provenance(item: Readonly<ManifestItem>): [string, string, string] {
  return [item.path, item.locator, item.sha256];
}
export async function openRun(lease: WriterLease, release: string, workflow: string,
  items: readonly ManifestItem[]): Promise<string> {
  // No takeover, retry or orphan recovery in implementation 2 (even after lease release).
  const prior = await lease.query(
    `SELECT id FROM banuchat.ingestion_runs WHERE dataset_release_id=$1 OR status='running' LIMIT 1`, [release]);
  if (prior.rowCount) throw new DatabaseError('DATABASE_CONFLICT');
  const run = await lease.query<{ id: string }>(
    `INSERT INTO banuchat.ingestion_runs (dataset_release_id,attempt_no,workflow_ref,trigger_type,status,finished_at)
     SELECT $1,coalesce(max(attempt_no),0)+1,$2,'manual','running',NULL
     FROM banuchat.ingestion_runs WHERE dataset_release_id=$1 RETURNING id`, [release, workflow]);
  invariant(run.rows[0]);
  const id = run.rows[0].id;
  for (const item of items) {
    await lease.query(`INSERT INTO banuchat.ingestion_items
      (dataset_release_id,ingestion_run_id,source_kind,record_key,source_path,source_locator,source_sha256,status,finished_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NULL)`, [release, id, item.kind, item.key, ...provenance(item)]);
  }
  return id;
}
export async function finishItem(lease: WriterLease, run: string, item: ManifestItem): Promise<void> {
  const result = await lease.query(`UPDATE banuchat.ingestion_items SET status='processed',finished_at=clock_timestamp()
    WHERE ingestion_run_id=$1 AND source_kind=$2 AND record_key=$3 AND status='pending'`, [run, item.kind, item.key]);
  invariant(result.rowCount === 1);
}
