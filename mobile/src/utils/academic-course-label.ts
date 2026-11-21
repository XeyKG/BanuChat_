const sectionOffset: Readonly<Record<string, number>> = {
  'course-001': 1,
  'course-002': 2,
};
const periodBase: Readonly<Record<string, number>> = { '202610': 99000, '202660': 99100 };

/** Fictional section numbers for the approved display fixtures, never student IDs. */
export function academicCourseLabel(courseKey: string, courseName: string, period: string): string {
  const offset = sectionOffset[courseKey];
  const base = periodBase[period];
  return offset !== undefined && base !== undefined
    ? `${courseName} · NRC ficticio ${base + offset}`
    : courseName;
}
