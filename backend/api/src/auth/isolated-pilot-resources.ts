import type {Pool} from 'pg';
import type {SqlQueryClient} from '../data/sql-client.js';
import type {AuthPrincipal,AuthService} from './auth-service.js';
import {AuthError} from './primitives.js';
import type {IsolatedPilotScope} from './isolated-pilot-scope.js';
import {assertIsolatedPilotAuthScope} from './isolated-pilot-scope.js';
import type {IntentRouter} from '../routing/intent-router-types.js';
import type {DocumentRagInput} from '../chat/document-rag.js';
import type {PilotAnswer} from '../chat/ccd-operational-pilot.js';
import {getDocumentArtifact,type DocumentArtifactStorage} from '../application/document-artifact.js';
import {ConversationActivityCoordinator} from '../http/conversation-activity.js';
import {boundConversationContext} from '../chat/conversation-context.js';
import type {ConversationMessage} from '../chat/conversation-context.js';
import {createAuthenticatedApiServer} from '../http/api-v2-server.js';
import {AuthService as CoreAuth} from './auth-service.js';
import {resourceError} from './resources.js';

const profile={profile_key:'ccd-local-demo',alias:'Demostración CCD local — sin identidad institucional'};
interface Conversation {id:string;principal_id:string;release_id:string;started_at:Date}
interface StoredMessage {id:string;role:'user'|'assistant';content:string;created_at:Date;insufficient_evidence:boolean;citations:PilotAnswer['citations']}
/** Fixed candidate, normal v2 authentication, separate temporary history. Never installed by npm start. */
export class IsolatedPilotResources {
 private readonly activity=new ConversationActivityCoordinator();
 constructor(private readonly auth:AuthService,private readonly scope:IsolatedPilotScope,private readonly deployment:string,
  private readonly responder:(input:DocumentRagInput)=>Promise<PilotAnswer>,private readonly router:IntentRouter,
  private readonly storage:DocumentArtifactStorage,private readonly trace?:(event:{query:DocumentRagInput;answer:PilotAnswer;route:string})=>void){}
 private unit<T>(token:string,operation:(sql:SqlQueryClient,principal:AuthPrincipal)=>Promise<T>){
  return this.auth.withAuthorizedAccess(token,async(c,p)=>{
   const r=await c.query<{allowed:boolean}>('SELECT banuchat_auth.lock_pilot_scope($1,$2,$3,$4) AS allowed',[p.principalId,this.deployment,this.scope.release_id,this.scope.manifest_sha256]);
   if(r.rows[0]?.allowed!==true)throw new AuthError('FORBIDDEN');return operation(c,p);
  });
 }
 private async owned(c:SqlQueryClient,p:AuthPrincipal,id:string,lock=false){
  const r=await c.query<Conversation>('SELECT * FROM banuchat_pilot_http.conversations WHERE id=$1 AND principal_id=$2'+(lock?' FOR UPDATE':''),[id,p.principalId]);
  const row=r.rows[0];if(!row)throw new AuthError('NOT_FOUND');if(row.release_id!==this.scope.release_id)throw new AuthError('CONFLICT');return row;
 }
 create(token:string){return this.unit(token,async(c,p)=>{
  const r=await c.query<Conversation>('INSERT INTO banuchat_pilot_http.conversations(principal_id,release_id) VALUES($1,$2) RETURNING *',[p.principalId,this.scope.release_id]);const row=r.rows[0]!;
  return {conversation_id:row.id,profile_key:profile.profile_key,profile_alias:profile.alias,created_at:row.started_at.toISOString()};
 });}
 list(token:string,limit=20){return this.unit(token,async(c,p)=>{
  const r=await c.query<{id:string;started_at:Date;last_message_at:Date|null;message_count:number}>(`SELECT c.id,c.started_at,max(m.created_at) AS last_message_at,count(m.id)::int AS message_count
    FROM banuchat_pilot_http.conversations c LEFT JOIN banuchat_pilot_http.messages m ON m.conversation_id=c.id WHERE c.principal_id=$1 GROUP BY c.id ORDER BY c.started_at DESC,c.id LIMIT $2`,[p.principalId,limit]);
  return {conversations:r.rows.map(r=>({conversation_id:r.id,profile_key:profile.profile_key,started_at:r.started_at.toISOString(),last_message_at:r.last_message_at?.toISOString()??null,message_count:r.message_count}))};
 });}
 detail(token:string,id:string){return this.unit(token,async(c,p)=>{
  const row=await this.owned(c,p,id);const ms=await c.query<StoredMessage>('SELECT * FROM banuchat_pilot_http.messages WHERE conversation_id=$1 ORDER BY ordinal',[id]);
  return {conversation_id:id,started_at:row.started_at.toISOString(),profile,messages:ms.rows.map(m=>{const common={message_id:m.id,content:m.content,created_at:m.created_at.toISOString()};return m.role==='assistant'?{...common,role:'assistant' as const,insufficient_evidence:m.insufficient_evidence,citations:m.citations}:{...common,role:'user' as const};})};
 });}
 async remove(token:string,id:string){await this.unit(token,async(c,p)=>{
  await this.owned(c,p,id,true);if(!this.activity.tryBeginDelete(id))throw new AuthError('CONFLICT');
  try{await c.query('DELETE FROM banuchat_pilot_http.conversations WHERE id=$1',[id]);}finally{this.activity.endDelete(id);}
 });}
 async send(token:string,id:string,content:string,now:string){
  const state=await this.unit(token,async(c,p)=>{
   await this.owned(c,p,id);const r=await c.query<{role:'user'|'assistant';content:string;ordinal:number}>('SELECT role,left(content,1200) AS content,ordinal FROM banuchat_pilot_http.messages WHERE conversation_id=$1 ORDER BY ordinal DESC LIMIT 8',[id]);
   return {next:r.rows[0]?r.rows[0].ordinal+1:0,history:boundConversationContext(r.rows.slice().reverse() as ConversationMessage[])};
  });
  if(!this.activity.tryBeginMessage(id))throw new AuthError('CONFLICT');
  try{
   const query={release_id:this.scope.release_id,query:content,history:state.history};
   const decision=this.router.route({content,context:{profile_selected:true,now}});
   const answer=await this.responder(query);
   if(answer.release_id!==this.scope.release_id||!answer.content.trim()||answer.citations.length!==answer.citation_records.length||answer.citations.some((x,i)=>x.index!==i||x.source_kind!=='document'||x.release_id!==this.scope.release_id||x.document_version_id!==answer.citation_records[i]?.document_version_id))throw new AuthError('INTERNAL_ERROR');
   const exposed=answer.citations.map(x=>{if(x.source_kind!=='document')throw new AuthError('INTERNAL_ERROR');return {...x,locator:`Sección «${x.label}»`,artifact_url:`/api/v2/documents/${x.document_version_id}/artifact`};});
   const result=await this.unit(token,async(c,p)=>{
    await this.owned(c,p,id,true);
    const n=(await c.query<{n:number}>('SELECT coalesce(max(ordinal)+1,0)::int AS n FROM banuchat_pilot_http.messages WHERE conversation_id=$1',[id])).rows[0]!.n;
    if(n!==state.next)throw new AuthError('CONFLICT');
    for(const cite of answer.citation_records){
     const matches=await c.query(`SELECT dc.id FROM banuchat.document_chunks dc JOIN banuchat.document_versions v ON v.id=dc.document_version_id AND v.dataset_release_id=dc.dataset_release_id
      WHERE dc.id=$1 AND v.id=$2 AND dc.dataset_release_id=$3 AND v.source_sha256=$4 AND v.source_path=$5 AND dc.locator=$6`,[cite.chunk_id,cite.document_version_id,cite.dataset_release_id,cite.source_sha256,cite.source_path,cite.source_locator]);
     if(matches.rows.length!==1)throw new AuthError('INTERNAL_ERROR');
    }
    const user=(await c.query<StoredMessage>(`INSERT INTO banuchat_pilot_http.messages(conversation_id,ordinal,role,content) VALUES($1,$2,'user',$3) RETURNING *`,[id,n,content])).rows[0]!;
    const assistant=(await c.query<StoredMessage>(`INSERT INTO banuchat_pilot_http.messages(conversation_id,ordinal,role,content,insufficient_evidence,citations,citation_records)
     VALUES($1,$2,'assistant',$3,$4,$5::jsonb,$6::jsonb) RETURNING *`,[id,n+1,answer.content,answer.insufficient_evidence,JSON.stringify(exposed),JSON.stringify(answer.citation_records)])).rows[0]!;
    return {conversation_id:id,user_message:{message_id:user.id,role:'user' as const,content:user.content,created_at:user.created_at.toISOString()},assistant_message:{message_id:assistant.id,role:'assistant' as const,content:assistant.content,created_at:assistant.created_at.toISOString(),insufficient_evidence:assistant.insufficient_evidence,citations:exposed}};
   });
   this.trace?.({query,answer,route:decision.route});return result;
  }finally{this.activity.endMessage(id);}
 }
 artifact(token:string,id:string){return this.unit(token,async c=>{
  // The existing artifact reader keeps its path, realpath, revision and byte-SHA checks.
  const projection:SqlQueryClient={query:async<T>(_text:string,values?:readonly unknown[])=>c.query<T>(`SELECT v.id,v.source_path,v.source_sha256,r.label AS version_label FROM banuchat.document_versions v
   JOIN banuchat.dataset_releases r ON r.id=v.dataset_release_id WHERE v.id=$1 AND r.id=$2 AND r.manifest_sha256=$3 AND r.status='ready' AND v.processing_status='ready'`,[values?.[0],this.scope.release_id,this.scope.manifest_sha256])};
  return getDocumentArtifact(projection,{document_version_id:id},this.storage).catch(error=>{throw resourceError(error);});
 });}
 progress(token:string):Promise<never>{return this.unit(token,async()=>{throw new AuthError('FORBIDDEN');});}
 calendar(token:string):Promise<never>{return this.unit(token,async()=>{throw new AuthError('FORBIDDEN');});}
 announcements(token:string):Promise<never>{return this.unit(token,async()=>{throw new AuthError('FORBIDDEN');});}
}

