export type RuntimeProvenanceReason =
  | 'invalid_configuration'
  | 'runtime_unavailable'
  | 'invalid_repository'
  | 'dirty_runtime'
  | 'revision_changed'
  | 'bytes_mismatch';

export class RuntimeProvenanceError extends Error {
  readonly code = 'RUNTIME_REJECTED' as const;

  constructor(readonly reason: RuntimeProvenanceReason) {
    super(`RUNTIME_REJECTED: ${reason}`);
    this.name = 'RuntimeProvenanceError';
  }

  toJSON(): { error_code: 'RUNTIME_REJECTED'; reason: RuntimeProvenanceReason } {
    return { error_code: this.code, reason: this.reason };
  }
}

