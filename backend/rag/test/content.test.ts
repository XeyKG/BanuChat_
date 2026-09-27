import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { buildDocumentDerivatives, validateSyntheticContent, SYNTHETIC_V1_PROFILE, sha256,
  SafeReader, validateRelativePath, PreflightError, safeError } from '../src/index.js';
import { array, copySource, failure, mutateCatalog, object, readJson, realSource, refreshHash,
  temporaryDirectory, writeJson } from './helpers.js';

test('current frozen corpus: counts, relations, modes and deterministic 60 chunks', async () => {
  const before = await readFile(path.join(realSource, 'manifest.json'));
  const result = await validateSyntheticContent({ syntheticRoot: realSource, profile: SYNTHETIC_V1_PROFILE });
  assert.deepEqual(result.summary, { files: 18, items: 76,
    kinds: { document: 12, course: 12, calendar_event: 22, announcement: 8, profile: 4, profile_course: 18 },
    documents: 12, chunked_documents: 10, full_documents: 2 });
  const derivatives = buildDocumentDerivatives(result);
  assert.deepEqual(derivatives, buildDocumentDerivatives(result));
  assert.equal(derivatives.reduce((n, doc) => n + doc.chunks.length, 0), 60);
  for (const doc of derivatives) {
    if (doc.retrieval_mode === 'full_document') {
      assert.deepEqual(doc.chunks, []);
      assert.equal(doc.content_sha256, doc.source_sha256);
    } else {
      assert.deepEqual(doc.chunks.map(chunk => chunk.ordinal), [0, 1, 2, 3, 4, 5]);
      for (const chunk of doc.chunks) {
        assert.equal(chunk.content_sha256, sha256(Buffer.from(chunk.content)));
        assert.equal(chunk.page_start, null);
        assert.equal(chunk.page_end, null);
      }
    }
  }
  for (const file of result.manifest.files) assert.equal(sha256(result.bytes.get(file.path)!), file.sha256);
  for (const item of result.manifest.items) assert.equal(sha256(result.bytes.get(item.path)!), item.sha256);
  assert.deepEqual(await readFile(path.join(realSource, 'manifest.json')), before);
});

const mutations: { name: string; category: PreflightError['category']; mutate: (root: string) => Promise<void> }[] = [
  { name: 'bad physical SHA', category: 'hash', mutate: async root => {
    const manifest = object(await readJson(root, 'manifest.json'));
    object(array(manifest['files'])[0])['sha256'] = '0'.repeat(64);
    await writeJson(root, 'manifest.json', manifest);
  } },
  { name: 'item hash differs from file', category: 'hash', mutate: async root => {
    const manifest = object(await readJson(root, 'manifest.json'));
    object(array(manifest['items'])[0])['sha256'] = '0'.repeat(64);
    await writeJson(root, 'manifest.json', manifest);
  } },
  { name: 'invalid schema document', category: 'schema', mutate: async root => {
    const schema = object(await readJson(root, 'schemas/courses.schema.json'));
    schema['type'] = 'not-a-type';
    await writeJson(root, 'schemas/courses.schema.json', schema);
  } },
  { name: 'unexpected schema ID', category: 'schema', mutate: async root => {
    const schema = object(await readJson(root, 'schemas/courses.schema.json'));
    schema['$id'] = 'urn:other';
    await writeJson(root, 'schemas/courses.schema.json', schema);
  } },
  { name: 'remote schema reference is not downloaded', category: 'schema', mutate: async root => {
    const schema = object(await readJson(root, 'schemas/courses.schema.json'));
    schema['$ref'] = 'https://example.invalid/schema';
    await writeJson(root, 'schemas/courses.schema.json', schema);
  } },
  { name: 'missing JSON Pointer', category: 'pointer', mutate: async root => {
    const manifest = object(await readJson(root, 'manifest.json'));
    const item = array(manifest['items']).map(object).find(row => row['kind'] === 'course')!;
    item['locator'] = '/courses/999';
    await writeJson(root, 'manifest.json', manifest);
  } },
  { name: 'item key differs from row', category: 'identity', mutate: async root => {
    const manifest = object(await readJson(root, 'manifest.json'));
    object(array(manifest['items'])[0])['key'] = 'missing-key';
    await writeJson(root, 'manifest.json', manifest);
  } },
  { name: 'event FK broken', category: 'relation', mutate: root => mutateCatalog(root, 'calendars/events.json', value => {
    const event = array(value['events']).map(object).find(row => row['event_type'] === 'course_session')!;
    event['course_key'] = 'course-missing';
  }) },
  { name: 'progress FK broken', category: 'relation', mutate: async root => {
    let previous = '';
    let next = '';
    await mutateCatalog(root, 'profiles/progress.json', value => {
      const row = object(array(value['progress'])[0]);
      previous = `${row['profile_key']}/${row['course_key']}`;
      row['course_key'] = 'course-missing';
      next = `${row['profile_key']}/${row['course_key']}`;
    });
    const manifest = object(await readJson(root, 'manifest.json'));
    const item = array(manifest['items']).map(object).find(row => row['kind'] === 'profile_course' && row['key'] === previous)!;
    item['key'] = next;
    await writeJson(root, 'manifest.json', manifest);
  } },
  { name: 'impossible date', category: 'schema', mutate: root => mutateCatalog(root, 'calendars/events.json', value => {
    object(array(value['events'])[0])['starts_at'] = '2026-02-30T10:00:00-05:00';
  }) },
  { name: 'reversed interval', category: 'date', mutate: root => mutateCatalog(root, 'calendars/events.json', value => {
    object(array(value['events'])[0])['ends_at'] = '2020-01-01T10:00:00-05:00';
  }) },
  { name: 'offset is not Bogota local time', category: 'date', mutate: root => mutateCatalog(root, 'calendars/events.json', value => {
    object(array(value['events'])[0])['starts_at'] = '2026-10-01T10:00:00Z';
  }) },
  { name: 'document mode inconsistent', category: 'identity', mutate: async root => {
    const manifest = object(await readJson(root, 'manifest.json'));
    const item = array(manifest['items']).map(object).find(row => row['kind'] === 'document')!;
    item['retrieval_mode'] = 'full_document';
    await writeJson(root, 'manifest.json', manifest);
  } },
  { name: 'duplicate catalog identity', category: 'identity', mutate: root => mutateCatalog(root, 'courses/courses.json', value => {
    const rows = array(value['courses']);
    object(rows[1])['course_key'] = object(rows[0])['course_key']!;
  }) },
  { name: 'catalog row without item', category: 'identity', mutate: root => mutateCatalog(root, 'courses/courses.json', value => {
    array(value['courses']).push({ ...object(array(value['courses'])[0]), course_key: 'extra-course' });
  }) },
  { name: 'unlisted functional file', category: 'inventory', mutate: async root => { await writeFile(path.join(root, 'courses/extra.json'), '{}\n'); } },
  { name: 'README outside known control locations is not silently ignored', category: 'inventory', mutate: async root => {
    await writeFile(path.join(root, 'documents/artifacts/README.md'), 'Extra\n');
  } },
  { name: 'catalog title inconsistent with artifact', category: 'identity', mutate: root => mutateCatalog(root, 'documents/documents.json', value => {
    object(array(value['documents'])[0])['title'] = 'Otro título';
  }) },
];
for (const item of mutations) {
  test(`content rejects: ${item.name}`, async t => {
    const root = await copySource(t);
    await item.mutate(root);
    await assert.rejects(validateSyntheticContent({ syntheticRoot: root, profile: SYNTHETIC_V1_PROFILE }), failure('VALIDATION_FAILED', item.category));
  });
}

