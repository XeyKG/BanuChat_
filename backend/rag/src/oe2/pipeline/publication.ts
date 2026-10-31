import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {withWriterLease,type WriterLease} from '../../db/writer-lock.js';
import {DatabaseError} from '../../db/errors.js';
import {ProjectionError,revalidateCandidate,requireApproval,type DemoCandidate,type DemoApproval} from './projection.js';

export interface Publication {outcome:'published'|'unchanged';release_id:string;previous_release_id:string|null;content_sha256:string}
export async function assertDemoTarget(pool:Pool,writer=false):Promise<void>{
 const row=(await pool.query<{valid:boolean}>(`SELECT current_database()='postgres'
 AND to_regnamespace('banuchat') IS NULL AND marker='fictional-oe2-pipeline-demo-02'
 AND current_user=$1 AS valid FROM public.oe2_pipeline_scope WHERE singleton`,
 [writer?'banuchat_oe2_pipeline_writer':'banuchat_oe2_pipeline_reader'])).rows;
 if(row.length!==1||row[0]?.valid!==true)throw new ProjectionError('INVALID_TARGET');
}
export async function currentDemoRelease(pool:Pool):Promise<string|null>{return (await pool.query<{current_release_id:string|null}>('SELECT current_release_id FROM public.oe2_pipeline_datasets WHERE id=1')).rows[0]!.current_release_id;}

export async function publishDemoCandidate(input:{pool:Pool;candidate:DemoCandidate;approval:DemoApproval;expected_base_release_id:string|null;
 beforePointerSwap?:(lease:WriterLease)=>Promise<void>}):Promise<Publication>{
 revalidateCandidate(input.candidate);requireApproval(input.candidate,input.approval);await assertDemoTarget(input.pool,true);
 const c=input.candidate;
 try{return await withWriterLease(input.pool,lease=>lease.transaction(async()=>{
  const current=(await lease.query<{current_release_id:string|null}>('SELECT current_release_id FROM public.oe2_pipeline_datasets WHERE id=1 FOR UPDATE')).rows[0]!.current_release_id;
  const previous=current===null?undefined:(await lease.query<{content_sha256:string}>('SELECT content_sha256 FROM public.oe2_pipeline_releases WHERE id=$1 AND status=\'ready\'',[current])).rows[0];
  if(previous?.content_sha256===c.content_sha256)return {outcome:'unchanged',release_id:current!,previous_release_id:current,content_sha256:c.content_sha256};
  if(current!==input.expected_base_release_id)throw new ProjectionError('STALE_BASE');
  const id=randomUUID();
  await lease.query(`INSERT INTO public.oe2_pipeline_releases(id,status,embedding_config_id,content_sha256,approval_ref,candidate_text)
   SELECT $1,'staging',embedding_config_id,$2,$3,$4 FROM public.oe2_pipeline_scope WHERE singleton`,[id,c.content_sha256,input.approval.approval_ref,JSON.stringify(c)]);
  for(const s of c.artifacts)await lease.query('INSERT INTO public.oe2_pipeline_sources VALUES($1,$2,$3,$4,$5,$6)',[id,s.category,s.source_id,s.fixture_sha256,s.snapshot_sha256,s.json]);
  for(const o of c.origins)await lease.query('INSERT INTO public.oe2_pipeline_origins VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[id,o.category,o.source_id,o.record_id,o.record_sha256,o.source_version,o.published_at,JSON.stringify(o.fields)]);
  for(const a of c.announcements)await lease.query('INSERT INTO public.oe2_pipeline_announcements VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,a.key,a.category,a.record_id,a.title,a.description,a.valid_from,a.valid_until,a.source_path,a.source_locator,a.source_sha256]);
  for(const p of c.programming)await lease.query('INSERT INTO public.oe2_pipeline_programming VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[id,p.key,p.category,p.record_id,p.title,p.course_code,p.period,p.mode,p.start_date,p.end_date,p.source_path,p.source_locator,p.source_sha256]);
  const counts=(await lease.query<{sources:number;origins:number;announcements:number;programming:number}>(`SELECT
   (SELECT count(*)::int FROM public.oe2_pipeline_sources WHERE dataset_release_id=$1) sources,
   (SELECT count(*)::int FROM public.oe2_pipeline_origins WHERE dataset_release_id=$1) origins,
   (SELECT count(*)::int FROM public.oe2_pipeline_announcements WHERE dataset_release_id=$1) announcements,
   (SELECT count(*)::int FROM public.oe2_pipeline_programming WHERE dataset_release_id=$1) programming`,[id])).rows[0]!;
  if(counts.sources!==3||counts.origins!==c.origins.length||counts.announcements!==c.announcements.length||counts.programming!==c.programming.length)throw new ProjectionError('INVALID_SNAPSHOT');
  await input.beforePointerSwap?.(lease);
  await lease.query("UPDATE public.oe2_pipeline_releases SET status='ready',published_at=clock_timestamp() WHERE id=$1",[id]);
  await lease.query('UPDATE public.oe2_pipeline_datasets SET current_release_id=$1 WHERE id=1',[id]);
  return {outcome:'published',release_id:id,previous_release_id:current,content_sha256:c.content_sha256};
 }));}catch(error){if(error instanceof DatabaseError&&error.cause instanceof ProjectionError)throw error.cause;throw error;}
}

/** Reuses the existing read services. SQL and public contracts remain unchanged. */
export function demoReadSql(pool:Pool){return {async query<T>(text:string,values?:readonly unknown[]):Promise<{rows:T[]}>{
 if(!/^\s*SELECT\b/iu.test(text)||/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/iu.test(text))throw new ProjectionError('INVALID_TARGET');
 const names=[...text.matchAll(/banuchat\.([a-z_]+)/gu)].map(m=>m[1]!);
 if(!names.length||names.some(n=>!['datasets','dataset_releases','announcements'].includes(n)))throw new ProjectionError('INVALID_TARGET');
 const rewritten=text.replaceAll('banuchat.dataset_releases','public.oe2_pipeline_releases').replaceAll('banuchat.datasets','public.oe2_pipeline_datasets').replaceAll('banuchat.announcements','public.oe2_pipeline_announcements');
 const result=await pool.query(rewritten,values?[...values]:undefined);return {rows:result.rows as T[]};
}};}
export interface DemoProgrammingRow {
 dataset_release_id:string;programming_key:string;category:'academic_offer';record_id:string;title:string;
 course_code:string;period:string;mode:string;start_date:string;end_date:string;source_path:string;source_locator:string;source_sha256:string;
 source_id:string;fixture_sha256:string;snapshot_sha256:string;source_version:string;origin_published_at:Date|string;
}
export async function getDemoProgramming(pool:Pool){
 await assertDemoTarget(pool);
 const result=await pool.query<DemoProgrammingRow>(`SELECT p.*,to_char(p.start_date,'YYYY-MM-DD') AS start_date,to_char(p.end_date,'YYYY-MM-DD') AS end_date,
 s.source_id,s.fixture_sha256,s.snapshot_sha256,o.source_version,o.published_at AS origin_published_at
 FROM public.oe2_pipeline_datasets d JOIN public.oe2_pipeline_programming p ON p.dataset_release_id=d.current_release_id
 JOIN public.oe2_pipeline_origins o USING(dataset_release_id,category,record_id)
 JOIN public.oe2_pipeline_sources s USING(dataset_release_id,category)
 WHERE d.id=1 ORDER BY p.programming_key LIMIT 50`);
 return {evidence_mode:'fictional_auxiliary' as const,programming:result.rows};
}
