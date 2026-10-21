import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { execFileSync } from 'node:child_process';
import { prepareCcdCorpus, ccdSnapshotFiles, sha256, PreflightError } from '../src/index.js';
import type { CcdCorpus } from '../src/ccd/prepare.js';
import { temporaryDirectory } from './helpers.js';

// Fictional test text, never a copy of institutional documents or answers.
async function fixture(t: TestContext) {
  const root = await temporaryDirectory(t);
  const corpusRoot = path.join(root, 'local');
  const institutionalRoot = path.join(root, 'external');
  await mkdir(corpusRoot); await mkdir(institutionalRoot);
  await writeFile(path.join(institutionalRoot, 'source.bin'), 'fictional source');
  await writeFile(path.join(institutionalRoot, 'review.bin'), 'fictional review');
  const corpus: CcdCorpus = {
    schema_version: 'ccd-1.0.0', dataset_key: 'banuchat-ccd-local', version: 'test-v1',
    synthetic: false, use_scope: 'local_development_only',
    validation: { status: 'team_validated', institutional_approval: false,
      authorization_ref: 'BCH-03/incremento-1', note: 'Fictional fixture, no institutional authority.' },
    sources: [{ id: 'DOC-110', path: 'source.bin', sha256: sha256(Buffer.from('fictional source')) },
      { id: 'BCH01-CIERRE', path: 'review.bin', sha256: sha256(Buffer.from('fictional review')) }],
    units: (['M01', 'M12'] as const).map(group => ({ id: group === 'M01' ? 'ccd-m01' : 'ccd-m12',
      group, c_units: group === 'M01' ? ['C04', 'C07'] : ['C44', 'C45'],
      title: `Fictional ${group}`, retrieval_mode: 'chunked', period: '202660', population: 'Fictional population',
      applicability_status: 'current_applicability_unconfirmed', editorial_status: 'team_validated_local_candidate',
      content: 'Fictional evidence for boundary tests.', limits: ['No real academic rule.'],
      references: [{ source_id: 'DOC-110', locator: 'fictional section' },
        { source_id: 'BCH01-CIERRE', locator: group === 'M01' ? '02_Respuestas_6!D2' : '02_Respuestas_6!D7' }] })),
  };
  const save = async () => writeFile(path.join(corpusRoot, 'corpus.json'), JSON.stringify(corpus, null, 2) + '\n');
  await save();
  return { corpusRoot, institutionalRoot, corpus, save };
}

test('CCD snapshot preserves scope and two independent provenance chains without v1 Markdown requirements', async t => {
  const f = await fixture(t);
  const before = await readFile(path.join(f.institutionalRoot, 'source.bin'));
  const result = await prepareCcdCorpus(f);
  assert.equal(result.manifest.synthetic, false);
  assert.equal(result.corpus.validation.institutional_approval, false);
  assert.equal(result.derivatives.length, 2);
  assert.deepEqual(result.documents.map(doc => doc.document_key), ['ccd-m01', 'ccd-m12']);
  for (const [index, doc] of result.derivatives.entries()) {
    assert.equal(doc.chunks.length, 1);
    assert.equal(doc.chunks[0]?.locator, `unit:${index === 0 ? 'M01' : 'M12'}`);
    assert.match(doc.chunks[0]!.content, /Periodo de la fuente: 202660/);
    assert.match(doc.chunks[0]!.content, /Validación del equipo; sin aval institucional formal/);
    assert.match(doc.chunks[0]!.content, /Aplicabilidad actual: no confirmada/);
    assert.match(doc.chunks[0]!.content, /DOC-110; fictional section; SHA-256/);
    assert.equal(doc.source_sha256, sha256(result.artifacts.get(result.documents[index]!.artifact_path)!));
    assert.equal(doc.chunks[0]!.content_sha256, doc.source_sha256);
  }
  assert.deepEqual([...ccdSnapshotFiles(result)], [...ccdSnapshotFiles(await prepareCcdCorpus(f))]);
  assert.deepEqual(await readFile(path.join(f.institutionalRoot, 'source.bin')), before);
});

for (const [name, mutate] of [
  ['unapproved group', (c: CcdCorpus) => Object.assign(c.units[0]!, { group: 'M04' })],
  ['false institutional approval', (c: CcdCorpus) => Object.assign(c.validation, { institutional_approval: true })],
  ['synthetic flag', (c: CcdCorpus) => Object.assign(c, { synthetic: true })],
  ['personal extra field', (c: CcdCorpus) => Object.assign(c.units[0]!, { uid: 'fictional' })],
  ['duplicate group', (c: CcdCorpus) => { c.units[1] = c.units[0]!; }],
  ['wrong C mapping', (c: CcdCorpus) => { c.units[0]!.c_units = ['C44', 'C45']; }],
  ['wrong review locator', (c: CcdCorpus) => { c.units[0]!.references[1]!.locator = '02_Respuestas_6!D7'; }],
  ['missing documentary support', (c: CcdCorpus) => { c.units[0]!.references = [c.units[0]!.references[1]!]; }],
  ['traversal', (c: CcdCorpus) => { c.sources[0]!.path = '../source.bin'; }],
  ['duplicate source ID', (c: CcdCorpus) => { c.sources[1]!.id = 'DOC-110'; }],
  ['newlines in metadata', (c: CcdCorpus) => { c.units[0]!.title = 'Title\nInjected scope'; }],
] as const) {
  test(`CCD rejects ${name} before any persistence`, async t => {
    const f = await fixture(t); mutate(f.corpus); await f.save();
    await assert.rejects(prepareCcdCorpus(f), PreflightError);
  });
}

test('CCD rejects changed or missing original, with a safe error without paths or source content', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.institutionalRoot, 'source.bin'), 'changed private data');
  await assert.rejects(prepareCcdCorpus(f), (error: unknown) => {
    assert.ok(error instanceof PreflightError);
    assert.deepEqual(error.toJSON(), { code: 'VALIDATION_FAILED', category: 'hash' });
    return true;
  });
  f.corpus.sources[0]!.path = 'absent.bin'; await f.save();
  await assert.rejects(prepareCcdCorpus(f), PreflightError);
});

test('CCD CLI writes idempotent snapshots and rejects altered artifacts without overwriting them', async t => {
  const f = await fixture(t);
  const args = ['--import', 'tsx', 'src/ccd/cli.ts', '--corpus-root', f.corpusRoot,
    '--institutional-root', f.institutionalRoot, '--write-snapshot'];
  const run = () => JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, stdio: 'pipe' }));
  assert.equal(run().chunks, 2);
  assert.equal(run().database_accessed, false);
  const artifact = path.join(f.corpusRoot, 'documents/artifacts/ccd-m01.md');
  await writeFile(artifact, 'tampered');
  assert.throws(run);
  assert.equal(await readFile(artifact, 'utf8'), 'tampered');
});
