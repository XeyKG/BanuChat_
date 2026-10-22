import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { sha256 } from '../crypto/sha256.js';
import { requireValid, safeError } from '../errors.js';
import { parseStrictJson } from '../preflight/json.js';
import { SafeReader } from '../source/safe-reader.js';
import type { Chunk, DocumentDerivatives, DocumentRecord } from '../types.js';

export type CcdSourceId = 'DOC-110' | 'BCH01-CIERRE' | 'DOC-098' | 'DOC-099' | 'DOC-100' | 'DOC-101' | 'DOC-102' | 'DOC-103' | 'DOC-104' | 'DOC-116' | 'DOC-076';
export interface CcdSource { id: CcdSourceId; path: string; sha256: string }
export interface CcdReference { source_id: CcdSource['id']; locator: string }
export interface CcdUnit {
  id: string; group: 'M01' | 'M12' | 'M02' | 'TEST_ORIENTATION' | 'U03' | 'U04'; c_units: string[];
  title: string; retrieval_mode: 'chunked'; period: '202660' | 'Edición entregada; periodo no confirmado' | 'Transición 202560–202610; actualidad no confirmada'; population: string;
  applicability_status: 'current_applicability_unconfirmed';
  editorial_status: 'team_validated_local_candidate' | 'source_checked_local_candidate'; content: string;
  limits: string[]; references: CcdReference[]; topics?: string[]; scenario_refs?: string[];
}
export interface CcdCorpus {
  schema_version: 'ccd-1.0.0' | 'ccd-1.1.0' | 'ccd-1.2.0'; dataset_key: 'banuchat-ccd-local'; version: string;
  synthetic: false; use_scope: 'local_development_only';
  validation: { status: 'team_validated' | 'source_checked_local'; institutional_approval: false;
    authorization_ref: 'BCH-03/incremento-1' | 'BCH-03/incremento-4' | 'BCH-03/incremento-5'; note: string; review_package_sha256?: string };
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
    dataset_key: 'banuchat-ccd-local'; manifest_version: string; schema_version: CcdCorpus['schema_version'];
    synthetic: false; corpus_kind: 'ccd_local'; timezone: 'America/Bogota';
    files: { path: string; kind: 'document_artifact'; sha256: string }[];
    items: { kind: 'document'; key: string; path: string; locator: 'document'; sha256: string; retrieval_mode: 'chunked' }[];
    ccd_provenance: { corpus_sha256: string; schema_sha256: string; corpus: CcdCorpus };
  };
  pipeline: { pipeline_version: 'ccd-local-unit-v1' | 'ccd-local-unit-v1.1' | 'ccd-local-unit-v1.2'; chunking: 'one_scoped_unit';
    synthetic_banner: 'not_applicable'; schema_sha256: string };
}

const schemaRoot = fileURLToPath(new URL('../../../../data/ccd/schemas/', import.meta.url));
const expected = {
  M01: { id: 'ccd-m01', c: ['C04', 'C07'], cell: '02_Respuestas_6!D2' },
  M12: { id: 'ccd-m12', c: ['C44', 'C45'], cell: '02_Respuestas_6!D7' },
} as const;

export function ccdUnitPolicy(unit: CcdUnit) {
  if (unit.group === 'U03') return { id: 'ccd-u03', c: ['C53'], source: 'DOC-110', cell: '01_Admision_M01_M12!F5', period: '202660' };
  if (unit.group === 'U04') return { id: 'ccd-u04', c: ['C09', 'C10'], source: 'DOC-116', cell: '01_Admision_M01_M12!F11', period: 'Transición 202560–202610; actualidad no confirmada' };
  if (unit.group === 'M01' || unit.group === 'M12') return { ...expected[unit.group], source: 'DOC-110', period: '202660' };
  if (unit.group === 'TEST_ORIENTATION') return { id: 'ccd-tests-overview', c: ['C11'], source: 'DOC-110',
    cell: '07_Bloqueos!A3:H3', period: '202660' };
  const source = /^ccd-m02-(doc-09[89]|doc-10[0-4])$/.exec(unit.id)?.[1]?.toUpperCase();
  requireValid(source, 'identity');
  return { id: unit.id, c: ['C05'], source, cell: '02_Respuestas_6!E3', period: 'Edición entregada; periodo no confirmado' };
}

