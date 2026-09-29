import type { Pool } from 'pg';
import { prepareApprovedSource } from '../approval/source.js';
import type { ApprovalRegistryV1 } from '../approval/registry.js';
import { recoverOrphanedAttempt } from '../db/failure.js';
import { ingestApprovedCandidate } from '../ingest.js';
import type { IngestInput } from '../ingest.js';
import type { EmbeddingClient } from '../ollama/types.js';
import { retryFailedCandidate } from '../retry.js';
import type { RuntimeContext } from '../runtime/provenance.js';
import { InternalControlError } from './control-errors.js';
import type { ExecuteRequest, RecoverRequest, RetryRequest, StatusRequest } from './protocol.js';
import { IngestionStatusError } from './status-errors.js';
import { findCompatibleReleaseIds, getIngestionStatusByRelease,
  getIngestionStatusByRun, notStartedStatus } from './status.js';
import type { IngestionStatus } from './status.js';

export interface InternalIngestionServiceConfig {
  registry: ApprovalRegistryV1;
  runtime: RuntimeContext;
  sourceCheckoutRoot: string;
  workflowRef: string;
  pool: Pool;
  embeddingClient: EmbeddingClient;
}

export interface InternalIngestionServiceDependencies {
  prepareApprovedSource: typeof prepareApprovedSource;
  ingestApprovedCandidate: typeof ingestApprovedCandidate;
  retryFailedCandidate: typeof retryFailedCandidate;
  recoverOrphanedAttempt: typeof recoverOrphanedAttempt;
}

export interface InternalIngestionStatusDependencies {
  findCompatibleReleaseIds: typeof findCompatibleReleaseIds;
  getIngestionStatusByRelease: typeof getIngestionStatusByRelease;
  getIngestionStatusByRun: typeof getIngestionStatusByRun;
}

export interface InternalIngestionService {
  execute(request: ExecuteRequest): ReturnType<typeof ingestApprovedCandidate>;
  retry(request: RetryRequest): ReturnType<typeof retryFailedCandidate>;
  recover(request: RecoverRequest): Promise<void>;
  status(request: StatusRequest): Promise<IngestionStatus>;
}

const DEFAULT_DEPENDENCIES: InternalIngestionServiceDependencies = {
  prepareApprovedSource,
  ingestApprovedCandidate,
  retryFailedCandidate,
  recoverOrphanedAttempt,
};
const DEFAULT_STATUS_DEPENDENCIES: InternalIngestionStatusDependencies = {
  findCompatibleReleaseIds,
  getIngestionStatusByRelease,
  getIngestionStatusByRun,
};

export function createInternalIngestionService(
  config: InternalIngestionServiceConfig,
  replacements: Partial<InternalIngestionServiceDependencies & InternalIngestionStatusDependencies> = {},
): InternalIngestionService {
  if (!config || typeof config.workflowRef !== 'string' || config.workflowRef.trim().length === 0
    || typeof config.sourceCheckoutRoot !== 'string' || config.sourceCheckoutRoot.trim().length === 0
    || !config.runtime || typeof config.runtime.implementation_revision !== 'string'
    || typeof config.runtime.pipeline_version !== 'string') {
    throw new InternalControlError('invalid_configuration');
  }
  const operations = { ...DEFAULT_DEPENDENCIES, ...DEFAULT_STATUS_DEPENDENCIES, ...replacements };

  const assertWorkflow = (workflowRef: string): void => {
    if (workflowRef !== config.workflowRef) throw new InternalControlError('workflow_mismatch');
  };
  const assertPipeline = (pipelineVersion: string): void => {
    if (pipelineVersion !== config.runtime.pipeline_version) {
      throw new InternalControlError('pipeline_mismatch');
    }
  };
  const prepareInput = async (request: ExecuteRequest): Promise<IngestInput> => {
    const snapshot = await operations.prepareApprovedSource({
      registry: config.registry,
      approvalRef: request.approval_ref,
      sourceGitRevision: request.source_git_revision,
      sourceCheckoutRoot: config.sourceCheckoutRoot,
    });
    return {
      validated: snapshot.validated,
      derivatives: snapshot.derivatives,
      sourceGitRevision: snapshot.source_git_revision,
      implementationRevision: config.runtime.implementation_revision,
      workflowRef: config.workflowRef,
    };
  };

  return {
    async execute(request) {
      assertWorkflow(request.workflow_ref);
      assertPipeline(request.pipeline_version);
      return operations.ingestApprovedCandidate(
        config.pool,
        config.embeddingClient,
        await prepareInput(request),
      );
    },
    async retry(request) {
      assertWorkflow(request.workflow_ref);
      assertPipeline(request.pipeline_version);
      return operations.retryFailedCandidate(
        config.pool,
        config.embeddingClient,
        request.release_id,
        await prepareInput(request),
      );
    },
    async recover(request) {
      assertWorkflow(request.workflow_ref);
      await operations.recoverOrphanedAttempt(config.pool, request.release_id, request.run_id);
    },
    async status(request) {
      if (request.workflow_ref !== undefined) assertWorkflow(request.workflow_ref);
      if ('run_id' in request) return operations.getIngestionStatusByRun(config.pool, request.run_id);
      if ('release_id' in request) {
        return operations.getIngestionStatusByRelease(config.pool, request.release_id);
      }
      assertPipeline(request.pipeline_version);
      const snapshot = await operations.prepareApprovedSource({
        registry: config.registry,
        approvalRef: request.approval_ref,
        sourceGitRevision: request.source_git_revision,
        sourceCheckoutRoot: config.sourceCheckoutRoot,
      });
      const matches = await operations.findCompatibleReleaseIds(config.pool, snapshot, config.runtime);
      if (matches.length === 0) return notStartedStatus();
      if (matches.length !== 1) throw new IngestionStatusError('ambiguous_identity');
      return operations.getIngestionStatusByRelease(config.pool, matches[0]!);
    },
  };
}
