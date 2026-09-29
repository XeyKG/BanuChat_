export type IngestionStatusReason =
  | 'run_not_found'
  | 'release_not_found'
  | 'ambiguous_identity'
  | 'state_inconsistent'
  | 'invalid_database_result';

export class IngestionStatusError extends Error {
  readonly code = 'STATUS_REJECTED' as const;

  constructor(readonly reason: IngestionStatusReason) {
    super(`STATUS_REJECTED: ${reason}`);
    this.name = 'IngestionStatusError';
  }

  toJSON(): { error_code: 'STATUS_REJECTED'; reason: IngestionStatusReason } {
    return { error_code: this.code, reason: this.reason };
  }
}