export async function createIsolatedPilotRuntime(input:{pool:Pool;expectedDatabase:string;deploymentId:string;rateKey:Buffer;scope:IsolatedPilotScope;
 reader:Pool;expectedReaderRole:string;responder:(input:DocumentRagInput)=>Promise<PilotAnswer>;router:IntentRouter;artifacts:DocumentArtifactStorage;
 trace?:(event:{query:DocumentRagInput;answer:PilotAnswer;route:string})=>void}){
 await assertIsolatedPilotAuthScope(input.pool,input.expectedDatabase,input.deploymentId,input.scope);
 const r=(await input.reader.query(`SELECT current_database() AS database,current_user AS role,current_setting('default_transaction_read_only') AS read_only`)).rows[0];
 if(input.expectedReaderRole!=='banuchat_pilot_reader'||r?.database!==input.expectedDatabase||r?.role!==input.expectedReaderRole||r?.read_only!=='on'||!input.router.catalog_valid)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 const auth=await CoreAuth.create({...input,isolated_pilot:input.scope,evidence_mode:'ccd_local'});
 const resources=new IsolatedPilotResources(auth,Object.freeze({...input.scope}),input.deploymentId,input.responder,input.router,input.artifacts,input.trace);
 return createAuthenticatedApiServer({auth,resources});
}
