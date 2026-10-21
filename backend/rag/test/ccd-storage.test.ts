import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { assertCcdDatabase } from '../src/ccd/ingest.js';
import { storageCounts } from '../src/db/recipe.js';
import { DatabaseError } from '../src/db/errors.js';

test('storage recipes preserve frozen synthetic counts and admit only the CCD 2/2/2 recipe', () => {
  assert.deepEqual(storageCounts('synthetic_v1'), { items: 76, documents: 12, chunks: 60, perDocument: 6 });
  assert.deepEqual(storageCounts('ccd_local'), { items: 2, documents: 2, chunks: 2, perDocument: 1 });
  // Exercise untyped/operational callers: no silent fallback for unknown recipes.
  assert.throws(() => Reflect.apply(storageCounts, undefined, ['other']), DatabaseError);
});

test('CCD writer refuses another database before inspection, embeddings or writes', async () => {
  const calls: string[] = [];
  const pool = { query: async (sql: string) => { calls.push(sql); return { rows: [{ name: 'synthetic_demo' }] }; } };
  await assert.rejects(assertCcdDatabase(pool as unknown as Pool), DatabaseError);
  assert.deepEqual(calls, ['SELECT current_database() AS name']);
});
