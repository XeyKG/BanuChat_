import type {SqlQueryClient} from '../data/sql-client.js';
import {normalizeDocumentRetrievalRow,validateDocumentRetrievalInput,type DocumentRetrievalInput} from './document-retrieval.js';
import {DocumentRetrievalError} from './document-retrieval-errors.js';
export async function assertCcdKnowledgeReads(sql:SqlQueryClient):Promise<void>{
 const r=await sql.query<{safe:boolean}>(`SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles o ON o.oid=p.proowner
  WHERE p.oid=to_regprocedure('banuchat_auth.retrieve_ccd_knowledge_chunks(uuid,public.vector,integer,text[])')
  AND p.prosecdef AND p.provolatile='s' AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
  AND o.rolname='banuchat_ccd_reference_reader' AND NOT(o.rolcanlogin OR o.rolsuper OR o.rolcreatedb OR o.rolcreaterole OR o.rolreplication OR o.rolbypassrls)
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=o.oid)
  AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
  AND has_function_privilege(p.oid,'EXECUTE') AND NOT has_any_column_privilege('banuchat.document_chunks','SELECT')
  AND NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_auth'::regnamespace,'banuchat_aux'::regnamespace)
   AND c.relkind='r' AND (has_table_privilege(o.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(o.oid,c.oid,'INSERT,UPDATE')))) AS safe`);
 if(r.rows[0]?.safe!==true)throw new Error('Authenticated CCD reference reads rejected.');
}
/** Same authenticated current-release boundary; only reviewed document keys narrow ranking. */
export async function retrieveCcdKnowledgeChunks(sql:SqlQueryClient,input:DocumentRetrievalInput,keys:readonly string[]){
 const v=validateDocumentRetrievalInput(input);
 await assertCcdKnowledgeReads(sql);
 try{const result=await sql.query<unknown>('SELECT * FROM banuchat_auth.retrieve_ccd_knowledge_chunks($1::uuid,$2::public.vector,$3::integer,$4::text[])',[v.releaseId,v.queryVector,v.topK,keys]);
 return result.rows.map(r=>normalizeDocumentRetrievalRow(r,v.releaseId));
 }catch(error){const code=(error as {code?:string})?.code;if(code==='P0409')throw new DocumentRetrievalError('release_not_available');if(code==='P0400')throw new DocumentRetrievalError('invalid_argument');throw error;}
}
