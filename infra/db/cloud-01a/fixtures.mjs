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
        email: `student-${suffix}@banuchat.test`,
        program_key: programs[index % programs.length].program_key,
        current_semester: 2 + index % 7,
        current_period_key: current,
      });
      profiles.push({ profile_key, alias: `Estudiante ficticio ${suffix}` });

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
    }
  }

  return { fixture_version: 1, synthetic: true, programs, periods, profiles, students, course_attempts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(buildAcademicFixtures(), null, 2) + '\n');
}
