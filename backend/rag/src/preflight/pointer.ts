import { requireValid } from '../errors.js';
import type { Json } from '../types.js';

export function resolveJsonPointer(root: Json, pointer: string): Json {
  if (pointer === '') return root;
  requireValid(pointer.startsWith('/') && !/~(?:[^01]|$)/.test(pointer), 'pointer');
  let value = root;
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    requireValid(value !== null && typeof value === 'object' && Object.hasOwn(value, key), 'pointer');
    if (Array.isArray(value)) {
      requireValid(/^(0|[1-9][0-9]*)$/.test(key) && Number.isSafeInteger(Number(key)), 'pointer');
      const entry = value[Number(key)];
      requireValid(entry !== undefined, 'pointer');
      value = entry;
    } else {
      const entry: Json | undefined = value[key];
      requireValid(entry !== undefined, 'pointer');
      value = entry;
    }
  }
  return value;
}
