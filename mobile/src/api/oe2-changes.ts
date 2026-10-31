import {requestOe2,Oe2Error,formatOe2CivilDate} from './oe2-demo';
export type ChangeCategory='academic_offer'|'calls'|'news';
export type ChangeType='created'|'modified'|'removed';
export const FIELD_LABELS={title:'Título',course_code:'Código',period:'Periodo',mode:'Modalidad',start_date:'Inicio',end_date:'Finalización',audience:'Población',opens_at:'Apertura',closes_at:'Cierre',summary:'Resumen',source_version:'Versión de origen',source_published_at:'Publicación de origen'};
export type ChangeField=keyof typeof FIELD_LABELS;
export interface ChangeOrigin {source_id:string;record_id:string;source_version:string;source_published_at:string;observed_at:string}
export interface Oe2Change {id:string;category:ChangeCategory;change_type:ChangeType;title:string;current_available:boolean;previous_source:ChangeOrigin|null;current_source:ChangeOrigin|null;fields:{field:ChangeField;before:string|null;after:string|null}[]}
export interface ChangesResponse {evidence_mode:'fictional_auxiliary';comparison_status:'compared'|'no_previous';current_release_id:string;previous_release_id:string|null;current_published_at:string;previous_published_at:string|null;counts:{created:number;modified:number;removed:number;unchanged:number};matched_count:number;has_more:boolean;changes:Oe2Change[]}
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const instant=(v:unknown):v is string=>text(v)&&Number.isFinite(Date.parse(v));
const publicationTime=(v:unknown):v is string=>instant(v)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/u.test(v);
const uuid=(v:unknown)=>text(v)&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(v);
const origin=(v:unknown)=>record(v)&&['source_id','record_id','source_version'].every(k=>text(v[k]))&&instant(v.source_published_at)&&instant(v.observed_at)&&Object.keys(v).sort().join()==='observed_at,record_id,source_id,source_published_at,source_version';
export function parseChangesResponse(value:unknown):ChangesResponse {
 const fail=():never=>{throw new Oe2Error('invalid');};
 if(!record(value)||value.evidence_mode!=='fictional_auxiliary'||!uuid(value.current_release_id)||!publicationTime(value.current_published_at)||!record(value.counts)||!Array.isArray(value.changes)||value.changes.length>50||typeof value.has_more!=='boolean'||!Number.isInteger(value.matched_count)||(value.matched_count as number)<value.changes.length)return fail();
 const counts=value.counts;
 if(Object.keys(counts).sort().join()!=='created,modified,removed,unchanged'||!['created','modified','removed','unchanged'].every(k=>Number.isInteger(counts[k])&&Number(counts[k])>=0))return fail();
 if(Object.keys(value).sort().join()!=='changes,comparison_status,counts,current_published_at,current_release_id,evidence_mode,has_more,matched_count,previous_published_at,previous_release_id'||value.has_more!==((value.matched_count as number)>value.changes.length)||(value.matched_count as number)>Number(counts.created)+Number(counts.modified)+Number(counts.removed))return fail();
 if(value.comparison_status==='no_previous'){if(value.previous_release_id!==null||value.previous_published_at!==null||value.changes.length||Object.values(value.counts).some(v=>v!==0)||value.matched_count!==0||value.has_more)return fail();}
 else if(value.comparison_status!=='compared'||!uuid(value.previous_release_id)||value.previous_release_id===value.current_release_id||!publicationTime(value.previous_published_at)||value.previous_published_at>=value.current_published_at)return fail();
 const ids=new Set<string>();for(const r of value.changes){
  if(!record(r)||!text(r.id)||ids.has(r.id)||!text(r.title)||!['academic_offer','calls','news'].includes(String(r.category))||!['created','modified','removed'].includes(String(r.change_type))||!Array.isArray(r.fields)||r.fields.length===0||r.fields.length>Object.keys(FIELD_LABELS).length)return fail();ids.add(r.id);
  if(r.current_available!==(r.change_type!=='removed')||(r.change_type==='removed'?r.current_source!==null:!origin(r.current_source))||(r.change_type==='created'?r.previous_source!==null:!origin(r.previous_source)))return fail();
  if(r.change_type==='modified'&&record(r.current_source)&&record(r.previous_source)&&(r.current_source.source_id!==r.previous_source.source_id||r.current_source.record_id!==r.previous_source.record_id))return fail();
  const fields=new Set<string>();for(const f of r.fields){if(!record(f)||typeof f.field!=='string'||!Object.hasOwn(FIELD_LABELS,f.field)||fields.has(f.field)||!(f.before===null||text(f.before))||!(f.after===null||text(f.after))||f.before===f.after)return fail();fields.add(f.field);
   if(r.change_type==='removed'&&f.after!==null||r.change_type==='created'&&f.before!==null)return fail();
   if(['start_date','end_date'].includes(f.field))for(const date of [f.before,f.after])if(date!==null)formatOe2CivilDate(date as string);
   if(['opens_at','closes_at','source_published_at'].includes(f.field))for(const date of [f.before,f.after])if(date!==null&&!instant(date))return fail();
  }
 }
 return value as unknown as ChangesResponse;
}
export const getOe2Changes=(category?:ChangeCategory,changeType?:ChangeType)=>{const query=new URLSearchParams({limit:'20'});if(category)query.set('category',category);if(changeType)query.set('change_type',changeType);return requestOe2('changes?'+query,parseChangesResponse);};
export function formatChangeValue(field:ChangeField,value:string|null):string {
 if(value===null)return 'No presente';if(field==='start_date'||field==='end_date')return formatOe2CivilDate(value);
 if(['opens_at','closes_at','source_published_at'].includes(field))return formatChangeInstant(value);return value;
}
export const formatChangeInstant=(value:string)=>new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value));
export const CHANGE_LABELS:Record<ChangeType,string>={created:'Añadido',modified:'Modificado',removed:'Retirado'};
export const CATEGORY_LABELS:Record<ChangeCategory,string>={academic_offer:'Programación',calls:'Convocatorias',news:'Novedades'};
