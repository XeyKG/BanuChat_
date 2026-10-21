import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareCcdCorpus, ccdSnapshotFiles } from './prepare.js';
import { SafeReader } from '../source/safe-reader.js';
import { requireValid, safeError } from '../errors.js';

try {
  const args = process.argv.slice(2);
  requireValid(args.length === 4 || args.length === 5, 'schema');
  requireValid(args[0] === '--corpus-root' && args[2] === '--institutional-root'
    && (args.length === 4 || args[4] === '--write-snapshot'), 'schema');
  const corpusRoot = args[1];
  const institutionalRoot = args[3];
  requireValid(corpusRoot && institutionalRoot, 'schema');
  const prepared = await prepareCcdCorpus({ corpusRoot, institutionalRoot });
  const files = ccdSnapshotFiles(prepared);
  const reader = await SafeReader.create(corpusRoot);
  const existing = new Set(await reader.listFiles());
  requireValid([...existing].every(file => file === 'corpus.json' || files.has(file)), 'inventory');
  // Check all existing outputs before creating any file; never overwrite a snapshot.
  for (const [name, bytes] of files) {
    if (existing.has(name)) requireValid(bytes.equals(await reader.read(name)), 'hash');
  }
  if (args[4] === '--write-snapshot') {
    for (const [name, bytes] of files) {
      if (!existing.has(name)) {
        const target = path.join(corpusRoot, name);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes, { flag: 'wx' });
      }
    }
  }
  console.log(JSON.stringify({ status: 'prepared_local_only',
    dataset_key: prepared.corpus.dataset_key, version: prepared.corpus.version,
    validation: prepared.corpus.validation.status, institutional_approval: false,
    corpus_sha256: prepared.corpus_sha256, schema_sha256: prepared.schema_sha256,
    units: prepared.corpus.units.map(unit => ({ id: unit.id, group: unit.group, c_units: unit.c_units,
      references: unit.references, period: unit.period })),
    verified_sources: prepared.corpus.sources.length, documents: prepared.documents.length,
    chunks: prepared.derivatives.reduce((count, doc) => count + doc.chunks.length, 0),
    snapshot_written: args[4] === '--write-snapshot', database_accessed: false,
    embeddings_generated: 0 }, null, 2));
} catch (error) {
  console.error(JSON.stringify(safeError(error)));
  process.exitCode = 1;
}
