import { sha256 } from '../crypto/sha256.js';
import { requireValid, safeError } from '../errors.js';
import { SafeReader } from '../source/safe-reader.js';
import type { Catalogs, ContentProfile, ItemKind, Json, Manifest, ValidatedContent } from '../types.js';
import { validateInterval } from './dates.js';
import { decodeUtf8, parseStrictJson } from './json.js';
import { resolveJsonPointer } from './pointer.js';
import { loadSchemas, schemaNames, schemaPath } from './schemas.js';

const catalogs = [
  ['documents/documents.json', 'documents', 'documents', 'document', 'document_key'],
  ['courses/courses.json', 'courses', 'courses', 'course', 'course_key'],
  ['calendars/events.json', 'calendar-events', 'events', 'calendar_event', 'event_key'],
  ['announcements/announcements.json', 'announcements', 'announcements', 'announcement', 'announcement_key'],
  ['profiles/profiles.json', 'profiles', 'profiles', 'profile', 'profile_key'],
  ['profiles/progress.json', 'profile-progress', 'progress', 'profile_course', 'profile_key'],
] as const;

const controls = new Set(['README.md', 'HUMAN_REVIEW.md', 'manifest.json', '.gitattributes', '.gitignore',
  ...['announcements', 'calendars', 'courses', 'documents', 'profiles', 'schemas'].map(dir => `${dir}/README.md`),
  ...schemaNames.map(schemaPath)]);

export async function validateSyntheticContent(options: {
  syntheticRoot: string; profile?: ContentProfile;
}): Promise<ValidatedContent> {
  try { return await validate(options); }
  catch (error) { throw safeError(error); }
}

