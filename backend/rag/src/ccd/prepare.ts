import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { sha256 } from '../crypto/sha256.js';
import { requireValid, safeError } from '../errors.js';
import { parseStrictJson } from '../preflight/json.js';
import { SafeReader } from '../source/safe-reader.js';
import type { Chunk, DocumentDerivatives, DocumentRecord } from '../types.js';

export interface CcdSource { id: 'DOC-110' | 'BCH01-CIERRE'; path: string; sha256: string }
export interface CcdReference { source_id: CcdSource['id']; locator: string }
export interface CcdUnit {
  id: 'ccd-m01' | 'ccd-m12'; group: 'M01' | 'M12'; c_units: string[];
  title: string; retrieval_mode: 'chunked'; period: '202660'; population: string;
  applicability_status: 'current_applicability_unconfirmed';
  editorial_status: 'team_validated_local_candidate'; content: string;
  limits: string[]; references: CcdReference[];
}
export interface CcdCorpus {
  schema_version: 'ccd-1.0.0'; dataset_key: 'banuchat-ccd-local'; version: string;
  synthetic: false; use_scope: 'local_development_only';
  validation: { status: 'team_validated'; institutional_approval: false;
    authorization_ref: 'BCH-03/incremento-1'; note: string };
  sources: CcdSource[]; units: CcdUnit[];
}
export interface PreparedCcdCorpus {
  corpus: CcdCorpus;
  corpus_sha256: string;
  schema_sha256: string;
  documents: DocumentRecord[];
  derivatives: DocumentDerivatives[];
  /** Only sanitized derived bytes. Never contains original DOCX/XLSX bytes. */
  artifacts: ReadonlyMap<string, Buffer>;
  manifest: {
    dataset_key: 'banuchat-ccd-local'; manifest_version: string; schema_version: 'ccd-1.0.0';
    synthetic: false; corpus_kind: 'ccd_local'; timezone: 'America/Bogota';
    files: { path: string; kind: 'document_artifact'; sha256: string }[];
    items: { kind: 'document'; key: string; path: string; locator: 'document'; sha256: string; retrieval_mode: 'chunked' }[];
    ccd_provenance: { corpus_sha256: string; schema_sha256: string; corpus: CcdCorpus };
  };
  pipeline: { pipeline_version: 'ccd-local-unit-v1'; chunking: 'one_scoped_unit';
    synthetic_banner: 'not_applicable'; schema_sha256: string };
}

const schemaRoot = fileURLToPath(new URL('../../../../data/ccd/schemas/', import.meta.url));
const expected = {
  M01: { id: 'ccd-m01', c: ['C04', 'C07'], cell: '02_Respuestas_6!D2' },
  M12: { id: 'ccd-m12', c: ['C44', 'C45'], cell: '02_Respuestas_6!D7' },
} as const;

