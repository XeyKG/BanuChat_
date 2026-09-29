export type InternalRequestReason =
  | 'invalid_shape'
  | 'missing_field'
  | 'extra_field'
  | 'invalid_value'
  | 'ambiguous_selector';

export class InternalRequestError extends Error {
  readonly code = 'INVALID_INTERNAL_REQUEST' as const;

  constructor(readonly reason: InternalRequestReason) {
    super(`INVALID_INTERNAL_REQUEST: ${reason}`);
    this.name = 'InternalRequestError';
  }

  toJSON(): { error_code: 'INVALID_INTERNAL_REQUEST'; reason: InternalRequestReason } {
    return { error_code: this.code, reason: this.reason };
  }
}

