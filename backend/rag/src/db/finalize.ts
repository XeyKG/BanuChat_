import type { WriterLease } from './writer-lock.js';
import { invariant } from './errors.js';
import { storageCounts, type StorageRecipe } from './recipe.js';

/** succeeded and ready/current commit together; defaults preserve the frozen v1 counts. */
export async function finalizeAndPublish(lease: WriterLease, release: string, run: string,
  recipe: StorageRecipe = 'synthetic_v1', transition?: { expectedRelease: string }): Promise<void> {
  return finalize(lease,release,run,recipe,true,transition);
}
/** Validate a normal candidate and close its run without ready/current activation. */
export async function finalizeCandidate(lease:WriterLease,release:string,run:string,recipe:StorageRecipe,transition:{expectedRelease:string}):Promise<void>{
  return finalize(lease,release,run,recipe,false,transition);
}
async function finalize(lease:WriterLease,release:string,run:string,recipe:StorageRecipe,activate:boolean,transition?:{expectedRelease:string}):Promise<void>{
  const expected = storageCounts(recipe);
  await lease.transaction(async () => {
    invariant((await lease.query('SELECT id FROM banuchat.datasets WHERE id=1 FOR UPDATE')).rowCount === 1);
    if (transition) {
      invariant(recipe === 'ccd_expanded_v1' || recipe === 'ccd_guidance_v1' || recipe === 'ccd_knowledge_v1');
      const pointer = await lease.query<{ current_release_id: string }>('SELECT current_release_id FROM banuchat.datasets WHERE id=1');
      invariant(pointer.rows[0]?.current_release_id === transition.expectedRelease);
      const context = await lease.query(`INSERT INTO banuchat.ccd_demo_contexts(dataset_release_id,profile_key,alias)
        SELECT $1,profile_key,alias FROM banuchat.ccd_demo_contexts WHERE dataset_release_id=$2 AND profile_key='ccd-local-demo'`, [release, transition.expectedRelease]);
      invariant(context.rowCount === 1);
    }
    const candidate = await lease.query<{ status: string }>('SELECT status FROM banuchat.dataset_releases WHERE id=$1 AND dataset_id=1 FOR UPDATE', [release]);
    invariant(candidate.rows[0]?.status === 'staging');
    const attempt = await lease.query<{ status: string }>('SELECT status FROM banuchat.ingestion_runs WHERE id=$1 AND dataset_release_id=$2 FOR UPDATE', [run, release]);
    invariant(attempt.rows[0]?.status === 'running');
    const items = await lease.query<{ total: number; processed: number }>(`SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE status='processed' OR
        (status='skipped' AND source_kind<>'document' AND result_code='REUSED_EXACT'))::integer AS processed FROM banuchat.ingestion_items
      WHERE ingestion_run_id=$1 AND dataset_release_id=$2`, [run, release]);
    invariant(items.rows[0]?.total === expected.items && items.rows[0].processed === expected.items);
    const versions = await lease.query<{ total: number; ready: number }>(`SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE processing_status='ready' AND ingestion_run_id=$2)::integer AS ready
      FROM banuchat.document_versions WHERE dataset_release_id=$1`, [release, run]);
    invariant(versions.rows[0]?.total === expected.documents && versions.rows[0].ready === expected.documents);
    const chunks = await lease.query<{ total: number; valid: number }>(`SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE embedding IS NOT NULL AND public.vector_dims(embedding)=1024
        AND public.vector_norm(embedding)>0 AND generation_run_id=$2
        AND embedding_generated_at >= (SELECT started_at FROM banuchat.ingestion_runs WHERE id=$2))::integer AS valid
      FROM banuchat.document_chunks WHERE dataset_release_id=$1`, [release, run]);
    invariant(chunks.rows[0]?.total === expected.chunks && chunks.rows[0].valid === expected.chunks);
    const updated = await lease.query(`UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=clock_timestamp()
      WHERE id=$1 AND dataset_release_id=$2 AND status='running'`, [run, release]);
    invariant(updated.rowCount === 1);
    await lease.query('SELECT banuchat.assert_release_complete($1)', [release]);
    if(activate)await lease.query('SELECT banuchat.publish_release($1)', [release]);
  });
}
