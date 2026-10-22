import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {Server,ProtocolError,ProtocolErrorCode,type Tool,type CallToolResult} from "@modelcontextprotocol/server";
import {Ajv2020,type ValidateFunction,type AnySchema} from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type {SqlQueryClient} from "../../api/src/data/sql-client.js";
import type {QueryEmbeddingClient} from "../../api/src/retrieval/query-embedding-client.js";
import {McpReadError,findSyntheticDocuments,getSyntheticCourses,getSyntheticCalendar,getSyntheticAnnouncements,getSyntheticProgress,searchSyntheticKnowledge} from "../../api/src/application/mcp-synthetic-reads.js";
import type {CalendarEventsInput} from "../../api/src/application/calendar-events.js";
import type {AnnouncementsInput} from "../../api/src/application/announcements.js";
import type {ProfileProgressInput} from "../../api/src/application/profile-progress.js";
import {DatabaseDependencyError} from "../../api/src/data/database-errors.js";

export const PROTOCOL="2026-07-28";
export const contract=JSON.parse(readFileSync(new URL("../tools.contract.json",import.meta.url),"utf8")) as {
  mcpProtocolRevision:string;tools:Tool[];executionErrorSchema:object;
};
if(contract.mcpProtocolRevision!==PROTOCOL) throw new Error("mcp_contract_revision_mismatch");
const expectedTools=["search_knowledge","find_documents","get_courses","get_calendar_events","get_announcements","get_profile_progress"];
if(JSON.stringify(contract.tools.map(t=>t.name))!==JSON.stringify(expectedTools)) throw new Error("mcp_contract_catalog_mismatch");
const ajv=new Ajv2020({strict:true,strictTypes:false,allErrors:true,validateFormats:true});
addFormats.default(ajv);
const validators=new Map<string,{input:ValidateFunction;output:ValidateFunction}>();
for(const tool of contract.tools) validators.set(tool.name,{input:ajv.compile(tool.inputSchema as AnySchema),output:ajv.compile(tool.outputSchema as AnySchema)});
const errorValidator=ajv.compile(contract.executionErrorSchema);

