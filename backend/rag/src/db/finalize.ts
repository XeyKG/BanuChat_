import type { WriterLease } from './writer-lock.js';
import { invariant } from './errors.js';

/** V1 final transaction: succeeded and ready/current commit together or not at all. */
export async function finalizeAndPublish(lease: WriterLease, release: string, run: string): Promise<void> {
  await lease.transaction(async () => {
    invariant((await lease.query('SELECT id FROM banuchat.datasets WHERE id=1 FOR UPDATE')).rowCount === 1);
    const candidate = await lease.query<{ status: string }>('SELECT status FROM banuchat.dataset_releases WHERE id=$1 AND dataset_id=1 FOR UPDATE', [release]);
    invariant(candidate.rows[0]?.status === 'staging');
    const attempt = await lease.query<{ status: string }>('SELECT status FROM banuchat.ingestion_runs WHERE id=$1 AND dataset_release_id=$2 FOR UPDATE', [run, release]);
    invariant(attempt.rows[0]?.status === 'running');
    const items = await lease.query<{ total: number; processed: number }>(`SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE status='processed')::integer AS processed FROM banuchat.ingestion_items
      WHERE ingestion_run_id=$1 AND dataset_release_id=$2`, [run, release]);
    invariant(items.rows[0]?.total === 76 && items.rows[0].processed === 76);
    const versions = await lease.query<{ total: number; ready: number }>(`SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE processing_status='ready' AND ingestion_run_id=$2)::integer AS ready
      FROM banuchat.document_versions WHERE dataset_release_id=$1`, [release, run]);
    invariant(versions.rows[0]?.total === 12 && versions.rows[0].ready === 12);
    const chunks = await lease.query<{ total: number; valid: number }>(`SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE embedding IS NOT NULL AND public.vector_dims(embedding)=1024
        AND public.vector_norm(embedding)>0 AND generation_run_id=$2
        AND embedding_generated_at >= (SELECT started_at FROM banuchat.ingestion_runs WHERE id=$2))::integer AS valid
      FROM banuchat.document_chunks WHERE dataset_release_id=$1`, [release, run]);
    invariant(chunks.rows[0]?.total === 60 && chunks.rows[0].valid === 60);
    const updated = await lease.query(`UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=clock_timestamp()
      WHERE id=$1 AND dataset_release_id=$2 AND status='running'`, [run, release]);
    invariant(updated.rowCount === 1);
    await lease.query('SELECT banuchat.assert_release_complete($1)', [release]);
    await lease.query('SELECT banuchat.publish_release($1)', [release]);
  });
}
