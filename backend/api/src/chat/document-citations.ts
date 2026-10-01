import type { RetrievedDocumentChunk } from "../application/document-retrieval.js";
import type {
  PersistenceCitation,
  PresentationCitation,
} from "./chat-types.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export interface DocumentCitations {
  citations: PresentationCitation[];
  citation_records: PersistenceCitation[];
}

function reject(): never {
  throw new TypeError("Invalid retrieved document chunks for citations");
}

function isNonblank(value: string): boolean {
  return /\S/u.test(value);
}

export function buildDocumentCitations(
  chunks: readonly RetrievedDocumentChunk[],
): DocumentCitations {
  if (chunks.length === 0) {
    return { citations: [], citation_records: [] };
  }

  const releaseId = chunks[0]?.release_id;
  if (releaseId === undefined || !UUID_PATTERN.test(releaseId)) {
    return reject();
  }

  const chunkIds = new Set<string>();
  const citations: PresentationCitation[] = [];
  const citationRecords: PersistenceCitation[] = [];

  chunks.forEach((chunk, index) => {
    if (
      chunk.release_id !== releaseId ||
      !UUID_PATTERN.test(chunk.document_version_id) ||
      !UUID_PATTERN.test(chunk.chunk_id) ||
      chunkIds.has(chunk.chunk_id) ||
      !isNonblank(chunk.title) ||
      !isNonblank(chunk.source_path) ||
      !isNonblank(chunk.chunk_locator) ||
      !SHA256_PATTERN.test(chunk.source_sha256)
    ) {
      return reject();
    }
    chunkIds.add(chunk.chunk_id);

    citations.push({
      index,
      source_kind: "document",
      label: `Documento: ${chunk.title}`,
      locator: chunk.chunk_locator,
      release_id: chunk.release_id,
      document_version_id: chunk.document_version_id,
      artifact_url: null,
    });
    citationRecords.push({
      citation_index: index,
      dataset_release_id: chunk.release_id,
      source_kind: "document",
      source_path: chunk.source_path,
      source_locator: chunk.chunk_locator,
      source_sha256: chunk.source_sha256,
      document_version_id: chunk.document_version_id,
      chunk_id: chunk.chunk_id,
      course_key: null,
      event_key: null,
      announcement_key: null,
      profile_key: null,
    });
  });

  return { citations, citation_records: citationRecords };
}
