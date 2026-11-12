import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildAcademicFixtures } from './fixtures.mjs';

// Offline only. Run the emitted script with psql -X on the dedicated cluster.
const fixtures = buildAcademicFixtures();
const fixtureBytes = JSON.stringify(fixtures, null, 2) + '\n';
const base = readFileSync(new URL('../../../data/synthetic/manifest.json', import.meta.url));
const sha = createHash('sha256').update(fixtureBytes).digest('hex');
const path = 'profiles/cloud-01a-2.json';
const profileItems = fixtures.profiles.map((row, index) => ({
  kind: 'profile', key: row.profile_key, path, locator: `/profiles/${index}`, sha256: sha,
}));
const progressItems = fixtures.progress.map((row, index) => ({
  kind: 'profile_course', key: `${row.profile_key}/${row.course_key}`,
  path, locator: `/progress/${index}`, sha256: sha,
}));
const payload = Buffer.from(JSON.stringify({
  base: JSON.parse(base), fixtures, sha, path, items: [...profileItems, ...progressItems],
})).toString('hex');
const sql = readFileSync(new URL('publish-successor.sql', import.meta.url), 'utf8');
process.stdout.write(`\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
SET LOCAL lock_timeout = '5s';
SELECT set_config('banuchat_cloud.payload', convert_from(decode('${payload}','hex'),'UTF8'), true) IS NOT NULL AS prepared;
${sql}
COMMIT;
`);
