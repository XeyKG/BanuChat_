import type { Pool } from 'pg';
import { OllamaError } from '../ollama/errors.js';
import { DatabaseError, invariant } from './errors.js';
import { withWriterLease, type WriterLease } from './writer-lock.js';

export const FAILURE_CODES = ['OLLAMA_UNAVAILABLE', 'INVALID_EMBEDDING', 'DATABASE_UNAVAILABLE',
  'DATABASE_CONFLICT', 'DATABASE_INVARIANT', 'INGESTION_ABORTED', 'ORPHANED_ATTEMPT'] as const;
export type FailureCode = typeof FAILURE_CODES[number];
export function failureCode(error: unknown): FailureCode {
  if (error instanceof DatabaseError || error instanceof OllamaError) return error.code;
  return 'INGESTION_ABORTED';
}

/** Explicit state transition, never based on age. Corpus must remain staging until last UPDATE. */
export async function failAttempt(lease: WriterLease, release: string, run: string, code: FailureCode): Promise<void> {
  invariant(FAILURE_CODES.includes(code));
  await lease.transaction(async () => {
    invariant((await lease.query('SELECT id FROM banuchat.datasets WHERE id=1 FOR UPDATE')).rowCount === 1);
    const candidate = await lease.query<{ status: string }>(
      'SELECT status FROM banuchat.dataset_releases WHERE id=$1 AND dataset_id=1 FOR UPDATE', [release]);
    const attempt = await lease.query<{ status: string }>(
      'SELECT status FROM banuchat.ingestion_runs WHERE id=$1 AND dataset_release_id=$2 FOR UPDATE', [run, release]);
    invariant(candidate.rows[0] && attempt.rows[0]);
    if (candidate.rows[0].status !== 'staging' || attempt.rows[0].status !== 'running') {
      throw new DatabaseError('DATABASE_CONFLICT');
    }
    await lease.query(`UPDATE banuchat.ingestion_items SET status='failed',result_code=$3,finished_at=clock_timestamp()
      WHERE dataset_release_id=$1 AND ingestion_run_id=$2 AND status='pending'`, [release, run, code]);
    invariant((await lease.query(`UPDATE banuchat.ingestion_runs SET status='failed',error_code=$3,finished_at=clock_timestamp()
      WHERE id=$2 AND dataset_release_id=$1 AND status='running'`, [release, run, code])).rowCount === 1);
    invariant((await lease.query("UPDATE banuchat.dataset_releases SET status='failed' WHERE id=$1 AND status='staging'", [release])).rowCount === 1);
  });
}

/** Preserve the original failure even if cleanup fails or the COMMIT outcome is uncertain. */
export async function withAttemptFailure<T>(lease: WriterLease, release: string, run: string,
  work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    try { await failAttempt(lease, release, run, failureCode(error)); }
    catch { /* No success claim: a lost lease/uncertain commit requires explicit inspection/recovery. */ }
    throw error;
  }
}

export async function recoverOrphanedAttempt(pool: Pool, releaseId: string, runId: string): Promise<void> {
  await withWriterLease(pool, lease => failAttempt(lease, releaseId, runId, 'ORPHANED_ATTEMPT'));
}
