import { sha256 } from '../crypto/sha256.js';
import type { StageInput, StageResult } from './types.js';
import type { WriterLease } from './writer-lock.js';
import { invariant, databaseError } from './errors.js';
import { resolveRelease, validateStageIdentity } from './releases.js';
import { openRun } from './runs.js';
import { findItem, stageStructured } from './structured.js';
import { stageDocuments } from './documents.js';

/** Pure boundary check, no writes or input mutation. Caller owns validated source trust. */
export function validateStageInput(input: StageInput): void {
  validateStageIdentity(input);
  invariant(input.derivatives.length === input.validated.catalogs.documents.length);
  invariant(new Set(input.derivatives.map(doc => doc.document_key)).size === input.derivatives.length);
  for (const doc of input.validated.catalogs.documents) {
    const derived = input.derivatives.find(value => value.document_key === doc.document_key);
    const item = findItem(input.validated.manifest.items, 'document', doc.document_key);
    invariant(derived && item.kind === 'document' && derived.retrieval_mode === doc.retrieval_mode
      && item.retrieval_mode === doc.retrieval_mode && derived.source_sha256 === item.sha256
      && doc.artifact_path === item.path && /^[0-9a-f]{64}$/.test(derived.content_sha256));
    if (doc.retrieval_mode === 'full_document') {
      invariant(derived.chunks.length === 0 && derived.content_sha256 === derived.source_sha256);
    } else {
      invariant(derived.chunks.length > 0);
      for (const [ordinal, chunk] of derived.chunks.entries()) {
        invariant(chunk.ordinal === ordinal && chunk.page_start === null && chunk.page_end === null
          && chunk.content_sha256 === sha256(Buffer.from(chunk.content, 'utf8')));
      }
    }
  }
}

/** Partial phase, NOT standalone ingestion. Keep the caller's lease across later phases. */
export async function stageCandidate(lease: WriterLease, input: StageInput): Promise<StageResult> {
  try {
    validateStageInput(input);
    const setup = await lease.transaction(async () => {
      const release = await resolveRelease(lease, input);
      if (release.outcome !== 'staging') return { release, run: null };
      const run = await openRun(lease, release.release_id, input.workflowRef, input.validated.manifest.items);
      return { release, run };
    });
    if (setup.release.outcome !== 'staging') return { outcome: setup.release.outcome, release_id: setup.release.release_id };
    invariant(setup.run);
    await stageStructured(lease, setup.release.release_id, setup.run, input.validated.catalogs, input.validated.manifest.items);
    await stageDocuments(lease, setup.release.release_id, setup.run, input.validated.catalogs.documents, input.derivatives, input.validated.manifest.items);
    return { outcome: 'staged', release_id: setup.release.release_id, run_id: setup.run };
  } catch (error) { throw databaseError(error); }
}
