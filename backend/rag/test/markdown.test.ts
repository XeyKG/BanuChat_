import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { extractMarkdownDocument, chunkMarkdownDocument, deriveDocument,
  SYNTHETIC_BANNER, sha256 } from '../src/index.js';
import type { DocumentRecord } from '../src/types.js';
import { copySource, failure } from './helpers.js';

const body = '# Título e\u0301\n\n' + Array.from({ length: 6 }, (_, i) => `## ${i + 1}. Sección\n\nPárrafo  **exacto**.\n\n- Uno\n- Dos\n\n`).join('');
test('exact banner removal, H1 context, unchanged Markdown and only final LF trimming', () => {
  const bytes = Buffer.from(SYNTHETIC_BANNER + body);
  const extracted = extractMarkdownDocument(bytes);
  assert.equal(extracted.content, body);
  assert.equal(extracted.content_sha256, sha256(Buffer.from(body)));
  const chunks = chunkMarkdownDocument(extracted);
  assert.equal(chunks.length, 6);
  for (const [index, chunk] of chunks.entries()) {
    assert.equal(chunk.content, `# Título e\u0301\n\n## ${index + 1}. Sección\n\nPárrafo  **exacto**.\n\n- Uno\n- Dos\n`);
    assert.equal(chunk.locator, `section:${index}:${index + 1}. Sección`);
    assert.equal(chunk.content_sha256, sha256(Buffer.from(chunk.content)));
  }
  assert.deepEqual(bytes, Buffer.from(SYNTHETIC_BANNER + body));
  assert.deepEqual(chunks, chunkMarkdownDocument(extractMarkdownDocument(bytes)));
});

for (const [name, mutate] of [
  ['altered banner', (text: string) => text.replace('synthetic: true', 'synthetic: false')],
  ['missing H1', (text: string) => text.replace(/^# .+\n/m, '')],
  ['second H1', (text: string) => text + '# Otro\n'],
  ['wrong H2 count', (text: string) => text.replace(/^## /m, '### ')],
  ['substantive preamble', (text: string) => text.replace(/^## /m, 'Preamble\n\n## ')],
  ['empty section', (text: string) => text.replace(/(## .+\n)[\s\S]*?(?=## )/, '$1\n')],
  ['fenced code', (text: string) => text + '```md\n## Not a section\n```\n'],
] as const) {
  test(`Markdown rejects ${name} in isolated fixture`, async t => {
    const root = await copySource(t);
    const filename = path.join(root, 'documents/artifacts/doc-001.md');
    await writeFile(filename, mutate(await readFile(filename, 'utf8')), 'utf8');
    assert.throws(() => extractMarkdownDocument(Buffer.from(mutate(SYNTHETIC_BANNER + body))), failure('VALIDATION_FAILED', 'markdown'));
    const changed = await readFile(filename);
    assert.throws(() => extractMarkdownDocument(changed), failure('VALIDATION_FAILED', 'markdown'));
  });
}

test('full_document bypasses extraction entirely: raw hash, zero chunks, no embedding API', () => {
  const document: DocumentRecord = { document_key: 'doc-full', title: 'Title', retrieval_mode: 'full_document',
    mime_type: 'text/markdown', version_label: 'v1', artifact_path: 'documents/artifacts/doc-full.md' };
  // Deliberately not valid chunked Markdown: this function must not call the extractor.
  const bytes = Buffer.from('Artifact only');
  const result = deriveDocument(document, bytes);
  assert.deepEqual(result.chunks, []);
  assert.equal(result.content_sha256, sha256(bytes));
  assert.equal(result.source_sha256, sha256(bytes));
  assert.equal('embeddings' in result, false);
});
