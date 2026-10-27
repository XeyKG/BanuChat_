import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const TASK_LIMITS = Object.freeze({T01:180,T02:480,T03:240,T04:300,T05:300});
export const SESSION_COLUMNS = Object.freeze(['participant_id','program_code','eligible','consent_confirmed','task_id','status','seconds','errors','assistance','technical_issue','observation']);
export const SUS_COLUMNS = Object.freeze(['participant_id',...Array.from({length:10},(_,i)=>`item_${i+1}`)]);
const PARTICIPANT = /^P(?:0[1-9]|[1-9][0-9]+)$/;
const PROGRAM = /^[A-Z][A-Z0-9_-]{0,31}$/;
const STATUSES = ['SUCCESS','FAIL','BLOCKED'];
const ISSUES = ['NONE','NETWORK','CRASH','API_UNAVAILABLE','DEVICE','OTHER'];
function requireValue(condition, message) { if (!condition) throw new Error(message); }

/** Small RFC 4180 reader: BOM, CRLF, quoted commas/newlines and doubled quotes. */
export function parseCsv(text, columns, label) {
  text = text.replace(/^\uFEFF/u,'');
  const rows=[]; let row=[],field='',quoted=false,closed=false;
  const pushField=()=>{row.push(field);field='';closed=false;};
  const pushRow=()=>{pushField();if(row.some(value=>value!==''))rows.push(row);row=[];};
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c==='"'){requireValue(!field&&!closed,`${label}: malformed CSV quote`);quoted=true;}
    else if(c===',')pushField();
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}
    else{requireValue(!closed,`${label}: text after closing CSV quote`);field+=c;}
  }
  requireValue(!quoted,`${label}: unterminated CSV quote`);
  if(field||row.length||closed)pushRow();
  requireValue(rows.length>0,`${label}: missing CSV header`);
  const header=rows.shift();
  requireValue(new Set(header).size===header.length,`${label}: duplicate CSV column`);
  requireValue(header.length===columns.length&&columns.every(c=>header.includes(c)),`${label}: unexpected CSV columns`);
  return rows.map((cells,i)=>{
    requireValue(cells.length===header.length,`${label}: row ${i+2} has wrong column count`);
    return Object.fromEntries(header.map((key,j)=>[key,cells[j].trim()]));
  });
}

function numeric(value, integer, label) {
  requireValue((integer?/^\d+$/u:/^\d+(?:\.\d+)?$/u).test(value),`${label}: expected nonnegative ${integer?'integer':'seconds'}`);
  const number=Number(value);
  requireValue(Number.isFinite(number)&&(!integer||Number.isSafeInteger(number)),`${label}: invalid numeric range`);
  return number;
}
export function susScore(items) {
  requireValue(items.length===10,'SUS requires ten items');
  requireValue(items.every(value=>value===null||(Number.isInteger(value)&&value>=1&&value<=5)),'SUS item outside 1–5');
  if(items.includes(null))return 'NE';
  return items.reduce((sum,value,i)=>sum+(i%2===0?value-1:5-value),0)*2.5;
}
const median=values=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
const state=value=>value?'MET':'NOT_MET';

/** Threshold predicates also accept a score of 49 for a boundary unit test.
 * Ten integer SUS responses actually produce only multiples of 2.5. */
export function evaluateCriteria({n,programs,successes,started,susScores,tasksComplete}) {
  const valid=susScores.filter(v=>v!=='NE');
  requireValue(valid.every(v=>Number.isFinite(v)&&v>=0&&v<=100),'Invalid SUS score');
  const hasData=n>0,allSus=hasData&&susScores.length===n&&valid.length===n;
  const counts=Object.values(programs),sum=valid.reduce((a,b)=>a+b,0);
  const conditions={
    minimum_n:hasData?state(n>=10):'NE',
    minimum_three_programs:hasData?state(counts.length>=3):'NE',
    maximum_half_one_program:hasData?state(Math.max(...counts)*2<=n):'NE',
    completion_strictly_above_85:started>0?state(successes*100>85*started):'NE',
    sus_mean_strictly_above_70:allSus?state(sum>70*valid.length):'NE',
    every_sus_at_least_50:valid.some(v=>v<50)?'NOT_MET':allSus?'MET':'NE',
    complete_task_records:hasData&&tasksComplete?'MET':'NE',
    complete_sus_records:allSus?'MET':'NE',
  };
  const values=Object.values(conditions);
  const overall=!hasData?'NO_DATA':values.includes('NOT_MET')?'NOT_MET':values.includes('NE')?'NE':'MET';
  return {conditions,overall,meaning:'Protocol threshold check only; not academic approval, human acceptance or closure of OE5'};
}

