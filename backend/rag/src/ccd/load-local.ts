import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { connectCcdLocal } from './local-runtime.js';
import { ingestCcdCorpus } from './ingest.js';
import { SafeReader } from '../source/safe-reader.js';
import { OllamaClient } from '../ollama/client.js';
import { invariant } from '../db/errors.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
try {
  const operation = process.argv[2];
  invariant(process.argv.length === 3 && (operation === 'migrate' || operation === 'ingest' || operation === 'inspect'));
  const { pool, identity } = await connectCcdLocal();
  try {
    const reader = await SafeReader.create(root);
    if (operation === 'migrate') {
      invariant((await pool.query("SELECT 1 FROM pg_namespace WHERE nspname NOT IN ('public','information_schema') AND nspname NOT LIKE 'pg_%'")).rowCount === 0);
      invariant((await pool.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')")).rowCount === 0);
      await pool.query((await reader.read('infra/db/001_initial_schema.sql')).toString('utf8'));
      await pool.query((await reader.read('infra/db/002_ccd_local_manifest.sql')).toString('utf8'));
      console.log(JSON.stringify({ identity, migrations_applied: ['001_initial_schema.sql', '002_ccd_local_manifest.sql'] }));
    } else if (operation === 'ingest') {
      invariant(process.env.CCD_INSTITUTIONAL_ROOT);
      const result = await ingestCcdCorpus(pool, new OllamaClient('http://127.0.0.1:11434'), {
        corpusRoot: path.join(root, 'data/ccd/local/m01-m12'), institutionalRoot: process.env.CCD_INSTITUTIONAL_ROOT,
        runtimeRoot: root,
      });
      const evidence = path.join(root, 'data/ccd/evidence/increment-2');
      await mkdir(evidence, { recursive: true });
      await writeFile(path.join(evidence, `ingestion-${Date.now()}.json`), JSON.stringify({ identity, result }, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ identity, outcome: result.outcome, release_id: result.release_id,
        embeddings_generated: result.embeddings_generated }));
    } else {
      const counts = await pool.query(`SELECT (SELECT count(*)::int FROM banuchat.documents) AS documents,
        (SELECT count(*)::int FROM banuchat.document_versions) AS versions,
        count(*)::int AS chunks, count(embedding)::int AS embeddings,
        bool_and(public.vector_dims(embedding)=1024) AS dimensions_valid FROM banuchat.document_chunks`);
      const releases = await pool.query(`SELECT r.id,r.status,d.current_release_id=r.id AS current,
        r.manifest_sha256,r.pipeline_sha256,e.model,e.model_revision,e.config_sha256
        FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id
        JOIN banuchat.embedding_configs e ON e.id=r.embedding_config_id`);
      console.log(JSON.stringify({ identity, counts: counts.rows, releases: releases.rows }));
    }
  } finally { await pool.end(); }
} catch {
  // Operational diagnostics never expose credentials, SQL, original paths or native stacks.
  console.error(JSON.stringify({ error: 'CCD_LOCAL_OPERATION_REJECTED' })); process.exitCode = 1;
}
