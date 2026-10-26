import type { Pool } from 'pg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prepareCcdCorpus, ccdSnapshotFiles } from './prepare.js';
import { SafeReader } from '../source/safe-reader.js';
import { sha256 } from '../crypto/sha256.js';
import { invariant } from '../db/errors.js';
import { withWriterLease } from '../db/writer-lock.js';
import { resolveEmbeddingConfig } from '../db/embedding-config.js';
import { openRun } from '../db/runs.js';
import { stageDocuments } from '../db/documents.js';
import { generateEmbeddings } from '../db/embeddings.js';
import { finalizeAndPublish } from '../db/finalize.js';
import { withAttemptFailure } from '../db/failure.js';
import { assertSameRuntime } from '../ollama/config.js';
import type { EmbeddingClient } from '../ollama/types.js';
import { storageCounts } from '../db/recipe.js';

const execute = promisify(execFile);
export async function captureCcdCode(root: string) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  const git = async (...args: string[]) => (await execute('git', ['--no-optional-locks', '-C', root, ...args],
    { encoding: 'utf8', env, windowsHide: true, maxBuffer: 4 * 1024 * 1024 })).stdout;
  const baseline = (await git('rev-parse', '--verify', 'HEAD')).trim();
  invariant(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(baseline));
  const scope = ['backend/rag/src', 'backend/rag/package.json', 'backend/rag/package-lock.json',
    'backend/rag/tsconfig.json', 'data/ccd/schemas',
    'infra/db/001_initial_schema.sql', 'infra/db/002_ccd_local_manifest.sql',
    'infra/db/003_ccd_chat_demo.sql', 'infra/db/004_ccd_expanded_manifest.sql', 'infra/db/005_ccd_guidance_manifest.sql',
    'infra/db/013_ccd_knowledge_candidate.sql','backend/api/src/chat/ccd-knowledge.ts','backend/api/src/chat/ccd-knowledge-manifest.ts',
    'backend/api/src/application/ccd-knowledge-retrieval.ts','backend/api/src/authenticated-runtime.ts'];
  const names = new Set((await git('ls-files', '-z', '--', ...scope) +
    await git('ls-files', '--others', '--exclude-standard', '-z', '--', ...scope)).split('\0').filter(Boolean));
  const reader = await SafeReader.create(root);
  const files: Record<string, string> = {};
  for (const name of [...names].sort()) files[name] = sha256(await reader.read(name));
  invariant(Object.keys(files).length > 10);
  return { code_base_git_revision: baseline, executed_files_sha256: files };
}

export async function assertCcdDatabase(pool: Pool): Promise<void> {
  const identity = await pool.query<{ name: string }>('SELECT current_database() AS name');
  invariant(identity.rows[0]?.name === 'banuchat_ccd_dev');
}

