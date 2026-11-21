import {addCivilDays} from './bogota-date';
const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'});
export function eventDay(timestamp:string):string {const parts=dateFormat.formatToParts(new Date(timestamp));return ['year','month','day'].map(key=>parts.find(p=>p.type===key)!.value).join('-');}
export function eventOverlapsDay(start:string,end:string|null,day:string):boolean {
 const from=eventDay(start);
 return day>=from&&day<=(end===null?from:eventDay(end));
}
export function monthStart(day:string):string {return day.slice(0,7)+'-01';}
export function moveMonth(day:string,offset:number):string {const [y,m]=day.split('-').map(Number),d=new Date(Date.UTC(y,m-1+offset,1));return d.toISOString().slice(0,10);}
export function calendarDays(month:string):string[]{const first=monthStart(month),d=new Date(first+'T12:00:00Z'),offset=(d.getUTCDay()+6)%7;const next=moveMonth(first,1),last=addCivilDays(next,-1),count=Number(last.slice(-2));return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>addCivilDays(first,i-offset));}
