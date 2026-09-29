import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { invariant } from './db/errors.js';
import { SYNTHETIC_BANNER } from './documents/markdown.js';
import { schemaNames } from './preflight/schemas.js';
import type { Json } from './types.js';

const require = createRequire(import.meta.url);
function version(name: string): string {
  const metadata: unknown = require(`${name}/package.json`);
  invariant(metadata && typeof metadata === 'object' && 'version' in metadata && typeof metadata.version === 'string');
  return metadata.version;
}
/** Only runtime revision varies. No caller-defined recipe/options/URLs/timestamps. */
export function buildPipelineConfigV1(implementationRevision: string): { [key: string]: Json } {
  invariant(typeof implementationRevision === 'string' && [40, 64].includes(implementationRevision.length)
    && /^[0-9a-f]+$/.test(implementationRevision));
  return {
    pipeline_version: 'synthetic-v1-section-v1', implementation_revision: implementationRevision,
    markdown_extraction: { version: 1, format: 'markdown', h1: 1, h2_per_document: 6 },
    synthetic_banner: { operation: 'remove_exact_prefix', value: SYNTHETIC_BANNER },
    chunking: { method: 'h2_sections', version: 1, ordinal_base: 0, overlap: 0, h1_context: true },
    locator: 'section:<ordinal>:<exact_h2_text_without_marker>', full_document: 'artifact_only',
    encoding: { charset: 'UTF-8', bom: false, line_endings: 'LF', final_lf: true },
    normalization: { unicode: 'none', interior_spaces: 'unchanged', lowercase: false, section_final_lf: 1 },
    schema_validation: { dialect: '2020-12', schemas: [...schemaNames], ajv: version('ajv'),
      ajv_formats: version('ajv-formats'), jsonc_parser: version('jsonc-parser'), formats: true },
  };
}
export function validatePipelineConfigV1(value: unknown): void {
  invariant(value && typeof value === 'object' && 'implementation_revision' in value
    && typeof value.implementation_revision === 'string');
  invariant(isDeepStrictEqual(value, buildPipelineConfigV1(value.implementation_revision)));
}
