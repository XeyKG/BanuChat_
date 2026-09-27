import { parseTree } from 'jsonc-parser';
import type { Node, ParseError } from 'jsonc-parser';
import { requireValid } from '../errors.js';
import type { Json } from '../types.js';

// Decimal identity, without converting the original mantissa/exponent to Number.
// Reject rounding/underflow in the JS representation instead of repairing source.
function decimalIdentity(literal: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(literal);
  requireValid(match, 'json');
  const fraction = match[3] ?? '';
  let digits = `${match[2]}${fraction}`.replace(/^0+/, '');
  if (!digits) return '0';
  const trailing = /0+$/.exec(digits)?.[0].length ?? 0;
  if (trailing) digits = digits.slice(0, -trailing);
  const exponent = BigInt(match[4] ?? '0') - BigInt(fraction.length) + BigInt(trailing);
  return `${match[1]}${digits}e${exponent}`;
}

export function decodeUtf8(bytes: Uint8Array, logicalFile?: string): string {
  requireValid(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), 'encoding', logicalFile);
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { requireValid(false, 'encoding', logicalFile); }
  requireValid(!text.includes('\r') && text.endsWith('\n'), 'encoding', logicalFile);
  return text;
}

export function parseStrictJson(bytes: Uint8Array, logicalFile?: string): Json {
  const text = decodeUtf8(bytes, logicalFile);
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { allowTrailingComma: false, disallowComments: true, allowEmptyContent: false });
  requireValid(tree && errors.length === 0, 'json', logicalFile);
  const visit = (node: Node): void => {
    if (node.type === 'object') {
      const keys = new Set<string>();
      for (const property of node.children ?? []) {
        const key: unknown = property.children?.[0]?.value;
        requireValid(typeof key === 'string' && !keys.has(key), 'json', logicalFile);
        keys.add(key);
      }
    }
    if (node.type === 'number') {
      const value: unknown = node.value;
      requireValid(typeof value === 'number' && Number.isFinite(value), 'json', logicalFile);
      requireValid(decimalIdentity(text.slice(node.offset, node.offset + node.length)) === decimalIdentity(String(value)), 'json', logicalFile);
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return JSON.parse(text) as Json;
}
