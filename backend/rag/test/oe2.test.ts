import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { compareOe2Snapshots, FileOe2StateStore, extractOe2Fixture,
  runOe2FixtureFlow } from '../src/oe2/flow.js';
import { createOe2HttpServer } from '../src/oe2/server.js';

const fixtureRoot = fileURLToPath(new URL('../../../eval/oe2/fixtures/', import.meta.url));

test('runs the three fixture-only OE2 flows and then detects no changes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'banuchat-oe2-'));
  try {
    const store = new FileOe2StateStore(root);
    const cases = [
      ['academic_offer', 'fixture-academic-offer-v1'],
      ['calls', 'fixture-calls-v1'],
      ['news', 'fixture-news-v1'],
    ] as const;
    for (const [category, sourceId] of cases) {
      const first = await runOe2FixtureFlow({ category, sourceId, fixtureRoot, store,
        now: () => new Date('2026-10-24T12:00:00Z') });
      assert.equal(first.outcome, 'updated');
      assert.deepEqual(first.changes, { created: 2, modified: 0, deleted: 0, unchanged: 0 });
      assert.equal(first.published_to_ccd, false);
      const second = await runOe2FixtureFlow({ category, sourceId, fixtureRoot, store });
      assert.equal(second.outcome, 'unchanged');
      assert.deepEqual(second.changes, { created: 0, modified: 0, deleted: 0, unchanged: 2 });
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects duplicate records and preserves the last valid snapshot', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'banuchat-oe2-'));
  const fixtures = await mkdtemp(path.join(tmpdir(), 'banuchat-oe2-fixtures-'));
  try {
    const store = new FileOe2StateStore(root);
    const valid = await readFile(path.join(fixtureRoot, 'news.json'));
    await writeFile(path.join(fixtures, 'news.json'), valid);
    await runOe2FixtureFlow({ category: 'news', sourceId: 'fixture-news-v1', fixtureRoot: fixtures, store,
      now: () => new Date('2026-10-24T12:00:00Z') });
    const before = await readFile(path.join(root, 'news.json'), 'utf8');
    const duplicate = JSON.parse(valid.toString('utf8')) as { records: unknown[] };
    duplicate.records.push(duplicate.records[0]);
    await writeFile(path.join(fixtures, 'news.json'), `${JSON.stringify(duplicate)}\n`);
    await assert.rejects(runOe2FixtureFlow({ category: 'news', sourceId: 'fixture-news-v1',
      fixtureRoot: fixtures, store }), /OE2_DUPLICATE_RECORD/);
    assert.equal(await readFile(path.join(root, 'news.json'), 'utf8'), before);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(fixtures, { recursive: true, force: true });
  }
});

test('rejects a source that is not explicitly fixture-authorized', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'banuchat-oe2-'));
  try {
    await assert.rejects(runOe2FixtureFlow({ category: 'news', sourceId: 'unab-students-index',
      fixtureRoot, store: new FileOe2StateStore(root) }), /OE2_SOURCE_NOT_AUTHORIZED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('field-level reference set is extracted exactly from fixtures', async () => {
  let correct = 0; let total = 0;
  for (const [file, category, sourceId] of [
    ['academic-offer.json', 'academic_offer', 'fixture-academic-offer-v1'],
    ['calls.json', 'calls', 'fixture-calls-v1'],
    ['news.json', 'news', 'fixture-news-v1'],
  ] as const) {
    const bytes = await readFile(path.join(fixtureRoot, file));
    const raw = JSON.parse(bytes.toString('utf8')) as { records: Record<string, string>[] };
    const extracted = extractOe2Fixture(bytes, category, sourceId);
    assert.equal(extracted.length, raw.records.length);
    for (let index = 0; index < raw.records.length; index++) {
      const expected = raw.records[index]!; const actual = extracted[index]!;
      for (const field of ['id', 'title', 'published_at', 'source_version']) {
        total++; correct += Number((field === 'id' ? actual.source_record_id : actual[field as keyof typeof actual]) === expected[field]);
      }
      for (const [field, value] of Object.entries(actual.fields)) { total++; correct += Number(value === expected[field]); }
    }
  }
  assert.equal(correct, total);
  assert.equal(correct / total, 1);
});

test('change comparison distinguishes modified and deleted records', async () => {
  const records = extractOe2Fixture(await readFile(path.join(fixtureRoot, 'news.json')),
    'news', 'fixture-news-v1');
  const previous = { schema_version: 'oe2-snapshot-1' as const, category: 'news' as const,
    source_id: 'fixture-news-v1', source_sha256: '0'.repeat(64),
    available_at: '2026-10-24T12:00:00.000Z', records };
  const changed = [{ ...records[0]!, content_sha256: '1'.repeat(64) }];
  assert.deepEqual(compareOe2Snapshots(previous, changed),
    { created: 0, modified: 1, deleted: 1, unchanged: 0 });
});

test('OE2 HTTP boundary authenticates and invokes only an explicit category/source pair', async () => {
  const token = 'local-test-token-1234567890-abcdef';
  const calls: string[] = [];
  const server = createOe2HttpServer({
    async run(category, sourceId) {
      calls.push(`${category}:${sourceId}`);
      return { outcome: 'unchanged', category, source_id: sourceId,
        source_sha256: '0'.repeat(64), available_at: '2026-10-24T12:00:00.000Z',
        record_count: 0, changes: { created: 0, modified: 0, deleted: 0, unchanged: 0 },
        publication_lag_verifiable: false, publication_lag_reason: 'fixture_source',
        published_to_ccd: false };
    },
    async status(category) { return { outcome: 'not_started', category }; },
  }, token);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address(); assert(address !== null && typeof address === 'object');
    const url = `http://127.0.0.1:${address.port}/internal/oe2/run`;
    const unauthorized = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'news', source_id: 'fixture-news-v1' }) });
    assert.equal(unauthorized.status, 401); assert.deepEqual(calls, []);
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` }, body: JSON.stringify({ category: 'news', source_id: 'fixture-news-v1' }) });
    assert.equal(response.status, 200); assert.equal((await response.json() as { published_to_ccd: boolean }).published_to_ccd, false);
    assert.deepEqual(calls, ['news:fixture-news-v1']);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error)));
  }
});