/** Separate CCD boundary: no synthetic flag coercion, Git revision or v1 profile. */
export async function prepareCcdCorpus(options: {
  corpusRoot: string; institutionalRoot: string;
}): Promise<PreparedCcdCorpus> {
  try {
    const local = await SafeReader.create(options.corpusRoot);
    const external = await SafeReader.create(options.institutionalRoot);
    const corpusBytes = await local.read('corpus.json');
    const parsed = parseStrictJson(corpusBytes);
    requireValid(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'schema');
    const guidance = parsed['schema_version'] === 'ccd-1.2.0';
    const expanded = guidance || parsed['schema_version'] === 'ccd-1.1.0';
    const schemaBytes = await (await SafeReader.create(schemaRoot)).read(guidance ? 'corpus-1.2.schema.json' : expanded ? 'corpus-1.1.schema.json' : 'corpus.schema.json');
    const schema = parseStrictJson(schemaBytes);
    requireValid(schema && typeof schema === 'object' && !Array.isArray(schema), 'schema');
    const validate = new Ajv2020({ strict: true, allErrors: false }).compile<CcdCorpus>(schema);
    requireValid(validate(parsed), 'schema');
    const corpus = parsed;
    const sources = new Map(corpus.sources.map(source => [source.id, source]));
    const sourceIds = expanded ? ['DOC-110', 'BCH01-CIERRE', 'DOC-098', 'DOC-099', 'DOC-100', 'DOC-101', 'DOC-102', 'DOC-103', 'DOC-104', ...(guidance ? ['DOC-116', 'DOC-076'] : [])] : ['DOC-110', 'BCH01-CIERRE'];
    requireValid(sources.size === sourceIds.length && sourceIds.every(id => sources.has(id as CcdSourceId)), 'identity');
    requireValid(new Set(corpus.sources.map(source => source.path)).size === sourceIds.length, 'identity');
    for (const source of corpus.sources) {
      requireValid(sha256(await external.read(source.path)) === source.sha256, 'hash');
    }
    const unitIds = new Set<string>();
    const artifacts = new Map<string, Buffer>();
    const documents: DocumentRecord[] = [];
    const derivatives: DocumentDerivatives[] = [];
    for (const unit of [...corpus.units].sort((a, b) => a.id.localeCompare(b.id))) {
      const mapping = ccdUnitPolicy(unit);
      requireValid(!unitIds.has(unit.id) && unit.id === mapping.id && unit.period === mapping.period
        && [...unit.c_units].sort().join(',') === mapping.c.join(','), 'identity');
      unitIds.add(unit.id);
      requireValid(unit.references.some(ref => ref.source_id === mapping.source)
        && unit.references.some(ref => ref.source_id === 'BCH01-CIERRE' && ref.locator === mapping.cell), 'relation');
      if (unit.group === 'U04') requireValid(unit.references.some(ref => ref.source_id === 'DOC-076'), 'relation');
      if (unit.group === 'U03' || unit.group === 'U04') {
        requireValid(JSON.stringify(unit.scenario_refs) === JSON.stringify(unit.group === 'U03' ? ['R07'] : ['R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18']), 'relation');
      }
      requireValid(new Set(unit.references.map(ref => `${ref.source_id}:${ref.locator}`)).size === unit.references.length, 'identity');
      const provenance = unit.references.map(ref => {
        const source = sources.get(ref.source_id);
        requireValid(source, 'relation');
        return `- ${ref.source_id}; ${ref.locator}; SHA-256 ${source.sha256}`;
      }).join('\n');
      // Scope and editorial warnings travel WITH the evidence, including its chunk.
      const body = unit.content + (unit.topics ? `\n\nTemáticas respaldadas: ${unit.topics.join('; ')}.` : '');
      const editorial = unit.editorial_status === 'team_validated_local_candidate'
        ? 'Validación del equipo; sin aval institucional formal. Solo pruebas locales.'
        : 'Síntesis cotejada contra la fuente para pruebas locales; sin aval institucional formal.';
      const content = `# ${unit.title}\n\n${body}\n\nPeriodo de la fuente: ${unit.period}.\nPoblación: ${unit.population}\nAplicabilidad actual: no confirmada.\n${editorial}\n\nLímites:\n${unit.limits.map(limit => `- ${limit}`).join('\n')}\n\nProcedencia (${unit.group}; ${unit.c_units.join(', ')}):\n${provenance}\n`;
      requireValid([...content].length <= 6000, 'markdown');
      const bytes = Buffer.from(content, 'utf8');
      const digest = sha256(bytes);
      const artifactPath = `documents/artifacts/${unit.id}.md`;
      artifacts.set(artifactPath, bytes);
      documents.push({ document_key: unit.id, title: unit.title, retrieval_mode: 'chunked',
        mime_type: 'text/markdown', version_label: corpus.version, artifact_path: artifactPath });
      const chunk: Chunk = { ordinal: 0, locator: `unit:${unit.group}${unit.group === 'M02' ? ':' + mapping.source : ''}`, content,
        content_sha256: digest, page_start: null, page_end: null };
      derivatives.push({ document_key: unit.id, retrieval_mode: 'chunked',
        source_sha256: digest, content_sha256: digest, chunks: [chunk] });
    }
    requireValid(unitIds.size === (guidance ? 12 : expanded ? 10 : 2), 'identity');
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
    const pipeline: PreparedCcdCorpus['pipeline'] = { pipeline_version: guidance ? 'ccd-local-unit-v1.2' : expanded ? 'ccd-local-unit-v1.1' : 'ccd-local-unit-v1',
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
