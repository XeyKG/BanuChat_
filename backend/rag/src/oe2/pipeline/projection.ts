import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseStrictJson} from '../../preflight/json.js';
import {extractOe2Fixture} from '../flow.js';
import {resolveOe2Source} from '../registry.js';
import type {Oe2Category,Oe2Snapshot} from '../types.js';

export const CATEGORIES=['academic_offer','calls','news'] as const;
export const SOURCES={academic_offer:'fixture-academic-offer-v1',calls:'fixture-calls-v1',news:'fixture-news-v1'} as const;
export const POLICY='oe2-pipeline-demo-1';
export const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export class ProjectionError extends Error {constructor(readonly code:'INVALID_SNAPSHOT'|'UNAPPROVED'|'STALE_BASE'|'INVALID_TARGET'){super('OE2 pipeline rejected: '+code);}}
const reject=():never=>{throw new ProjectionError('INVALID_SNAPSHOT');};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:reject();
const exact=(v:Record<string,unknown>,keys:string[])=>{if(Object.keys(v).sort().join('|')!==keys.sort().join('|'))reject();};

export interface SnapshotArtifact {category:Oe2Category;source_id:string;fixture_sha256:string;snapshot_sha256:string;json:string}
export interface Origin {category:Oe2Category;source_id:string;record_id:string;record_sha256:string;source_version:string;published_at:string;fields:Readonly<Record<string,string>>}
export interface ProjectedAnnouncement {key:string;category:'calls'|'news';record_id:string;title:string;description:string;valid_from:string;valid_until:string|null;source_path:string;source_locator:string;source_sha256:string}
export interface Programming {key:string;category:'academic_offer';record_id:string;title:string;course_code:string;period:string;mode:string;start_date:string;end_date:string;source_path:string;source_locator:string;source_sha256:string}
export interface DemoCandidate {policy:typeof POLICY;synthetic:true;content_sha256:string;artifacts:SnapshotArtifact[];origins:Origin[];announcements:ProjectedAnnouncement[];programming:Programming[]}

export function validateSnapshot(bytes:Buffer,category:Oe2Category):Oe2Snapshot {
 try{
  const raw=object(parseStrictJson(bytes));exact(raw,['schema_version','category','source_id','source_sha256','available_at','records']);
  if(raw.schema_version!=='oe2-snapshot-1'||raw.category!==category||raw.source_id!==SOURCES[category]
   ||typeof raw.source_sha256!=='string'||!/^[a-f0-9]{64}$/u.test(raw.source_sha256)||typeof raw.available_at!=='string'||!Number.isFinite(Date.parse(raw.available_at))
   ||!Array.isArray(raw.records)||raw.records.length===0)reject();
  resolveOe2Source(category,String(raw.source_id));
  const records=raw.records as unknown[];
  const rows=records.map(v=>{const r=object(v);exact(r,['category','source_id','source_record_id','title','published_at','source_version','fields','content_sha256']);
   if(r.category!==category||r.source_id!==SOURCES[category])reject();
   return {id:r.source_record_id,title:r.title,published_at:r.published_at,source_version:r.source_version,...object(r.fields)};
  });
  const validated=extractOe2Fixture(Buffer.from(JSON.stringify({schema_version:'oe2-fixture-1',category,records:rows})+'\n'),category,SOURCES[category]);
  if(!isDeepStrictEqual(raw.records,validated))reject();
  return raw as unknown as Oe2Snapshot;
 }catch{throw new ProjectionError('INVALID_SNAPSHOT');}
}

/** Identity excludes observation timestamps; approval still binds source bytes and every record. */
export function candidateIdentity(snapshots:readonly Pick<Oe2Snapshot,'category'|'source_id'|'source_sha256'|'records'>[]):string {
 return hash(JSON.stringify({policy:POLICY,sources:CATEGORIES.map(category=>{
  const matches=snapshots.filter(s=>s.category===category);if(matches.length!==1)reject();const s=matches[0]!;
  return {category,source_id:s.source_id,source_sha256:s.source_sha256,records:s.records};
 })}));
}

