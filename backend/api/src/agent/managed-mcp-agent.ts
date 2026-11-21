import {randomUUID} from 'node:crypto';
import type {McpAgentResponder,DocumentRagResponder,ChatTurnRoute} from '../application/messages.js';
import {StdioMcpClientFactory,type McpToolSessionFactory} from './mcp-client.js';
import {runBoundedMcpAgent,requiresConversationalOrchestration,requiredMcpSources,clarifyMcpSources,mcpQueryRestriction,planningSubject,type McpAgentTrace,type McpAgentInput} from './bounded-mcp-agent.js';
import type {ConversationOrchestrator} from '../orchestration/n8n-conversation.js';
import {AuthError} from '../auth/primitives.js';
import {labelPrefix} from '../application/conversation-detail.js';

export interface ManagedMcpRuntime {
 environment:Readonly<Record<string,string>>;
 orchestrator:ConversationOrchestrator;
 deployment_id:string;
 trace?:(entry:{operation_id:string;trace:McpAgentTrace})=>void;
}

/** First managed branch uses structured synthetic sources; documentary questions
 * retain the approved CCD responder instead of searching the old synthetic corpus. */
export function usesManagedStructuredMcp(query:McpAgentInput):boolean {
 const text=planningSubject(query.query,query.history).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 if(/\b(?:documentos?|guias?|archivos?|ccd|pruebas?|diagnostic\w*|tarifas?|costos?|precios?|vacacionales?|syllabus|temarios?|requisitos?)\b/u.test(text))return false;
 return requiresConversationalOrchestration(query);
}

export function createManagedMcpResponder(input:{principal:string;profile_key:string;deployment_id:string;
 environment:Readonly<Record<string,string>>;orchestrator:ConversationOrchestrator;rag:DocumentRagResponder;
 sessions?:McpToolSessionFactory;onRoute?:(route:ChatTurnRoute)=>void;trace?:(entry:{operation_id:string;trace:McpAgentTrace})=>void}):McpAgentResponder {
 return async query=>{
  if(query.profile_key!==input.profile_key)throw new AuthError('FORBIDDEN');
  if(!usesManagedStructuredMcp(query))return input.rag(query);
  input.onRoute?.('structured_mcp');
  const restriction=mcpQueryRestriction(query.query,query.history);
  if(restriction)return {release_id:query.release_id,content:restriction,insufficient_evidence:true,citations:[],citation_records:[]};
  const operation_id=randomUUID();
  const admission=await input.orchestrator.orchestrate({operation_id,release_id:query.release_id,
   required_sources:requiredMcpSources(query),demo_mode:'synthetic',route:'agent_fallback',requested_capability:'bounded_mcp_agent'});
  if(admission.directive==='request_clarification')return clarifyMcpSources(query.release_id);
  const sessions=input.sessions??new StdioMcpClientFactory({args:['--import','tsx','src/managed-main.ts'],environment:{
   ...input.environment,MCP_PRINCIPAL_ID:input.principal,MCP_PROFILE_KEY:input.profile_key,
   MCP_STRUCTURED_RELEASE:query.release_id,MCP_DEPLOYMENT_ID:input.deployment_id
  }});
  const answer=await runBoundedMcpAgent({sessions,source_releases:{documents:query.release_id,structured:query.release_id},
   trace:trace=>input.trace?.({operation_id,trace})},query);
  // History reconstructs labels from the same immutable source metadata.
  return {...answer,citations:answer.citations.map(citation=>({...citation,
   label:`${labelPrefix(citation.source_kind)}: ${citation.label}`}))};
 };
}
