export function isValidInternalServiceToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 32 && !/\s/u.test(value);
}
