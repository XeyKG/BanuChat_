import type { WriterLease } from './writer-lock.js';
import type { StageInput, ReleaseResolution, ReleaseOutcome } from './types.js';
import { invariant } from './errors.js';

export function validateSourceRevision(value: string): void {
  invariant((value.length === 40 || value.length === 64) && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value));
}
export function validateStageIdentity(input: StageInput): void {
  invariant(input.datasetId === 1);
  validateSourceRevision(input.sourceGitRevision);
  const revision = input.pipelineConfig['implementation_revision'];
  invariant(typeof revision === 'string');
  validateSourceRevision(revision);
  invariant(input.workflowRef.trim().length > 0);
  invariant(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(input.embeddingConfigId));
}
export function releaseOutcome(status: string, current: boolean): ReleaseOutcome {
  invariant(['staging', 'ready', 'failed'].includes(status));
  return status === 'staging' ? 'staging' : status === 'failed' ? 'failed_requires_retry'
    : current ? 'already_current' : 'already_ready_not_current';
}

/** Must run on the lease, inside a short transaction. Hash identity belongs to SQL. */
export async function resolveRelease(lease: WriterLease, input: StageInput): Promise<ReleaseResolution> {
  validateStageIdentity(input);
  const config = await lease.query<{ dimension: number; distance_metric: string }>(
    'SELECT dimension,distance_metric FROM banuchat.embedding_configs WHERE id=$1', [input.embeddingConfigId]);
  invariant(config.rows[0]?.dimension === 1024 && config.rows[0].distance_metric === 'cosine');
  const dataset = await lease.query<{ name: string }>('SELECT name FROM banuchat.datasets WHERE id=$1 FOR UPDATE', [1]);
  if (dataset.rows.length === 0) {
    await lease.query('INSERT INTO banuchat.datasets (id,name) VALUES ($1,$2)', [1, input.validated.manifest.dataset_key]);
  } else invariant(dataset.rows[0]?.name === input.validated.manifest.dataset_key);
  const values = [1, input.sourceGitRevision, JSON.stringify(input.validated.manifest),
    JSON.stringify(input.pipelineConfig), input.embeddingConfigId];
  const found = await lease.query<{ id: string; status: string; current: boolean }>(
    `SELECT r.id,r.status,(d.current_release_id=r.id) AS current
     FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id
     WHERE r.dataset_id=$1 AND r.git_revision=$2 AND r.manifest_sha256=banuchat.jsonb_sha256($3::jsonb)
       AND r.pipeline_sha256=banuchat.jsonb_sha256($4::jsonb) AND r.embedding_config_id=$5 FOR UPDATE OF r`, values);
  const row = found.rows[0];
  if (row) return { release_id: row.id, outcome: releaseOutcome(row.status, row.current) };
  const inserted = await lease.query<{ id: string }>(
    `INSERT INTO banuchat.dataset_releases
     (dataset_id,git_revision,manifest,pipeline_config,embedding_config_id,dataset_schema_version,status)
     VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,'staging') RETURNING id`,
    [...values, input.validated.manifest.schema_version]);
  invariant(inserted.rows[0]);
  return { release_id: inserted.rows[0].id, outcome: 'staging' };
}
