import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { temporaryDirectory } from './helpers.js';
import { prepareCcdCorpus, sha256 } from '../src/index.js';
import type { CcdCorpus, CcdUnit, CcdSourceId } from '../src/ccd/prepare.js';
import { storageCounts } from '../src/db/recipe.js';
import { finalizeAndPublish } from '../src/db/finalize.js';
import type { WriterLease } from '../src/db/writer-lock.js';

async function fixture(t: TestContext, guidance = false) {
  const root = await temporaryDirectory(t); const corpusRoot = path.join(root, 'local'); const institutionalRoot = path.join(root, 'sources');
  await mkdir(corpusRoot); await mkdir(institutionalRoot);
  const ids: CcdSourceId[] = ['DOC-110', 'BCH01-CIERRE', 'DOC-098', 'DOC-099', 'DOC-100', 'DOC-101', 'DOC-102', 'DOC-103', 'DOC-104'];
  if (guidance) ids.push('DOC-116', 'DOC-076');
  for (const id of ids) await writeFile(path.join(institutionalRoot, `${id}.bin`), `fictional ${id}`);
  const units: CcdUnit[] = ids.filter(id => /^DOC-(098|099|10[0-4])$/.test(id)).map(id => ({
    id: `ccd-m02-${id.toLowerCase()}`, group: 'M02', c_units: ['C05'], title: `Fictional course ${id}`,
    content: 'Fictional descriptive evidence.', topics: ['Fictional topic A', 'Fictional topic B'], retrieval_mode: 'chunked',
    period: 'Edición entregada; periodo no confirmado', population: 'Fictional population', applicability_status: 'current_applicability_unconfirmed',
    editorial_status: 'source_checked_local_candidate', limits: ['Fictional source, no offer or academic effects.'],
    references: [{ source_id: id, locator: 'p.2 summary' }, { source_id: 'BCH01-CIERRE', locator: '02_Respuestas_6!E3' }],
  }));
  for (const [id, group, c, cell] of [['ccd-m01', 'M01', ['C04', 'C07'], '02_Respuestas_6!D2'],
    ['ccd-m12', 'M12', ['C44', 'C45'], '02_Respuestas_6!D7'],
    ['ccd-tests-overview', 'TEST_ORIENTATION', ['C11'], '07_Bloqueos!A3:H3']] as const) {
    units.push({ id, group, c_units: [...c], title: 'Fictional unit', content: 'Fictional evidence.', retrieval_mode: 'chunked', period: '202660',
      population: 'Fictional population', applicability_status: 'current_applicability_unconfirmed',
      editorial_status: group === 'TEST_ORIENTATION' ? 'source_checked_local_candidate' : 'team_validated_local_candidate',
      limits: ['No academic effects.'], references: [{ source_id: 'DOC-110', locator: 'fictional section' }, { source_id: 'BCH01-CIERRE', locator: cell }] });
  }
  const corpus: CcdCorpus = { schema_version: 'ccd-1.1.0', dataset_key: 'banuchat-ccd-local', version: 'fictional-expanded-v1', synthetic: false,
    use_scope: 'local_development_only', validation: { status: 'source_checked_local', institutional_approval: false,
      authorization_ref: 'BCH-03/incremento-4', note: 'Fictional fixture only.' },
    sources: ids.map(id => ({ id, path: `${id}.bin`, sha256: sha256(Buffer.from(`fictional ${id}`)) })), units };
  if (guidance) {
    corpus.schema_version = 'ccd-1.2.0'; corpus.validation.authorization_ref = 'BCH-03/incremento-5';
    corpus.validation.review_package_sha256 = 'a'.repeat(64);
    for (const group of ['U03', 'U04'] as const) units.push({ id: group === 'U03' ? 'ccd-u03' : 'ccd-u04', group,
      c_units: group === 'U03' ? ['C53'] : ['C09', 'C10'], title: 'Fictional scoped guidance', content: 'Fictional historical evidence, no entitlement.',
      retrieval_mode: 'chunked', period: group === 'U03' ? '202660' : 'Transición 202560–202610; actualidad no confirmada',
      population: 'Fictional scope', applicability_status: 'current_applicability_unconfirmed', editorial_status: 'source_checked_local_candidate',
      limits: ['No personal equivalences or free repetition.'], scenario_refs: group === 'U03' ? ['R07'] : ['R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18'],
      references: [{ source_id: group === 'U03' ? 'DOC-110' : 'DOC-116', locator: 'fictional section' },
        ...(group === 'U04' ? [{ source_id: 'DOC-076' as const, locator: 'fictional orientation' }] : []),
        { source_id: 'BCH01-CIERRE', locator: group === 'U03' ? '01_Admision_M01_M12!F5' : '01_Admision_M01_M12!F11' }] });
  }
  const save = () => writeFile(path.join(corpusRoot, 'corpus.json'), JSON.stringify(corpus, null, 2) + '\n'); await save();
  return { corpus, corpusRoot, institutionalRoot, save };
}
test('expanded recipe admits seven distinct descriptive course units and scoped diagnostic orientation', async t => {
  const f = await fixture(t); const result = await prepareCcdCorpus(f);
  assert.equal(result.documents.length, 10); assert.equal(result.derivatives.length, 10);
  assert.equal(new Set(result.derivatives.map(d => d.chunks[0]!.locator)).size, 10);
  assert.deepEqual(storageCounts('ccd_expanded_v1'), { items: 10, documents: 10, chunks: 10, perDocument: 1 });
  const course = result.derivatives.find(d => d.document_key === 'ccd-m02-doc-098')!.chunks[0]!;
  assert.match(course.content, /periodo no confirmado/); assert.match(course.content, /Fictional topic A/);
  assert.match(course.content, /Síntesis cotejada/); assert.doesNotMatch(course.content, /Validación del equipo;/);
});

