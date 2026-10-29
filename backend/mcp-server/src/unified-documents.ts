import type {SqlQueryClient} from '../../api/src/data/sql-client.js';
import {normalizeDocumentRow} from '../../api/src/application/document-lookup.js';
import {McpReadError} from '../../api/src/application/mcp-synthetic-reads.js';

/** MCP literal identity/title search, without changing the frozen REST lookup. */
export async function findUnifiedDocuments(sql:SqlQueryClient,expectedRelease:string,args:Record<string,unknown>){
 const result=await sql.query<{release_id:string;documents:Record<string,unknown>[]}>(`WITH current AS MATERIALIZED (
 SELECT r.id FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id
 WHERE d.id=1 AND d.name='banuchat-ccd-local' AND r.status='ready' AND r.manifest->'synthetic'='false'::jsonb AND r.id=$1
 ) SELECT c.id AS release_id,COALESCE((SELECT jsonb_agg(item) FROM (
 SELECT d.document_key,d.retrieval_mode,v.id AS document_version_id,v.title,v.mime_type,v.version_label,
 v.source_path,v.source_locator,v.source_sha256
 FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id=v.document_id AND d.dataset_id=v.dataset_id
 WHERE v.dataset_release_id=c.id AND v.processing_status='ready'
 AND (strpos(lower(v.title COLLATE "C.utf8"),lower($2::text COLLATE "C.utf8"))>0
 OR strpos(lower(d.document_key COLLATE "C.utf8"),lower($2::text COLLATE "C.utf8"))>0)
 AND ($3::text IS NULL OR d.retrieval_mode=$3) ORDER BY d.document_key LIMIT $4
 ) item),'[]'::jsonb) AS documents FROM current c`,[expectedRelease,args.query,args.retrieval_mode??null,args.limit??10]);
 if(result.rows.length===0)throw new McpReadError('NOT_FOUND');
 if(result.rows.length!==1||result.rows[0]!.release_id!==expectedRelease||!Array.isArray(result.rows[0]!.documents))throw new McpReadError('INTERNAL_ERROR');
 return {release_id:expectedRelease,documents:result.rows[0]!.documents.map(d=>({...normalizeDocumentRow(d),version_label:d.version_label}))};
}
