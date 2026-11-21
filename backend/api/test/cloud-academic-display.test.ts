import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudAcademicDisplay, cloudCourseLabel, isCloudStudent } from '../src/application/cloud-academic-display.js';

test('cloud student sees real catalog labels over unchanged synthetic attempt keys and statuses', () => {
  const record = {
    student: { profile_key: 'cloud-student-0003', program_key: 'sim-digital', program_name: 'Previous label', current_period_key: 'sim-2026-b', period_label: 'Previous term' },
    attempts: [
      { course_key:'course-001', course_name:'Old first course', period_key:'sim-2026-a', period_label:'Old term', attempt_number:1, outcome:'failed' },
      { course_key:'course-001', course_name:'Old first course', period_key:'sim-2026-b', period_label:'Old term', attempt_number:2, outcome:'passed' },
      { course_key:'course-002', course_name:'Old second course', period_key:'sim-2026-b', period_label:'Old term', attempt_number:1, outcome:'in_progress' },
    ],
  };
  const result = cloudAcademicDisplay(record);
  assert.equal(result.student.program_name, 'Ingeniería de Sistemas');
  assert.equal(result.student.period_label, '202660');
  assert.deepEqual(result.attempts.map(x => [x.course_name, x.period_label]), [
    ['Interacción Digital','202610'],['Interacción Digital','202660'],['Habilidades de Analítica Digital','202660'],
  ]);
  assert.deepEqual(result.attempts.map(x => [x.course_key, x.attempt_number, x.outcome]), record.attempts.map(x => [x.course_key, x.attempt_number, x.outcome]));
  assert.equal(record.student.program_name,'Previous label');
  assert.equal(cloudAcademicDisplay({ ...record, student: {...record.student, profile_key:'historical-profile'} }).student.program_name,'Previous label');
  assert.equal(cloudAcademicDisplay({student:null,attempts:[]}).student,null);
  assert.equal(cloudCourseLabel({course_key:'unmapped',course_name:'Original'}).course_name,'Original');
  assert.equal(isCloudStudent('cloud-student-0032'),true);
  assert.equal(isCloudStudent('cloud-student-0033'),false);
});
