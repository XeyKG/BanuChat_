import assert from 'node:assert/strict';
import test from 'node:test';
import { academicCourseLabel } from '../src/utils/academic-course-label';

test('fictional NRC follows the course and period with no semester prefix', () => {
  assert.equal(academicCourseLabel('course-001','Interacción Digital','202610'),'Interacción Digital · NRC ficticio 99001');
  assert.equal(academicCourseLabel('course-001','Interacción Digital','202660'),'Interacción Digital · NRC ficticio 99101');
  assert.equal(academicCourseLabel('course-002','Habilidades en Analítica Digital','202660'),'Habilidades en Analítica Digital · NRC ficticio 99102');
  assert.equal(academicCourseLabel('course-002','Nombre devuelto por la API','202660'),'Nombre devuelto por la API · NRC ficticio 99102');
  assert.equal(academicCourseLabel('course-001','Nombre anterior','Ciclo de demostración A de 2026'),'Nombre anterior');
});
