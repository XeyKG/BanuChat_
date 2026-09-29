import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import ts from 'typescript';
import { validateSourceRevision, releaseOutcome } from '../src/db/releases.js';
import { databaseError, DatabaseError } from '../src/db/errors.js';
import { provenance } from '../src/db/runs.js';
import { validateStageInput } from '../src/db/stage.js';
import { validateSyntheticContent, buildDocumentDerivatives, buildPipelineConfigV1 } from '../src/index.js';
import { realSource } from './helpers.js';

test('DB source revision accepts only full lowercase SHAs', () => {
  for (const good of ['a'.repeat(40), 'b'.repeat(64)]) validateSourceRevision(good);
  for (const bad of ['HEAD', 'abc123', 'A'.repeat(40), 'a'.repeat(41), 'a'.repeat(40) + '\n']) {
    assert.throws(() => validateSourceRevision(bad), DatabaseError);
  }
});
test('DB errors are safely classified and serialization excludes native cause', () => {
  for (const [code, expected] of [['ECONNREFUSED', 'DATABASE_UNAVAILABLE'], ['08006', 'DATABASE_UNAVAILABLE'],
    ['40P01', 'DATABASE_CONFLICT'], ['40001', 'DATABASE_CONFLICT'], ['23505', 'DATABASE_INVARIANT'], ['P0001', 'DATABASE_INVARIANT']]) {
    const error = databaseError({ code, message: 'secret SQL/password', connectionString: 'secret' });
    assert.deepEqual(error.toJSON(), { code: expected });
    assert.equal(JSON.stringify(error).includes('secret'), false);
  }
});
test('manifest provenance maps path/locator/sha without mutation', () => {
  const item = Object.freeze({ kind: 'course' as const, key: 'course-001', path: 'courses/courses.json', locator: '/courses/0', sha256: 'a'.repeat(64) });
  assert.deepEqual(provenance(item), [item.path, item.locator, item.sha256]);
});
test('release states select no-op and failed_requires_retry without reopening', () => {
  assert.equal(releaseOutcome('staging', false), 'staging');
  assert.equal(releaseOutcome('failed', false), 'failed_requires_retry');
  assert.equal(releaseOutcome('ready', true), 'already_current');
  assert.equal(releaseOutcome('ready', false), 'already_ready_not_current');
});
test('stage input boundary preserves all bytes/catalogs/derivatives', async () => {
  const validated = await validateSyntheticContent({ syntheticRoot: realSource });
  const derivatives = buildDocumentDerivatives(validated);
  const before = structuredClone({ manifest: validated.manifest, catalogs: validated.catalogs, bytes: validated.bytes, derivatives });
  validateStageInput({ datasetId: 1, sourceGitRevision: 'a'.repeat(40), embeddingConfigId: '00000000-0000-0000-0000-000000000001',
    pipelineConfig: buildPipelineConfigV1('b'.repeat(40)), workflowRef: 'TEST_ONLY', validated, derivatives });
  assert.deepEqual(structuredClone({ manifest: validated.manifest, catalogs: validated.catalogs, bytes: validated.bytes, derivatives }), before);
});
test('DB SQL text never interpolates data into identifiers', async () => {
  const folder = new URL('../src/db/', import.meta.url);
  for (const file of await readdir(folder)) {
    const code = await readFile(new URL(file, folder), 'utf8');
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.ES2022, true);
    const visit = (node: ts.Node): void => {
      // Logical record keys may be composed; SQL text may not be interpolated.
      if (ts.isTemplateExpression(node)) assert.doesNotMatch(node.getText(source), /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i, file);
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'query') {
        const sql = node.arguments[0];
        assert.ok(sql && (ts.isStringLiteralLike(sql)
          || (file === 'writer-lock.ts' && ts.isIdentifier(sql) && sql.text === 'sql')
          || (file === 'structured.ts' && ts.isElementAccessExpression(sql)
            && sql.expression.getText(source) === 'STRUCTURED_SQL')), `Nonliteral SQL in ${file}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
});