test('guidance admits exactly two new scoped units and preserves all ten prior artifact bytes', async t => {
  const old = await prepareCcdCorpus(await fixture(t)); const next = await prepareCcdCorpus(await fixture(t, true));
  assert.equal(next.documents.length, 12);
  assert.deepEqual(storageCounts('ccd_guidance_v1'), { items: 12, documents: 12, chunks: 12, perDocument: 1 });
  for (const [name, bytes] of old.artifacts) assert.ok(bytes.equals(next.artifacts.get(name)!));
  assert.equal(new Set(next.derivatives.map(d => d.chunks[0]!.locator)).size, 12);
});
for (const [label, mutate] of [
  ['restricted source', (c: CcdCorpus) => { c.sources[10]!.id = 'DOC-112' as CcdSourceId; }],
  ['missing guidance', (c: CcdCorpus) => { c.units.pop(); }],
  ['wrong scenario', (c: CcdCorpus) => { c.units.at(-1)!.scenario_refs = ['R07']; }],
  ['missing transition source', (c: CcdCorpus) => { c.units.at(-1)!.references = c.units.at(-1)!.references.filter(r => r.source_id !== 'DOC-076'); }],
  ['false institutional approval', (c: CcdCorpus) => { c.validation.institutional_approval = true as false; }],
  ['wrong historical period', (c: CcdCorpus) => { c.units.at(-1)!.period = '202660'; }],
  ['missing package hash', (c: CcdCorpus) => { delete c.validation.review_package_sha256; }],
] as const) test(`guidance rejects ${label}`, async t => { const f = await fixture(t, true); mutate(f.corpus); await f.save(); await assert.rejects(prepareCcdCorpus(f)); });
for (const [label, mutate] of [
  ['duplicate course', (c: CcdCorpus) => { c.units[1] = c.units[0]!; }],
  ['missing syllabus', (c: CcdCorpus) => { c.sources.pop(); }],
  ['wrong course provenance', (c: CcdCorpus) => { c.units[0]!.references[0]!.source_id = 'DOC-099'; }],
  ['period inferred from lineamientos', (c: CcdCorpus) => { c.units[0]!.period = '202660'; }],
  ['false team review for new content', (c: CcdCorpus) => { c.units[0]!.editorial_status = 'team_validated_local_candidate'; }],
  ['missing topics', (c: CcdCorpus) => { delete c.units[0]!.topics; }],
  ['wrong C mapping', (c: CcdCorpus) => { c.units[0]!.c_units = ['C11']; }],
] as const) test(`expanded CCD rejects ${label}`, async t => { const f = await fixture(t); mutate(f.corpus); await f.save(); await assert.rejects(prepareCcdCorpus(f)); });

test('publication transition checks predecessor and inserts context in the same final transaction', async () => {
  for (const pointer of ['expected', 'changed']) {
    const calls: string[] = [];
    const lease = {
      async transaction<T>(work: () => Promise<T>) { calls.push('BEGIN'); try { const value = await work(); calls.push('COMMIT'); return value; } catch (e) { calls.push('ROLLBACK'); throw e; } },
      async query(sql: string) {
        calls.push(sql);
        const rows = sql.includes('SELECT current_release_id') ? [{ current_release_id: pointer }]
          : sql.includes('count(*)') ? [{ total: 10, processed: 10, ready: 10, valid: 10 }]
          : sql.includes('SELECT status') ? [{ status: sql.includes('ingestion_runs') ? 'running' : 'staging' }] : [{ id: 'fixture' }];
        return { rows, rowCount: 1 };
      },
    } as unknown as WriterLease;
    if (pointer === 'changed') {
      await assert.rejects(finalizeAndPublish(lease, 'new', 'run', 'ccd_expanded_v1', { expectedRelease: 'expected' }));
      assert.equal(calls.at(-1), 'ROLLBACK'); assert.equal(calls.some(s => s.includes('INSERT INTO')), false);
    } else {
      await finalizeAndPublish(lease, 'new', 'run', 'ccd_expanded_v1', { expectedRelease: 'expected' });
      assert.equal(calls.at(-1), 'COMMIT');
      assert.ok(calls.findIndex(s => s.includes('INSERT INTO banuchat.ccd_demo_contexts')) < calls.findIndex(s => s.includes('publish_release')));
    }
  }
});
