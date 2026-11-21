// Display aliases for the two historical fixture keys in the 32-student cloud cohort.
// Official labels are recorded in docs/operations/panel-editorial.md. The
// mapping preserves course keys used by academic links and persisted citations.
const courses: Readonly<Record<string, string>> = {
  'course-001': 'Interacción Digital',
  'course-002': 'Habilidades de Analítica Digital',
};
const programs: Readonly<Record<string, string>> = {
  'sim-digital': 'Ingeniería de Sistemas',
  'sim-media': 'Ingeniería Industrial',
};
const periods: Readonly<Record<string, string>> = {
  'sim-2026-a': '202610',
  'sim-2026-b': '202660',
};
export function isCloudStudent(profileKey: string | null): boolean {
  return profileKey !== null && /^cloud-student-00(?:0[1-9]|[12][0-9]|3[012])$/u.test(profileKey);
}
export function cloudCourseLabel<T extends {course_key: string; course_name: string}>(course: T): T {
  return {...course, course_name: courses[course.course_key] ?? course.course_name};
}
interface AcademicStudent {
  profile_key: string;
  program_key: string;
  program_name: string;
  current_period_key: string;
  period_label: string;
}
interface AcademicAttempt {
  course_key: string;
  course_name: string;
  period_key: string;
  period_label: string;
}
export function cloudAcademicDisplay<T extends {student: AcademicStudent | null; attempts: AcademicAttempt[]}>(record: T): T {
  const student = record.student;
  if (!student || !isCloudStudent(student.profile_key)) return record;
  return {
    ...record,
    student: {...student, program_name: programs[student.program_key] ?? student.program_name, period_label: periods[student.current_period_key] ?? student.period_label},
    attempts: record.attempts.map(attempt => ({
      ...cloudCourseLabel(attempt),
      period_label: periods[attempt.period_key] ?? attempt.period_label,
    })),
  };
}
