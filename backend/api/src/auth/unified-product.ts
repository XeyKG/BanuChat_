import type {SqlQueryClient} from '../data/sql-client.js';
import {AuthError} from './primitives.js';
import {getProfileProgress} from '../application/profile-progress.js';
import {getCalendarEvents} from '../application/calendar-events.js';
import {getAnnouncements} from '../application/announcements.js';
import {dispatchChatQuery} from '../chat/chat-dispatcher.js';
import type {DocumentRagResponder,McpAgentResponder} from '../application/messages.js';
import type {IntentRouter} from '../routing/intent-router-types.js';
import {requiresConversationalOrchestration,runBoundedMcpAgent} from '../agent/bounded-mcp-agent.js';
import {StdioMcpClientFactory} from '../agent/mcp-client.js';
import type {ConversationOrchestrator} from '../orchestration/n8n-conversation.js';
import {randomUUID} from 'node:crypto';
export interface AuxiliaryContext {release_id:string;profile_key:string;alias:string;}
/** Only existing structured read services receive this adapter; never RAG or arbitrary HTTP SQL. */
export function auxiliarySql(sql:SqlQueryClient):SqlQueryClient {
 return {query<T>(text:string,values?:readonly unknown[]){
  if(!/^\s*(SELECT|WITH)\b/iu.test(text)||/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|COPY)\b/iu.test(text))throw new AuthError('FORBIDDEN');
  const tables=[...text.matchAll(/banuchat\.([a-z_]+)/gu)].map(m=>m[1]);
  if(tables.some(t=>!['datasets','dataset_releases','synthetic_profiles','profile_courses','courses','calendar_events','announcements'].includes(t!)))throw new AuthError('FORBIDDEN');
  return sql.query<T>(text.replaceAll('banuchat.','banuchat_aux.').replaceAll("d.name='banuchat-synthetic'","d.name='banuchat-auxiliary'"),values);
 }};
}
export async function auxiliaryContext(sql:SqlQueryClient,principal:string):Promise<AuxiliaryContext>{
 const r=await sql.query<AuxiliaryContext>(`SELECT a.release_id,a.profile_key,p.alias FROM banuchat_aux.account_profiles a
 JOIN banuchat_aux.datasets d ON d.id=1 AND d.current_release_id=a.release_id
 JOIN banuchat_aux.synthetic_profiles p ON p.dataset_release_id=a.release_id AND p.profile_key=a.profile_key
 WHERE a.principal_id=$1`,[principal]);
 if(r.rows.length!==1)throw new AuthError('FORBIDDEN');return r.rows[0]!;
}
export const unifiedProgress=(sql:SqlQueryClient,ctx:AuxiliaryContext,input:Parameters<typeof getProfileProgress>[1])=>getProfileProgress(auxiliarySql(sql),{...input,profile_key:ctx.profile_key});
export const unifiedCalendar=(sql:SqlQueryClient,input:Parameters<typeof getCalendarEvents>[1])=>getCalendarEvents(auxiliarySql(sql),input);
export const unifiedAnnouncements=(sql:SqlQueryClient,input:Parameters<typeof getAnnouncements>[1])=>getAnnouncements(auxiliarySql(sql),input);
export function unifiedResponder(input:{sql:SqlQueryClient;router:IntentRouter;rag:DocumentRagResponder;principal:string;aux:AuxiliaryContext;
 mcp_environment:Record<string,string>;orchestrator?:ConversationOrchestrator}):McpAgentResponder{
 return async query=>{
  const decision=input.router.route({content:query.query,context:{profile_selected:true,now:query.now}});
  const bound={...query,profile_key:input.aux.profile_key};
  if(decision.route==='capabilities_help')return {release_id:query.release_id,content:'Puedo ayudarte a consultar documentos CCD con sus fuentes, tu progreso y cursos, el calendario, noticias y convocatorias, y tus conversaciones anteriores.',insufficient_evidence:false,citations:[],citation_records:[]};
  if(requiresConversationalOrchestration(bound)){
   if(!input.orchestrator)throw new AuthError('DEPENDENCY_UNAVAILABLE');
   await input.orchestrator.orchestrate({operation_id:randomUUID(),release_id:query.release_id,demo_mode:'ccd_local',route:'agent_fallback',requested_capability:'bounded_mcp_agent'});
   const sessions=new StdioMcpClientFactory({args:['--import','tsx','src/unified-main.ts'],environment:{...input.mcp_environment,
    MCP_PRINCIPAL_ID:input.principal,MCP_DOCUMENT_RELEASE:query.release_id,MCP_STRUCTURED_RELEASE:input.aux.release_id}});
   return runBoundedMcpAgent({sessions,source_releases:{documents:query.release_id,structured:input.aux.release_id}},bound);
  }
  if(['profile_progress','calendar_events','announcements','basic_social','capabilities_help'].includes(decision.route)){
   const result=await dispatchChatQuery({sql:auxiliarySql(input.sql),router:input.router},{content:query.query,profile_key:input.aux.profile_key,release_id:input.aux.release_id,now:query.now});
   if(result.kind==='answered')return {...result,release_id:query.release_id};
  }
  return input.rag(query);
 };
}

