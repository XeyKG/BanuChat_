import type { EmbeddingConfig } from '../ollama/types.js';
import { validateEffectiveConfig } from '../ollama/config.js';
import type { WriterLease } from './writer-lock.js';
import { invariant } from './errors.js';

export async function resolveEmbeddingConfig(lease: WriterLease, config: EmbeddingConfig): Promise<string> {
  validateEffectiveConfig(config);
  return lease.transaction(async () => {
    const values = [config.provider, config.model, config.model_revision, config.dimension,
      config.distance_metric, JSON.stringify(config.parameters)];
    const find = () => lease.query<{ id: string }>(`SELECT id FROM banuchat.embedding_configs
      WHERE provider=$1 AND model=$2 AND model_revision=$3 AND dimension=$4
      AND distance_metric=$5 AND parameters=$6::jsonb`, values);
    const existing = (await find()).rows[0];
    if (existing) return existing.id;
    // SQL derives the canonical hash. A concurrent equivalent INSERT may win.
    const inserted = await lease.query<{ id: string }>(`INSERT INTO banuchat.embedding_configs
      (provider,model,model_revision,dimension,distance_metric,parameters) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
      ON CONFLICT (config_sha256) DO NOTHING RETURNING id`, values);
    const resolved = inserted.rows[0] ?? (await find()).rows[0];
    invariant(resolved);
    return resolved.id;
  });
}
