export type InternalControlReason =
  | 'invalid_configuration'
  | 'workflow_mismatch'
  | 'pipeline_mismatch';

export class InternalControlError extends Error {
  readonly code = 'CONTROL_REJECTED' as const;

  constructor(readonly reason: InternalControlReason) {
    super(`CONTROL_REJECTED: ${reason}`);
    this.name = 'InternalControlError';
  }

  toJSON(): { error_code: 'CONTROL_REJECTED'; reason: InternalControlReason } {
    return { error_code: this.code, reason: this.reason };
  }
}

