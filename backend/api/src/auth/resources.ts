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
   private readonly artifacts?:DocumentArtifactStorage){this.transactions=new PgTransactionRunner(pool);}
 private async unit<T>(token:string,operation:(c:SqlQueryClient,context:ResourceContext)=>Promise<T>,id:string|null=null,binding=false,turn=false):Promise<T>{
  try{return await this.transactions.run(async c=>{
   const ctx=(await c.query<ResourceContext>('SELECT * FROM banuchat_auth.resource_context($1,$2,$3,$4)',[token,id,binding,turn])).rows[0];
   if(!ctx)throw new AuthError('INTERNAL_ERROR');return operation(c,ctx);
  });}catch(error){throw resourceError(error);}
 }
 create(token:string){return this.unit(token,async(c,ctx)=>{
  if(!ctx.profile_key)throw new AuthError('FORBIDDEN');const result=await createConversation(c,{profile_key:ctx.profile_key});
  await c.query('INSERT INTO banuchat_auth.conversation_owners(conversation_id,principal_id) VALUES($1,$2)',[result.conversation_id,ctx.principal_id]);return result;
 },null,true);}
 list(token:string,limit?:number){return this.unit(token,(c,ctx)=>listConversations(c,limit===undefined?{}:{limit},ctx.principal_id));}
 detail(token:string,id:string){return this.unit(token,c=>getConversationDetail(c,{conversation_id:id}),id);}
 async remove(token:string,id:string):Promise<void>{
  return this.unit(token,async c=>{
   if(!this.activity.tryBeginDelete(id))throw new AuthError('CONFLICT');
   try{await deleteConversation(c,{conversation_id:id});}finally{this.activity.endDelete(id);}
  },id);
 }
 async send(token:string,id:string,content:string,now:string){
  // Authorization and owner check precede the activity gate (foreign UUID must remain 404).
  await this.unit(token,async()=>{},id,true,true);
  if(!this.activity.tryBeginMessage(id))throw new AuthError('CONFLICT');
  try{return await sendMessage({...this.chat,demo_mode:'synthetic',
   read_context:operation=>this.unit(token,c=>operation(c),id,true,true),
   commit_turn:operation=>this.transactions.run(operation),
   persist:(c,values)=>c.query('SELECT * FROM banuchat_auth.persist_turn($1,$2,$3,$4,$5,$6,$7,$8)',[token,...values]),
  },{conversation_id:id,content,now});}catch(error){throw resourceError(error);}finally{this.activity.endMessage(id);}
 }
 progress(token:string,input:Omit<ProfileProgressInput,'profile_key'>){return this.unit(token,(c,ctx)=>{
  if(!ctx.profile_key)throw new AuthError('FORBIDDEN');return getProfileProgress(c,{...input,profile_key:ctx.profile_key});
 },null,true);}
 calendar(token:string,input:CalendarEventsInput){return this.unit(token,c=>getCalendarEvents(c,input));}
 announcements(token:string,input:AnnouncementsInput){return this.unit(token,c=>getAnnouncements(c,input));}
 artifact(token:string,id:string){return this.unit(token,async c=>{
  // Dataset/release authorization precedes filesystem access; historical ready versions are valid.
  if(!(await c.query(`SELECT v.id FROM banuchat.document_versions v JOIN banuchat.dataset_releases r
   ON r.id=v.dataset_release_id AND r.dataset_id=v.dataset_id WHERE v.id=$1 AND v.dataset_id=1
   AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb`,[id])).rows.length)throw new AuthError('NOT_FOUND');
  return getDocumentArtifact(c,{document_version_id:id},this.artifacts);
 });}
}
