import {isDeepStrictEqual} from 'node:util';
import {revalidateCandidate,type DemoCandidate} from '../../../rag/src/oe2/pipeline/projection.js';
import {AuthError} from '../auth/primitives.js';

export type Oe2DemoKind='programming'|'announcements';
export interface Oe2DemoFilters {query?:string;mode?:string;type?:'calls'|'news';temporal_status?:'all'|'upcoming'|'active'|'expired'|'published';limit?:number}
export interface Oe2Publication {
 valid:boolean;release_id:string;published_at:string;candidate:DemoCandidate;
 programming:Record<string,unknown>[];announcements:Record<string,unknown>[];
}
export interface Oe2PublicationReader {read():Promise<Oe2Publication>}
export interface Oe2PublicSource {source_id:string;record_id:string;source_version:string;published_at:string;record_sha256:string;snapshot_sha256:string}
export interface Oe2Programming {id:string;title:string;course_code:string;period:string;mode:string;start_date:string;end_date:string;temporal_status:'upcoming'|'in_progress'|'finished';source:Oe2PublicSource}
export interface Oe2Announcement {id:string;type:'calls'|'news';title:string;description:string;valid_from:string;valid_until:string|null;temporal_status:'upcoming'|'active'|'expired'|'published';source:Oe2PublicSource}
interface Envelope {release_id:string;published_at:string;reference_time:string;evidence_mode:'fictional_auxiliary'}
export type Oe2ProgrammingResponse=Envelope&{programming:Oe2Programming[]};
export type Oe2AnnouncementsResponse=Envelope&{announcements:Oe2Announcement[]};

/** Closed input shared by HTTP and the service. No user value becomes SQL. */
export function validateOe2Filters(kind:Oe2DemoKind,value:Oe2DemoFilters):void {
 const allowed=kind==='programming'?['query','mode','limit']:['query','type','temporal_status','limit'];
 if(Object.keys(value).some(k=>!allowed.includes(k)))throw new AuthError('INVALID_ARGUMENT');
 if(value.query!==undefined&&(typeof value.query!=='string'||[...value.query.trim()].length<2||[...value.query].length>100||/[\u0000-\u001f\u007f]/u.test(value.query)))throw new AuthError('INVALID_ARGUMENT');
 if(value.mode!==undefined&&(typeof value.mode!=='string'||!/^[a-z][a-z0-9_-]{0,39}$/u.test(value.mode)))throw new AuthError('INVALID_ARGUMENT');
 if(value.type!==undefined&&!['calls','news'].includes(value.type))throw new AuthError('INVALID_ARGUMENT');
 if(value.temporal_status!==undefined&&!['all','upcoming','active','expired','published'].includes(value.temporal_status))throw new AuthError('INVALID_ARGUMENT');
 if(value.limit!==undefined&&(!Number.isInteger(value.limit)||value.limit<1||value.limit>50))throw new AuthError('INVALID_ARGUMENT');
}
function source(c:DemoCandidate,category:'academic_offer'|'calls'|'news',id:string):Oe2PublicSource {
 const o=c.origins.find(r=>r.category===category&&r.record_id===id)!,a=c.artifacts.find(a=>a.category===category)!;
 return {source_id:o.source_id,record_id:o.record_id,source_version:o.source_version,published_at:new Date(o.published_at).toISOString(),record_sha256:o.record_sha256,snapshot_sha256:a.snapshot_sha256};
}
/** Verifies SQL projection against the approved immutable candidate before exposure. */
export function projectOe2Publication(p:Oe2Publication,kind:Oe2DemoKind,input:Oe2DemoFilters,now:string):Oe2ProgrammingResponse|Oe2AnnouncementsResponse {
 validateOe2Filters(kind,input);
 try{
  if(p.valid!==true||!Number.isFinite(Date.parse(now))||!Number.isFinite(Date.parse(p.published_at))||!/^[a-f0-9-]{36}$/u.test(p.release_id))throw Error();
  revalidateCandidate(p.candidate);const c=p.candidate;
  for(const [actual,expected,key]of [[p.programming,c.programming,'programming_key'],[p.announcements,c.announcements,'announcement_key']]as const){
   if(actual.length!==expected.length)throw Error();
   for(const record of expected){const a=actual.find(a=>a[key]===record.key);if(!a)throw Error();
    for(const [field,value]of Object.entries(record)){
     if(field==='key')continue;
     if(['valid_from','valid_until'].includes(field)&&value!==null){if(Date.parse(String(a[field]))!==Date.parse(String(value)))throw Error();}
     else if(!isDeepStrictEqual(a[field],value))throw Error();
    }
   }
  }
  const envelope:Envelope={release_id:p.release_id,published_at:new Date(p.published_at).toISOString(),reference_time:now,evidence_mode:'fictional_auxiliary'};
  const matches=(text:string)=>input.query===undefined||text.toLocaleLowerCase('es').includes(input.query.toLocaleLowerCase('es'));
  const n=input.limit??20;
  if(kind==='programming'){
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
   const programming=c.programming.filter(r=>matches(r.title+' '+r.course_code+' '+r.period)&&(input.mode===undefined||r.mode===input.mode)).slice(0,n).map((r):Oe2Programming=>({id:r.key,title:r.title,course_code:r.course_code,period:r.period,mode:r.mode,start_date:r.start_date,end_date:r.end_date,
    temporal_status:day<r.start_date?'upcoming':day>r.end_date?'finished':'in_progress',source:source(c,'academic_offer',r.record_id)}));
   return {...envelope,programming};
  }
  const announcements=c.announcements.map((r):Oe2Announcement=>({id:r.key,type:r.category,title:r.title,description:r.description,valid_from:new Date(r.valid_from).toISOString(),valid_until:r.valid_until===null?null:new Date(r.valid_until).toISOString(),
   temporal_status:Date.parse(now)<Date.parse(r.valid_from)?'upcoming':r.category==='news'?'published':r.valid_until!==null&&Date.parse(now)>Date.parse(r.valid_until)?'expired':'active',source:source(c,r.category,r.record_id)}))
   .filter(r=>(input.type===undefined||r.type===input.type)&&(input.temporal_status===undefined||input.temporal_status==='all'||r.temporal_status===input.temporal_status)&&matches(r.title+' '+r.description)).slice(0,n);
  return {...envelope,announcements};
 }catch{throw new AuthError('DEPENDENCY_UNAVAILABLE');}
}
export async function readOe2Demo(reader:Oe2PublicationReader|undefined,kind:Oe2DemoKind,input:Oe2DemoFilters,now:string){
 validateOe2Filters(kind,input);if(!reader)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 try{return projectOe2Publication(await reader.read(),kind,input,now);}catch{throw new AuthError('DEPENDENCY_UNAVAILABLE');}
}
