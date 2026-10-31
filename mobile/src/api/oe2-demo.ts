import {getApiBaseUrl} from '../config/api';
import {resourceFetch,getAuthSession} from '../auth/runtime';

export type Oe2Category='programming'|'calls'|'news';
export interface Oe2Source {source_id:string;record_id:string;source_version:string;published_at:string;record_sha256:string;snapshot_sha256:string}
export interface Programming {id:string;title:string;course_code:string;period:string;mode:string;start_date:string;end_date:string;temporal_status:'upcoming'|'in_progress'|'finished';source:Oe2Source}
export interface Publication {id:string;type:'calls'|'news';title:string;description:string;valid_from:string;valid_until:string|null;temporal_status:'upcoming'|'active'|'expired'|'published';source:Oe2Source}
export interface Oe2Response {release_id:string;published_at:string;reference_time:string;evidence_mode:'fictional_auxiliary';programming?:Programming[];announcements?:Publication[]}
export type Oe2ErrorKind='connection'|'unavailable'|'session'|'invalid';
export class Oe2Error extends Error {constructor(readonly kind:Oe2ErrorKind){super(kind);}}
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const instant=(v:unknown)=>text(v)&&Number.isFinite(Date.parse(v));
const civil=(v:unknown):v is string=>text(v)&&/^\d{4}-\d{2}-\d{2}$/u.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
function origin(v:unknown):v is Oe2Source {return record(v)&&['source_id','record_id','source_version'].every(k=>text(v[k]))&&instant(v.published_at)&&['record_sha256','snapshot_sha256'].every(k=>typeof v[k]==='string'&&/^[a-f0-9]{64}$/u.test(v[k] as string))&&!('source_path'in v);}
export function parseOe2Response(value:unknown,category:Oe2Category):Oe2Response {
 const invalid=():never=>{throw new Oe2Error('invalid');};
 if(!record(value)||value.evidence_mode!=='fictional_auxiliary'||!text(value.release_id)||!/^[a-f0-9-]{36}$/u.test(value.release_id)||!instant(value.published_at)||!instant(value.reference_time))return invalid();
 const key=category==='programming'?'programming':'announcements',rows=value[key];if(!Array.isArray(rows)||rows.length>50)return invalid();
 for(const r of rows){if(!record(r)||!text(r.id)||!text(r.title)||!origin(r.source))return invalid();
  if(category==='programming'){if(!['course_code','period','mode'].every(k=>text(r[k]))||!civil(r.start_date)||!civil(r.end_date)||r.start_date>r.end_date||!['upcoming','in_progress','finished'].includes(String(r.temporal_status)))return invalid();}
  else if(!['calls','news'].includes(String(r.type))||r.type!==category||!text(r.description)||!instant(r.valid_from)||(r.valid_until!==null&&!instant(r.valid_until))||
   !(r.type==='news'?['upcoming','published']:['upcoming','active','expired']).includes(String(r.temporal_status))||(r.type==='news'&&r.valid_until!==null))return invalid();
 }
 return value as unknown as Oe2Response;
}
export async function getOe2Demo(category:Oe2Category,query='',status='all'):Promise<Oe2Response>{
 const filters=new URLSearchParams({limit:'20'});if(query.trim())filters.set('query',query.trim());
 if(category!=='programming'){filters.set('type',category);filters.set('temporal_status',status);}
 return requestOe2(`${category==='programming'?'programming':'announcements'}?${filters}`,value=>parseOe2Response(value,category));
}
export async function requestOe2<T>(path:string,parse:(value:unknown)=>T):Promise<T>{
 try{
  const r=await resourceFetch(`${getApiBaseUrl()}/demo/oe2/${path}`);
  if(r.status===401)throw new Oe2Error('session');if(r.status===503)throw new Oe2Error('unavailable');if(r.status!==200)throw new Oe2Error('connection');
  return parse(await r.json());
 }catch(error){if(error instanceof Oe2Error)throw error;try{if(getAuthSession().getSnapshot().phase==='signed_out')throw new Oe2Error('session');}catch(sessionError){if(sessionError instanceof Oe2Error)throw sessionError;}throw new Oe2Error('connection');}
}
/** Civil dates are labels, never instants passed through a timezone conversion. */
export function formatOe2CivilDate(value:string):string {if(!civil(value))throw new Oe2Error('invalid');const [y,m,d]=value.split('-');return `${d}/${m}/${y}`;}
export const OE2_ERROR_TEXT:Record<Oe2ErrorKind,string>={connection:'No fue posible conectar. Comprueba la conexión y vuelve a intentar.',unavailable:'La fuente de demostración no está disponible. El chat y las demás funciones siguen separados.',session:'Tu sesión expiró. Vuelve a iniciar sesión.',invalid:'No fue posible verificar la publicación de demostración.'};
export const OE2_STATUS_TEXT:Record<string,string>={upcoming:'Próxima',in_progress:'En curso',finished:'Finalizada',active:'Abierta',expired:'Cerrada',published:'Publicada · sin vencimiento documentado'};
