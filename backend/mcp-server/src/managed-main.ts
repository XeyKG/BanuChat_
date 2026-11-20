import {Pool} from 'pg';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {createServer} from './server.js';
import {managedRuntimeConfig,assertManagedMcpContext} from './managed-runtime.js';
import {OllamaQueryEmbeddingClient} from '../../api/src/retrieval/ollama-query-embedding-client.js';
import {McpReadError,findSyntheticDocuments,getSyntheticCourses,getSyntheticCalendar,getSyntheticAnnouncements,getSyntheticProgress,searchSyntheticKnowledge} from '../../api/src/application/mcp-synthetic-reads.js';
import type {CalendarEventsInput} from '../../api/src/application/calendar-events.js';
import type {AnnouncementsInput} from '../../api/src/application/announcements.js';
import type {ProfileProgressInput} from '../../api/src/application/profile-progress.js';

/** Managed synthetic tools. Selected CCD RAG retains its existing separate adapter. */
let pool:InstanceType<typeof Pool>|undefined;
try{
 const config=await managedRuntimeConfig();
 pool=new Pool(config.postgres);
 pool.on('error',()=>process.stderr.write('mcp_managed_database_unavailable\n'));
 if(process.env.BANUCHAT_OLLAMA_BASE_URL!=='http://127.0.0.1:11434')throw Error();
 const embedding=new OllamaQueryEmbeddingClient('http://127.0.0.1:11434');
 const read=async(name:string,args:Record<string,unknown>)=>{
  const client=await pool!.connect();
  const sql={async query<T>(text:string,values?:readonly unknown[]){const r=await client.query(text,values?[...values]:undefined);return {rows:r.rows as T[]};}};
  try{
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   await assertManagedMcpContext(sql,config);
   let result:{release_id:string};
   switch(name){
    case 'get_profile_progress':result=await getSyntheticProgress(sql,{...args,profile_key:config.profileKey} as ProfileProgressInput);break;
    case 'get_courses':result=await getSyntheticCourses(sql,args);break;
    case 'get_calendar_events':result=await getSyntheticCalendar(sql,args as unknown as CalendarEventsInput);break;
    case 'get_announcements':result=await getSyntheticAnnouncements(sql,args as AnnouncementsInput);break;
    case 'find_documents':result=await findSyntheticDocuments(sql,args as {query:string});break;
    case 'search_knowledge':result=await searchSyntheticKnowledge(sql,embedding,args as {query:string});break;
    default:throw new McpReadError('NOT_FOUND');
   }
   if(result.release_id!==config.release)throw new McpReadError('NOT_FOUND');
   await client.query('COMMIT');return result;
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
 };
 const sql={async query<T>(text:string,values?:readonly unknown[]){const r=await pool!.query(text,values?[...values]:undefined);return {rows:r.rows as T[]};}};
 const handle=serveStdio(()=>createServer({sql,embedding,read}),{legacy:'reject',onerror:()=>{}});
 let closed=false;
 const close=async()=>{if(closed)return;closed=true;await handle.close();await pool?.end();};
 process.stdin.once('end',()=>void close());process.once('SIGTERM',()=>void close());process.once('SIGINT',()=>void close());
}catch{process.stderr.write('mcp_managed_startup_rejected\n');await pool?.end().catch(()=>{});process.exitCode=1;}
