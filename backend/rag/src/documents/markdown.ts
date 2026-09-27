import { sha256 } from '../crypto/sha256.js';
import { requireValid } from '../errors.js';
import { decodeUtf8 } from '../preflight/json.js';
import type { Chunk, DocumentDerivatives, DocumentRecord, ValidatedContent } from '../types.js';

export const SYNTHETIC_BANNER = 'Contenido sintético de demostración; no representa información institucional real.\n\nsynthetic: true\n\n';
export interface ExtractedMarkdown { content: string; content_sha256: string; h1: string; sections: string[] }

export function extractMarkdownDocument(bytes: Uint8Array, expectedSections = 6): ExtractedMarkdown {
  const source = decodeUtf8(bytes);
  requireValid(source.startsWith(SYNTHETIC_BANNER), 'markdown');
  const content = source.slice(SYNTHETIC_BANNER.length);
  requireValid(!/^\s*(?:`{3,}|~{3,})/m.test(content), 'markdown');
  const lines = content.split('\n');
  const h1s = lines.flatMap((line, index) => line.startsWith('# ') ? [index] : []);
  const boundaries = lines.flatMap((line, index) => line.startsWith('## ') ? [index] : []);
  requireValid(h1s.length === 1 && h1s[0] === 0 && boundaries.length === expectedSections
    && expectedSections > 0 && Number.isInteger(expectedSections), 'markdown');
  const first = boundaries[0];
  requireValid(first !== undefined && first > 0 && lines.slice(1, first).every(line => line.trim() === ''), 'markdown');
  const h1 = lines[0];
  requireValid(h1 && h1.slice(2).trim().length > 0, 'markdown');
  const sections = boundaries.map((start, index) => {
    const end = boundaries[index + 1] ?? lines.length;
    const heading = lines[start];
    requireValid(heading && heading.slice(3).trim().length > 0
      && lines.slice(start + 1, end).some(line => line.trim().length > 0), 'markdown');
    return lines.slice(start, end).join('\n').replace(/\n+$/, '') + '\n';
  });
  return { content, content_sha256: sha256(Buffer.from(content, 'utf8')), h1, sections };
}

export function chunkMarkdownDocument(extracted: ExtractedMarkdown): Chunk[] {
  return extracted.sections.map((section, ordinal) => {
    const content = `${extracted.h1}\n\n${section}`;
    const title = section.slice(3, section.indexOf('\n'));
    return { ordinal, locator: `section:${ordinal}:${title}`, content,
      content_sha256: sha256(Buffer.from(content, 'utf8')), page_start: null, page_end: null };
  });
}

export function deriveDocument(document: DocumentRecord, bytes: Uint8Array): DocumentDerivatives {
  const source_sha256 = sha256(bytes);
  if (document.retrieval_mode === 'full_document') {
    return { document_key: document.document_key, retrieval_mode: 'full_document',
      source_sha256, content_sha256: source_sha256, chunks: [] };
  }
  const extracted = extractMarkdownDocument(bytes);
  requireValid(extracted.h1 === `# ${document.title}`, 'identity');
  return { document_key: document.document_key, retrieval_mode: 'chunked', source_sha256,
    content_sha256: extracted.content_sha256, chunks: chunkMarkdownDocument(extracted) };
}

export function buildDocumentDerivatives(validated: ValidatedContent): DocumentDerivatives[] {
  return validated.catalogs.documents.map(document => {
    const bytes = validated.bytes.get(document.artifact_path);
    requireValid(bytes, 'inventory');
    return deriveDocument(document, bytes);
  });
}