async function validate({ syntheticRoot, profile }: { syntheticRoot: string; profile?: ContentProfile }): Promise<ValidatedContent> {
  const reader = await SafeReader.create(syntheticRoot);
  const bytes = new Map<string, Buffer>();
  const validateSchema = await loadSchemas(reader, bytes);
  const manifestBytes = await reader.read('manifest.json');
  bytes.set('manifest.json', manifestBytes);
  const manifest = validateSchema<Manifest>('manifest', parseStrictJson(manifestBytes, 'manifest.json'), 'manifest.json');
  const files = new Map(manifest.files.map(file => [file.path, file]));
  requireValid(files.size === manifest.files.length, 'inventory', 'manifest.json');
  const physical = (await reader.listFiles()).filter(file => !controls.has(file));
  requireValid(physical.length === files.size && physical.every(file => files.has(file)), 'inventory');
  for (const file of manifest.files) {
    const raw = await reader.read(file.path);
    requireValid(sha256(raw) === file.sha256, 'hash', file.path);
    decodeUtf8(raw, file.path);
    bytes.set(file.path, raw);
  }

  const envelopes = new Map<string, Json>();
  const rowSets = new Map<ItemKind, Map<string, { row: Json; locator: string; path: string }>>();
  const combined: Record<string, Json> = {};
  for (const [path, schema, field, kind, keyField] of catalogs) {
    const raw = bytes.get(path);
    requireValid(raw, 'inventory', path);
    const envelope = validateSchema<Record<string, Json>>(schema, parseStrictJson(raw, path), path);
    const rows = envelope[field];
    requireValid(Array.isArray(rows), 'schema', path);
    envelopes.set(path, envelope);
    combined[field] = rows;
    const identities = new Map<string, { row: Json; locator: string; path: string }>();
    for (const [index, row] of rows.entries()) {
      requireValid(row && typeof row === 'object' && !Array.isArray(row), 'identity', path);
      const key = kind === 'profile_course' ? `${row['profile_key']}/${row['course_key']}` : row[keyField];
      requireValid(typeof key === 'string' && !identities.has(key), 'identity', path);
      identities.set(key, { row, locator: `/${field}/${index}`, path });
    }
    rowSets.set(kind, identities);
  }
  const data = combined as unknown as Catalogs;
  const seen = new Set<string>();
  const artifactPaths = new Set<string>();
  const kinds: Record<ItemKind, number> = { document: 0, course: 0, calendar_event: 0, announcement: 0, profile: 0, profile_course: 0 };
  for (const item of manifest.items) {
    const id = `${item.kind}:${item.key}`;
    requireValid(!seen.has(id), 'identity', 'manifest.json');
    seen.add(id);
    kinds[item.kind]++;
    const row = rowSets.get(item.kind)?.get(item.key);
    requireValid(row, 'identity', item.path);
    requireValid(files.get(item.path)?.sha256 === item.sha256, 'hash', item.path);
    if (item.kind === 'document') {
      const doc = data.documents.find(d => d.document_key === item.key);
      requireValid(doc && doc.artifact_path === item.path && doc.retrieval_mode === item.retrieval_mode
        && item.locator === 'document' && !artifactPaths.has(item.path)
        && files.get(item.path)?.kind === 'document_artifact', 'identity', item.path);
      artifactPaths.add(item.path);
      // Metadata has a single authority (catalog); only mode/path/key are repeated in manifest.
      // Verify artifact title without extracting or chunking full_document.
      const text = decodeUtf8(bytes.get(item.path)!, item.path);
      const headings = text.split('\n').filter(line => line.startsWith('# '));
      requireValid(headings.length === 1 && headings[0] === `# ${doc.title}`, 'identity', item.path);
    } else {
      const envelope = envelopes.get(item.path);
      requireValid(envelope !== undefined && row.path === item.path, 'identity', item.path);
      const pointed = resolveJsonPointer(envelope, item.locator);
      requireValid(pointed === row.row && row.locator === item.locator, 'identity', item.path);
    }
  }
  requireValid([...rowSets.values()].reduce((n, rows) => n + rows.size, 0) === seen.size, 'identity');
  requireValid(manifest.files.filter(file => file.kind === 'document_artifact').length === artifactPaths.size, 'inventory');
  const courseKeys = new Set(data.courses.map(row => row.course_key));
  const announcementKeys = new Set(data.announcements.map(row => row.announcement_key));
  const profileKeys = new Set(data.profiles.map(row => row.profile_key));
  for (const event of data.events) {
    requireValid(event.course_key === null || courseKeys.has(event.course_key), 'relation', 'calendars/events.json');
    requireValid(event.announcement_key === null || announcementKeys.has(event.announcement_key), 'relation', 'calendars/events.json');
    validateInterval(event.starts_at, event.ends_at);
  }
  for (const announcement of data.announcements) validateInterval(announcement.valid_from, announcement.valid_until);
  for (const progress of data.progress) {
    requireValid(profileKeys.has(progress.profile_key) && courseKeys.has(progress.course_key), 'relation', 'profiles/progress.json');
    // Decimal precision is checked without changing/rounding the original number.
    requireValid(Number.isInteger(progress.progress_percent) || /^\d+\.\d{1,2}$/.test(String(progress.progress_percent)), 'schema', 'profiles/progress.json');
    validateInterval(progress.started_at, progress.completed_at);
  }
  const summary = { files: files.size, items: seen.size, kinds, documents: data.documents.length,
    chunked_documents: data.documents.filter(doc => doc.retrieval_mode === 'chunked').length,
    full_documents: data.documents.filter(doc => doc.retrieval_mode === 'full_document').length };
  if (profile) {
    for (const key of ['dataset_key', 'manifest_version', 'schema_version', 'synthetic', 'timezone'] as const) {
      requireValid(manifest[key] === profile[key], 'inventory', 'manifest.json');
    }
    for (const key of ['files', 'items', 'chunked_documents', 'full_documents'] as const) requireValid(summary[key] === profile[key], 'inventory');
    for (const kind of Object.keys(kinds) as ItemKind[]) requireValid(kinds[kind] === profile.kinds[kind], 'inventory');
  }
  return { manifest, catalogs: data, bytes, summary };
}
