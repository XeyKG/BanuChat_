import {isDeepStrictEqual} from 'node:util';
import {requireApproval,POLICY,type Origin} from '../../../rag/src/oe2/pipeline/projection.js';
import {AuthError} from '../auth/primitives.js';
import {validateOe2Publication,type Oe2Publication,type Oe2PublicationHistory,type Oe2PublicationReader} from './oe2-demo.js';

export type ChangeCategory='academic_offer'|'calls'|'news';
export type ChangeType='created'|'modified'|'removed';
export const CHANGE_FIELDS=['title','course_code','period','mode','start_date','end_date','audience','opens_at','closes_at','summary','source_version','source_published_at']as const;
export type ChangeField=typeof CHANGE_FIELDS[number];
export interface ChangeFilters {category?:ChangeCategory;change_type?:ChangeType;limit?:number}
export interface ChangeOrigin {source_id:string;record_id:string;source_version:string;source_published_at:string;observed_at:string}
export interface Oe2Change {id:string;category:ChangeCategory;change_type:ChangeType;title:string;current_available:boolean;
 previous_source:ChangeOrigin|null;current_source:ChangeOrigin|null;fields:{field:ChangeField;before:string|null;after:string|null}[]}
export interface Oe2ChangesResponse {
 evidence_mode:'fictional_auxiliary';comparison_status:'compared'|'no_previous';
 current_release_id:string;previous_release_id:string|null;current_published_at:string;previous_published_at:string|null;
 counts:{created:number;modified:number;removed:number;unchanged:number};matched_count:number;has_more:boolean;changes:Oe2Change[];
}
export function validateChangeFilters(filters:ChangeFilters):void {
 if(Object.keys(filters).some(k=>!['category','change_type','limit'].includes(k))
  ||(filters.category!==undefined&&!['academic_offer','calls','news'].includes(filters.category))
  ||(filters.change_type!==undefined&&!['created','modified','removed'].includes(filters.change_type))
  ||(filters.limit!==undefined&&(!Number.isInteger(filters.limit)||filters.limit<1||filters.limit>50)))throw new AuthError('INVALID_ARGUMENT');
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
/** PostgreSQL UTC timestamps retain all six fractional digits; never sort UUIDs. */
function orderTimestamp(value:string):string {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/u.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,19)!==value.slice(0,19))throw Error();return value;
}
function selectedPair(h:Oe2PublicationHistory):[Oe2Publication,Oe2Publication|null,string,string|null]{
 if(!uuid.test(h.current_release_id)||!Array.isArray(h.timeline)||!h.timeline.length||h.timeline.length>100)throw Error();
 const ids=new Set<string>(),dates=new Set<string>();
 for(const t of h.timeline){const date=orderTimestamp(t.published_at);if(!uuid.test(t.release_id)||ids.has(t.release_id)||dates.has(date))throw Error();ids.add(t.release_id);dates.add(date);}
 const timeline=[...h.timeline].sort((a,b)=>a.published_at<b.published_at?-1:a.published_at>b.published_at?1:0);
 const current=timeline.at(-1)!;if(current.release_id!==h.current_release_id)throw Error();const previous=timeline.at(-2);
 if(h.publications.length!==(previous?2:1)||new Set(h.publications.map(p=>p.release_id)).size!==h.publications.length)throw Error();
 const find=(t:typeof current)=>{const p=h.publications.find(p=>p.release_id===t.release_id);if(!p)throw Error();validateOe2Publication(p);
  if(p.published_at!==t.published_at||p.candidate.content_sha256!==t.content_sha256)throw Error();
  requireApproval(p.candidate,{scope:'fictional_auxiliary_only',policy:POLICY,candidate_sha256:t.content_sha256,approval_ref:t.approval_ref});return p;};
 return [find(current),previous?find(previous):null,current.published_at,previous?.published_at??null];
}
interface RecordVersion {id:string;origin:ChangeOrigin;fields:Partial<Record<ChangeField,string>>}
function versions(p:Oe2Publication):Map<string,RecordVersion>{
 const result=new Map<string,RecordVersion>();for(const o of p.candidate.origins){
  const snapshot=p.candidate.artifacts.find(a=>a.category===o.category)!;const records=JSON.parse(snapshot.json).records as {source_record_id:string;title:string}[];
  const record=records.find(r=>r.source_record_id===o.record_id)!;
  const fields:Partial<Record<ChangeField,string>>={title:record.title,...o.fields,source_version:o.source_version,source_published_at:new Date(o.published_at).toISOString()};
  for(const field of ['opens_at','closes_at']as const)if(fields[field]!==undefined)fields[field]=new Date(fields[field]!).toISOString();
  const projection=[...p.candidate.programming,...p.candidate.announcements].find(r=>r.category===o.category&&r.record_id===o.record_id)!;
  const key=identity(o);if(result.has(key))throw Error();result.set(key,{id:projection.key,fields,origin:{source_id:o.source_id,record_id:o.record_id,source_version:o.source_version,source_published_at:fields.source_published_at!,observed_at:new Date(JSON.parse(snapshot.json).available_at).toISOString()}});
 }return result;
}
const identity=(o:Pick<Origin,'category'|'source_id'|'record_id'>)=>JSON.stringify([o.category,o.source_id,o.record_id]);
/** Compare validated persisted records; snapshot observation times are provenance only. */
export function compareOe2History(history:Oe2PublicationHistory,filters:ChangeFilters={}):Oe2ChangesResponse {
 validateChangeFilters(filters);
 try{
  const [current,previous,currentDate,previousDate]=selectedPair(history);
  const response:Oe2ChangesResponse={evidence_mode:'fictional_auxiliary',comparison_status:previous?'compared':'no_previous',current_release_id:current.release_id,previous_release_id:previous?.release_id??null,current_published_at:currentDate,previous_published_at:previousDate,
   counts:{created:0,modified:0,removed:0,unchanged:0},matched_count:0,has_more:false,changes:[]};
  if(!previous)return response;
  const before=versions(previous),after=versions(current),changes:Oe2Change[]=[];
  for(const key of [...new Set([...before.keys(),...after.keys()])].sort()){
   const old=before.get(key),now=after.get(key),category=JSON.parse(key)[0]as ChangeCategory;
   if(old&&now&&isDeepStrictEqual(old.fields,now.fields)){response.counts.unchanged++;continue;}
   const change_type:ChangeType=!old?'created':!now?'removed':'modified';response.counts[change_type]++;
   changes.push({id:(now??old)!.id,category,change_type,title:(now??old)!.fields.title!,current_available:!!now,previous_source:old?.origin??null,current_source:now?.origin??null,
    fields:CHANGE_FIELDS.filter(f=>(old?.fields[f]??null)!==(now?.fields[f]??null)).map(field=>({field,before:old?.fields[field]??null,after:now?.fields[field]??null}))});
  }
  const selected=changes.filter(c=>(filters.category===undefined||c.category===filters.category)&&(filters.change_type===undefined||c.change_type===filters.change_type));
  response.matched_count=selected.length;response.changes=selected.slice(0,filters.limit??20);response.has_more=selected.length>response.changes.length;return response;
 }catch{throw new AuthError('DEPENDENCY_UNAVAILABLE');}
}
export async function readOe2Changes(reader:Oe2PublicationReader|undefined,filters:ChangeFilters){
 validateChangeFilters(filters);if(!reader?.readHistory)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 try{return compareOe2History(await reader.readHistory(),filters);}catch{throw new AuthError('DEPENDENCY_UNAVAILABLE');}
}
