export type ErrorCode = 'SOURCE_REJECTED' | 'VALIDATION_FAILED' | 'INTERNAL_ERROR';
export type ErrorCategory = 'path' | 'read' | 'encoding' | 'json' | 'schema' | 'inventory'
  | 'hash' | 'pointer' | 'identity' | 'relation' | 'date' | 'markdown' | 'git' | 'unexpected';

/** Contractual serialization never includes native errors, file contents or stacks. */
export class PreflightError extends Error {
  constructor(readonly code: ErrorCode, readonly category: ErrorCategory,
    readonly logicalFile?: string) {
    super(`${code}: ${category}`);
    this.name = 'PreflightError';
  }

  toJSON(): { code: ErrorCode; category: ErrorCategory; logical_file?: string } {
    // Only known contract filenames are safe to serialize, not arbitrary caller input.
    const safe = this.logicalFile !== undefined && /^(?:manifest\.json|schemas\/(?:manifest|documents|courses|calendar-events|announcements|profiles|profile-progress)\.schema\.json|documents\/documents\.json|courses\/courses\.json|calendars\/events\.json|announcements\/announcements\.json|profiles\/(?:profiles|progress)\.json|documents\/artifacts\/[a-z0-9][a-z0-9_-]{0,127}\.md)$/.test(this.logicalFile);
    return { code: this.code, category: this.category,
      ...(safe ? { logical_file: this.logicalFile! } : {}) };
  }
}

export function requireValid(condition: unknown, category: ErrorCategory,
  logicalFile?: string): asserts condition {
  if (!condition) throw new PreflightError('VALIDATION_FAILED', category, logicalFile);
}

export function safeError(error: unknown): PreflightError {
  return error instanceof PreflightError ? error : new PreflightError('INTERNAL_ERROR', 'unexpected');
}
