import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FileOe2StateStore, extractOe2Fixture, runOe2FixtureFlow } from '../../backend/rag/src/oe2/flow.js';
import type { Oe2Category, Oe2Record } from '../../backend/rag/src/oe2/types.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(root, 'fixtures');
const cases = [
  ['academic-offer.json', 'academic_offer', 'fixture-academic-offer-v1'],
  ['calls.json', 'calls', 'fixture-calls-v1'],
  ['news.json', 'news', 'fixture-news-v1'],
] as const;

function comparable(record: Oe2Record): Record<string, string> {
  return { source_record_id: record.source_record_id, title: record.title,
    published_at: record.published_at, source_version: record.source_version, ...record.fields };
}

const reference = JSON.parse(await readFile(path.join(root, 'reference.json'), 'utf8')) as {
  records: Array<{ category: Oe2Category; source_record_id: string; title: string;
    published_at: string; source_version: string; fields: Record<string, string> }>;
};
const stateRoot = await mkdtemp(path.join(tmpdir(), 'banuchat-oe2-eval-'));
try {
  const store = new FileOe2StateStore(stateRoot);
  const extracted: Oe2Record[] = [];
  const flows = [];
  for (const [file, category, sourceId] of cases) {
    const bytes = await readFile(path.join(fixtureRoot, file));
    extracted.push(...extractOe2Fixture(bytes, category, sourceId));
    flows.push(await runOe2FixtureFlow({ category, sourceId, fixtureRoot, store,
      now: () => new Date('2026-10-24T12:00:00.000Z') }));
  }
  let correctFields = 0; let totalFields = 0; let correctDocuments = 0;
  for (const expected of reference.records) {
    const actual = extracted.find(item => item.category === expected.category
      && item.source_record_id === expected.source_record_id);
    const expectedFields = { source_record_id: expected.source_record_id, title: expected.title,
      published_at: expected.published_at, source_version: expected.source_version, ...expected.fields };
    let documentCorrect = actual !== undefined;
    for (const [field, expectedValue] of Object.entries(expectedFields)) {
      totalFields++;
      const fieldCorrect = actual !== undefined && comparable(actual)[field] === expectedValue;
      correctFields += Number(fieldCorrect); documentCorrect &&= fieldCorrect;
    }
    correctDocuments += Number(documentCorrect);
  }
  console.log(JSON.stringify({
    schema_version: 'oe2-evaluation-result-1', scope: 'local_fixture_only',
    implemented_flows: flows.length, successful_local_executions: flows.filter(f => f.outcome === 'updated').length,
    autonomous_n8n_executions_observed: 0,
    records: { correct: correctDocuments, total: reference.records.length,
      accuracy: correctDocuments / reference.records.length },
    fields: { correct: correctFields, total: totalFields, accuracy: correctFields / totalFields,
      formula: 'correct_reference_fields / total_reference_fields' },
    duplicate_case: 'covered_by_unit_test', failure_recovery_case: 'covered_by_unit_test',
    publication_lag_under_24h: { verifiable: false, reason: 'fixtures_do_not_provide_real_origin_publication_events' },
    ccd_publication_modified: false,
  }, null, 2));
} finally {
  await rm(stateRoot, { recursive: true, force: true });
}
