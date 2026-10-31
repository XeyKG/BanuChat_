import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {getDemoProgramming,currentDemoRelease} from '../../src/oe2/pipeline/publication.js';
const pool=new Pool({host:'127.0.0.1',database:'postgres',user:'banuchat_oe2_pipeline_reader',password:process.env.OE2_PIPELINE_READER_PASSWORD,options:'-c default_transaction_read_only=on'});
let result='PASS';const evidence:Record<string,unknown>={};
try{
 const before=await currentDemoRelease(pool),count=Number((await pool.query('SELECT count(*) n FROM public.oe2_pipeline_releases')).rows[0].n);
 const value=await getDemoProgramming(pool);assert.equal(value.programming.length,2);
 for(const row of value.programming){assert.match(row.start_date,/^\d{4}-\d{2}-\d{2}$/u);assert.match(row.end_date,/^\d{4}-\d{2}-\d{2}$/u);}
 const row=value.programming.find(p=>p.record_id==='OFF-001')!;assert.equal(row.start_date,'2026-11-03');assert.equal(row.end_date,'2026-11-28');
 assert.equal(await currentDemoRelease(pool),before);assert.equal(Number((await pool.query('SELECT count(*) n FROM public.oe2_pipeline_releases')).rows[0].n),count);
 Object.assign(evidence,{current_unchanged:before,release_count_unchanged:count,value});
}catch{result='FAIL';process.exitCode=1;}
finally{await writeFile('/outputs/read-check.json',JSON.stringify({at:new Date().toISOString(),result,evidence},null,2)+'\n');console.log(JSON.stringify({result,check:'civil_dates_preserved_by_real_programming_service'}));await pool.end();}