/** Separate CCD boundary: no synthetic flag coercion, Git revision or v1 profile. */
export async function prepareCcdCorpus(options: {
  corpusRoot: string; institutionalRoot: string;
}): Promise<PreparedCcdCorpus> {
  try {
    const local = await SafeReader.create(options.corpusRoot);
    const external = await SafeReader.create(options.institutionalRoot);
    const schemaBytes = await (await SafeReader.create(schemaRoot)).read('corpus.schema.json');
    const schema = parseStrictJson(schemaBytes);
    requireValid(schema && typeof schema === 'object' && !Array.isArray(schema), 'schema');
    const validate = new Ajv2020({ strict: true, allErrors: false }).compile<CcdCorpus>(schema);
    const corpusBytes = await local.read('corpus.json');
    const parsed = parseStrictJson(corpusBytes);
    requireValid(validate(parsed), 'schema');
    const corpus = parsed;
    const sources = new Map(corpus.sources.map(source => [source.id, source]));
    requireValid(sources.size === 2 && sources.has('DOC-110') && sources.has('BCH01-CIERRE'), 'identity');
    requireValid(new Set(corpus.sources.map(source => source.path)).size === 2, 'identity');
    for (const source of corpus.sources) {
      requireValid(sha256(await external.read(source.path)) === source.sha256, 'hash');
    }
    const groups = new Set<string>();
    const artifacts = new Map<string, Buffer>();
    const documents: DocumentRecord[] = [];
    const derivatives: DocumentDerivatives[] = [];
    for (const unit of [...corpus.units].sort((a, b) => a.id.localeCompare(b.id))) {
      const mapping = expected[unit.group];
      requireValid(!groups.has(unit.group) && unit.id === mapping.id
        && [...unit.c_units].sort().join(',') === mapping.c.join(','), 'identity');
      groups.add(unit.group);
      requireValid(unit.references.some(ref => ref.source_id === 'DOC-110')
        && unit.references.some(ref => ref.source_id === 'BCH01-CIERRE' && ref.locator === mapping.cell), 'relation');
      requireValid(new Set(unit.references.map(ref => `${ref.source_id}:${ref.locator}`)).size === unit.references.length, 'identity');
      const provenance = unit.references.map(ref => {
        const source = sources.get(ref.source_id);
        requireValid(source, 'relation');
        return `- ${ref.source_id}; ${ref.locator}; SHA-256 ${source.sha256}`;
      }).join('\n');
      // Scope and editorial warnings travel WITH the evidence, including its chunk.
      const content = `# ${unit.title}\n\n${unit.content}\n\nPeriodo de la fuente: ${unit.period}.\nPoblación: ${unit.population}\nAplicabilidad actual: no confirmada.\nValidación del equipo; sin aval institucional formal. Solo pruebas locales.\n\nLímites:\n${unit.limits.map(limit => `- ${limit}`).join('\n')}\n\nProcedencia (${unit.group}; ${unit.c_units.join(', ')}):\n${provenance}\n`;
      requireValid([...content].length <= 6000, 'markdown');
      const bytes = Buffer.from(content, 'utf8');
      const digest = sha256(bytes);
      const artifactPath = `documents/artifacts/${unit.id}.md`;
      artifacts.set(artifactPath, bytes);
      documents.push({ document_key: unit.id, title: unit.title, retrieval_mode: 'chunked',
        mime_type: 'text/markdown', version_label: corpus.version, artifact_path: artifactPath });
      const chunk: Chunk = { ordinal: 0, locator: `unit:${unit.group}`, content,
        content_sha256: digest, page_start: null, page_end: null };
      derivatives.push({ document_key: unit.id, retrieval_mode: 'chunked',
        source_sha256: digest, content_sha256: digest, chunks: [chunk] });
    }
    const corpusSha256 = sha256(corpusBytes);
    const schemaSha256 = sha256(schemaBytes);
    const manifest: PreparedCcdCorpus['manifest'] = {
      dataset_key: corpus.dataset_key, manifest_version: corpus.version,
      schema_version: corpus.schema_version, synthetic: false, corpus_kind: 'ccd_local', timezone: 'America/Bogota',
      files: [...artifacts].map(([artifactPath, bytes]) => ({ path: artifactPath, kind: 'document_artifact', sha256: sha256(bytes) })),
      items: documents.map(document => ({ kind: 'document', key: document.document_key,
        path: document.artifact_path, locator: 'document', sha256: sha256(artifacts.get(document.artifact_path)!), retrieval_mode: 'chunked' })),
      ccd_provenance: { corpus_sha256: corpusSha256, schema_sha256: schemaSha256, corpus },
    };
    const pipeline: PreparedCcdCorpus['pipeline'] = { pipeline_version: 'ccd-local-unit-v1',
      chunking: 'one_scoped_unit', synthetic_banner: 'not_applicable', schema_sha256: schemaSha256 };
    // Verify sources again after derivation. External source must stay read-only.
    for (const source of corpus.sources) requireValid(sha256(await external.read(source.path)) === source.sha256, 'hash');
    requireValid(sha256(await local.read('corpus.json')) === corpusSha256, 'hash');
    return { corpus, corpus_sha256: corpusSha256, schema_sha256: schemaSha256,
      documents, derivatives, artifacts, manifest, pipeline };
  } catch (error) { throw safeError(error); }
}

/** Files for a local snapshot, suitable for checksums and later artifact serving. */
export function ccdSnapshotFiles(prepared: PreparedCcdCorpus): ReadonlyMap<string, Buffer> {
  return new Map([...prepared.artifacts, ['manifest.json', Buffer.from(JSON.stringify(prepared.manifest, null, 2) + '\n')],
    ['pipeline.json', Buffer.from(JSON.stringify(prepared.pipeline, null, 2) + '\n')]]);
}
