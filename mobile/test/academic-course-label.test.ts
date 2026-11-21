import assert from 'node:assert/strict';
import test from 'node:test';
import { academicCourseLabel } from '../src/utils/academic-course-label';

test('fictional NRC follows the course and period with no semester prefix', () => {
  assert.equal(academicCourseLabel('course-001','Interacción Digital','202610'),'NRC 99001 · Interacción Digital');
  assert.equal(academicCourseLabel('course-001','Interacción Digital','202660'),'NRC 99101 · Interacción Digital');
  assert.equal(academicCourseLabel('course-002','Habilidades de Analítica Digital','202660'),'NRC 99102 · Habilidades de Analítica Digital');
  assert.equal(academicCourseLabel('course-001','Old label','202660'),'Old label');
});