export function analyzeCsv(sessionCsv,susCsv,{fixture=false}={}) {
  const rows=parseCsv(sessionCsv,SESSION_COLUMNS,'sessions'),susRows=parseCsv(susCsv,SUS_COLUMNS,'SUS');
  const participants=new Map(),seen=new Set();
  const tasks=rows.map((row,i)=>{
    const label=`sessions row ${i+2}`;
    requireValue(PARTICIPANT.test(row.participant_id),`${label}: invalid participant_id`);
    requireValue(PROGRAM.test(row.program_code),`${label}: invalid program_code`);
    requireValue(row.eligible==='TRUE'&&row.consent_confirmed==='TRUE',`${label}: eligibility and consent must be confirmed before a task`);
    requireValue(Object.hasOwn(TASK_LIMITS,row.task_id),`${label}: invalid task_id`);
    requireValue(STATUSES.includes(row.status),`${label}: invalid status`);
    requireValue(ISSUES.includes(row.technical_issue),`${label}: invalid technical_issue code`);
    const key=`${row.participant_id}:${row.task_id}`;
    requireValue(!seen.has(key),`${label}: duplicate participant/task; separate and document repeat sessions`);seen.add(key);
    const seconds=numeric(row.seconds,false,label),errors=numeric(row.errors,true,label),assistance=numeric(row.assistance,true,label);
    requireValue(row.status!=='SUCCESS'||(seconds<=TASK_LIMITS[row.task_id]&&assistance===0),`${label}: SUCCESS contradicts time limit or navigation assistance`);
    requireValue(row.status!=='BLOCKED'||row.technical_issue!=='NONE',`${label}: BLOCKED requires a technical issue`);
    const previous=participants.get(row.participant_id);
    requireValue(!previous||previous.program_code===row.program_code,`${label}: inconsistent program for participant`);
    if(!previous)participants.set(row.participant_id,{participant_id:row.participant_id,program_code:row.program_code,tasks:[]});
    const task={participant_id:row.participant_id,task_id:row.task_id,status:row.status,seconds,errors,assistance,technical_issue:row.technical_issue};participants.get(row.participant_id).tasks.push(task);
    return task;
  });
  const sus=new Map();
  susRows.forEach((row,i)=>{
    const label=`SUS row ${i+2}`;
    requireValue(PARTICIPANT.test(row.participant_id),`${label}: invalid participant_id`);
    requireValue(!sus.has(row.participant_id),`${label}: duplicate participant`);
    requireValue(participants.has(row.participant_id),`${label}: participant absent from session records`);
    const items=Array.from({length:10},(_,j)=>{
      const value=row[`item_${j+1}`];requireValue(value===''||/^[1-5]$/u.test(value),`${label}: item_${j+1} outside 1–5`);return value===''?null:Number(value);
    });
    sus.set(row.participant_id,{score:susScore(items),missing_items:items.flatMap((v,j)=>v===null?[j+1]:[])});
  });
  const records=[...participants.values()].sort((a,b)=>a.participant_id.localeCompare(b.participant_id,'en'));
  const programs={};for(const p of records)programs[p.program_code]=(programs[p.program_code]??0)+1;
  const participantResults=records.map(p=>({participant_id:p.participant_id,program_code:p.program_code,missing_tasks:Object.keys(TASK_LIMITS).filter(id=>!p.tasks.some(t=>t.task_id===id)),sus:sus.get(p.participant_id)?.score??'NE',sus_record_present:sus.has(p.participant_id),missing_sus_items:sus.get(p.participant_id)?.missing_items??[1,2,3,4,5,6,7,8,9,10]}));
  function summarize(selected) {
    const status_counts=Object.fromEntries(STATUSES.map(s=>[s,selected.filter(t=>t.status===s).length]));
    const values=selected.map(t=>t.seconds),successTimes=selected.filter(t=>t.status==='SUCCESS').map(t=>t.seconds);
    return {started:selected.length,status_counts,success_numerator:status_counts.SUCCESS,primary_denominator:selected.length,completion_percent:selected.length?100*status_counts.SUCCESS/selected.length:null,seconds_all_statuses:{n:values.length,median:median(values),min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null},success_only_seconds:{n:successTimes.length,median:median(successTimes)},errors:selected.reduce((n,t)=>n+t.errors,0),navigation_assistance:selected.reduce((n,t)=>n+t.assistance,0),tasks_with_assistance:selected.filter(t=>t.assistance>0).length,technical_issues:Object.fromEntries(ISSUES.filter(s=>s!=='NONE').map(s=>[s,selected.filter(t=>t.technical_issue===s).length]))};
  }
  const global=summarize(tasks),scores=participantResults.map(p=>p.sus),valid=scores.filter(v=>v!=='NE'),n=records.length;
  return {
    schema_version:'oe5-human-analysis-1',protocol:'OE5-H0-CCD-1.0',
    data_kind:fixture?'ARTIFICIAL_ANALYZER_FIXTURE_NOT_HUMAN_DATA':'INPUT_REQUIRES_APPROVED_FREEZE_AND_CUSTODY',
    execution_status:n?'DATA_ANALYZED_NOT_ACCEPTANCE':'NO_DATA',
    inputs_sha256:{sessions:createHash('sha256').update(sessionCsv).digest('hex'),sus:createHash('sha256').update(susCsv).digest('hex')},
    eligibility:{n_eligible:n,source:'Distinct participants present in task records with moderator eligibility and consent attestations; reconcile with the approved eligible-participant register before interpretation',entirely_absent_participants_not_detectable_from_two_CSVs:true},
    program_distribution:programs,planned_tasks:5*n,started_tasks:tasks.length,unrecorded_tasks:5*n-tasks.length,
    denominator_rule:'All initiated tasks from eligible consenting participants, including BLOCKED; missing tasks prevent declaring acceptance',
    global,by_task:Object.fromEntries(Object.keys(TASK_LIMITS).map(id=>[id,summarize(tasks.filter(t=>t.task_id===id))])),
    participants:participantResults,
    sus:{n_valid:valid.length,n_NE:n-valid.length,mean_valid:valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null,min_valid:valid.length?Math.min(...valid):null,imputation:false,not_a_percent_correct:true},
    criteria:evaluateCriteria({n,programs,successes:global.success_numerator,started:tasks.length,susScores:scores,tasksComplete:participantResults.every(p=>p.missing_tasks.length===0)}),
    human_acceptance:'NOT_ESTABLISHED_BY_ANALYZER',OE5_original_closure:'NOT_ESTABLISHED_BY_ANALYZER',
  };
}

