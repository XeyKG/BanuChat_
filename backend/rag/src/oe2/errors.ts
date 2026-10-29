export type Oe2ErrorCode = 'SOURCE_NOT_AUTHORIZED' | 'SOURCE_UNAVAILABLE' | 'SOURCE_INVALID'
  | 'SOURCE_EMPTY' | 'STATE_ERROR' | 'RUN_IN_PROGRESS' | 'INTERNAL_ERROR';

/** Operational errors contain no native message, path, payload or stack in HTTP. */
export class Oe2FlowError extends Error {
  constructor(readonly code: Oe2ErrorCode) { super(`OE2_${code}`); }
}
