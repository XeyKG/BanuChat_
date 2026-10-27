import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {analyzeCsv,evaluateCriteria,parseCsv,susScore,SESSION_COLUMNS,SUS_COLUMNS} from './analyze-human-validation.mjs';
const directory=new URL('./human-validation/',import.meta.url);
const sessions=await readFile(new URL('fixtures/fixture-sessions-43-of-50.csv',directory),'utf8');
const sus=await readFile(new URL('fixtures/fixture-sus-75.csv',directory),'utf8');
const boundaries=JSON.parse(await readFile(new URL('fixtures/fixture-boundary-cases.json',directory),'utf8'));
const encode=(rows,columns)=>[columns.join(','),...rows.map(row=>columns.map(c=>'"'+String(row[c]??'').replaceAll('"','""')+'"').join(','))].join('\n')+'\n';
const modifySessions=fn=>{const rows=parseCsv(sessions,SESSION_COLUMNS,'fixture');fn(rows);return encode(rows,SESSION_COLUMNS);};
const modifySus=fn=>{const rows=parseCsv(sus,SUS_COLUMNS,'fixture');fn(rows);return encode(rows,SUS_COLUMNS);};

test('ARTIFICIAL fixtures: 43/50 meets strict completion; 42/50 does not',()=>{
 const pass=analyzeCsv(sessions,sus,{fixture:true});assert.equal(pass.data_kind,'ARTIFICIAL_ANALYZER_FIXTURE_NOT_HUMAN_DATA');assert.equal(pass.eligibility.n_eligible,10);assert.equal(pass.global.success_numerator,boundaries.minimum_successes_of_50);assert.equal(pass.global.primary_denominator,50);assert.equal(pass.global.completion_percent,86);assert.equal(pass.criteria.overall,'MET');
 const fail=analyzeCsv(modifySessions(rows=>{rows[0].status='FAIL';}),sus,{fixture:true});assert.equal(fail.global.success_numerator,boundaries.failing_successes_of_50);assert.equal(fail.criteria.conditions.completion_strictly_above_85,'NOT_MET');
});
test('SUS mean exactly 70 fails; individual 50 passes its inclusive condition',()=>{
 const exactly=analyzeCsv(sessions,modifySus(rows=>rows.forEach(r=>{r.item_1='3';r.item_3='3';})),{fixture:true});assert.equal(exactly.sus.mean_valid,70);assert.equal(exactly.criteria.conditions.sus_mean_strictly_above_70,'NOT_MET');
 const fifty=analyzeCsv(sessions,modifySus(rows=>{for(let n=1;n<=10;n++)rows[0][`item_${n}`]='3';}),{fixture:true});assert.equal(fifty.sus.min_valid,50);assert.equal(fifty.criteria.conditions.every_sus_at_least_50,'MET');assert.equal(fifty.criteria.overall,'MET');
});
test('49 boundary is tested as a predicate; integer-item SUS cannot produce 49',()=>{
 const predicate=evaluateCriteria({n:10,programs:{FIX_A:4,FIX_B:3,FIX_C:3},successes:43,started:50,susScores:[boundaries.individual_score_failing_predicate_only,...Array(9).fill(75)],tasksComplete:true});assert.equal(predicate.conditions.every_sus_at_least_50,'NOT_MET');
 assert.equal(susScore(Array(10).fill(3)),50);assert.equal(susScore([5,1,5,1,5,1,5,1,5,1]),100);assert.equal(susScore([1,5,1,5,1,5,1,5,1,5]),0);
});
test('missing SUS item or row is NE; available-case mean cannot approve missing SUS',()=>{
 const missing=analyzeCsv(sessions,modifySus(rows=>{rows[0].item_10='';}),{fixture:true});assert.equal(missing.participants[0].sus,'NE');assert.equal(missing.sus.n_NE,1);assert.equal(missing.sus.n_valid,9);assert.equal(missing.sus.mean_valid,75);assert.equal(missing.criteria.overall,'NE');
 const absent=analyzeCsv(sessions,modifySus(rows=>rows.pop()),{fixture:true});assert.equal(absent.criteria.overall,'NE');
 const adverse=analyzeCsv(sessions,modifySus(rows=>{rows[0].item_10='';for(let n=1;n<=10;n++)rows[1][`item_${n}`]=n%2===1?'1':'5';}),{fixture:true});assert.equal(adverse.sus.n_NE,1);assert.equal(adverse.sus.min_valid,0);assert.equal(adverse.criteria.conditions.every_sus_at_least_50,'NOT_MET');assert.equal(adverse.criteria.overall,'NOT_MET');
});
test('duplicate participant SUS and duplicate task are errors',()=>{
 assert.throws(()=>analyzeCsv(sessions,modifySus(rows=>rows.push({...rows[0]}))),/duplicate participant/u);
 assert.throws(()=>analyzeCsv(modifySessions(rows=>rows.push({...rows[0]})),sus),/duplicate participant\/task/u);
});
test('invalid status, negative seconds, invalid counts and invalid SUS are errors',()=>{
 for(const [column,value] of [['task_id','T06'],['status','PASS'],['seconds','-1'],['errors','1.5'],['assistance','NaN'],['technical_issue','unknown']])assert.throws(()=>analyzeCsv(modifySessions(rows=>{rows[0][column]=value;}),sus));
 for(const value of ['0','6','3.5'])assert.throws(()=>analyzeCsv(sessions,modifySus(rows=>{rows[0].item_1=value;})),/outside 1–5/u);
});
test('diversity and maximum program concentration are separate unchanged criteria',()=>{
 const two=analyzeCsv(modifySessions(rows=>rows.forEach(r=>{r.program_code=Number(r.participant_id.slice(1))<=5?'FIX_A':'FIX_B';})),sus,{fixture:true});assert.equal(two.criteria.conditions.minimum_three_programs,'NOT_MET');assert.equal(two.criteria.conditions.maximum_half_one_program,'MET');
 const six=analyzeCsv(modifySessions(rows=>rows.forEach(r=>{const n=Number(r.participant_id.slice(1));r.program_code=n<=6?'FIX_A':n<=8?'FIX_B':'FIX_C';})),sus,{fixture:true});assert.equal(six.criteria.conditions.minimum_three_programs,'MET');assert.equal(six.criteria.conditions.maximum_half_one_program,'NOT_MET');
 const nine=analyzeCsv(modifySessions(rows=>rows.splice(45,5)),modifySus(rows=>rows.pop()),{fixture:true});assert.equal(nine.eligibility.n_eligible,9);assert.equal(nine.criteria.conditions.minimum_n,'NOT_MET');
});
test('BLOCKED stays in denominator and counts; missing tasks cannot produce acceptance',()=>{
 const blocked=analyzeCsv(modifySessions(rows=>rows.forEach(r=>{if(r.status==='FAIL'){r.status='BLOCKED';r.technical_issue='NETWORK';}})),sus,{fixture:true});assert.equal(blocked.global.primary_denominator,50);assert.equal(blocked.global.status_counts.BLOCKED,7);assert.equal(blocked.global.completion_percent,86);
 const incomplete=analyzeCsv(modifySessions(rows=>rows.pop()),sus,{fixture:true});assert.equal(incomplete.global.primary_denominator,49);assert.equal(incomplete.planned_tasks,50);assert.equal(incomplete.unrecorded_tasks,1);assert.equal(incomplete.criteria.overall,'NE');
});
test('contradictory SUCCESS and BLOCKED records fail closed',()=>{
 assert.throws(()=>analyzeCsv(modifySessions(rows=>{rows[0].assistance='1';}),sus),/SUCCESS contradicts/u);
 assert.throws(()=>analyzeCsv(modifySessions(rows=>{rows[0].seconds='181';}),sus),/SUCCESS contradicts/u);
 assert.throws(()=>analyzeCsv(modifySessions(rows=>{rows[0].status='BLOCKED';}),sus),/requires a technical issue/u);
 const selfCorrected=analyzeCsv(modifySessions(rows=>{rows[0].errors='2';}),sus);assert.equal(selfCorrected.global.status_counts.SUCCESS,43);
});
test('participant IDs, program consistency, declared consent and eligibility are validated',()=>{
 for(const [column,value] of [['participant_id','P00'],['participant_id','person'],['program_code',''],['eligible','FALSE'],['consent_confirmed','FALSE']])assert.throws(()=>analyzeCsv(modifySessions(rows=>{rows[0][column]=value;}),sus));
 assert.throws(()=>analyzeCsv(modifySessions(rows=>{rows[0].program_code='FIX_OTHER';}),sus),/inconsistent program/u);
 assert.throws(()=>analyzeCsv(sessions,modifySus(rows=>{rows[0].participant_id='P99';})),/absent from session/u);
});
test('quoted commas, escaped quotes, multiline CSV, BOM, empty templates and malformed CSV',async()=>{
 const text=modifySessions(rows=>{rows[0].observation='Nota artificial, con "comillas"\ny segunda línea';});assert.equal(analyzeCsv('\uFEFF'+text,sus).global.started,50);
 const empty=analyzeCsv(await readFile(new URL('session-template.csv',directory),'utf8'),await readFile(new URL('sus-template.csv',directory),'utf8'));assert.equal(empty.execution_status,'NO_DATA');assert.equal(empty.criteria.overall,'NO_DATA');
 assert.throws(()=>parseCsv('a,a\n1,2\n',['a','b'],'fixture'),/duplicate CSV column/u);assert.throws(()=>parseCsv('a\n"x',['a'],'fixture'),/unterminated/u);assert.throws(()=>parseCsv('a\n"x"z\n',['a'],'fixture'),/closing CSV/u);
});
test('denominators and strict comparisons do not rely on rounding; output is reproducible',()=>{
 const exact85=evaluateCriteria({n:20,programs:{FIX_A:8,FIX_B:6,FIX_C:6},successes:85,started:100,susScores:Array(20).fill(75),tasksComplete:true});assert.equal(exact85.conditions.completion_strictly_above_85,'NOT_MET');
 assert.deepEqual(analyzeCsv(sessions,sus,{fixture:true}),analyzeCsv(sessions,sus,{fixture:true}));
 const result=analyzeCsv(sessions,sus,{fixture:true});assert.equal(result.by_task.T01.seconds_all_statuses.median,30);assert.equal(result.by_task.T01.seconds_all_statuses.min,30);assert.equal(result.by_task.T01.seconds_all_statuses.max,30);assert.equal(result.global.navigation_assistance,7);
 const varied=analyzeCsv(modifySessions(rows=>rows.forEach(r=>{if(r.task_id==='T01')r.seconds=String(Number(r.participant_id.slice(1))*10);})),sus,{fixture:true});assert.deepEqual(varied.by_task.T01.seconds_all_statuses,{n:10,median:55,min:10,max:100});
});
test('CLI writes only labelled artificial output and refuses overwriting raw input',async()=>{
 const output=join(tmpdir(),`fixture-oe5-analysis-${randomUUID()}.json`),script=fileURLToPath(new URL('./analyze-human-validation.mjs',import.meta.url)),session=fileURLToPath(new URL('fixtures/fixture-sessions-43-of-50.csv',directory)),questionnaire=fileURLToPath(new URL('fixtures/fixture-sus-75.csv',directory));
 try{execFileSync(process.execPath,[script,session,questionnaire,'--fixture','--output',output],{stdio:'pipe',windowsHide:true});const result=JSON.parse(await readFile(output,'utf8'));assert.equal(result.data_kind,'ARTIFICIAL_ANALYZER_FIXTURE_NOT_HUMAN_DATA');assert.throws(()=>execFileSync(process.execPath,[script,session,questionnaire,'--fixture','--output',session],{stdio:'pipe',windowsHide:true}));assert.throws(()=>execFileSync(process.execPath,[script,session,questionnaire],{stdio:'pipe',windowsHide:true}));}finally{await unlink(output).catch(()=>{});}
});
