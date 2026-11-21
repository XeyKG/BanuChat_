import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const [baseId, baseSha, revision, mode] = process.argv.slice(2);
if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(baseId ?? '') ||
    !/^[a-f0-9]{64}$/u.test(baseSha ?? '') ||
    !/^[a-f0-9]{40}$/u.test(revision ?? '') ||
    !['verify', 'publish'].includes(mode)) {
  console.error('Uso: node build-academic-catalog.mjs UUID_BASE SHA256_MANIFIESTO GIT_SHA verify|publish');
  process.exit(1);
}

function loadSource(directory, kind) {
  const path = `${directory}/catalog-2026.json`;
  const bytes = readFileSync(new URL(`../../../data/academic-demo/${path}`, import.meta.url));
  return {path, kind, sha256: createHash('sha256').update(bytes).digest('hex'), data: JSON.parse(bytes)};
}
const profiles = loadSource('profiles', 'academic_catalog');
const courses = loadSource('courses', 'course');
const calendar = loadSource('calendars', 'calendar_event');
if (profiles.data.synthetic !== true) throw new Error('La fuente debe ser sintética');

const payload = JSON.stringify({
  fixture: {...profiles.data, courses: courses.data, calendar_events: calendar.data},
  base_id: baseId,
  base_sha256: baseSha,
  git_revision: revision,
  files: [profiles, courses, calendar].map(({path, kind, sha256}) => ({path, kind, sha256})),
});
const migration = readFileSync(new URL('./publish-academic-catalog.sql', import.meta.url), 'utf8');
const sqlLiteral = value => `'${value.replaceAll("'", "''")}'`;
process.stdout.write(`BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT set_config('banuchat_cloud.academic_catalog', ${sqlLiteral(payload)}, true) IS NOT NULL;
${migration}
SELECT d.current_release_id, r.manifest_sha256, r.manifest->'academic_catalog' AS provenance
FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
WHERE d.name='banuchat-synthetic';
${mode === 'verify' ? 'ROLLBACK' : 'COMMIT'};
`);
