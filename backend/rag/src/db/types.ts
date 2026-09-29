import type { DocumentDerivatives, Json, ValidatedContent } from '../types.js';

export interface StageInput {
  readonly datasetId: 1;
  readonly sourceGitRevision: string;
  readonly embeddingConfigId: string;
  readonly pipelineConfig: Readonly<{ [key: string]: Json }>;
  readonly workflowRef: string;
  readonly validated: Readonly<ValidatedContent>;
  readonly derivatives: readonly DocumentDerivatives[];
}
export type ReleaseOutcome = 'staging' | 'failed_requires_retry' | 'already_current' | 'already_ready_not_current';
export interface ReleaseResolution { release_id: string; outcome: ReleaseOutcome }
export type StageResult = { outcome: 'staged'; release_id: string; run_id: string }
  | { outcome: Exclude<ReleaseOutcome, 'staging'>; release_id: string };
