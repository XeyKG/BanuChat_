import {createHash} from 'node:crypto';
import type {SqlQueryClient} from '../data/sql-client.js';
import type {DocumentRagDependencies,DocumentRagInput,DocumentRagAnswer} from './document-rag.js';
import {RELEASE_EMBEDDING_CONFIG_QUERY} from '../application/document-query-retrieval.js';
import {normalizeDocumentRetrievalRow,validateDocumentRetrievalInput} from '../application/document-retrieval.js';
import {generateCcdKnowledgeAnswer,ccdKnowledgeQueryScope,type CcdKnowledgeEvidenceMetadata} from './ccd-knowledge.js';
import {resolveConversationQuery} from './conversation-context.js';
import type {PresentationCitation} from './chat-types.js';
import {DocumentRetrievalError} from '../application/document-retrieval-errors.js';
import type {DocumentRetrievalInput} from '../application/document-retrieval.js';

const APPROVED_CLAIMS=['OP-008','OP-016','CAN-DIAG-RETRY','CAN-FEE-EXTEMPORANEOUS','CAN-FEE-EXTRAORDINARY','CAN-FUTURE-FEE'];
const UUID=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/iu;
interface ReferenceManifest {
 schema_version:'banuchat-approved-fees-1'|'banuchat-approved-ccd-1';synthetic:false;
 source_manifest_sha256:string;source_release_id:string;_database_sha256?:string;
 embedding:Record<string,unknown>;
 documents:Array<{document_key:string;metadata:CcdKnowledgeEvidenceMetadata}>;
}
export interface ApprovedReferences {
 readonly releaseId:string;
 respond(query:DocumentRagInput,fallback:(query:DocumentRagInput)=>Promise<DocumentRagAnswer>):Promise<DocumentRagAnswer>;
 artifact(sql:SqlQueryClient,token:string,id:string):Promise<{document_version_id:string;bytes:Buffer}|undefined>;
 sources(sql:SqlQueryClient,token:string,id:string):Promise<Array<{message_id:string;citations:PresentationCitation[]}>>;
}
/** Restricted supplemental corpus. Account/academic releases remain synthetic. */
export async function createApprovedReferences(input:Omit<DocumentRagDependencies,'evidence_mode'|'retrieve_chunks'>,releaseId:string,expectedManifestHash?:string):Promise<ApprovedReferences>{
 if(!UUID.test(releaseId))throw Error('Approved reference configuration rejected');
 const rows=await input.sql.query<{manifest:ReferenceManifest}>('SELECT manifest FROM banuchat_reference.context($1::uuid)',[releaseId]);
 const manifest=rows.rows[0]?.manifest;
 const full=manifest?.schema_version==='banuchat-approved-ccd-1',count=full?107:6;
 if(rows.rows.length!==1||!manifest||!['banuchat-approved-fees-1','banuchat-approved-ccd-1'].includes(manifest.schema_version)||manifest.synthetic!==false||!Array.isArray(manifest.documents)||manifest.documents.length!==count||new Set(manifest.documents.map(d=>d.document_key)).size!==count||new Set(manifest.documents.map(d=>d.metadata.claim_id)).size!==count||manifest.documents.some(d=>(!full&&!APPROVED_CLAIMS.includes(d.metadata.claim_id))||d.metadata.reference_status!=='adopted'||d.metadata.knowledge_version!==2))throw Error('Approved reference manifest rejected');
 if(full&&(!expectedManifestHash||!/^[a-f\d]{64}$/u.test(expectedManifestHash)||manifest._database_sha256!==expectedManifestHash||manifest.source_manifest_sha256!=='fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852'||manifest.source_release_id!=='10af4ffd-effb-41fc-bbfe-4dc48cb3398f'))throw Error('Approved CCD source pin rejected');
 const metadata=new Map(manifest.documents.map(d=>[d.document_key,d.metadata]));
 const normalize=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
 const syntheticTitles=full?(await input.sql.query<{title:string}>(`SELECT v.title::text FROM banuchat.document_versions v JOIN banuchat.datasets d ON d.id=1 AND d.current_release_id=v.dataset_release_id WHERE v.processing_status='ready'`)).rows.map(r=>normalize(r.title).split(' ').filter(w=>w.length>3&&w!=='para')):[];
 // The existing retrieval pipeline validates the pinned embedding recipe. This
 // adapter answers only its exact configuration query; it cannot execute SQL.
 const configSql:SqlQueryClient={async query<T>(text:string,values?:readonly unknown[]){
  if(text!==RELEASE_EMBEDDING_CONFIG_QUERY||values?.length!==1||values[0]!==releaseId)throw Error('Reference config read rejected');
  return {rows:[manifest.embedding as T]};
 }};
 const retrieveApproved=async(value:DocumentRetrievalInput,keys:readonly string[])=>{
  const v=validateDocumentRetrievalInput(value);
  if(v.releaseId!==releaseId||keys.some(k=>!metadata.has(k)))throw Error('Reference release rejected');
  if(!keys.length)return [];
  try{
   const result=full?await input.sql.query<unknown>('SELECT * FROM banuchat_reference.retrieve_pinned($1::uuid,$2::text,$3::public.vector,$4::integer,$5::text[])',[releaseId,expectedManifestHash,v.queryVector,v.topK,keys])
    :await input.sql.query<unknown>('SELECT * FROM banuchat_reference.retrieve($1::uuid,$2::public.vector,$3::integer,$4::text[])',[releaseId,v.queryVector,v.topK,keys]);
   return result.rows.map(row=>normalizeDocumentRetrievalRow(row,releaseId));
  }catch(error){if(['P0403','P0409'].includes((error as {code?:string}).code??''))throw new DocumentRetrievalError('release_not_available');throw error;}
 };
 const retrieve:NonNullable<DocumentRagDependencies['retrieve_chunks']>=(_sql,value)=>retrieveApproved(value,[...metadata.keys()]);
 return {
  releaseId,
  async respond(query,fallback){
   const resolved=resolveConversationQuery(query.query,query.history??[]);
   const scope=ccdKnowledgeQueryScope(resolved.retrieval_query??query.query,metadata);
   const text=normalize(query.query);
   const explicitSynthetic=/\b(?:programa demo|corpus sintetico|material ficticio)\b/u.test(text)||syntheticTitles.some(tokens=>tokens.length>=3&&tokens.every(t=>text.split(' ').includes(t)));
   if((!full&&!scope.topics.some(t=>t==='fees'||t==='retry_limits'))||(full&&explicitSynthetic))return fallback(query);
   const answer=await generateCcdKnowledgeAnswer({...input,sql:configSql,evidence_mode:'ccd_local',retrieve_chunks:retrieve,
    retrieve_scoped_chunks:(_sql,value,keys)=>retrieveApproved(value,keys),knowledge:{release_id:releaseId,metadata}}, {...query,release_id:releaseId});
   return {...answer,release_id:query.release_id};
  },
  async artifact(sql,token,id){
   const r=await sql.query<{artifact:string;sha256:string}>('SELECT artifact,sha256 FROM banuchat_reference.artifact($1,$2::uuid,$3::uuid)',[token,id,releaseId]);
   if(!r.rows.length)return undefined;
   const row=r.rows[0]!;const bytes=Buffer.from(row.artifact,'utf8');
   if(r.rows.length!==1||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Reference artifact integrity rejected');
   return {document_version_id:id,bytes};
  },
  async sources(sql,token,id){return (await sql.query<{message_id:string;citations:PresentationCitation[]}>('SELECT * FROM banuchat_reference.sources($1,$2::uuid)',[token,id])).rows;},
 };
}
