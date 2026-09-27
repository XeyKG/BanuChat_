import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import type { FormatOptions } from 'ajv-formats';
import { PreflightError, requireValid } from '../errors.js';
import type { Json } from '../types.js';
import type { SafeReader } from '../source/safe-reader.js';
import { parseStrictJson } from './json.js';

export const schemaNames = ['manifest', 'documents', 'courses', 'calendar-events',
  'announcements', 'profiles', 'profile-progress'] as const;
export type SchemaName = typeof schemaNames[number];
export const schemaPath = (name: SchemaName): string => `schemas/${name}.schema.json`;
const schemaId = (name: SchemaName): string => `urn:banuchat:synthetic:v1:${name}`;

export async function loadSchemas(reader: SafeReader, snapshot: Map<string, Buffer>) {
  // Frozen schemas use types inherited from outer subschemas. Disable only this
  // Ajv lint rule, not JSON Schema validation. No coercion/defaults/removal enabled.
  const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false,
    allErrors: false, validateFormats: true, multipleOfPrecision: 10 });
  // CJS plugin's runtime default is callable; its declaration has NodeNext interop ambiguity.
  const addFormats = addFormatsModule as unknown as (instance: Ajv2020, options?: FormatOptions) => Ajv2020;
  addFormats(ajv);
  const ids = new Set<string>(schemaNames.map(schemaId));
  const checkReferences = (value: Json): void => {
    if (value !== null && typeof value === 'object') {
      if (!Array.isArray(value)) {
        for (const keyword of ['$ref', '$dynamicRef']) {
          const ref = value[keyword];
          if (ref !== undefined) requireValid(typeof ref === 'string'
            && (ref.startsWith('#') || ids.has(ref.split('#')[0]!)), 'schema');
        }
      }
      for (const child of Object.values(value)) checkReferences(child);
    }
  };
  try {
    for (const name of schemaNames) {
      const logical = schemaPath(name);
      const bytes = await reader.read(logical);
      snapshot.set(logical, bytes);
      const schema = parseStrictJson(bytes, logical);
      requireValid(schema !== null && typeof schema === 'object' && !Array.isArray(schema)
        && schema['$id'] === schemaId(name)
        && schema['$schema'] === 'https://json-schema.org/draft/2020-12/schema', 'schema', logical);
      checkReferences(schema);
      requireValid(ajv.validateSchema(schema), 'schema', logical);
      ajv.addSchema(schema);
    }
    // Compile all seven even if an invalid manifest would stop validation first.
    for (const name of schemaNames) requireValid(ajv.getSchema(schemaId(name)), 'schema', schemaPath(name));
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    throw new PreflightError('VALIDATION_FAILED', 'schema');
  }
  return function validate<T>(name: SchemaName, value: Json, logical: string): T {
    const validator = ajv.getSchema(schemaId(name));
    requireValid(validator && validator(value), 'schema', logical);
    // Trust is established here by the matching frozen local JSON Schema, not a parser cast.
    return value as unknown as T;
  };
}
