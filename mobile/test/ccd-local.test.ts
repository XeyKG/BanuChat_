/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiBaseUrl } from '../src/config/api';
import { clearOperatorConversations, rememberConversation } from '../src/session/operator-conversations';
import { createConversation, getConversation, listConversations, deleteConversation } from '../src/api/conversations';
import { MessageRequestError, sendMessage } from '../src/api/messages';
import { getProfiles } from '../src/api/profiles';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const nativeFetch = globalThis.fetch;
test.beforeEach(() => {
  process.env.EXPO_PUBLIC_DEMO_MODE = 'ccd_local';
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001/api/v1';
  clearOperatorConversations();
});
test.afterEach(() => { globalThis.fetch = nativeFetch; });

test('CCD rejects LAN/public URLs but permits loopback and the emulator host alias', () => {
  for (const host of ['127.0.0.1', 'localhost', '10.0.2.2']) {
    process.env.EXPO_PUBLIC_API_BASE_URL = `http://${host}:3001/api/v1`;
    assert.equal(getApiBaseUrl(), process.env.EXPO_PUBLIC_API_BASE_URL);
  }
  for (const value of ['http://192.168.1.5:3001/api/v1', 'https://example.test/api/v1',
    'http://127.0.0.1:3000/api/v1', 'http://user:pass@127.0.0.1:3001/api/v1', 'http://127.0.0.1:3001/api/v1?other=true']) {
    process.env.EXPO_PUBLIC_API_BASE_URL = value;
    assert.throws(getApiBaseUrl);
  }
});

test('shared-profile chats cannot be enumerated or fetched from a foreign opening', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected network'); };
  assert.deepEqual(await listConversations('ccd-local-demo'), []);
  await assert.rejects(getConversation(other));
  await assert.rejects(sendMessage(other, 'hola'));
  await assert.rejects(deleteConversation(other));
  assert.equal(calls, 0);
});

test('create remembers only its validated conversation; clearing the opening revokes UI access', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    return Response.json(options?.method === 'POST' ? {
      conversation_id: id, profile_key: 'ccd-local-demo', profile_alias: 'Contexto técnico', created_at: '2026-10-21T00:00:00Z',
    } : { conversation_id: id, started_at: '2026-10-21T00:00:00Z', profile: { profile_key: 'ccd-local-demo', alias: 'Contexto técnico' }, messages: [] },
    { status: options?.method === 'POST' ? 201 : 200 });
  };
  await createConversation('ccd-local-demo');
  assert.equal((await listConversations('ccd-local-demo')).length, 1);
  assert.ok(calls.every(url => !url.includes('profile_key=')));
  clearOperatorConversations();
  await assert.rejects(getConversation(id));
  assert.equal(calls.length, 2);
});

test('409 and network errors perform one POST without automatic retry', async () => {
  rememberConversation(id);
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ error: { code: 'CONFLICT' } }, { status: 409 }); };
  await assert.rejects(sendMessage(id, 'seguimiento'), (error: unknown) => error instanceof MessageRequestError && error.kind === 'conflict');
  assert.equal(calls, 1);
  globalThis.fetch = async () => { calls++; throw new Error('Network'); };
  await assert.rejects(sendMessage(id, 'seguimiento'), (error: unknown) => error instanceof MessageRequestError && error.kind === 'network');
  assert.equal(calls, 2);
});

test('CCD and synthetic profile lists cannot be silently interchanged', async () => {
  globalThis.fetch = async () => Response.json({ release_id: id, profiles: [{ profile_key: 'student_001', alias: 'Sintético' }] });
  await assert.rejects(getProfiles());
  process.env.EXPO_PUBLIC_DEMO_MODE = 'synthetic';
  assert.equal((await getProfiles()).profiles[0].profile_key, 'student_001');
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.2:3000/api/v1';
  assert.equal(getApiBaseUrl(), process.env.EXPO_PUBLIC_API_BASE_URL);
});

test('synthetic history keeps the original profile query without a volatile CCD allowlist', async () => {
  process.env.EXPO_PUBLIC_DEMO_MODE = 'synthetic';
  let requested = '';
  globalThis.fetch = async url => { requested = String(url); return Response.json({ conversations: [] }); };
  assert.deepEqual(await listConversations('student_001'), []);
  assert.match(requested, /profile_key=student_001/);
});
