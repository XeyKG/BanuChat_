export { PreflightError, safeError } from './errors.js';
export type { ErrorCode, ErrorCategory } from './errors.js';
export type * from './types.js';
export { sha256 } from './crypto/sha256.js';
export { SafeReader, validateRelativePath } from './source/safe-reader.js';
export { verifySourceCheckout } from './source/git-source-verifier.js';
export type { SourceCheckoutOptions } from './source/git-source-verifier.js';
export { validateSyntheticContent } from './preflight/content.js';
export { SYNTHETIC_V1_PROFILE } from './preflight/profile.js';
export { decodeUtf8, parseStrictJson } from './preflight/json.js';
export { resolveJsonPointer } from './preflight/pointer.js';
export { validateCivilDate, parseTimestamp, validateInterval } from './preflight/dates.js';
export { extractMarkdownDocument, chunkMarkdownDocument, buildDocumentDerivatives,
  deriveDocument, SYNTHETIC_BANNER } from './documents/markdown.js';
export type { ExtractedMarkdown } from './documents/markdown.js';
export { DatabaseError, databaseError } from './db/errors.js';
export type { DatabaseCode } from './db/errors.js';
export { WriterLease, withWriterLease, WRITER_LOCK_NAMESPACE } from './db/writer-lock.js';
export { resolveRelease } from './db/releases.js';
export { stageCandidate } from './db/stage.js';
export type { StageInput, StageResult, ReleaseResolution } from './db/types.js';
export { buildPipelineConfigV1, validatePipelineConfigV1 } from './pipeline.js';
export { OllamaClient, validateVectors, validateEmbedResponse, vectorLiteral } from './ollama/client.js';
export { OllamaError } from './ollama/errors.js';
export type { EmbeddingClient, EmbeddingConfig } from './ollama/types.js';
export { resolveEmbeddingConfig } from './db/embedding-config.js';
export { generateEmbeddings } from './db/embeddings.js';
export { finalizeAndPublish } from './db/finalize.js';
export { ingestApprovedCandidate } from './ingest.js';
export type { IngestInput } from './ingest.js';
export { failAttempt, recoverOrphanedAttempt, failureCode, FAILURE_CODES } from './db/failure.js';
export type { FailureCode } from './db/failure.js';
export { prepareRetry } from './db/retry.js';
export { retryFailedCandidate } from './retry.js';
export { InternalRequestError } from './internal-http/errors.js';
export type { InternalRequestReason } from './internal-http/errors.js';
export { parseExecuteRequest, parseRetryRequest, parseRecoverRequest,
  parseStatusRequest } from './internal-http/protocol.js';
export type { ExecuteRequest, RetryRequest, RecoverRequest, StatusRequest,
  InternalIngestionRequest } from './internal-http/protocol.js';
export { ApprovalRegistryError } from './approval/errors.js';
export type { ApprovalRegistryReason } from './approval/errors.js';
export { parseApprovalRegistry, resolveApproval,
  assertApprovalMatchesRequest } from './approval/registry.js';
export type { ApprovalRecord, ApprovalRegistryV1 } from './approval/registry.js';
export { loadApprovalRegistry,
  APPROVAL_REGISTRY_MAX_BYTES } from './approval/loader.js';
