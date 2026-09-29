import type { Pool } from 'pg';
import type { EmbeddingClient } from './ollama/types.js';
import type { IngestInput } from './ingest.js';
import { assertSameRuntime } from './ollama/config.js';
import { buildPipelineConfigV1 } from './pipeline.js';
import { withWriterLease } from './db/writer-lock.js';
import { resolveEmbeddingConfig } from './db/embedding-config.js';
import { prepareRetry } from './db/retry.js';
import { withAttemptFailure } from './db/failure.js';
import { stageStructured } from './db/structured.js';
import { stageDocuments } from './db/documents.js';
import { generateEmbeddings } from './db/embeddings.js';
import { finalizeAndPublish } from './db/finalize.js';
import { invariant } from './db/errors.js';

export async function retryFailedCandidate(pool: Pool, client: EmbeddingClient, releaseId: string, input: IngestInput) {
  const pipelineConfig = buildPipelineConfigV1(input.implementationRevision);
  const batchSize = input.batchSize ?? 10;
  invariant(Number.isInteger(batchSize) && batchSize >= 1 && batchSize <= 10);
  return withWriterLease(pool, async lease => {
    const config = await client.inspect();
    const embeddingConfigId = await resolveEmbeddingConfig(lease, config);
    const stageInput = { datasetId: 1 as const, ...input, pipelineConfig, embeddingConfigId };
    const run = await prepareRetry(lease, releaseId, stageInput);
    return withAttemptFailure(lease, releaseId, run, async () => {
      await stageStructured(lease, releaseId, run, input.validated.catalogs, input.validated.manifest.items, true);
      await stageDocuments(lease, releaseId, run, input.validated.catalogs.documents, input.derivatives, input.validated.manifest.items, true);
      const count = await generateEmbeddings(lease, releaseId, run, stageInput, client, config, batchSize);
      invariant(count === 60);
      assertSameRuntime(config, await client.inspect());
      await finalizeAndPublish(lease, releaseId, run);
      return { outcome: 'published' as const, release_id: releaseId, run_id: run, embeddings: count };
    });
  });
}
