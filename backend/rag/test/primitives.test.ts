import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseStrictJson, decodeUtf8, resolveJsonPointer, sha256, validateCivilDate,
  parseTimestamp, validateInterval } from '../src/index.js';
import { failure } from './helpers.js';

test('raw SHA256 matches standard vector, not normalized bytes', () => {
  assert.equal(sha256(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.notEqual(sha256(Buffer.from('é')), sha256(Buffer.from('e\u0301')));
  assert.notEqual(sha256(Buffer.from('{}\n')), sha256(Buffer.from('{ }\n')));
});
test('strict JSON supports valid values and rejects nested/escaped duplicate keys', () => {
  assert.deepEqual(parseStrictJson(Buffer.from('{"a":[1,true,null]}\n')), { a: [1, true, null] });
  for (const text of ['{"a":{"x":1,"x":2}}\n', '{"a":1,"\\u0061":2}\n', '{/*comment*/"a":1}\n', '{"a":1,}\n', '{"a":1e999}\n']) {
    assert.throws(() => parseStrictJson(Buffer.from(text)), failure('VALIDATION_FAILED', 'json'));
  }
});
test('strict UTF8 preserves unicode and rejects malformed bytes/BOM/CR/no final LF', () => {
  assert.equal(decodeUtf8(Buffer.from('ñ e\u0301\n')), 'ñ e\u0301\n');
  for (const bytes of [Buffer.from([0xff, 0x0a]), Buffer.from('\ufeffx\n'), Buffer.from('x\r\n'), Buffer.from('x')]) {
    assert.throws(() => decodeUtf8(bytes), failure('VALIDATION_FAILED', 'encoding'));
  }
});
test('JSON numeric representation cannot silently round source decimals or underflow', () => {
  for (const number of ['33.000000000000000001', '1e-9999', '9007199254740993']) {
    assert.throws(() => parseStrictJson(Buffer.from(`{"value":${number}}\n`)), failure('VALIDATION_FAILED', 'json'));
  }
  assert.deepEqual(parseStrictJson(Buffer.from('[33.10,1e2,0.00,-0]\n')), [33.1, 100, 0, -0]);
});
test('JSON Pointer RFC6901 escaped keys, arrays and own properties only', () => {
  const value = { 'a/b': { '~key': [42] }, '~1': 7, '': 8 };
  assert.equal(resolveJsonPointer(value, '/a~1b/~0key/0'), 42);
  assert.equal(resolveJsonPointer(value, '/~01'), 7);
  assert.equal(resolveJsonPointer(value, '/'), 8);
  assert.equal(resolveJsonPointer(value, ''), value);
  for (const pointer of ['/missing', '/a~2b', '/a~1b/~0key/01', '/a~1b/~0key/-', '/a~1b/~0key/length', '/toString']) {
    assert.throws(() => resolveJsonPointer(value, pointer), failure('VALIDATION_FAILED', 'pointer'));
  }
});
test('real civil dates and Bogota RFC3339 offsets, without current-time assumptions', () => {
  for (const date of ['2024-02-29', '2026-09-26']) validateCivilDate(date);
  for (const date of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-01', '2026-04-31']) {
    assert.throws(() => validateCivilDate(date), failure('VALIDATION_FAILED', 'date'));
  }
  parseTimestamp('2026-09-26T23:59:59.123456789-05:00');
  for (const timestamp of ['2026-02-30T12:00:00-05:00', '2026-09-26T24:00:00-05:00',
    '2026-09-26T12:00:00', '2026-09-26T12:00:00Z', '2026-09-26T12:00:00-04:00', '2026-09-26T12:00:00-25:00']) {
    assert.throws(() => parseTimestamp(timestamp), failure('VALIDATION_FAILED', 'date'));
  }
});
test('intervals preserve submillisecond precision, equality and nullable boundaries', () => {
  validateInterval('2026-09-26T12:00:00.1-05:00', '2026-09-26T12:00:00.1000-05:00');
  validateInterval(null, '2026-09-26T12:00:00-05:00');
  validateInterval('2026-09-26T12:00:00-05:00', null);
  assert.throws(() => validateInterval('2026-09-26T12:00:00.0002-05:00', '2026-09-26T12:00:00.0001-05:00'), failure('VALIDATION_FAILED', 'date'));
});
