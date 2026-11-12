import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildAcademicFixtures } from './fixtures.mjs';

const fixture = buildAcademicFixtures();
const readSynthetic = path => JSON.parse(readFileSync(
  new URL('../../../data/synthetic/' + path, import.meta.url), 'utf8',
));

test('genera 32 estudiantes ficticios reproducibles con identificadores separados', () => {
  assert.deepEqual(fixture, buildAcademicFixtures());
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.students.length, 32);
  for (const field of ['profile_key', 'academic_id', 'email']) {
    assert.equal(new Set(fixture.students.map(row => row[field])).size, 32);
  }
  for (const student of fixture.students) {
    assert.match(student.academic_id, /^SIM-\d{4}$/);
    assert.match(student.email, /^[a-z]+\.[a-z]+\.\d{4}@banuchat\.test$/);
    assert.ok(student.given_name && student.family_name && student.current_semester > 0);
    assert.equal(Object.hasOwn(student, 'synthetic_uid'), false);
  }
});

test('los perfiles son nuevos y las referencias resuelven dentro del fixture o catálogo autorizado', () => {
  const legacy = new Set(readSynthetic('profiles/profiles.json').profiles.map(row => row.profile_key));
  const profiles = new Set(fixture.profiles.map(row => row.profile_key));
  const programs = new Set(fixture.programs.map(row => row.program_key));
  const periods = new Set(fixture.periods.map(row => row.period_key));
  const courses = new Set(readSynthetic('courses/courses.json').courses.map(row => row.course_key));
  assert.equal(profiles.size, fixture.students.length);
  for (const student of fixture.students) {
    assert.ok(profiles.has(student.profile_key) && !legacy.has(student.profile_key));
    assert.ok(programs.has(student.program_key) && periods.has(student.current_period_key));
  }
  for (const attempt of fixture.course_attempts) {
    assert.ok(profiles.has(attempt.profile_key) && courses.has(attempt.course_key) && periods.has(attempt.period_key));
  }
});

test('los intentos distinguen curso, período, nota opcional y resultado', () => {
  const { course_attempts: attempts } = fixture;
  assert.equal(attempts.length, 62);
  const keys = new Set(attempts.map(row => JSON.stringify([row.profile_key, row.course_key, row.attempt_number])));
  assert.equal(keys.size, 62);
  const retakes = attempts.filter(row => row.attempt_number === 2);
  assert.equal(retakes.length, 8);
  for (const row of retakes) {
    const first = attempts.find(candidate => candidate.profile_key === row.profile_key
      && candidate.course_key === row.course_key && candidate.attempt_number === 1);
    assert.equal(first?.outcome, 'failed');
    assert.notEqual(first.period_key, row.period_key);
    assert.equal(row.outcome, 'passed');
  }
  assert.equal(attempts.filter(row => row.outcome === 'in_progress' && row.grade_percent === null).length, 23);
});

test('cada alta futura tiene identidad propia y un estudiante carece de historial', () => {
  const { accounts, students, progress, course_attempts } = fixture;
  assert.equal(new Set(accounts.map(account => account.synthetic_uid)).size, 32);
  for (const [index, account] of accounts.entries()) {
    assert.match(account.synthetic_uid, /^U\d{8}$/);
    assert.equal(account.profile_key, students[index].profile_key);
    assert.notEqual(account.recovery_email, students[index].email);
  }
  const empty = students.at(-1).profile_key;
  assert.equal(progress.length, 54);
  assert.equal(progress.some(row => row.profile_key === empty), false);
  assert.equal(course_attempts.some(row => row.profile_key === empty), false);
});

test('el publicador prepara un sucesor reproducible con hashes y localizadores verificables', () => {
  const run = name => execFileSync(process.execPath, [fileURLToPath(new URL(name, import.meta.url))], {
    encoding: 'utf8',
  });
  const source = run('fixtures.mjs');
  const sql = run('build-successor.mjs');
  assert.equal(sql, run('build-successor.mjs'));
  assert.ok(sql.startsWith('\\set ON_ERROR_STOP on\nBEGIN;'));
  const encoded = sql.match(/decode\('([a-f0-9]+)','hex'\)/)[1];
  const payload = JSON.parse(Buffer.from(encoded, 'hex').toString('utf8'));
  assert.deepEqual(payload.base, readSynthetic('manifest.json'));
  assert.deepEqual(payload.fixtures, fixture);
  assert.equal(payload.sha, createHash('sha256').update(source).digest('hex'));
  assert.equal(payload.base.items.length + payload.items.length, 162);
  assert.equal(new Set(payload.items.map(row => row.kind + '/' + row.key)).size, 86);
  for (const item of payload.items) {
    const [, collection, index] = item.locator.split('/');
    const row = fixture[collection][index];
    assert.equal(item.sha256, payload.sha);
    assert.equal(item.key, row.course_key ? row.profile_key + '/' + row.course_key : row.profile_key);
  }
});
