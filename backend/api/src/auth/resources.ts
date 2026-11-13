import type {Pool} from 'pg';
import type {SqlQueryClient} from '../data/sql-client.js';
import {PgTransactionRunner} from '../data/transaction.js';
import {AuthError,safeError} from './primitives.js';
import {describeHttpError} from '../http/http-errors.js';
import {createConversation} from '../application/conversations.js';
import {listConversations} from '../application/conversation-history.js';
import {getConversationDetail} from '../application/conversation-detail.js';
import {deleteConversation} from '../application/delete-conversation.js';
import {sendMessage,type SendMessageDependencies} from '../application/messages.js';
import {getProfileProgress,type ProfileProgressInput} from '../application/profile-progress.js';
import {getCalendarEvents,type CalendarEventsInput} from '../application/calendar-events.js';
import {getAnnouncements,type AnnouncementsInput} from '../application/announcements.js';
import {getDocumentArtifact,type DocumentArtifactStorage} from '../application/document-artifact.js';
import {ConversationActivityCoordinator} from '../http/conversation-activity.js';
import {knowledgeDefinition,type KnowledgeMode} from './knowledge-mode.js';
import {auxiliaryContext,unifiedProgress,unifiedCalendar,unifiedAnnouncements,unifiedResponder} from './unified-product.js';
import type {ConversationOrchestrator} from '../orchestration/n8n-conversation.js';
import type {PresentationCitation} from '../chat/chat-types.js';
import {readOe2Demo,type Oe2PublicationReader,type Oe2DemoKind,type Oe2DemoFilters} from '../application/oe2-demo.js';
import {readOe2Changes,type ChangeFilters} from '../application/oe2-changes.js';
interface ResourceContext {principal_id:string;session_id:string;profile_key:string|null;release_id:string|null;}
export function resourceError(error:unknown):AuthError {
 if(error instanceof AuthError)return error;
 const code=(error as {code?:string}|null)?.code;
 const map:Record<string,ConstructorParameters<typeof AuthError>[0]>={P0400:'INVALID_ARGUMENT',P0401:'UNAUTHENTICATED',P0403:'FORBIDDEN',P0404:'NOT_FOUND',P0409:'CONFLICT',P0500:'INTERNAL_ERROR'};
 if(code && map[code])return new AuthError(map[code]);
 const app=describeHttpError(error);return app.code==='INTERNAL_ERROR'?safeError(error):new AuthError(app.code);
}
/** Permanent protected use cases. Token only reaches auth/SQL, never dispatch or RAG. */
export class AuthenticatedResources {
 private readonly transactions:PgTransactionRunner;
 private readonly activity=new ConversationActivityCoordinator();
 constructor(private readonly pool:Pool,private readonly chat:Omit<SendMessageDependencies,'demo_mode'|'read_context'|'commit_turn'|'persist'>,
   private readonly artifacts?:DocumentArtifactStorage,private readonly evidenceMode:KnowledgeMode='synthetic',
   private readonly unified?:{mcp_environment:Record<string,string>;orchestrator?:ConversationOrchestrator;oe2_reader?:Oe2PublicationReader}){this.transactions=new PgTransactionRunner(pool);}
 async demoOe2(token:string,kind:Oe2DemoKind,filters:Oe2DemoFilters,now:string){
  if(!this.unified)throw new AuthError('NOT_FOUND');
  // Release the normal product connection before waiting on an optional source.
  await this.unit(token,async()=>undefined);
  return readOe2Demo(this.unified.oe2_reader,kind,filters,now);
 }
 async oe2Changes(token:string,filters:ChangeFilters){
  if(!this.unified)throw new AuthError('NOT_FOUND');
  await this.unit(token,async()=>undefined);
  return readOe2Changes(this.unified.oe2_reader,filters);
 }
 private async unit<T>(token:string,operation:(c:SqlQueryClient,context:ResourceContext)=>Promise<T>,id:string|null=null,binding=false,turn=false):Promise<T>{
  try{return await this.transactions.run(async c=>{
   const ctx=(await c.query<ResourceContext>('SELECT * FROM banuchat_auth.resource_context($1,$2,$3,$4)',[token,id,binding,turn])).rows[0];
   if(!ctx)throw new AuthError('INTERNAL_ERROR');return operation(c,ctx);
  });}catch(error){throw resourceError(error);}
 }
 create(token:string){return this.unit(token,async(c,ctx)=>{
  if(!ctx.profile_key)throw new AuthError('FORBIDDEN');const result=await createConversation(c,{profile_key:ctx.profile_key},this.evidenceMode);
  await c.query('INSERT INTO banuchat_auth.conversation_owners(conversation_id,principal_id) VALUES($1,$2)',[result.conversation_id,ctx.principal_id]);return result;
 },null,true);}
 list(token:string,limit?:number){return this.unit(token,(c,ctx)=>listConversations(c,limit===undefined?{}:{limit},ctx.principal_id));}
 detail(token:string,id:string){return this.unit(token,async c=>{
  const result=await getConversationDetail(c,{conversation_id:id},this.evidenceMode);
  if(this.unified){const sources=await c.query<{message_id:string;citations:PresentationCitation[]}>('SELECT t.message_id,t.citations FROM banuchat_aux.turn_sources t JOIN banuchat.messages m ON m.id=t.message_id WHERE m.conversation_id=$1',[id]);
   for(const m of result.messages){const source=sources.rows.find(s=>s.message_id===m.message_id);if(source&&m.role==='assistant')m.citations=source.citations;}}
  return result;
 },id);}
 async remove(token:string,id:string):Promise<void>{
  return this.unit(token,async c=>{
   if(!this.activity.tryBeginDelete(id))throw new AuthError('CONFLICT');
   try{await deleteConversation(c,{conversation_id:id});}finally{this.activity.endDelete(id);}
  },id);
 }
 async send(token:string,id:string,content:string,now:string){
  // Authorization and owner check precede the activity gate (foreign UUID must remain 404).
  const principal=await this.unit(token,async(_c,ctx)=>ctx.principal_id,id,true,true);
  if(!this.activity.tryBeginMessage(id))throw new AuthError('CONFLICT');
  try{const aux=this.unified?await auxiliaryContext(this.chat.sql,principal):undefined;
   const answer=this.unified&&aux?unifiedResponder({sql:this.chat.sql,router:this.chat.router,rag:this.chat.document_rag,principal,aux,...this.unified}):undefined;
   let citations:PresentationCitation[]=[];
   return await sendMessage({...this.chat,demo_mode:this.evidenceMode,
   document_rag:async query=>{
    const personal=/\bmi\s+(?:perfil acad[eé]mico|expediente|programa acad[eé]mico|semestre|per[ií]odo acad[eé]mico|historial acad[eé]mico|recursamiento|correo acad[eé]mico)\b/iu;
    if(this.evidenceMode!=='synthetic'||!personal.test(query.query))return this.chat.document_rag(query);
    const record=await this.academic(token);
    const s=record.student;
    const attempts=record.attempts as {course_name:string;attempt_number:number;outcome:string}[];
    const history=attempts.map(a=>`${a.course_name}, intento ${a.attempt_number}: ${a.outcome==='passed'?'aprobado':a.outcome==='failed'?'reprobado':'en curso'}`).join('\n');
    return {release_id:query.release_id,content:s?`Expediente ficticio de ${s.given_name} ${s.family_name}. ID ${s.academic_id}, ${s.email}. ${s.program_name}, semestre ${s.current_semester}, ${s.period_label}.\n${history||'Sin intentos registrados.'}`:'Tu cuenta no tiene un expediente académico ficticio asignado.',
     insufficient_evidence:false,citations:[],citation_records:[]};
   },
   ...(answer&&aux?{structured_release_id:aux.release_id,answer_responder:async query=>{const result=await answer(query);citations=result.citations;return result;}}:{}),
   read_context:operation=>this.unit(token,c=>operation(c),id,true,true),
   commit_turn:operation=>this.transactions.run(operation),
   persist:(c,values)=>aux?c.query(`SELECT * FROM banuchat_auth.persist_unified_turn($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS t(
    status text,user_message_id uuid,user_ordinal integer,user_content banuchat.nonblank,user_created_at banuchat.finite_time,
    assistant_message_id uuid,assistant_ordinal integer,assistant_content banuchat.nonblank,assistant_created_at banuchat.finite_time,assistant_insufficient_evidence boolean)`,[token,...values,JSON.stringify(citations),aux.release_id]):c.query('SELECT * FROM banuchat_auth.persist_turn($1,$2,$3,$4,$5,$6,$7,$8)',[token,...values]),
  },{conversation_id:id,content,now});}catch(error){throw resourceError(error);}finally{this.activity.endMessage(id);}
 }
 async academic(token:string){
  if(this.evidenceMode!=='synthetic'||this.unified)throw new AuthError('NOT_FOUND');
  try {
   return (await this.pool.query(`SELECT student, attempts FROM banuchat_academic.read_me($1)`,[token])).rows[0]
    ?? {student:null,attempts:[]};
  } catch(error){throw resourceError(error);}
 }
 progress(token:string,input:Omit<ProfileProgressInput,'profile_key'>){return this.unit(token,(c,ctx)=>{
  if(this.unified)return auxiliaryContext(c,ctx.principal_id).then(aux=>unifiedProgress(c,aux,{...input,profile_key:aux.profile_key}));
  if(this.evidenceMode==='ccd_local')throw new AuthError('FORBIDDEN');
  if(!ctx.profile_key)throw new AuthError('FORBIDDEN');return getProfileProgress(c,{...input,profile_key:ctx.profile_key});
 },null,true);}
 calendar(token:string,input:CalendarEventsInput){return this.unit(token,c=>{if(this.unified)return unifiedCalendar(c,input);if(this.evidenceMode==='ccd_local')throw new AuthError('FORBIDDEN');return getCalendarEvents(c,input);});}
 announcements(token:string,input:AnnouncementsInput){return this.unit(token,c=>{if(this.unified)return unifiedAnnouncements(c,input);if(this.evidenceMode==='ccd_local')throw new AuthError('FORBIDDEN');return getAnnouncements(c,input);});}
 artifact(token:string,id:string){return this.unit(token,async c=>{
  // Dataset/release authorization precedes filesystem access; historical ready versions are valid.
  if(!(await c.query(`SELECT v.id FROM banuchat.document_versions v JOIN banuchat.dataset_releases r
   ON r.id=v.dataset_release_id AND r.dataset_id=v.dataset_id WHERE v.id=$1 AND v.dataset_id=1
   AND r.status='ready' AND r.manifest->'synthetic'=$2::jsonb`,[id,JSON.stringify(knowledgeDefinition(this.evidenceMode).synthetic)])).rows.length)throw new AuthError('NOT_FOUND');
  return getDocumentArtifact(c,{document_version_id:id},this.artifacts);
 });}
}
