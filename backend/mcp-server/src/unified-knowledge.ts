import type {RetrievedDocumentChunk} from '../../api/src/application/document-retrieval.js';
import {ccdKnowledgeQueryScope} from '../../api/src/chat/ccd-knowledge.js';
import {ccdKnowledgeMetadata,isCcdKnowledgeSchema} from '../../api/src/chat/ccd-knowledge-manifest.js';
import {decideCcdEvidence} from '../../api/src/chat/document-evidence.js';

/** Apply the adopted release's vocabulary rather than pre-1.3 unit locators.
 * Uses existing generic authenticated retrieval; does not grant scoped SQL access.
 * This selects evidence, without generating an answer or interpreting its text.
 */
export function selectUnifiedKnowledge(chunks:readonly RetrievedDocumentChunk[],query:string,manifest:unknown):RetrievedDocumentChunk[]{
 if(!manifest||typeof manifest!=='object'||!('schema_version' in manifest)||!isCcdKnowledgeSchema(manifest.schema_version)){
  return decideCcdEvidence(chunks,query,[]).chunks;
 }
 const metadata=ccdKnowledgeMetadata(manifest),scope=ccdKnowledgeQueryScope(query,metadata);
 if(scope.unavailable||(!scope.topics.length&&!scope.courses.length))return [];
 return chunks.filter(c=>{
  const m=metadata.get(c.document_key);
  if(!m||m.reference_status!=='adopted')return false;
  if(!scope.history&&m.topics.some(t=>['history','transition','historical_academic'].includes(t)))return false;
  if(!scope.topics.includes('fees')&&m.topics.includes('fees'))return false;
  if(scope.topics.includes('academic')&&m.topics.includes('hours'))return false;
  if(scope.courses.length&&scope.topics.some(t=>['academic','hours'].includes(t))){
   return m.course!==null&&scope.courses.includes(m.course)&&m.topics.some(t=>scope.topics.includes(t));
  }
  if(!scope.topics.includes('academic')&&m.topics.includes('academic'))return false;
  return m.topics.some(t=>scope.topics.includes(t));
 });
}
