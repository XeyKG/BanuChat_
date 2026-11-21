import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import type { RetrievedDocumentChunk } from '../../backend/api/src/application/document-retrieval.js';
import {
  generateCcdKnowledgeAnswer,
  type CcdKnowledgeDependencies,
  type CcdKnowledgeEvidenceMetadata,
} from '../../backend/api/src/chat/ccd-knowledge.js';

interface Document {
  id: string;
  document_id: string;
  chunk_id: string;
  document_key: string;
  title: string;
  content: string;
  locator: string;
  source_sha256: string;
  original_chunk_sha256: string;
  embedding_sha256: string;
  embedding: string;
  metadata: CcdKnowledgeEvidenceMetadata;
}
interface ApprovedSnapshot {
  release_id: string;
  manifest: { schema_version: string; embedding: unknown; documents: Document[] };
  documents: Document[];
}

const base = new URL('../../infra/local/', import.meta.url);
const input = JSON.parse(await readFile(new URL('approved-ccd.private.json', base), 'utf8')) as ApprovedSnapshot;
assert.equal(input.manifest.schema_version, 'banuchat-approved-ccd-1');
assert.ok(input.documents.length > 0);
const trusted = new Map(input.manifest.documents.map(document => [document.document_key, document]));
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const compact = (value: string) => value.replace(/\s+/gu, ' ').trim();
const chunks: RetrievedDocumentChunk[] = [];
for (const document of input.documents) {
  assert.match(document.document_key, /^[a-z0-9][a-z0-9_-]*$/u);
  const pinned = trusted.get(document.document_key);
  assert.ok(pinned, 'Document missing from the local approved manifest');
  assert.equal(document.source_sha256, pinned.source_sha256);
  assert.equal(document.chunk_id, pinned.chunk_id);
  assert.deepEqual(document.metadata, pinned.metadata);
  const bytes = await readFile(new URL('approved-ccd-markdown/' + document.document_key + '.md', base));
  assert.equal(sha256(bytes), pinned.source_sha256, 'Local artifact hash mismatch');
  assert.equal(sha256(document.content), pinned.original_chunk_sha256, 'Chunk hash mismatch');
  assert.equal(sha256(document.embedding), pinned.embedding_sha256, 'Stored vector hash mismatch');
  const vector: unknown = JSON.parse(document.embedding);
  assert.ok(Array.isArray(vector) && vector.length === 1024 && vector.every(Number.isFinite), 'Stored vector dimension or value invalid');
  const artifact = compact(bytes.toString('utf8'));
  assert.ok(document.metadata.presentation_units?.every(unit => artifact.includes(compact(unit.text))), 'Reviewed facts missing from verified Markdown');
  chunks.push({
    release_id: input.release_id,
    document_id: document.document_id,
    chunk_id: document.chunk_id,
    document_version_id: document.id,
    document_key: document.document_key,
    title: document.title,
    content: document.content,
    ordinal: 0,
    chunk_locator: document.locator,
    source_path: 'documents/' + document.document_key + '.md',
    source_locator: document.locator,
    source_sha256: document.source_sha256,
    page_start: null,
    page_end: null,
    cosine_distance: 0.2,
    cosine_similarity: 0.8,
  });
}
assert.equal(chunks.length, trusted.size);

const cases = [
  { label: 'Definición', question: '¿Qué son competencias digitales?', citations: 1, wording: /Son habilidades/u },
  { label: 'Etiqueta equivalente', question: '¿En qué consisten las habilidades digitales?', citations: 1, wording: /Son habilidades/u },
  { label: 'Ruta introductoria', question: '¿Qué es la ruta de competencias digitales?', citations: 2, wording: /pilares/u },
  { label: 'Nombre formal de la ruta', question: '¿En qué consiste la Ruta de Formación Transversal en Competencias Digitales?', citations: 2, wording: /pilares/u },
  { label: 'Límite de expedientes', question: '¿Qué docente está asignado a mi grupo?', citations: 0, wording: /No tengo acceso/u },
];

const results = [];
for (const scenario of cases) {
  let scopedReads = 0;
  let generatorCalls = 0;
  const deps: CcdKnowledgeDependencies = {
    evidence_mode: 'ccd_local',
    knowledge: { release_id: input.release_id, metadata: new Map([...trusted.values()].map(d => [d.document_key, d.metadata])) },
    sql: { async query<T>() { return { rows: [input.manifest.embedding as T] }; } },
    query_embedding_client: { async embedQuery() { return [1, ...Array<number>(1023).fill(0)]; } },
    retrieve_chunks: async () => { throw Error('Unexpected unscoped retrieval in this check'); },
    retrieve_scoped_chunks: async (_sql, request, keys) => {
      scopedReads++;
      return chunks.filter(chunk => keys.includes(chunk.document_key)).slice(0, request.top_k);
    },
    generator_client: { async generate() { generatorCalls++; throw Error('This check must not contact Ollama'); } },
    generator_config: {
      provider: 'ollama', model: 'qwen3:4b-instruct', model_revision: 'a'.repeat(64), runtime_version: '0.35.0',
      recipe: { think: false, stream: false, keep_alive: '5m', options: { temperature: 0, num_predict: 256 } },
    },
  };
  const answer = await generateCcdKnowledgeAnswer(deps, { release_id: input.release_id, query: scenario.question });
  assert.match(answer.content, scenario.wording);
  assert.equal(answer.citations.length, scenario.citations);
  assert.equal(answer.insufficient_evidence, scenario.citations === 0);
  assert.equal(scopedReads, scenario.citations > 0 ? 1 : 0);
  assert.equal(generatorCalls, 0);
  assert.ok(answer.citation_records.every(citation => chunks.some(chunk => chunk.chunk_id === citation.chunk_id)));
  results.push({ case: scenario.label, citations: answer.citations.length, scoped_reads: scopedReads, generator_calls: generatorCalls });
}
console.log(JSON.stringify({ files_verified: chunks.length, cases: results }, null, 2));
