#!/usr/bin/env node
// Read-only, bounded diagnosis. No document writes, publication or restoration.
// Run from backend/api with: node --import tsx ../../infra/scripts/...mjs --run-once
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,readdir,realpath,stat} from 'node:fs/promises';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertSource,safeRelative} from './verify-unified-recovery.mjs';
import {ccdArtifactStorage} from '../../backend/api/src/authenticated-main.ts';
import {getDocumentArtifact} from '../../backend/api/src/application/document-artifact.ts';
import {DocumentArtifactError} from '../../backend/api/src/application/document-artifact-errors.ts';

const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const TASK='OE6-CCD-HISTORICAL-ARTIFACTS-01';
const sha=b=>createHash('sha256').update(b).digest('hex');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const json=x=>JSON.stringify(x,null,2)+'\n';
const fail=code=>{throw new Error(code);};
function command(program,args,input){
 const env={...process.env};if(program==='powershell')delete env.PSModulePath;
 try{return execFileSync(program,args,{cwd:ROOT,env,input,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:30000,maxBuffer:16*1024*1024});}catch{fail('local_command_failed');}
}
const docker=args=>command('docker',args);
const inside=(base,target)=>{const r=relative(base,target);return r!==''&&r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r);};
export function classifyObservation({exists,available_sha256,expected_sha256,reused_by_current=false,correct_copy_elsewhere=false}){
 if(typeof exists!=='boolean')return 'E';
 if(!exists)return 'A';
 if(available_sha256===expected_sha256)return 'MATCH';
 if(reused_by_current)return 'D';
 if(correct_copy_elsewhere)return 'C';
 return 'B';
}
export async function inspectFile(base,path){
 safeRelative(path);const root=await realpath(base);const candidate=resolve(root,path);
 if(!inside(root,candidate))fail('artifact_path_outside_root');
 try{
  const actual=await realpath(candidate);
  if(!inside(root,actual)||!(await stat(actual)).isFile())fail('artifact_path_outside_root');
  const b=await readFile(actual);return {exists:true,sha256:sha(b),bytes:b.length};
 }catch(error){if(error.code==='ENOENT')return {exists:false};throw error;}
}
async function privateDirectory(){
 if(process.platform!=='win32'||!process.env.LOCALAPPDATA)fail('custodian_windows_required');
 const directory=resolve(process.env.LOCALAPPDATA,'BanuChat/diagnostics',TASK,randomUUID());
 await mkdir(directory,{recursive:true});
 const physical=await realpath(directory),local=await realpath(process.env.LOCALAPPDATA);
 if(!inside(local,physical)||inside(ROOT,physical))fail('private_custody_rejected');
 for(const c of [process.env.OneDrive,process.env.OneDriveConsumer,process.env.OneDriveCommercial].filter(Boolean))if(inside(resolve(c),physical))fail('cloud_custody_rejected');
 const sid=command('whoami',['/user','/fo','csv','/nh']).match(/S-1-[0-9-]+/)?.[0];if(!sid)fail('custodian_unavailable');
 command('icacls',[directory,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)(F)']);
 return directory;
}
async function walkMarkdown(base){
 const root=await realpath(base),files=[];let visited=0;
 async function walk(dir,depth){
  if(depth>8)fail('search_depth_limit');
  for(const d of await readdir(dir,{withFileTypes:true})){
   if(++visited>1800)fail('search_file_limit');
   if(d.isSymbolicLink())fail('search_symlink_rejected');
   const path=resolve(dir,d.name);if(!inside(root,path))fail('search_path_rejected');
   if(d.isDirectory())await walk(path,depth+1);
   else if(d.name.endsWith('.md')){
    const s=await stat(path);if(s.size>2*1024*1024)fail('search_size_limit');
    files.push({path,bytes:s.size,sha256:sha(await readFile(path))});
   }
  }
 }
 await walk(root,0);return files;
}
async function readMetadataArea(base){
 try{const rows=await Promise.all((await readdir(base,{withFileTypes:true})).filter(d=>d.isFile()).map(async d=>{const s=await stat(resolve(base,d.name));return {extension:d.name.includes('.')?d.name.slice(d.name.lastIndexOf('.')):'',bytes:s.size,modified:s.mtime.toISOString()};}));
  return {files:rows.length,earliest:rows.map(r=>r.modified).sort()[0],latest:rows.map(r=>r.modified).sort().at(-1),extensions:Object.fromEntries([...new Set(rows.map(r=>r.extension))].map(e=>[e,rows.filter(r=>r.extension===e).length]))};
 }catch(error){if(error.code==='ENOENT')return {files:0,available:false};throw error;}
}
export async function main(args){
 if(args.length!==1||args[0]!=='--run-once')fail('explicit_read_only_run_required');
 const recovery=resolve(process.env.LOCALAPPDATA,'BanuChat/recovery/OE6-UNIFIED-RECOVERY-01');
 const run='1d3b3e42-c077-43b7-a8f3-162ee35d933f',recoveryRun=resolve(recovery,run);
 // Custody checked before reading any recovery evidence or document file.
 const physicalRecovery=await realpath(recovery),physicalLocal=await realpath(process.env.LOCALAPPDATA);
 if(!inside(physicalLocal,physicalRecovery)||inside(ROOT,physicalRecovery))fail('recovery_custody_rejected');
 for(const c of [process.env.OneDrive,process.env.OneDriveConsumer,process.env.OneDriveCommercial].filter(Boolean))if(inside(resolve(c),physicalRecovery))fail('recovery_cloud_rejected');
 const directory=await privateDirectory();
 const report={task:TASK,started_at:new Date().toISOString(),base_head:command('git',['rev-parse','HEAD']).trim(),status:'RUNNING'};
 const prior=JSON.parse(await readFile(resolve(recoveryRun,'report-private.json'),'utf8'));
 const transfer=JSON.parse(await readFile(resolve(recovery,'custody-transfer.json'),'utf8'));
 const dump=await readFile(resolve(recoveryRun,'unified.dump'));
 if(sha(dump)!==prior.stores.unified.backup.sha256)fail('custody_dump_hash_mismatch');
 report.custody={outside_repository:true,outside_onedrive:true,prior_dump_hash_verified:true,transfer_at:transfer.at,
  historical_sync_risk:'NO DETERMINADO',cloud_access:false,metadata_scope:'Nonrecursive file sizes/extensions/timestamps only; no credentials, log decoding or cloud access',
  local_metadata:{logs:await readMetadataArea(resolve(process.env.LOCALAPPDATA,'Microsoft/OneDrive/logs/Personal')),settings:await readMetadataArea(resolve(process.env.LOCALAPPDATA,'Microsoft/OneDrive/settings/Personal'))}};
 const inspected=JSON.parse(docker(['inspect','banuchat-unified-postgres']))[0],identity=assertSource(inspected,'unified');
 const user=inspected.Config.Env.find(x=>x.startsWith('POSTGRES_USER='))?.slice('POSTGRES_USER='.length);if(!user)fail('source_admin_unavailable');
 const query=sql=>{
  const text=command('docker',['exec','-i',identity.id,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-U',user,'-d','banuchat_unified'],
   "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL statement_timeout='15s';SET LOCAL lock_timeout='3s';"+sql+";ROLLBACK;").trim();
  return JSON.parse(text);
 };
 const fingerprint=()=>query(`SELECT jsonb_build_object('tables',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname) ORDER BY 1) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('banuchat','banuchat_auth','banuchat_aux')))`);
 const tableList=fingerprint().tables;
 const tableHashes=()=>Object.fromEntries(tableList.map(([schema,name])=>[schema+'.'+name,query(`SELECT jsonb_build_object('rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(h,'' ORDER BY h),''),'UTF8')),'hex')) FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') h FROM "${schema}"."${name}" t) x`)]));
 const before=tableHashes();report.source_before=before;report.identity_before=identity;
 const rows=query(`SELECT jsonb_agg(to_jsonb(x) ORDER BY release_imported_at,source_path,document_version_id) FROM (
 SELECT r.id release_id,r.status release_status,r.imported_at release_imported_at,r.validated_at release_validated_at,
 r.dataset_schema_version,v.id document_version_id,v.document_id,v.version_label,v.source_path,v.source_sha256,v.processing_status,
 v.dataset_release_id=(SELECT current_release_id FROM banuchat.datasets WHERE id=1) is_current,
 (SELECT count(*) FROM banuchat.document_chunks c WHERE c.document_version_id=v.id) chunks,
 (SELECT count(*) FROM banuchat.document_chunks c WHERE c.document_version_id=v.id AND encode(sha256(convert_to(c.content,'UTF8')),'hex')=v.source_sha256) exact_chunk_bytes
 FROM banuchat.document_versions v JOIN banuchat.dataset_releases r ON r.id=v.dataset_release_id AND r.dataset_id=v.dataset_id) x`);
 const storage=ccdArtifactStorage(),observations=new Map(),affected=[];
 for(const row of rows){
  const key=[row.version_label,row.source_path,row.source_sha256].join('|');
  if(!observations.has(key)){
   const base=storage.version_roots[row.version_label];if(!base)fail('version_root_unadmitted');
   const available=await inspectFile(base,row.source_path);
   observations.set(key,{key,version_label:row.version_label,path:row.source_path,expected_sha256:row.source_sha256,available,rows:[]});
  }
  observations.get(key).rows.push(row);
 }
 for(const o of observations.values()){
  if(o.available.sha256===o.expected_sha256)continue;
  const samePath=rows.filter(r=>r.version_label===o.version_label&&r.source_path===o.path);
  o.available_matches=samePath.filter(r=>r.source_sha256===o.available.sha256).map(r=>({release:r.release_id,current:r.is_current,status:r.release_status,imported_at:r.release_imported_at}));
  o.distinct_path_hashes=[...new Set(samePath.map(r=>r.source_sha256))];
  o.category=classifyObservation({exists:o.available.exists,available_sha256:o.available.sha256,expected_sha256:o.expected_sha256,reused_by_current:o.available_matches.some(r=>r.current)&&o.rows.every(r=>!r.is_current)});
  affected.push(o);
 }
 if(observations.size!==251||affected.length!==33)fail('reference_inventory_changed');
 report.references=affected;
 const allowedSearch=[
  ...Object.entries(storage.version_roots).map(([label,path])=>({label:'runtime:'+label,path:resolve(path,'documents/artifacts')})),
  {label:'prior-recovery-verified-artifacts',path:resolve(recoveryRun,'artifacts')},
  {label:'p4b-audit-snapshot',path:resolve(ROOT,'data/ccd/local/p4b-canonical-candidate')},
  {label:'p4b1-audit-input-snapshot',path:resolve(ROOT,'data/ccd/local/p4b1-canonical-candidate-closure/audit-input-snapshot')},
 ];
 const inventory=[],searchSummary=[];
 for(const root of allowedSearch){
  let files;
  try{files=await walkMarkdown(root.path);}catch(error){if(error.code==='ENOENT'){searchSummary.push({root:root.label,available:false});continue;}throw error;}
  inventory.push(...files.map(f=>({...f,root:root.label})));
  searchSummary.push({root:root.label,available:true,markdown_files:files.length});
 }
 for(const o of affected){
  o.exact_file_copies=inventory.filter(f=>f.sha256===o.expected_sha256);
  o.category=classifyObservation({exists:o.available.exists,available_sha256:o.available.sha256,
   expected_sha256:o.expected_sha256,reused_by_current:o.available_matches.some(r=>r.current)&&o.rows.every(r=>!r.is_current),
   correct_copy_elsewhere:o.exact_file_copies.length>0});
 }
 report.search_scope=searchSummary;
 report.verified_copy_inventory=affected.map(o=>({key:o.key,file_copies:o.exact_file_copies,
  sql_exact_versions:o.rows.filter(r=>r.chunks===1&&r.exact_chunk_bytes===1).map(r=>r.document_version_id)}));
 const affectedRows=affected.flatMap(o=>o.rows),ids=affectedRows.map(r=>r.document_version_id);
 const selection=ids.map(quote).join(',');
 const impactSql=where=>`SELECT jsonb_build_object('citations',count(*),'messages',count(DISTINCT c.message_id),'conversations',count(DISTINCT m.conversation_id)) FROM banuchat.message_citations c JOIN banuchat.messages m ON m.id=c.message_id WHERE c.document_version_id IN (${where})`;
 report.impact=query(impactSql(selection));
 report.additional_impact=query(`WITH versions AS (SELECT * FROM banuchat.document_versions WHERE id IN (${selection})),citations AS (
 SELECT c.* FROM banuchat.message_citations c WHERE EXISTS(SELECT 1 FROM versions v WHERE c.document_version_id=v.id OR c.chunk_id IN(SELECT id FROM banuchat.document_chunks WHERE document_version_id=v.id) OR (c.source_kind='document' AND c.dataset_release_id=v.dataset_release_id AND c.source_path=v.source_path AND c.source_sha256=v.source_sha256)))
 SELECT jsonb_build_object('citations_by_version_chunk_or_provenance',(SELECT count(*) FROM citations),
 'conversations_via_citations',(SELECT count(DISTINCT m.conversation_id) FROM citations c JOIN banuchat.messages m ON m.id=c.message_id),
 'conversations_pinned_to_affected_release',(SELECT count(*) FROM banuchat.conversations WHERE dataset_release_id IN(SELECT dataset_release_id FROM versions)),
 'messages_pinned_to_affected_release',(SELECT count(*) FROM banuchat.messages WHERE answer_dataset_release_id IN(SELECT dataset_release_id FROM versions)))`);
 report.release_matrix=[...new Set(rows.map(r=>r.release_id))].map(id=>{
  const all=rows.filter(r=>r.release_id===id),a=affectedRows.filter(r=>r.release_id===id),first=all[0];
  return {release_id:id,status:first.release_status,schema:first.dataset_schema_version,is_current:first.is_current,imported_at:first.release_imported_at,versions:all.length,affected_versions:a.length,
   impact:a.length?query(impactSql(a.map(r=>quote(r.document_version_id)).join(','))):{citations:0,messages:0,conversations:0}};
 });
 const liveSql={async query(text,parameters=[]){
  if(parameters.length!==1||!/^\s*SELECT\s/i.test(text)||!text.includes('FROM banuchat.document_versions dv')||!/^[a-f0-9-]{36}$/i.test(parameters[0]))fail('artifact_service_query_rejected');
  const resolved=text.replaceAll('$1',quote(parameters[0]));
  return {rows:query("SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM ("+resolved+") s")};
 }};
 report.service_results=[];
 for(const row of affectedRows){
  try{await getDocumentArtifact(liveSql,{document_version_id:row.document_version_id},storage);report.service_results.push({id:row.document_version_id,result:'VERIFIED_BYTES'});}
  catch(error){if(!(error instanceof DocumentArtifactError))throw error;report.service_results.push({id:row.document_version_id,result:error.reason});}
 }
 const current=rows.find(r=>r.is_current);if(!current)fail('current_missing');
 report.current_service_sample=!!(await getDocumentArtifact(liveSql,{document_version_id:current.document_version_id},storage)).bytes.length;
 const after=tableHashes();report.source_after=after;
 const filesAfter=new Map();
 for(const [key,o]of observations)filesAfter.set(key,await inspectFile(storage.version_roots[o.version_label],o.path));
 report.preservation={tables:JSON.stringify(before)===JSON.stringify(after),identity:JSON.stringify(identity)===JSON.stringify(assertSource(JSON.parse(docker(['inspect','banuchat-unified-postgres']))[0],'unified')),
  runtime_files:[...observations].every(([key,o])=>JSON.stringify(o.available)===JSON.stringify(filesAfter.get(key))),
  candidate_files:(await Promise.all(inventory.map(async f=>sha(await readFile(f.path))===f.sha256))).every(Boolean),
  custody_dump:sha(await readFile(resolve(recoveryRun,'unified.dump')))===prior.stores.unified.backup.sha256};
 report.prior_chunk_fingerprint_matches=JSON.stringify(before['banuchat.document_chunks'])===JSON.stringify(prior.stores.unified.source.tables['banuchat.document_chunks']);
 if(Object.values(report.preservation).some(v=>!v))fail('source_integrity_mismatch');
 report.status='BANUCHAT_CCD_HISTORICAL_ARTIFACTS_DIAGNOSED';report.completed_at=new Date().toISOString();
 await writeFile(resolve(directory,'diagnosis-private.json'),json(report),{flag:'wx'});
 const categories=Object.fromEntries(['A','B','C','D','E'].map(k=>[k,affected.filter(o=>o.category===k).length]));
 const publicReport={task:TASK,status:report.status,at:report.completed_at,base_head:report.base_head,
  references:{total_distinct:observations.size,matching:observations.size-affected.length,affected:affected.length,categories,affected_document_versions:ids.length,distinct_paths:new Set(affected.map(o=>o.version_label+'|'+o.path)).size,affected_current_versions:affectedRows.filter(r=>r.is_current).length,current_verified:rows.filter(r=>r.is_current).length},
  releases:report.release_matrix.map((r,i)=>({release_alias:'R'+(i+1),...Object.fromEntries(Object.entries(r).filter(([key])=>key!=='release_id'))})),
  impact:report.impact,additional_impact:report.additional_impact,service:{not_found:report.service_results.filter(r=>r.result==='not_found').length,other_results:report.service_results.filter(r=>r.result!=='not_found').length,non_ready_release_versions:affectedRows.filter(r=>r.release_status!=='ready').length,live_hash_guard_reached:affectedRows.some(r=>r.release_status==='ready'&&r.processing_status==='ready'),current_sample_verified:report.current_service_sample,http_authentication_tested:false},
  copies:{references_with_exact_file:affected.filter(o=>o.exact_file_copies.length).length,physical_matches:affected.reduce((n,o)=>n+o.exact_file_copies.length,0),
   versions_with_one_exact_sql_chunk:affectedRows.filter(r=>r.chunks===1&&r.exact_chunk_bytes===1).length,prior_verified_backup_chunk_fingerprint_matches:report.prior_chunk_fingerprint_matches},
  search:searchSummary,preservation:report.preservation,custody:{historical_sync_risk:'NO DETERMINADO',current_custody_verified:true,metadata_only:true,cloud_access:false,local_metadata:report.custody.local_metadata},
  limitations:['No restoration, file copying to product, reconstruction or mapping changes','No cloud-account access or retrospective proof of synchronization','Direct artifact service + read-only SQL, no new session or HTTP route test','SQL hash equality identifies stored bytes, not an existing standalone artifact file','Bounded authorized-root search; no global claim that files do not exist elsewhere']};
 publicReport.observation={existing_file_wrong_hash:affected.filter(o=>o.available.exists&&o.available.sha256!==o.expected_sha256).length,
  ready_document_versions:report.release_matrix.filter(r=>r.status==='ready').reduce((n,r)=>n+r.versions,0),
  ready_affected_document_versions:report.release_matrix.filter(r=>r.status==='ready').reduce((n,r)=>n+r.affected_versions,0),
  staging_affected_document_versions:affectedRows.filter(r=>r.release_status==='staging').length};
 publicReport.copies.by_search_root=Object.fromEntries(searchSummary.map(s=>[s.root,affected.reduce((n,o)=>n+o.exact_file_copies.filter(f=>f.root===s.root).length,0)]));
 await writeFile(resolve(ROOT,'eval/oe6/results/ccd-historical-artifacts-2026-10-31.json'),json(publicReport));
 console.log(JSON.stringify({status:report.status,references:publicReport.references,impact:report.impact,copies:publicReport.copies,service:publicReport.service,search:searchSummary,preservation:report.preservation,custody_risk:'NO DETERMINADO',private_run:relative(resolve(process.env.LOCALAPPDATA),directory)}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main(process.argv.slice(2)).catch(error=>{console.error(JSON.stringify({status:'BANUCHAT_CCD_HISTORICAL_ARTIFACTS_PARTIAL',reason:/^[a-z0-9_]+$/.test(error.message)?error.message:'diagnosis_failed'}));process.exitCode=1;});
