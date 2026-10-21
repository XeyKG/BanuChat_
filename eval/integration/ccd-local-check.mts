/** Explicit local operational checks, never part of the default unit suite. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { connectCcdLocal } from '../../backend/rag/src/ccd/local-runtime.js';
import { prepareCcdCorpus, ccdSnapshotFiles } from '../../backend/rag/src/ccd/prepare.js';
import { SafeReader } from '../../backend/rag/src/source/safe-reader.js';
import { sha256 } from '../../backend/rag/src/crypto/sha256.js';
import { captureCcdCode } from '../../backend/rag/src/ccd/ingest.js';
import { generateDocumentRagAnswer } from '../../backend/api/src/chat/document-rag.js';
import { getDocumentArtifact } from '../../backend/api/src/application/document-artifact.js';
import { OllamaQueryEmbeddingClient } from '../../backend/api/src/retrieval/ollama-query-embedding-client.js';
import { OllamaGeneratorClient } from '../../backend/api/src/generation/ollama-generator-client.js';
import { loadGeneratorRuntimeConfig } from '../../backend/api/src/generation/generator-client.js';
import type { GeneratorClient } from '../../backend/api/src/generation/generator-client.js';
import type { SqlQueryClient } from '../../backend/api/src/data/sql-client.js';
import type { RetrievedDocumentChunk } from '../../backend/api/src/application/document-retrieval.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const evidenceDirectory = path.join(root, 'data/ccd/evidence/increment-2');
const report: Record<string, unknown> = { started_at: new Date().toISOString() };
const checks: { name: string; passed: boolean }[] = [];
const answers: unknown[] = [];
try {
  const mode = process.argv[2];
  assert.ok(process.argv.length === 3 && (mode === 'validators' || mode === 'queries'));
  report.operation = mode;
  const { pool, identity } = await connectCcdLocal();
  report.identity = identity;
  try {
    assert.ok(process.env.CCD_INSTITUTIONAL_ROOT);
    const corpusRoot = path.join(root, 'data/ccd/local/m01-m12');
    const prepared = await prepareCcdCorpus({ corpusRoot, institutionalRoot: process.env.CCD_INSTITUTIONAL_ROOT });
    const reader = await SafeReader.create(corpusRoot);
    for (const [name, bytes] of ccdSnapshotFiles(prepared)) assert.ok(bytes.equals(await reader.read(name)));
    report.source_snapshot_sha256 = prepared.corpus_sha256;
    // All SQL negative tests roll back, on a single dedicated connection.
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const checkManifest = async (name: string, manifest: unknown, valid: boolean) => {
        await connection.query('SAVEPOINT manifest_case');
        let accepted = true;
        try { await connection.query('SELECT banuchat.validate_manifest($1::jsonb)', [JSON.stringify(manifest)]); }
        catch { accepted = false; }
        await connection.query('ROLLBACK TO SAVEPOINT manifest_case');
        checks.push({ name, passed: accepted === valid });
        assert.equal(accepted, valid, name);
      };
      await checkManifest('CCD accepted', prepared.manifest, true);
      const synthetic = JSON.parse((await (await SafeReader.create(path.join(root, 'data/synthetic'))).read('manifest.json')).toString('utf8'));
      await checkManifest('Frozen synthetic manifest accepted by preserved v1 validator', synthetic, true);
      for (const [name, mutate] of [
        ['unadmitted unit', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units[0]!.id = 'other' as 'ccd-m01'; }],
        ['wrong C mapping', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units[0]!.c_units = ['C44', 'C45']; }],
        ['false institutional approval', (m: typeof prepared.manifest) => { Object.assign(m.ccd_provenance.corpus.validation, { institutional_approval: true }); }],
        ['missing source', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.sources.pop(); }],
        ['missing provenance hash', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus_sha256 = ''; }],
        ['missing limits', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units[0]!.limits = []; }],
        ['unconfirmed period changed', (m: typeof prepared.manifest) => { Object.assign(m.ccd_provenance.corpus.units[0]!, { period: '202710' }); }],
        ['wrong review reference', (m: typeof prepared.manifest) => { m.ccd_provenance.corpus.units[0]!.references[1]!.locator = 'unknown'; }],
        ['artifact hash mismatch', (m: typeof prepared.manifest) => { m.files[0]!.sha256 = '0'.repeat(64); }],
        ['duplicate item', (m: typeof prepared.manifest) => { m.items[1] = m.items[0]!; }],
      ] as const) {
        const changed = structuredClone(prepared.manifest); mutate(changed);
        await checkManifest(`Reject ${name}`, changed, false);
      }
    } finally { await connection.query('ROLLBACK'); connection.release(); }
    report.sql_manifest_checks = checks;
    if (mode === 'queries') {
      const current = (await pool.query(`SELECT r.* FROM banuchat.dataset_releases r
        JOIN banuchat.datasets d ON d.current_release_id=r.id WHERE d.name='banuchat-ccd-local' AND r.status='ready'`)).rows[0];
      assert.ok(current); assert.deepEqual(current.manifest, prepared.manifest);
      const releaseId: string = current.id;
      const code = await captureCcdCode(root);
      // Query runner must use the same ingestion source files that were fingerprinted at load.
      assert.deepEqual(current.pipeline_config.executed_files_sha256, code.executed_files_sha256);
      report.release_id = releaseId;
      report.ingestion_code_provenance = code;
      const apiReader = await SafeReader.create(root);
      const names = ['eval/integration/ccd-local-check.mts', 'backend/api/package.json', 'backend/api/package-lock.json',
        'backend/api/src/chat/document-rag.ts', 'backend/api/src/chat/document-citations.ts',
        'backend/api/src/application/document-query-retrieval.ts', 'backend/api/src/application/document-retrieval.ts',
        'backend/api/src/application/document-artifact.ts', 'backend/api/src/generation/ollama-generator-client.ts',
        'backend/api/src/generation/generator-client.ts', 'backend/api/src/retrieval/ollama-query-embedding-client.ts'];
      report.query_files_sha256 = Object.fromEntries(await Promise.all(names.map(async name => [name, sha256(await apiReader.read(name))])));
      const stored = (await pool.query(`SELECT d.document_key,v.id AS document_version_id,v.version_label,
        v.source_path,v.source_sha256,v.content_sha256,c.id AS chunk_id,c.locator,c.content,
        c.content_sha256 AS chunk_sha256,public.vector_dims(c.embedding) AS dimensions,
        public.vector_norm(c.embedding)>0 AS nonzero,c.generation_run_id,c.embedding_generated_at
        FROM banuchat.documents d JOIN banuchat.document_versions v ON v.document_id=d.id
        JOIN banuchat.document_chunks c ON c.document_version_id=v.id WHERE v.dataset_release_id=$1 ORDER BY d.document_key`, [releaseId])).rows;
      assert.equal(stored.length, 2);
      for (const row of stored) {
        const artifact = prepared.artifacts.get(row.source_path);
        assert.ok(artifact); assert.equal(row.source_sha256, sha256(artifact));
        assert.equal(row.content, artifact.toString('utf8'));
        assert.equal(row.content_sha256, row.chunk_sha256);
        assert.equal(row.chunk_sha256, sha256(Buffer.from(row.content)));
        assert.equal(row.version_label, prepared.corpus.version);
        assert.equal(row.dimensions, 1024); assert.equal(row.nonzero, true);
        const served = await getDocumentArtifact(pool, { document_version_id: row.document_version_id }, { root: corpusRoot });
        assert.ok(served.bytes.equals(artifact));
      }
      report.documents = stored.map(({ content: _content, ...metadata }) => metadata);
      report.embedding_config = (await pool.query('SELECT * FROM banuchat.embedding_configs WHERE id=$1', [current.embedding_config_id])).rows[0];
      report.ingestion_runs = (await pool.query('SELECT id,status,attempt_no,trigger_type FROM banuchat.ingestion_runs WHERE dataset_release_id=$1', [releaseId])).rows;
      // Verify write guards without retaining any mutation.
      const guard = await pool.connect();
      try {
        await guard.query('BEGIN');
        let rejected = false;
        try { await guard.query("UPDATE banuchat.document_versions SET title='guard-test' WHERE id=$1", [stored[0]!.document_version_id]); }
        catch { rejected = true; }
        assert.equal(rejected, true); report.published_write_guard_rejected = rejected;
      } finally { await guard.query('ROLLBACK'); guard.release(); }
      const baseUrl = 'http://127.0.0.1:11434';
      const version = await (await fetch(`${baseUrl}/api/version`)).json() as { version: string };
      const tags = await (await fetch(`${baseUrl}/api/tags`)).json() as { models: { name: string; digest: string }[] };
      const generator = tags.models.find(model => model.name === 'qwen3:4b-instruct'); assert.ok(generator);
      const runtime = loadGeneratorRuntimeConfig({ BANUCHAT_GENERATOR_MODEL: generator.name,
        BANUCHAT_GENERATOR_MODEL_REVISION: generator.digest, BANUCHAT_GENERATOR_RUNTIME_VERSION: version.version });
      report.generator_config = runtime.generator;
      const actualGenerator = new OllamaGeneratorClient(baseUrl, 180_000);
      const embeddingClient = new OllamaQueryEmbeddingClient(baseUrl, 180_000);
      const questions = [
        { group: 'M01', query: '¿Cuáles son los tres pilares de Competencias Digitales descritos en los lineamientos de 202660?' },
        { group: 'M12', query: '¿Qué correo registra la documentación de 202660 para contactar al CCD?' },
        { group: 'negative', query: '¿Puedo repetir gratuitamente todas las pruebas que pierda?' },
      ];
      report.answers = answers;
      for (const question of questions) {
        let recovered: RetrievedDocumentChunk[] = [];
        const sql: SqlQueryClient = { async query<T>(text: string, values?: readonly unknown[]) {
          const result = await pool.query(text, values ? [...values] : []);
          if (result.rows[0]?.chunk_id) recovered = result.rows as RetrievedDocumentChunk[];
          return { rows: result.rows as T[] };
        } };
        const raw: unknown[] = [];
        const generatorClient: GeneratorClient = { async generate(input, config) {
          const result = await actualGenerator.generate(input, config); raw.push(result); return result;
        } };
        const started = performance.now();
        const answer = await generateDocumentRagAnswer({ sql, query_embedding_client: embeddingClient,
          generator_client: generatorClient, generator_config: runtime.generator, evidence_mode: 'ccd_local' },
        { release_id: releaseId, query: question.query });
        answers.push({ ...question, elapsed_ms: performance.now() - started, answer, raw_generation: raw,
          retrieval: recovered.map(({ content: _content, ...metadata }) => metadata) });
        if (question.group === 'negative') {
          assert.equal(answer.insufficient_evidence, true);
          assert.deepEqual(answer.citations, []); assert.deepEqual(answer.citation_records, []);
        } else {
          assert.equal(answer.insufficient_evidence, false);
          assert.ok(answer.citations.some(citation => citation.locator === `unit:${question.group}`));
        }
        console.log(JSON.stringify({ group: question.group, insufficient_evidence: answer.insufficient_evidence,
          citations: answer.citations.map(citation => citation.locator) }));
      }
    }
    report.passed = true;
  } finally { await pool.end(); }
} catch {
  report.passed = false;
  console.error('CCD_CHECK_FAILED; see local evidence for completed checks'); process.exitCode = 1;
} finally {
  report.finished_at = new Date().toISOString();
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(path.join(evidenceDirectory, `checks-${Date.now()}.json`), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, sql_checks: checks.length, queries_observed: answers.length }));
}
