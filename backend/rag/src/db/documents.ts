import type { DocumentRecord, DocumentDerivatives, ManifestItem } from '../types.js';
import type { WriterLease } from './writer-lock.js';
import { invariant } from './errors.js';
import { findItem } from './structured.js';
import { finishItem, provenance } from './runs.js';

export async function resolveDocument(lease: WriterLease, document: Readonly<DocumentRecord>): Promise<string> {
  const existing = await lease.query<{ id: string; retrieval_mode: string }>(
    'SELECT id,retrieval_mode FROM banuchat.documents WHERE dataset_id=$1 AND document_key=$2', [1, document.document_key]);
  if (existing.rows[0]) {
    invariant(existing.rows[0].retrieval_mode === document.retrieval_mode);
    return existing.rows[0].id;
  }
  const inserted = await lease.query<{ id: string }>(
    'INSERT INTO banuchat.documents (dataset_id,document_key,retrieval_mode) VALUES ($1,$2,$3) RETURNING id',
    [1, document.document_key, document.retrieval_mode]);
  invariant(inserted.rows[0]);
  return inserted.rows[0].id;
}
export async function stageDocuments(lease: WriterLease, release: string, run: string,
  documents: readonly DocumentRecord[], derivatives: readonly DocumentDerivatives[], items: readonly ManifestItem[]): Promise<void> {
  for (const document of documents) {
    const derived = derivatives.find(value => value.document_key === document.document_key);
    invariant(derived);
    const item = findItem(items, 'document', document.document_key);
    await lease.transaction(async () => {
      const id = await resolveDocument(lease, document);
      const full = document.retrieval_mode === 'full_document';
      const version = await lease.query<{ id: string }>(`INSERT INTO banuchat.document_versions
        (dataset_id,dataset_release_id,document_id,version_label,title,source_path,source_locator,source_sha256,
         content_sha256,mime_type,processing_status,ingestion_run_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [1, release, id, document.version_label, document.title, ...provenance(item),
        derived.content_sha256, document.mime_type, full ? 'ready' : 'pending', run]);
      invariant(version.rows[0]);
      const versionId = version.rows[0].id;
      const linked = await lease.query(`UPDATE banuchat.ingestion_items SET document_version_id=$1
        WHERE ingestion_run_id=$2 AND source_kind='document' AND record_key=$3 AND status='pending'`,
      [versionId, run, document.document_key]);
      invariant(linked.rowCount === 1);
      for (const chunk of derived.chunks) {
        const result = await lease.query<{ content_sha256: string }>(`INSERT INTO banuchat.document_chunks
          (dataset_release_id,document_version_id,ordinal,content,locator,page_start,page_end,
           embedding,embedding_generated_at,generation_run_id)
          VALUES ($1,$2,$3,$4,$5,NULL,NULL,NULL,NULL,NULL) RETURNING content_sha256`,
        [release, versionId, chunk.ordinal, chunk.content, chunk.locator]);
        invariant(result.rows[0]?.content_sha256 === chunk.content_sha256);
      }
      if (full) await finishItem(lease, run, item);
    });
  }
}
