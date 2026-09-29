import type { WriterLease } from './writer-lock.js';
import type { StageInput } from './types.js';
import { validateStageInput } from './stage.js';
import { DatabaseError, invariant } from './errors.js';
import { openRun } from './runs.js';

/** Reopen only the explicitly selected failed identity. Never resolve/create another release. */
export async function prepareRetry(lease: WriterLease, releaseId: string, input: StageInput): Promise<string> {
  validateStageInput(input);
  invariant(input.validated.manifest.items.length === 76);
  return lease.transaction(async () => {
    const dataset = await lease.query<{ name: string }>('SELECT name FROM banuchat.datasets WHERE id=1 FOR UPDATE');
    invariant(dataset.rows[0]?.name === input.validated.manifest.dataset_key);
    const release = await lease.query<{ status: string; exact: boolean }>(`SELECT status,
      (dataset_id=$2 AND git_revision=$3 AND manifest=$4::jsonb AND pipeline_config=$5::jsonb
      AND embedding_config_id=$6 AND dataset_schema_version=$7) AS exact
      FROM banuchat.dataset_releases WHERE id=$1 FOR UPDATE`,
    [releaseId, input.datasetId, input.sourceGitRevision, JSON.stringify(input.validated.manifest),
      JSON.stringify(input.pipelineConfig), input.embeddingConfigId, input.validated.manifest.schema_version]);
    invariant(release.rows[0]?.exact === true);
    if (release.rows[0].status !== 'failed') throw new DatabaseError('DATABASE_CONFLICT');
    invariant((await lease.query("UPDATE banuchat.dataset_releases SET status='staging' WHERE id=$1 AND status='failed'", [releaseId])).rowCount === 1);
    return openRun(lease, releaseId, input.workflowRef, input.validated.manifest.items, 'retry');
  });
}
