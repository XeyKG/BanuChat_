/** Read-only DB evidence for the local Mobile UI check; never changes corpus/history. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { connectCcdLocal } from '../../backend/rag/src/ccd/local-runtime.js';
const directory = fileURLToPath(new URL('../../data/ccd/evidence/bch02-increment-3/', import.meta.url));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const { pool, identity } = await connectCcdLocal();
try {
  const corpus = (await pool.query(`SELECT r.id,r.status,r.manifest_sha256,r.pipeline_sha256,d.current_release_id,
    (SELECT jsonb_agg(jsonb_build_array(v.id,v.source_sha256,c.id,c.content_sha256,banuchat.text_sha256(c.embedding::text))
      ORDER BY v.id,c.id) FROM banuchat.document_versions v LEFT JOIN banuchat.document_chunks c ON c.document_version_id=v.id
      WHERE v.dataset_release_id=r.id) AS documents
    FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id ORDER BY r.id`)).rows;
  const history = (await pool.query(`SELECT c.id,
    (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.ordinal) FROM banuchat.messages m WHERE m.conversation_id=c.id) AS messages,
    (SELECT jsonb_agg(to_jsonb(mc) ORDER BY m.ordinal,mc.citation_index) FROM banuchat.message_citations mc
      JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=c.id) AS citations
    FROM banuchat.conversations c ORDER BY c.id`)).rows;
  await mkdir(directory, { recursive: true });
  if (process.argv[2] === 'before') {
    await writeFile(directory + 'before.json', JSON.stringify({ identity, corpus, history, at: new Date().toISOString() }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ baseline: true, previous_conversations: history.length }));
  } else if (process.argv[2] === 'after') {
    const before = JSON.parse(await readFile(directory + 'before.json', 'utf8')) as { corpus: unknown; history: { id: string }[] };
    assert.deepEqual(corpus, before.corpus);
    const previousIds = new Set(before.history.map(row => row.id));
    assert.equal(hash(history.filter(row => previousIds.has(row.id))), hash(before.history));
    const added = history.filter(row => !previousIds.has(row.id));
    const citations = (await pool.query(`SELECT m.conversation_id,m.content AS answer,mc.*,
      v.source_sha256=mc.source_sha256 AS hash_matches,c.locator=mc.source_locator AS locator_matches,
      c.dataset_release_id=mc.dataset_release_id AS release_matches
      FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id
      JOIN banuchat.document_versions v ON v.id=mc.document_version_id
      JOIN banuchat.document_chunks c ON c.id=mc.chunk_id WHERE m.conversation_id=ANY($1::uuid[])
      ORDER BY m.conversation_id,m.ordinal,mc.citation_index`, [added.map(row => row.id)])).rows;
    assert.ok(citations.every(row => row.hash_matches && row.locator_matches && row.release_matches));
    const relayDirectory = fileURLToPath(new URL('../../mobile/.expo/ccd_local-evidence/', import.meta.url));
    const logs = (await Promise.all((await readdir(relayDirectory)).filter(name => name.endsWith('.jsonl'))
      .map(async name => (await readFile(relayDirectory + name, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line))))).flat();
    assert.ok(logs.every(row => !row.route.includes('/conversations?')));
    assert.ok(logs.every(row => !row.route.includes('/progress') &&
      !row.route.startsWith('/api/v1/calendar') && !row.route.startsWith('/api/v1/announcements')));
    const successful = logs.filter(row => row.method === 'POST' && row.status === 201 && row.route.endsWith('/messages'));
    assert.equal(new Set(successful.map(row => row.route + row.request)).size, successful.length);
    for (const entry of successful) {
      const sent = JSON.parse(entry.response) as { conversation_id: string; user_message: { message_id: string; content: string };
        assistant_message: { message_id: string; content: string; insufficient_evidence: boolean; citations: { index: number; locator: string }[] } };
      const chat = added.find(row => row.id === sent.conversation_id);
      assert.ok(chat);
      assert.equal(chat.messages.find((row: { id: string }) => row.id === sent.user_message.message_id)?.content, sent.user_message.content);
      assert.equal(chat.messages.find((row: { id: string }) => row.id === sent.assistant_message.message_id)?.content, sent.assistant_message.content);
      assert.equal(chat.messages.find((row: { id: string }) => row.id === sent.assistant_message.message_id)?.insufficient_evidence, sent.assistant_message.insufficient_evidence);
      assert.deepEqual(citations.filter(row => row.message_id === sent.assistant_message.message_id)
        .map(row => [row.citation_index, row.source_locator]), sent.assistant_message.citations.map(row => [row.index, row.locator]));
    }
    const simulatedConflicts = logs.filter(row => row.simulated && row.status === 409).length;
    const artifacts = logs.filter(row => row.status === 200 && row.route.endsWith('/artifact'));
    for (const artifact of artifacts) {
      const version = artifact.route.split('/').at(-2);
      const citation = citations.find(row => row.document_version_id === version);
      assert.ok(citation);
      assert.equal(createHash('sha256').update(artifact.response).digest('hex'), citation.source_sha256);
    }
    await writeFile(directory + `after-${Date.now()}.json`, JSON.stringify({ identity, at: new Date().toISOString(),
      corpus_unchanged: true, previous_history_unchanged: true, ui_posts_match_persistence: true,
      no_shared_history_query: true, successful_ui_posts: successful.length, simulated_conflicts: simulatedConflicts,
      no_repeated_successful_posts: true, artifact_downloads_hash_verified: artifacts.length,
      added, citations }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ corpus_unchanged: true, previous_history_unchanged: true,
      new_conversations: added.length, messages: added.reduce((sum, row) => sum + (row.messages?.length ?? 0), 0),
      citations: citations.length, successful_ui_posts: successful.length, simulated_conflicts: simulatedConflicts }));
  } else throw new Error('Select before or after');
} finally { await pool.end(); }
