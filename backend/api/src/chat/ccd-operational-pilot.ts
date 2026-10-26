import {normalizeDocumentRetrievalRow,validateDocumentRetrievalInput,type RetrievedDocumentChunk,type DocumentRetrievalInput} from '../application/document-retrieval.js';
import type {SqlQueryClient} from '../data/sql-client.js';
import type {DocumentRagInput} from './document-rag.js';
import {generateCcdKnowledgeAnswer,ccdKnowledgeQueryScope,studentText,type CcdKnowledgeDependencies,type CcdKnowledgeEvidenceMetadata,type CcdKnowledgeAnswer,type CcdKnowledgeQueryScope} from './ccd-knowledge.js';
/** Historical isolated composition only; product imports the CCD policy directly. */
export interface PilotEvidenceMetadata extends Omit<CcdKnowledgeEvidenceMetadata,'reference_status'> {isolated_evaluation_allowed:true}
export type PilotQueryScope=CcdKnowledgeQueryScope;
export type PilotAnswer=CcdKnowledgeAnswer;
export interface OperationalPilotDependencies extends Omit<CcdKnowledgeDependencies,'knowledge'> {pilot:{release_id:string;metadata:ReadonlyMap<string,PilotEvidenceMetadata>}}
const admitted=(metadata:ReadonlyMap<string,PilotEvidenceMetadata>)=>new Map([...metadata].filter(([,m])=>m.isolated_evaluation_allowed===true).map(([k,m])=>[k,{...m,reference_status:'adopted' as const}]));
export {studentText};
export const pilotQueryScope=(query:string,metadata:ReadonlyMap<string,PilotEvidenceMetadata>)=>ccdKnowledgeQueryScope(query,admitted(metadata));
export async function generateOperationalPilotAnswer(deps:OperationalPilotDependencies,input:DocumentRagInput):Promise<PilotAnswer>{
 const {pilot,...rest}=deps;const answer=await generateCcdKnowledgeAnswer({...rest,knowledge:{release_id:pilot.release_id,metadata:admitted(pilot.metadata)}},input);
 return {...answer,citations:answer.citations.map((c,i)=>({...c,artifact_url:null,locator:answer.citation_records[i]!.source_locator}))};
}
/** Metadata prefilter with exact cosine rank; no production publication objects. */
export async function retrieveIsolatedPilotChunks(sql:SqlQueryClient,input:DocumentRetrievalInput,keys:readonly string[]):Promise<RetrievedDocumentChunk[]>{
  const v=validateDocumentRetrievalInput(input);
  const identity=await sql.query<{name:string;marker:boolean}>("SELECT current_database() AS name,EXISTS(SELECT 1 FROM banuchat.isolated_pilot_marker WHERE scope='NO_PUBLICATION') AS marker");
  if(identity.rows[0]?.name!=='banuchat_p0_operational'||identity.rows[0]?.marker!==true)throw new Error('Isolated query target rejected.');
  if(!keys.length)return [];
  const r=await sql.query<unknown>(`SELECT dc.id AS chunk_id,dc.document_version_id,dv.document_id,d.document_key,dv.title,dc.ordinal,dc.content,dc.locator AS chunk_locator,dc.page_start,dc.page_end,dv.source_path,dv.source_locator,dv.source_sha256,dc.dataset_release_id AS release_id,dc.embedding <=> $2::vector AS cosine_distance FROM banuchat.document_chunks dc JOIN banuchat.document_versions dv ON dv.id=dc.document_version_id AND dv.dataset_release_id=dc.dataset_release_id JOIN banuchat.documents d ON d.id=dv.document_id JOIN banuchat.dataset_releases r ON r.id=dc.dataset_release_id WHERE dc.dataset_release_id=$1 AND r.status='ready' AND dv.processing_status='ready' AND d.document_key=ANY($4::text[]) ORDER BY cosine_distance,dc.id LIMIT $3`,[v.releaseId,v.queryVector,v.topK,keys]);
  return r.rows.map(row=>normalizeDocumentRetrievalRow(row,v.releaseId));
}