/** Manual CCD execution only. No implicit retry/recovery and no synthetic coercion. */
export async function ingestCcdCorpus(pool: Pool, client: EmbeddingClient, options: {
  corpusRoot: string; institutionalRoot: string; runtimeRoot: string; expectedCurrentReleaseId?: string;
}) {
  await assertCcdDatabase(pool);
  const prepared = await prepareCcdCorpus(options);
  const guidance = prepared.corpus.schema_version === 'ccd-1.2.0';
  const expanded = guidance || prepared.corpus.schema_version === 'ccd-1.1.0';
  const recipe = guidance ? 'ccd_guidance_v1' : expanded ? 'ccd_expanded_v1' : 'ccd_local';
  const counts = storageCounts(recipe);
  invariant(!expanded || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(options.expectedCurrentReleaseId ?? ''));
  const local = await SafeReader.create(options.corpusRoot);
  for (const [name, bytes] of ccdSnapshotFiles(prepared)) invariant(bytes.equals(await local.read(name)));
  const code = await captureCcdCode(options.runtimeRoot);
  const pipeline = { ...prepared.pipeline, source_revision_kind: 'local_snapshot_sha256',
    source_snapshot_sha256: prepared.corpus_sha256, ...code,
    ...(expanded ? { predecessor_release_id: options.expectedCurrentReleaseId } : {}) };
  return withWriterLease(pool, async lease => {
    const config = await client.inspect();
    const embeddingConfigId = await resolveEmbeddingConfig(lease, config);
    const setup = await lease.transaction(async () => {
      const dataset = await lease.query<{ name: string; current_release_id: string }>('SELECT name,current_release_id FROM banuchat.datasets WHERE id=1 FOR UPDATE');
      if (!dataset.rows.length) await lease.query('INSERT INTO banuchat.datasets (id,name) VALUES (1,$1)', [prepared.corpus.dataset_key]);
      else invariant(dataset.rows[0]?.name === prepared.corpus.dataset_key);
      const values = [code.code_base_git_revision, JSON.stringify(prepared.manifest), JSON.stringify(pipeline), embeddingConfigId];
      const existing = await lease.query<{ id: string; status: string; current: boolean }>(`SELECT r.id,r.status,d.current_release_id=r.id AS current
        FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id
        WHERE r.git_revision=$1 AND r.manifest_sha256=banuchat.jsonb_sha256($2::jsonb)
          AND r.pipeline_sha256=banuchat.jsonb_sha256($3::jsonb) AND r.embedding_config_id=$4`, values);
      if (existing.rows[0]) {
        invariant(existing.rows[0].status === 'ready' && existing.rows[0].current);
        return { release: existing.rows[0].id, run: null };
      }
      if (expanded) {
        invariant(dataset.rows[0]?.current_release_id === options.expectedCurrentReleaseId);
        invariant((await lease.query("SELECT id FROM banuchat.dataset_releases WHERE status<>'ready'")).rowCount === 0);
        const previous = await lease.query<{ manifest: typeof prepared.manifest }>('SELECT manifest FROM banuchat.dataset_releases WHERE id=$1', [options.expectedCurrentReleaseId]);
        const preserved = guidance ? previous.rows[0]?.manifest.items.map(item => item.key) : ['ccd-m01', 'ccd-m12'];
        invariant(preserved && (!guidance || preserved.length === 10));
        for (const key of preserved) {
          invariant(previous.rows[0]?.manifest.items.find(item => item.key === key)?.sha256 === prepared.manifest.items.find(item => item.key === key)?.sha256);
        }
      } else invariant((await lease.query('SELECT id FROM banuchat.dataset_releases')).rowCount === 0);
      const release = await lease.query<{ id: string }>(`INSERT INTO banuchat.dataset_releases
        (dataset_id,git_revision,manifest,pipeline_config,embedding_config_id,dataset_schema_version,status)
        VALUES (1,$1,$2::jsonb,$3::jsonb,$4,$5,'staging') RETURNING id`, [...values, prepared.corpus.schema_version]);
      invariant(release.rows[0]);
      const run = await openRun(lease, release.rows[0].id, guidance ? 'bch03-ccd-guidance-v1' : expanded ? 'bch03-ccd-expanded-v1' : 'bch03-ccd-manual-v1', prepared.manifest.items, 'manual', recipe);
      return { release: release.rows[0].id, run };
    });
    if (setup.run === null) return { outcome: 'already_current', release_id: setup.release, embeddings_generated: 0 };
    return withAttemptFailure(lease, setup.release, setup.run, async () => {
      await stageDocuments(lease, setup.release, setup.run!, prepared.documents, prepared.derivatives,
        prepared.manifest.items, false, recipe);
      const count = await generateEmbeddings(lease, setup.release, setup.run!, {
        embeddingConfigId, derivatives: prepared.derivatives, validated: { manifest: prepared.manifest },
      }, client, config, 2, recipe);
      invariant(count === counts.chunks);
      assertSameRuntime(config, await client.inspect());
      const revalidated = await prepareCcdCorpus(options);
      invariant(revalidated.corpus_sha256 === prepared.corpus_sha256
        && revalidated.schema_sha256 === prepared.schema_sha256
        && JSON.stringify(await captureCcdCode(options.runtimeRoot)) === JSON.stringify(code));
      for (const [name, bytes] of ccdSnapshotFiles(revalidated)) invariant(bytes.equals(await local.read(name)));
      await finalizeAndPublish(lease, setup.release, setup.run!, recipe,
        expanded ? { expectedRelease: options.expectedCurrentReleaseId! } : undefined);
      return { outcome: 'published', release_id: setup.release, run_id: setup.run,
        documents: counts.documents, chunks: counts.chunks, embeddings_generated: count, embedding_config: config,
        source_snapshot_sha256: prepared.corpus_sha256, code_provenance: code };
    });
  });
}