export interface Dependencies {
  sql:SqlQueryClient;embedding:QueryEmbeddingClient;profileKey?:string;
  log?:(entry:{tool:string;request_id:string;outcome:string;duration_ms:number})=>void;
}
function invalid():never {throw new ProtocolError(ProtocolErrorCode.InvalidParams,"Argumentos MCP inválidos.");}
const messages:Record<string,string>={
  INVALID_ARGUMENT:"La combinación de argumentos no es válida.",NOT_FOUND:"No hay una publicación o perfil de demostración disponible.",
  PROFILE_CONTEXT_REQUIRED:"Selecciona un perfil sintético en la configuración del proceso.",
  DEPENDENCY_UNAVAILABLE:"Una dependencia local no está disponible.",INTERNAL_ERROR:"No se pudo completar la consulta de demostración."
};
function errorCode(error:unknown):string {
  if(error instanceof McpReadError) return error.code;
  if(error instanceof DatabaseDependencyError) return "DEPENDENCY_UNAVAILABLE";
  if(typeof error!=="object" || error===null) return "INTERNAL_ERROR";
  const value=error as {reason?:unknown;code?:unknown};
  if(value.reason==="invalid_argument") return "INVALID_ARGUMENT";
  if(value.reason==="profile_not_found" || value.reason==="no_current_release") return "NOT_FOUND";
  if(typeof value.reason==="string" && ["embedding_unavailable","embedding_runtime_mismatch"].includes(value.reason)) return "DEPENDENCY_UNAVAILABLE";
  if(typeof value.code==="string" && (/^08/.test(value.code) || ["ECONNREFUSED","ECONNRESET","EHOSTUNREACH","ENETUNREACH","ETIMEDOUT","ENOTFOUND","57P01","57P02","57P03","57014"].includes(value.code))) return "DEPENDENCY_UNAVAILABLE";
  return "INTERNAL_ERROR";
}
function semanticOutput(name:string,data:unknown,args:Record<string,unknown>):void {
  const o=data as Record<string,unknown>;
  const key=({search_knowledge:"matches",find_documents:"documents",get_courses:"courses",get_calendar_events:"events",get_announcements:"announcements",get_profile_progress:"courses"} as Record<string,string>)[name]!;
  const rows=o[key] as Record<string,unknown>[];
  const max=(args.limit ?? args.top_k ?? (name==="find_documents"?10:name==="search_knowledge"?5:20)) as number;
  if(rows.length>max) throw new McpReadError("INTERNAL_ERROR");
  if(name==="search_knowledge") {
    if((o.evidence as {match_count:number}).match_count!==rows.length) throw new McpReadError("INTERNAL_ERROR");
    rows.forEach((r,i)=>{
      if(r.rank!==i+1 || (r.source as {source_locator:unknown}).source_locator!==r.locator ||
        (r.page_end!==null && (r.page_start===null || (r.page_end as number)<(r.page_start as number))) ||
        (i>0 && (rows[i-1]!.cosine_distance as number)>(r.cosine_distance as number))) throw new McpReadError("INTERNAL_ERROR");
    });
  }
}
export function createServer(deps:Dependencies):Server {
  const server=new Server({name:"banuchat-mcp-server",version:"0.1.0"},{capabilities:{tools:{listChanged:false}},supportedProtocolVersions:[PROTOCOL]});
  server.setRequestHandler("tools/list",()=>({resultType:"complete",tools:structuredClone(contract.tools)}));
  server.setRequestHandler("tools/call",async request=>{
    const {name}=request.params;
    const check=validators.get(name);
    if(!check) throw new ProtocolError(ProtocolErrorCode.InvalidParams,"Herramienta MCP desconocida.");
    const args=request.params.arguments ?? {};
    if(!check.input(args)) invalid();
    const request_id=randomUUID(),started=performance.now();
    let outcome="success";
    try {
      let data:unknown;
      switch(name) {
        case "search_knowledge":data=await searchSyntheticKnowledge(deps.sql,deps.embedding,args as {query:string;top_k?:number});break;
        case "find_documents":data=await findSyntheticDocuments(deps.sql,args as {query:string;retrieval_mode?:string;limit?:number});break;
        case "get_courses":data=await getSyntheticCourses(deps.sql,args);break;
        case "get_calendar_events":data=await getSyntheticCalendar(deps.sql,args as unknown as CalendarEventsInput);break;
        case "get_announcements":data=await getSyntheticAnnouncements(deps.sql,args as AnnouncementsInput);break;
        case "get_profile_progress":
          if(!deps.profileKey) {outcome="PROFILE_CONTEXT_REQUIRED";return failure(outcome,request_id);}
          data=await getSyntheticProgress(deps.sql,{...args,profile_key:deps.profileKey} as ProfileProgressInput);break;
        default:invalid();
      }
      if(!check.output(data)) throw new McpReadError("INTERNAL_ERROR");
      semanticOutput(name,data,args);
      return {resultType:"complete",isError:false,structuredContent:data,content:[{type:"text",text:JSON.stringify(data)}]};
    } catch(error) {outcome=errorCode(error);return failure(outcome,request_id);}
    finally {deps.log?.({tool:name,request_id,outcome,duration_ms:Math.round(performance.now()-started)});}
  });
  server.onerror=()=>{ /* Transport callers choose a sanitized stderr callback. */ };
  return server;
}
function failure(code:string,request_id:string):CallToolResult {
  const value={code,message:messages[code]!,retryable:code==="DEPENDENCY_UNAVAILABLE",request_id};
  if(!errorValidator(value)) throw new Error("mcp_error_contract_invalid");
  return {resultType:"complete",isError:true,content:[{type:"text",text:JSON.stringify(value)}]};
}
