import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
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
    assert.match(student.email, /^student-\d{4}@banuchat\.test$/);
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
  assert.equal(attempts.length, 64);
  const keys = new Set(attempts.map(row => JSON.stringify([row.profile_key, row.course_key, row.attempt_number])));
  assert.equal(keys.size, 64);
  const retakes = attempts.filter(row => row.attempt_number === 2);
  assert.equal(retakes.length, 8);
  for (const row of retakes) {
    const first = attempts.find(candidate => candidate.profile_key === row.profile_key
      && candidate.course_key === row.course_key && candidate.attempt_number === 1);
    assert.equal(first?.outcome, 'failed');
    assert.notEqual(first.period_key, row.period_key);
    assert.equal(row.outcome, 'passed');
  }
  assert.equal(attempts.filter(row => row.outcome === 'in_progress' && row.grade_percent === null).length, 24);
});
