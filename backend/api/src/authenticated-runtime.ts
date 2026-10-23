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
/** Permanent authenticated RAG composition; callers cannot select corpus or SQL through HTTP. */
export async function createAuthenticatedDocumentRag(input:Omit<DocumentRagDependencies,'evidence_mode'|'retrieve_chunks'>):Promise<DocumentRagResponder>{
 await assertAuthenticatedDocumentReads(input.sql);
 return query=>generateDocumentRagAnswer({...input,evidence_mode:'synthetic',retrieve_chunks:retrieveAuthenticatedDocumentChunks},query);
}
/** Product composition, deliberately no listen/startup or v1 import. Explicit trusted config. */
export async function createAuthenticatedRuntimeServer(input:{pool:Pool;expectedDatabase:string;deploymentId:string;rateKey:Buffer;
 document_rag:DocumentRagResponder;router?:IntentRouter;artifacts?:DocumentArtifactStorage;now?:()=>string;recovery?:Pick<RecoveryService,'request'|'confirm'>}){
 const auth=await AuthService.create(input);
 const scope=(await input.pool.query('SELECT deployment_id,database_name FROM banuchat_auth.runtime_scope WHERE singleton')).rows[0] as {deployment_id:string;database_name:string}|undefined;
 if(!scope||scope.deployment_id!==input.deploymentId.toLowerCase()||scope.database_name!==input.expectedDatabase)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 const router=input.router??await loadDefaultIntentRouter();if(!router.catalog_valid)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 const resources=new AuthenticatedResources(input.pool,{sql:new PgSqlClient(input.pool),router,document_rag:input.document_rag},input.artifacts);
 return createAuthenticatedApiServer({auth,resources,...(input.now?{now:input.now}:{}),...(input.recovery?{recovery:input.recovery}:{})});
}
