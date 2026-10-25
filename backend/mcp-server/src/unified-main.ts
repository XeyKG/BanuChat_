import {Pool} from 'pg';
import {createHash} from 'node:crypto';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {createServer} from './server.js';
import {auxiliarySql,auxiliaryContext} from '../../api/src/auth/unified-product.js';
import {OllamaQueryEmbeddingClient} from '../../api/src/retrieval/ollama-query-embedding-client.js';
import {retrieveDocumentChunksForQuery} from '../../api/src/application/document-query-retrieval.js';
import {retrieveAuthenticatedDocumentChunks} from '../../api/src/application/authenticated-document-retrieval.js';
import {decideCcdEvidence} from '../../api/src/chat/document-evidence.js';
import {lookupDocuments} from '../../api/src/application/document-lookup.js';
import {getSyntheticCourses,getSyntheticCalendar,getSyntheticAnnouncements,getSyntheticProgress,McpReadError} from '../../api/src/application/mcp-synthetic-reads.js';
import type {CalendarEventsInput} from '../../api/src/application/calendar-events.js';
import type {AnnouncementsInput} from '../../api/src/application/announcements.js';
import type {ProfileProgressInput} from '../../api/src/application/profile-progress.js';
let pool:InstanceType<typeof Pool>|undefined;
try{
 const env=process.env,principal=env.MCP_PRINCIPAL_ID,documentRelease=env.MCP_DOCUMENT_RELEASE,structuredRelease=env.MCP_STRUCTURED_RELEASE;
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
 if(!principal||!documentRelease||!structuredRelease||![principal,documentRelease,structuredRelease].every(x=>uuid.test(x))
  ||env.MCP_POSTGRES_DB!=='banuchat_unified'||!env.MCP_POSTGRES_USER||!env.MCP_POSTGRES_PASSWORD)throw new Error();
 pool=new Pool({host:'127.0.0.1',port:Number(env.MCP_POSTGRES_PORT),database:env.MCP_POSTGRES_DB,
  user:env.MCP_POSTGRES_USER,password:env.MCP_POSTGRES_PASSWORD,options:'-c default_transaction_read_only=on -c statement_timeout=15000',max:1});
 const sql={async query<T>(text:string,values?:readonly unknown[]){const r=await pool!.query(text,values?[...values]:undefined);return {rows:r.rows as T[]};}};
 const guard=await sql.query<{safe:boolean}>("SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls "+
 "AND NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_auth'::regnamespace,'banuchat_aux'::regnamespace) "+
 "AND c.relkind='r' AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(c.oid,'INSERT,UPDATE'))) AS safe "+
 "FROM pg_roles WHERE rolname=current_user");
 if(guard.rows[0]?.safe!==true)throw new Error();
 const embedding=new OllamaQueryEmbeddingClient(env.BANUCHAT_OLLAMA_BASE_URL??'http://127.0.0.1:11434');
 const read=async(name:string,args:Record<string,unknown>)=>{
  const ctx=await auxiliaryContext(sql,principal);
  const doc=await sql.query<{id:string}>("SELECT r.id FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id "+
   "WHERE d.id=1 AND d.name='banuchat-ccd-local' AND r.manifest->'synthetic'='false'::jsonb AND r.status='ready'");
  if(ctx.release_id!==structuredRelease||doc.rows[0]?.id!==documentRelease)throw new McpReadError('NOT_FOUND');
  const aux=auxiliarySql(sql);
  switch(name){
   case 'get_profile_progress':return getSyntheticProgress(aux,{...args,profile_key:ctx.profile_key} as ProfileProgressInput);
   case 'get_courses':return getSyntheticCourses(aux,args);
   case 'get_calendar_events':return getSyntheticCalendar(aux,args as unknown as CalendarEventsInput);
   case 'get_announcements':return getSyntheticAnnouncements(aux,args as AnnouncementsInput);
   case 'find_documents':{
    const result=await lookupDocuments(sql,args as {query:string;limit?:number});
    return {...result,documents:result.documents.map(d=>({...d,version_label:null}))};
   }
   case 'search_knowledge':{
    const retrieved=await retrieveDocumentChunksForQuery({sql,query_embedding_client:embedding,retrieve_chunks:retrieveAuthenticatedDocumentChunks},
     {release_id:documentRelease,query:String(args.query),top_k:Number(args.top_k??5)});
    const chunks=decideCcdEvidence(retrieved,String(args.query),[]).chunks;
    const matches=chunks.map((c,i)=>({rank:i+1,chunk_id:c.chunk_id,document_key:c.document_key,document_version_id:c.document_version_id,
     document_title:c.title,content:c.content,content_sha256:createHash('sha256').update(c.content).digest('hex'),
     cosine_distance:c.cosine_distance,locator:c.chunk_locator,page_start:c.page_start,page_end:c.page_end,
     source:{source_kind:'document',source_path:c.source_path,source_locator:c.chunk_locator,source_sha256:c.source_sha256}}));
    return {release_id:documentRelease,evidence:{status:matches.length?'found':'not_found',match_count:matches.length},matches};
   }
   default:throw new McpReadError('NOT_FOUND');
  }
 };
 const handle=serveStdio(()=>createServer({sql,embedding,read}),{legacy:'reject',onerror:()=>{}});
 const close=async()=>{await handle.close();await pool?.end();};
 process.stdin.once('end',()=>void close());process.once('SIGTERM',()=>void close());
}catch{process.stderr.write('mcp_unified_startup_rejected\n');await pool?.end();process.exitCode=1;}

