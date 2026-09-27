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
