import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import type {Oe2Publication,Oe2PublicationReader} from '../application/oe2-demo.js';
import {AuthError} from '../auth/primitives.js';

const container='banuchat-oe6-local-postgres-synthetic-1';
// Existing source listens only on Docker's Linux host loopback. Use its local
// psql socket and existing restricted role; never expose another port or password.
const sql=`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object(
 'valid',current_database()='postgres' AND current_user='banuchat_oe2_pipeline_reader'
 AND current_setting('transaction_read_only')='on' AND to_regnamespace('banuchat') IS NULL
 AND (SELECT marker='fictional-oe2-pipeline-demo-02' FROM public.oe2_pipeline_scope WHERE singleton)
 AND r.content_sha256=(r.candidate_text::jsonb->>'content_sha256'),
 'release_id',r.id,'published_at',r.published_at,'candidate',r.candidate_text::json,
 'programming',(SELECT coalesce(json_agg(p),'[]') FROM (SELECT p.*,to_char(start_date,'YYYY-MM-DD') start_date,to_char(end_date,'YYYY-MM-DD') end_date FROM public.oe2_pipeline_programming p WHERE dataset_release_id=r.id ORDER BY programming_key LIMIT 51)p),
 'announcements',(SELECT coalesce(json_agg(a),'[]') FROM (SELECT * FROM public.oe2_pipeline_announcements WHERE dataset_release_id=r.id ORDER BY announcement_key LIMIT 101)a))
FROM public.oe2_pipeline_datasets d JOIN public.oe2_pipeline_releases r ON r.id=d.current_release_id
WHERE d.id=1 AND d.name='banuchat-oe2-pipeline-fixtures' AND r.status='ready';
ROLLBACK;`;
const command=promisify(execFile);
export async function loadLocalOe2Reader(configFile:URL):Promise<Oe2PublicationReader|undefined>{
 let config:unknown;try{config=JSON.parse(await readFile(configFile,'utf8'));}catch(error){
  if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;
  return {read:async()=>{throw new AuthError('DEPENDENCY_UNAVAILABLE');}};
 }
 const expected={enabled:true,transport:'docker_local_psql',container,database:'postgres',role:'banuchat_oe2_pipeline_reader'};
 const value=config as Record<string,unknown>|null;
 const valid=value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()===Object.keys(expected).sort().join()
  &&Object.entries(expected).every(([key,wanted])=>value[key]===wanted);
 return {async read(){
  try{
   if(!valid)throw Error();
   const inspected=await command('docker',['inspect','--format','{{json .}}',container],{windowsHide:true,timeout:3000,maxBuffer:128*1024});
   const c=JSON.parse(inspected.stdout);
   if(c.Name!=='/'+container||c.State.Running!==true||c.HostConfig.NetworkMode!=='host'||!c.Mounts.some((m:{Name:string})=>m.Name==='banuchat-schema-test_pgvector_data'))throw Error();
   const result=await new Promise<string>((resolve,reject)=>{
    const child=execFile('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','banuchat_oe2_pipeline_reader','-d','postgres'],
     {windowsHide:true,timeout:5000,maxBuffer:1024*1024},(error,stdout)=>error?reject(error):resolve(stdout));child.stdin?.end(sql);
   });
   // PostgreSQL json_agg can format arrays over multiple physical lines. This
   // fixed query returns one JSON value; parse the bounded value as a whole.
   return JSON.parse(result.trim()) as Oe2Publication;
  }catch{throw new AuthError('DEPENDENCY_UNAVAILABLE');}
 }};
}