/** Operator-side planned identity; not represented as an observed acquisition. */
export function plannedFixtureIdentity(fixtures:Readonly<Record<Oe2Category,Buffer>>):string {
 return candidateIdentity(CATEGORIES.map(category=>({category,source_id:SOURCES[category],source_sha256:hash(fixtures[category]),
  records:extractOe2Fixture(fixtures[category],category,SOURCES[category])})));
}

export function prepareDemoCandidate(inputs:Readonly<Record<Oe2Category,Buffer>>):DemoCandidate {
 const snapshots=CATEGORIES.map(c=>validateSnapshot(inputs[c],c));
 const candidate:DemoCandidate={policy:POLICY,synthetic:true,content_sha256:candidateIdentity(snapshots),artifacts:[],origins:[],announcements:[],programming:[]};
 for(const s of snapshots){
  const json=inputs[s.category].toString('utf8'),snapshotHash=hash(json);
  candidate.artifacts.push({category:s.category,source_id:s.source_id,fixture_sha256:s.source_sha256,snapshot_sha256:snapshotHash,json});
  s.records.forEach((r,index)=>{
   const key='oe2-'+s.category+'-'+hash(r.source_id+'\0'+r.source_record_id).slice(0,40);
   const source={source_path:(s.category==='academic_offer'?'programming/':'announcements/')+'oe2-'+s.category+'.snapshot.json',source_locator:'/records/'+index,source_sha256:snapshotHash};
   candidate.origins.push({category:s.category,source_id:r.source_id,record_id:r.source_record_id,record_sha256:r.content_sha256,source_version:r.source_version,published_at:r.published_at,fields:r.fields});
   if(s.category==='academic_offer'){
    candidate.programming.push({key,category:'academic_offer',record_id:r.source_record_id,title:'[PROGRAMACIÓN FICTICIA OE2] '+r.title,
     course_code:r.fields.course_code!,period:r.fields.period!,mode:r.fields.mode!,start_date:r.fields.start_date!,end_date:r.fields.end_date!,...source});
   }else{
    candidate.announcements.push({key,category:s.category,record_id:r.source_record_id,
     title:(s.category==='calls'?'[CONVOCATORIA FICTICIA OE2] ':'[NOVEDAD FICTICIA OE2] ')+r.title,
     description:s.category==='calls'?`Población documentada: ${r.fields.audience}. Publicada: ${r.published_at}. Versión de origen: ${r.source_version}. No determina elegibilidad individual.`
      :`${r.fields.summary} Publicada: ${r.published_at}. Versión de origen: ${r.source_version}. Dato ficticio de demostración.`,
     valid_from:s.category==='calls'?r.fields.opens_at!:r.published_at,valid_until:s.category==='calls'?r.fields.closes_at!:null,...source});
   }
  });
 }
 return candidate;
}

export function revalidateCandidate(candidate:DemoCandidate):void {
 const inputs={} as Record<Oe2Category,Buffer>;
 for(const category of CATEGORIES){const artifacts=candidate.artifacts.filter(a=>a.category===category);if(artifacts.length!==1)reject();inputs[category]=Buffer.from(artifacts[0]!.json);}
 if(!isDeepStrictEqual(prepareDemoCandidate(inputs),candidate))reject();
}

export interface DemoApproval {scope:'fictional_auxiliary_only';policy:typeof POLICY;candidate_sha256:string;approval_ref:string}
export function requireApproval(candidate:DemoCandidate,approval:DemoApproval):void {
 if(approval.scope!=='fictional_auxiliary_only'||approval.policy!==POLICY||approval.candidate_sha256!==candidate.content_sha256
  ||typeof approval.approval_ref!=='string'||!/^OE2-PIPELINE-02\/[a-zA-Z0-9_-]{1,80}$/u.test(approval.approval_ref))throw new ProjectionError('UNAPPROVED');
}
