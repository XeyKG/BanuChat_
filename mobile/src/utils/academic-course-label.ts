const labelToCourse: Readonly<Record<string, {name: string; offset: number}>> = {
  'course-001': {name: 'Interacción Digital', offset: 1},
  'course-002': {name: 'Habilidades de Analítica Digital', offset: 2},
};
const periodBase: Readonly<Record<string, number>> = { '202610': 99000, '202660': 99100 };

/** Fictional section numbers for the approved display fixtures, never student IDs. */
export function academicCourseLabel(courseKey: string, courseName: string, period: string): string {
  const course = labelToCourse[courseKey];
  const base = periodBase[period];
  return course?.name === courseName && base !== undefined ? `NRC ${base + course.offset} · ${courseName}` : courseName;
}