async function main(args) {
  requireValue(args.length>=2,'Usage: node eval/mobile/analyze-human-validation.mjs session.csv sus.csv [--fixture] [--output output.json]');
  const [sessionPath,susPath,...options]=args;let fixture=false,output=null;
  for(let i=0;i<options.length;i++){
    if(options[i]==='--fixture'&&!fixture)fixture=true;
    else if(options[i]==='--output'&&!output&&options[i+1])output=options[++i];
    else throw new Error('Invalid analyzer option');
  }
  const fixtureNames=[sessionPath,susPath].map(p=>/^fixture-/u.test(p.replaceAll('\\','/').split('/').at(-1)));
  if(fixture)requireValue(fixtureNames.every(Boolean),'Artificial fixture filenames must start with fixture-');
  else requireValue(!fixtureNames.some(Boolean),'Artificial fixture inputs require --fixture');
  if(output)requireValue(![sessionPath,susPath].some(p=>resolve(p)===resolve(output)),'Output must not overwrite raw inputs');
  const result=analyzeCsv(await readFile(sessionPath,'utf8'),await readFile(susPath,'utf8'),{fixture});
  const json=JSON.stringify(result,null,2)+'\n';if(output)await writeFile(output,json);else process.stdout.write(json);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main(process.argv.slice(2)).catch(error=>{const message=error?.code?'file operation failed':error instanceof Error?error.message:'invalid input';process.stderr.write(`Analyzer rejected input: ${message}\n`);process.exitCode=1;});
}
