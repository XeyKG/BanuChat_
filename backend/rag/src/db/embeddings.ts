import type { WriterLease } from './writer-lock.js';
import type { StageInput } from './types.js';
import type { EmbeddingClient, EmbeddingConfig } from '../ollama/types.js';
import { assertSameRuntime } from '../ollama/config.js';
import { validateVectors, vectorLiteral } from '../ollama/client.js';
import { invariant } from './errors.js';
import { finishItem } from './runs.js';
import { findItem } from './structured.js';

interface ChunkRow { id: string; ordinal: number; content: string; content_sha256: string; locator: string }
export async function generateEmbeddings(lease: WriterLease, release: string, run: string,
  input: StageInput, client: EmbeddingClient, config: EmbeddingConfig, batchSize = 10): Promise<number> {
  invariant(Number.isInteger(batchSize) && batchSize >= 1 && batchSize <= 10);
  const associated = await lease.query(`SELECT r.id FROM banuchat.dataset_releases r
    JOIN banuchat.embedding_configs e ON e.id=r.embedding_config_id
    JOIN banuchat.ingestion_runs ir ON ir.dataset_release_id=r.id
    WHERE r.id=$1 AND ir.id=$2 AND r.status='staging' AND ir.status='running'
      AND e.id=$3 AND e.provider=$4 AND e.model=$5 AND e.model_revision=$6
      AND e.dimension=1024 AND e.distance_metric='cosine' AND e.parameters=$7::jsonb`,
  [release, run, input.embeddingConfigId, config.provider, config.model, config.model_revision, JSON.stringify(config.parameters)]);
  invariant(associated.rowCount === 1);
  let generated = 0;
  for (const derived of input.derivatives) {
    if (derived.retrieval_mode === 'full_document') continue;
    const version = await lease.query<{ id: string }>(`SELECT v.id FROM banuchat.document_versions v
      JOIN banuchat.documents d ON d.id=v.document_id WHERE v.dataset_release_id=$1 AND d.document_key=$2
      AND v.ingestion_run_id=$3 AND v.processing_status='pending' AND d.retrieval_mode='chunked'`, [release, derived.document_key, run]);
    invariant(version.rows[0] && derived.chunks.length === 6);
    const versionId = version.rows[0].id;
    const chunks = await lease.query<ChunkRow>(`SELECT id,ordinal,content,content_sha256,locator FROM banuchat.document_chunks
      WHERE dataset_release_id=$1 AND document_version_id=$2 ORDER BY ordinal`, [release, versionId]);
    invariant(chunks.rows.length === 6);
    for (const [index, row] of chunks.rows.entries()) {
      const expected = derived.chunks[index];
      invariant(expected && row.ordinal === expected.ordinal && row.content === expected.content
        && row.content_sha256 === expected.content_sha256 && row.locator === expected.locator);
    }
    for (let start = 0; start < chunks.rows.length; start += batchSize) {
      const batch = chunks.rows.slice(start, start + batchSize);
      // All network work is outside transactions. Never persist an unchecked batch.
      assertSameRuntime(config, await client.inspect());
      const vectors = validateVectors(await client.embed(batch.map(row => row.content), config), batch.length);
      assertSameRuntime(config, await client.inspect());
      await lease.transaction(async () => {
        for (const [index, chunk] of batch.entries()) {
          const updated = await lease.query(`UPDATE banuchat.document_chunks
            SET embedding=$1::public.vector(1024),embedding_generated_at=clock_timestamp(),generation_run_id=$2
            WHERE id=$3 AND document_version_id=$4 AND dataset_release_id=$5 AND ordinal=$6 AND embedding IS NULL`,
          [vectorLiteral(vectors[index]!), run, chunk.id, versionId, release, chunk.ordinal]);
          invariant(updated.rowCount === 1);
        }
      });
      generated += batch.length;
    }
    await lease.transaction(async () => {
      const complete = await lease.query<{ total: number; valid: number }>(`SELECT count(*)::integer AS total,
        count(*) FILTER (WHERE embedding IS NOT NULL AND generation_run_id=$1
        AND embedding_generated_at >= (SELECT started_at FROM banuchat.ingestion_runs WHERE id=$1))::integer AS valid
        FROM banuchat.document_chunks WHERE dataset_release_id=$2 AND document_version_id=$3`, [run, release, versionId]);
      invariant(complete.rows[0]?.total === 6 && complete.rows[0].valid === 6);
      const updated = await lease.query(`UPDATE banuchat.document_versions SET processing_status='ready'
        WHERE id=$1 AND dataset_release_id=$2 AND ingestion_run_id=$3 AND processing_status='pending'`, [versionId, release, run]);
      invariant(updated.rowCount === 1);
      await finishItem(lease, run, findItem(input.validated.manifest.items, 'document', derived.document_key));
    });
  }
  return generated;
}