for (const [name, bytes, category] of [
  ['duplicate JSON keys', Buffer.from('{"schema_version":"1.0.0","schema_version":"1.0.0"}\n'), 'json'],
  ['trailing comma', Buffer.from('{"schema_version":"1.0.0",}\n'), 'json'],
  ['invalid UTF8', Buffer.from([0xc3, 0x28, 0x0a]), 'encoding'],
  ['BOM', Buffer.from('\ufeff{}\n'), 'encoding'],
  ['CRLF', Buffer.from('{}\r\n'), 'encoding'],
  ['missing final LF', Buffer.from('{}'), 'encoding'],
] as const) {
  test(`isolated file rejects: ${name}`, async t => {
    const root = await copySource(t);
    await writeFile(path.join(root, 'courses/courses.json'), bytes);
    await refreshHash(root, 'courses/courses.json');
    await assert.rejects(validateSyntheticContent({ syntheticRoot: root }), failure('VALIDATION_FAILED', category));
  });
}

test('v1 counts are opt-in, not hardcoded in generic preflight', async t => {
  const root = await copySource(t);
  await mutateCatalog(root, 'calendars/events.json', value => { array(value['events']).pop(); });
  const manifest = object(await readJson(root, 'manifest.json'));
  manifest['items'] = array(manifest['items']).filter(value => {
    const item = object(value);
    return !(item['kind'] === 'calendar_event' && item['locator'] === '/events/21');
  });
  await writeJson(root, 'manifest.json', manifest);
  assert.equal((await validateSyntheticContent({ syntheticRoot: root })).summary.items, 75);
  await assert.rejects(validateSyntheticContent({ syntheticRoot: root, profile: SYNTHETIC_V1_PROFILE }), failure('VALIDATION_FAILED', 'inventory'));
});

test('path traversal, absolute paths, alternate separators and Windows aliases rejected', async () => {
  const reader = await SafeReader.create(realSource);
  for (const bad of ['../secret', '/etc/passwd', 'C:/secret', 'documents\\secret', 'a/../secret', 'a//b', 'a:stream', 'a./b', 'NUL.txt']) {
    assert.throws(() => validateRelativePath(bad), failure('SOURCE_REJECTED', 'path'));
    await assert.rejects(reader.read(bad), failure('SOURCE_REJECTED', 'path'));
  }
});

test('symlink/junction in path chain or root rejected', async t => {
  const temp = await temporaryDirectory(t);
  const target = path.join(temp, 'target');
  const root = path.join(temp, 'source');
  await mkdir(target);
  await mkdir(root);
  await writeFile(path.join(target, 'data.json'), '{}\n');
  const link = path.join(root, 'link');
  try { await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && ['EPERM', 'EACCES', 'ENOTSUP'].includes(String(error.code))) {
      t.skip(`OS cannot create test link: ${String(error.code)}`); return;
    }
    throw error;
  }
  const reader = await SafeReader.create(root);
  await assert.rejects(reader.read('link/data.json'), failure('SOURCE_REJECTED', 'path'));
  await assert.rejects(reader.listFiles(), failure('SOURCE_REJECTED', 'path'));
  await assert.rejects(SafeReader.create(link), failure('SOURCE_REJECTED', 'path'));
});

test('contractual errors omit arbitrary paths, stacks and native error messages', () => {
  assert.deepEqual(new PreflightError('SOURCE_REJECTED', 'read', 'C:/secret.txt').toJSON(), { code: 'SOURCE_REJECTED', category: 'read' });
  assert.deepEqual(JSON.parse(JSON.stringify(safeError(new Error('private token')))), { code: 'INTERNAL_ERROR', category: 'unexpected' });
});
