import {randomUUID} from 'node:crypto';
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
import {cloudAcademicDisplay,cloudCourseLabel,isCloudStudent} from '../application/cloud-academic-display.js';
import {getDocumentArtifact,type DocumentArtifactStorage} from '../application/document-artifact.js';
import {ConversationActivityCoordinator} from '../http/conversation-activity.js';
import {knowledgeDefinition,type KnowledgeMode} from './knowledge-mode.js';
import {auxiliaryContext,unifiedProgress,unifiedCalendar,unifiedAnnouncements,unifiedResponder} from './unified-product.js';
import type {ConversationOrchestrator} from '../orchestration/n8n-conversation.js';
import type {PresentationCitation} from '../chat/chat-types.js';
import {readOe2Demo,type Oe2PublicationReader,type Oe2DemoKind,type Oe2DemoFilters} from '../application/oe2-demo.js';
import {readOe2Changes,type ChangeFilters} from '../application/oe2-changes.js';
import type {ApprovedReferences} from '../chat/approved-references.js';
import {createManagedMcpResponder,type ManagedMcpRuntime} from '../agent/managed-mcp-agent.js';
import type {ChatTurnRoute,DocumentRagResponder} from '../application/messages.js';
import type {ChatTurnObserver,ChatTurnOutcome} from '../orchestration/n8n-chat-execution.js';
import {withRagTurnMetrics,type RagStage,type RagTurnMetrics} from '../operations/rag-metrics.js';
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
   private readonly unified?:{mcp_environment:Record<string,string>;orchestrator?:ConversationOrchestrator;oe2_reader?:Oe2PublicationReader},
   private readonly references?:ApprovedReferences,private readonly publications?:Oe2PublicationReader,
   private readonly managedAgent?:ManagedMcpRuntime,private readonly chatObserver?:ChatTurnObserver,private readonly editorialNews=false,private readonly cloudAcademicLabels=false){this.transactions=new PgTransactionRunner(pool);}
 async demoOe2(token:string,kind:Oe2DemoKind,filters:Oe2DemoFilters,now:string){
  if(!this.unified&&!this.publications)throw new AuthError('NOT_FOUND');
  // Release the normal product connection before waiting on an optional source.
  await this.unit(token,async()=>undefined);
  return readOe2Demo(this.publications??this.unified?.oe2_reader,kind,filters,now);
 }
 async oe2Changes(token:string,filters:ChangeFilters){
  if(!this.unified&&!this.publications)throw new AuthError('NOT_FOUND');
  await this.unit(token,async()=>undefined);
  return readOe2Changes(this.publications??this.unified?.oe2_reader,filters);
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
  if(this.references){
   const sources=await this.references.sources(c,token,id);
   for(const m of result.messages){const source=sources.find(s=>s.message_id===m.message_id);if(source&&m.role==='assistant')m.citations=source.citations;}
  }
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
 async send(token:string,id:string,content:string,now:string,disconnected?:AbortSignal){
  // Authorization and owner check precede the activity gate (foreign UUID must remain 404).
  const turnContext=await this.unit(token,async(_c,ctx)=>ctx,id,true,true);
  const principal=turnContext.principal_id;
  if(!this.activity.tryBeginMessage(id))throw new AuthError('CONFLICT');
  const start=performance.now(), started_at=new Date().toISOString();
  const operation_id=this.chatObserver||this.managedAgent?randomUUID():undefined;
  let route:ChatTurnRoute|'unknown'='unknown';
  let sequence=0;
  let stage:RagStage|undefined;
  const rag:RagTurnMetrics|undefined=this.chatObserver?{ollama_calls:0,ollama_timeouts:0}:undefined;
  const timing=()=>({duration_ms:Math.round(performance.now()-start),...(stage?{stage}:{}),
   ...(stage&&rag?{rag}:{})});
  const observe=(event:ChatTurnOutcome)=>{
   if(!this.chatObserver||!operation_id)return;
   try{this.chatObserver({operation_id,sequence:sequence++,started_at,route,...timing(),...event});}
   catch{console.warn('BanuChat: no se pudo preparar un evento de chat para n8n.');}
  };
  const onRoute=(selected:ChatTurnRoute)=>{
   if(route===selected)return;
   route=selected;
   observe({status:'started'});
  };
  observe({status:'started'});
  try{const aux=this.unified?await auxiliaryContext(this.chat.sql,principal):undefined;
   const answer=this.unified&&aux?unifiedResponder({sql:this.chat.sql,router:this.chat.router,rag:this.chat.document_rag,principal,aux,...this.unified}):undefined;
   let citations:PresentationCitation[]=[];
   const documentRagForTurn:DocumentRagResponder=async query=>{
    const personal=/\bmi\s+(?:perfil acad[eé]mico|expediente|programa acad[eé]mico|semestre|per[ií]odo acad[eé]mico|historial acad[eé]mico|recursamiento|correo acad[eé]mico)\b/iu;
    if(this.evidenceMode!=='synthetic'||!personal.test(query.query))return this.chat.document_rag(query);
    const record=await this.academic(token);
    const s=record.student;
    const attempts=record.attempts as {course_name:string;attempt_number:number;outcome:string}[];
    const history=attempts.map(a=>`${a.course_name}, intento ${a.attempt_number}: ${a.outcome==='passed'?'aprobado':a.outcome==='failed'?'reprobado':'en curso'}`).join('\n');
    return {release_id:query.release_id,content:s?`Expediente de ${s.given_name} ${s.family_name}. ID ${s.academic_id}, ${s.email}. ${s.program_name}, semestre ${s.current_semester}, ${s.period_label}.\n${history||'Sin intentos registrados.'}`:'Tu cuenta no tiene un expediente académico asignado.',
     insufficient_evidence:false,citations:[],citation_records:[]};
   };
   if(this.managedAgent&&!turnContext.profile_key)throw new AuthError('FORBIDDEN');
   const managed=this.managedAgent?createManagedMcpResponder({...this.managedAgent,
    principal,profile_key:turnContext.profile_key!,rag:documentRagForTurn,onRoute,
    ...(operation_id?{operationId:operation_id}:{})}):undefined;
   const send=()=>sendMessage({...this.chat,demo_mode:this.evidenceMode,
   ...(this.references?{document_reference_release_id:this.references.releaseId}:{}),
   document_rag:documentRagForTurn,
   ...(managed?{agent_fallback:managed}:{}),
   ...(answer&&aux?{structured_release_id:aux.release_id,answer_responder:async query=>{const result=await answer(query);citations=result.citations;return result;}}:{}),
   read_context:operation=>this.unit(token,c=>operation(c),id,true,true),
   commit_turn:operation=>this.transactions.run(operation),
   persist:(c,values)=>this.references&&JSON.parse(values[6] as string).some((r:{dataset_release_id:string})=>r.dataset_release_id===this.references!.releaseId)
    ?c.query('SELECT * FROM banuchat_reference.persist_turn($1,$2,$3,$4,$5,$6,$7,$8)',[token,...values])
    :aux?c.query(`SELECT * FROM banuchat_auth.persist_unified_turn($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS t(
    status text,user_message_id uuid,user_ordinal integer,user_content banuchat.nonblank,user_created_at banuchat.finite_time,
    assistant_message_id uuid,assistant_ordinal integer,assistant_content banuchat.nonblank,assistant_created_at banuchat.finite_time,assistant_insufficient_evidence boolean)`,[token,...values,JSON.stringify(citations),aux.release_id]):c.query('SELECT * FROM banuchat_auth.persist_turn($1,$2,$3,$4,$5,$6,$7,$8)',[token,...values]),
  },{conversation_id:id,content,now},selected=>{
   if(!managed||selected!=='document_rag'||this.evidenceMode==='ccd_local')onRoute(selected);
  });
   const result=await (rag?withRagTurnMetrics(rag,send,active=>{
    stage=active;
    observe({status:'started'});
   }):send());
   const citationCount=result.assistant_message.citations.length;
   observe({finished_at:new Date().toISOString(),
    status:disconnected?.aborted?'cancelled':result.assistant_message.insufficient_evidence?
     (citationCount?'partial':'insufficient_evidence'):'answered',citation_count:citationCount});
   return result;
  }catch(error){
   const failure=resourceError(error);
   const finished_at=new Date().toISOString();
   observe(disconnected?.aborted?{finished_at,status:'cancelled',citation_count:0}:
    {finished_at,status:'error',error_code:failure.code});
   throw failure;
  }finally{this.activity.endMessage(id);}
 }
 async academic(token:string){
  if(this.evidenceMode!=='synthetic'||this.unified)throw new AuthError('NOT_FOUND');
  try {
   const record=(await this.pool.query(`SELECT student, attempts FROM banuchat_academic.read_me($1)`,[token])).rows[0]
    ?? {student:null,attempts:[]};
   return this.cloudAcademicLabels?cloudAcademicDisplay(record):record;
  } catch(error){throw resourceError(error);}
 }
 progress(token:string,input:Omit<ProfileProgressInput,'profile_key'>){return this.unit(token,async(c,ctx)=>{
  if(this.unified)return auxiliaryContext(c,ctx.principal_id).then(aux=>unifiedProgress(c,aux,{...input,profile_key:aux.profile_key}));
  if(this.evidenceMode==='ccd_local')throw new AuthError('FORBIDDEN');
  if(!ctx.profile_key)throw new AuthError('FORBIDDEN');
  const result=await getProfileProgress(c,{...input,profile_key:ctx.profile_key});
  return this.cloudAcademicLabels&&isCloudStudent(ctx.profile_key)?{...result,courses:result.courses.map(cloudCourseLabel)}:result;
 },null,true);}
 calendar(token:string,input:CalendarEventsInput){return this.unit(token,c=>{if(this.unified)return unifiedCalendar(c,input);if(this.evidenceMode==='ccd_local')throw new AuthError('FORBIDDEN');return getCalendarEvents(c,input,this.editorialNews);});}
 announcements(token:string,input:AnnouncementsInput){return this.unit(token,c=>{if(this.unified)return unifiedAnnouncements(c,input);if(this.evidenceMode==='ccd_local')throw new AuthError('FORBIDDEN');return getAnnouncements(c,input,this.editorialNews);});}
 artifact(token:string,id:string){return this.unit(token,async c=>{
  if(this.references){const artifact=await this.references.artifact(c,token,id);if(artifact)return artifact;}
  // Dataset/release authorization precedes filesystem access; historical ready versions are valid.
  if(!(await c.query(`SELECT v.id FROM banuchat.document_versions v JOIN banuchat.dataset_releases r
   ON r.id=v.dataset_release_id AND r.dataset_id=v.dataset_id WHERE v.id=$1 AND v.dataset_id=1
   AND r.status='ready' AND r.manifest->'synthetic'=$2::jsonb`,[id,JSON.stringify(knowledgeDefinition(this.evidenceMode).synthetic)])).rows.length)throw new AuthError('NOT_FOUND');
  return getDocumentArtifact(c,{document_version_id:id},this.artifacts);
 });}
}
