import type { Pool } from 'pg';
import type { ValidatedContent, DocumentDerivatives } from './types.js';
import type { EmbeddingClient } from './ollama/types.js';
import { assertSameRuntime } from './ollama/config.js';
import { buildPipelineConfigV1 } from './pipeline.js';
import { withWriterLease } from './db/writer-lock.js';
import { resolveEmbeddingConfig } from './db/embedding-config.js';
import { stageCandidate } from './db/stage.js';
import { generateEmbeddings } from './db/embeddings.js';
import { finalizeAndPublish } from './db/finalize.js';
import { invariant } from './db/errors.js';
import { withAttemptFailure } from './db/failure.js';

export interface IngestInput {
  validated: ValidatedContent; derivatives: readonly DocumentDerivatives[];
  sourceGitRevision: string; implementationRevision: string; workflowRef: string; batchSize?: number;
}
/** Internal execution, with controlled failure closure. No implicit retry. */
export async function ingestApprovedCandidate(pool: Pool, client: EmbeddingClient, input: IngestInput) {
  const pipelineConfig = buildPipelineConfigV1(input.implementationRevision);
  const batchSize = input.batchSize ?? 10;
  invariant(Number.isInteger(batchSize) && batchSize >= 1 && batchSize <= 10);
  return withWriterLease(pool, async lease => {
    const config = await client.inspect();
    const embeddingConfigId = await resolveEmbeddingConfig(lease, config);
    const stageInput = { datasetId: 1 as const, ...input, embeddingConfigId, pipelineConfig };
    const staged = await stageCandidate(lease, stageInput);
    if (staged.outcome !== 'staged') return staged;
    return withAttemptFailure(lease, staged.release_id, staged.run_id, async () => {
      const count = await generateEmbeddings(lease, staged.release_id, staged.run_id, stageInput, client, config, batchSize);
      invariant(count === 60);
      // Checks tag/digest/version immediately before final SQL transaction, not inside it.
      assertSameRuntime(config, await client.inspect());
      await finalizeAndPublish(lease, staged.release_id, staged.run_id);
      return { outcome: 'published' as const, release_id: staged.release_id, run_id: staged.run_id, embeddings: count };
    });
  });
}
