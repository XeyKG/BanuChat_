import type {Pool} from 'pg';
import {AuthService} from './auth/auth-service.js';
import {AuthenticatedResources} from './auth/resources.js';
import {AuthError} from './auth/primitives.js';
import {PgSqlClient} from './data/pg-client.js';
import {loadDefaultIntentRouter} from './routing/intent-router.js';
import type {IntentRouter} from './routing/intent-router-types.js';
import type {DocumentRagResponder} from './application/messages.js';
import type {DocumentArtifactStorage} from './application/document-artifact.js';
import {createAuthenticatedApiServer} from './http/api-v2-server.js';
import type {RecoveryService} from './auth/recovery-service.js';
import {generateDocumentRagAnswer,type DocumentRagDependencies} from './chat/document-rag.js';
import {assertAuthenticatedDocumentReads,retrieveAuthenticatedDocumentChunks} from './application/authenticated-document-retrieval.js';
import {knowledgeMode,type KnowledgeMode} from './auth/knowledge-mode.js';
import type {ConversationOrchestrator} from './orchestration/n8n-conversation.js';
import {generateCcdKnowledgeAnswer} from './chat/ccd-knowledge.js';
import {ccdKnowledgeMetadata,isCcdKnowledgeSchema} from './chat/ccd-knowledge-manifest.js';
import {retrieveCcdKnowledgeChunks} from './application/ccd-knowledge-retrieval.js';
import type {Oe2PublicationReader} from './application/oe2-demo.js';
/** Permanent authenticated RAG composition; callers cannot select corpus or SQL through HTTP. */
export async function createAuthenticatedDocumentRag(input:Omit<DocumentRagDependencies,'evidence_mode'|'retrieve_chunks'>,mode:KnowledgeMode='synthetic'):Promise<DocumentRagResponder>{
 knowledgeMode(mode);
 await assertAuthenticatedDocumentReads(input.sql);
 return async query=>{
  if(mode==='ccd_local'){
   const r=await input.sql.query<{manifest:unknown}>('SELECT manifest FROM banuchat.dataset_releases WHERE id=$1 AND status=\'ready\'',[query.release_id]);
   const manifest=r.rows[0]?.manifest;
   if(manifest&&typeof manifest==='object'&&'schema_version' in manifest&&isCcdKnowledgeSchema(manifest.schema_version)){
    return generateCcdKnowledgeAnswer({...input,evidence_mode:mode,retrieve_chunks:retrieveAuthenticatedDocumentChunks,retrieve_scoped_chunks:retrieveCcdKnowledgeChunks,knowledge:{release_id:query.release_id,metadata:ccdKnowledgeMetadata(manifest)}},query);
   }
  }
  return generateDocumentRagAnswer({...input,evidence_mode:mode,retrieve_chunks:retrieveAuthenticatedDocumentChunks},query);
 };
}
/** Product composition, deliberately no listen/startup or v1 import. Explicit trusted config. */
export async function createAuthenticatedRuntimeServer(input:{pool:Pool;expectedDatabase:string;deploymentId:string;rateKey:Buffer;
 document_rag:DocumentRagResponder;evidence_mode?:KnowledgeMode;router?:IntentRouter;artifacts?:DocumentArtifactStorage;now?:()=>string;recovery?:Pick<RecoveryService,'request'|'confirm'>;
 unified?:boolean;mcp_environment?:Record<string,string>;orchestrator?:ConversationOrchestrator;oe2_reader?:Oe2PublicationReader}){
 const auth=await AuthService.create(input);
 const scope=(await input.pool.query('SELECT deployment_id,database_name FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0] as {deployment_id:string;database_name:string}|undefined;
 if(!scope||scope.deployment_id!==input.deploymentId.toLowerCase()||scope.database_name!==input.expectedDatabase)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 const router=input.router??await loadDefaultIntentRouter();if(!router.catalog_valid)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 if(input.unified&&input.evidence_mode!=='ccd_local')throw new AuthError('DEPENDENCY_UNAVAILABLE');
 const resources=new AuthenticatedResources(input.pool,{sql:new PgSqlClient(input.pool),router,document_rag:input.document_rag},input.artifacts,knowledgeMode(input.evidence_mode),
 input.unified?{mcp_environment:input.mcp_environment??{},...(input.orchestrator?{orchestrator:input.orchestrator}:{}),...(input.oe2_reader?{oe2_reader:input.oe2_reader}:{})}:undefined);
 return createAuthenticatedApiServer({auth,resources,...(input.unified?{oe2_demo:true}:{}),...(input.now?{now:input.now}:{}),...(input.recovery?{recovery:input.recovery}:{})});
}
