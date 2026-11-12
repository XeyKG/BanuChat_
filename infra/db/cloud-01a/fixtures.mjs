import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const catalog = JSON.parse(readFileSync(
  new URL('../../../data/synthetic/courses/courses.json', import.meta.url), 'utf8',
));
const courseKeys = ['course-001', 'course-002'];
const givenNames = ['Alba', 'Bruno', 'Celia', 'Darío', 'Eva', 'Félix', 'Inés', 'Leo'];
const familyNames = ['Arcilla', 'Bruma', 'Cauce', 'Duna'];

export function buildAcademicFixtures() {
  if (catalog.synthetic !== true || !courseKeys.every(key =>
    catalog.courses.some(course => course.course_key === key && course.status === 'available')
  )) throw new Error('El catálogo sintético de referencia no coincide');

  const programs = [
    { program_key: 'sim-digital', name: 'Programa Simulado de Aprendizaje Digital' },
    { program_key: 'sim-media', name: 'Programa Simulado de Medios Interactivos' },
  ];
  const periods = [
    { period_key: 'sim-2026-a', label: 'Ciclo de demostración A de 2026' },
    { period_key: 'sim-2026-b', label: 'Ciclo de demostración B de 2026' },
  ];
  const [previous, current] = periods.map(period => period.period_key);
  const [intro, next] = courseKeys;
  const students = [];
  const profiles = [];
  const course_attempts = [];
  const accounts = [];
  const progress = [];
  const slug = value => value.normalize('NFD').replace(/\p{Mark}/gu, '').toLowerCase();

  for (const family_name of familyNames) {
    for (const given_name of givenNames) {
      const index = students.length;
      const suffix = String(index + 1).padStart(4, '0');
      const profile_key = 'cloud-student-' + suffix;
      students.push({
        profile_key,
        academic_id: 'SIM-' + suffix,
        given_name,
        family_name,
        email: `${slug(given_name)}.${slug(family_name)}.${suffix}@banuchat.test`,
        program_key: programs[index % programs.length].program_key,
        current_semester: 2 + index % 7,
        current_period_key: current,
      });
      profiles.push({ profile_key, alias: `${given_name} ${family_name}` });
      accounts.push({
        profile_key, synthetic_uid: 'U9000' + suffix,
        recovery_email: `demo-u9000${suffix}@banuchat.test`,
        synthetic_display_name: `${given_name} ${family_name}`,
      });

      if (index === 31) continue;

      // Casos explícitos de prueba, sin derivar aprobación de una nota.
      const repeated = index % 4 === 0;
      course_attempts.push({
        profile_key, course_key: intro, attempt_number: 1, period_key: previous,
        outcome: repeated ? 'failed' : 'passed', grade_percent: repeated ? 48 : 82,
      });
      course_attempts.push(repeated ? {
        profile_key, course_key: intro, attempt_number: 2, period_key: current,
        outcome: 'passed', grade_percent: 82,
      } : {
        profile_key, course_key: next, attempt_number: 1, period_key: current,
        outcome: 'in_progress', grade_percent: null,
      });
      progress.push({
        profile_key, course_key: intro, status: 'completed', progress_percent: 100,
        started_at: '2026-01-12T14:00:00Z',
        completed_at: repeated ? '2026-09-01T14:00:00Z' : '2026-05-01T14:00:00Z',
      });
      if (!repeated) progress.push({
        profile_key, course_key: next, status: 'in_progress', progress_percent: 40,
        started_at: '2026-08-10T14:00:00Z', completed_at: null,
      });
    }
  }

  return { fixture_version: 2, synthetic: true, programs, periods, profiles, students, course_attempts, accounts, progress };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(buildAcademicFixtures(), null, 2) + '\n');
}
