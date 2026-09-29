export type DatabaseCode = 'DATABASE_UNAVAILABLE' | 'DATABASE_CONFLICT' | 'DATABASE_INVARIANT';

export class DatabaseError extends Error {
  constructor(readonly code: DatabaseCode, options?: ErrorOptions) {
    super(code, options);
    this.name = 'DatabaseError';
  }
  toJSON(): { code: DatabaseCode } { return { code: this.code }; }
}

export function databaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const unavailable = code.startsWith('08') || ['57P01', '57P02', '57P03', '53300',
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND'].includes(code);
  const conflict = ['40001', '40P01', '55P03'].includes(code);
  return new DatabaseError(unavailable ? 'DATABASE_UNAVAILABLE' : conflict ? 'DATABASE_CONFLICT' : 'DATABASE_INVARIANT', { cause: error });
}

export function invariant(condition: unknown): asserts condition {
  if (!condition) throw new DatabaseError('DATABASE_INVARIANT');
}
