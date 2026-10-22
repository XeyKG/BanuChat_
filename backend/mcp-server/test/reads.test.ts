import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import type {SqlQueryClient} from "../../api/src/data/sql-client.js";
import {findSyntheticDocuments,getSyntheticCourses,getSyntheticCalendar,getSyntheticAnnouncements,getSyntheticProgress,searchSyntheticKnowledge,McpReadError} from "../../api/src/application/mcp-synthetic-reads.js";
import {runtimeConfig,assertReadOnlySynthetic} from "../src/runtime.js";
import {fixtureSql,embedding,config,R,E,D,C,H} from "./fixtures.js";

function capture(base=fixtureSql()) {
 const calls:{text:string;values:readonly unknown[]}[]=[];
 const sql:SqlQueryClient={async query<T>(text:string,values?:readonly unknown[]){calls.push({text,values:values??[]});return base.query<T>(text,values);}};
 return {sql,calls};
}
test("document partial title/identity is literal and parameterized; real version label, full_document",async()=>{
 const {sql,calls}=capture();const r=await findSyntheticDocuments(sql,{query:"GUÍA_%'",limit:2});
 assert.equal(calls.length,1);assert.deepEqual(calls[0]!.values,["GUÍA_%'",null,2]);
 assert.match(calls[0]!.text,/strpos\(lower\(v.title COLLATE "C.utf8"\)/);assert.match(calls[0]!.text,/lower\(d.document_key COLLATE "C.utf8"\)/);
 assert.doesNotMatch(calls[0]!.text,/GUÍA|ILIKE/);assert.equal(r.documents[0]!.version_label,"edición ficticia 1");
 assert.equal(r.documents[0]!.retrieval_mode,"full_document");assert.equal(r.release_id,R);
});
test("course query/status filters precede LIMIT and retain literal wildcards/defaults",async()=>{
 const {sql,calls}=capture();await getSyntheticCourses(sql,{query:"curso_%",statuses:[]});
 assert.deepEqual(calls[0]!.values,["curso_%",[],20]);
 assert.ok(calls[0]!.text.indexOf('strpos(lower(name COLLATE "C.utf8")')<calls[0]!.text.indexOf("LIMIT"));
 assert.match(calls[0]!.text,/status=ANY\(\$2\)/);assert.match(calls[0]!.text,/ORDER BY course_key/);
});
test("all structured reads select current pointer and records in exactly one statement, no writes",async()=>{
 for(const run of [
  (s:SqlQueryClient)=>findSyntheticDocuments(s,{query:"demo"}),
  (s:SqlQueryClient)=>getSyntheticCourses(s,{}),
  (s:SqlQueryClient)=>getSyntheticCalendar(s,{date_from:"2026-10-22",date_to:"2026-10-22"}),
  (s:SqlQueryClient)=>getSyntheticAnnouncements(s,{}),
  (s:SqlQueryClient)=>getSyntheticProgress(s,{profile_key:"demo-student"})
 ]){const {sql,calls}=capture();await run(sql);assert.equal(calls.length,1);assert.match(calls[0]!.text,/r.id=d.current_release_id/);assert.match(calls[0]!.text,/r.dataset_id=d.id/);assert.match(calls[0]!.text,/d.name='banuchat-synthetic'/);assert.match(calls[0]!.text,/r.manifest->'synthetic'='true'/);assert.doesNotMatch(calls[0]!.text,/\b(INSERT|UPDATE|DELETE|TRUNCATE|CALL|CREATE|ALTER|DROP)\b/i);}
});
test("calendar uses civil Bogotá start inclusive/end exclusive with bound days",async()=>{
 const {sql,calls}=capture();await getSyntheticCalendar(sql,{date_from:"2026-01-01",date_to:"2026-12-31",event_types:[],limit:3});
 assert.deepEqual(calls[0]!.values,["2026-01-01","2026-12-31",[],3]);
 assert.match(calls[0]!.text,/\$1::date::timestamp AT TIME ZONE 'America\/Bogota'/);
 assert.match(calls[0]!.text,/\$2::date \+ 1/);assert.match(calls[0]!.text,/ce.starts_at </);
 await assert.rejects(getSyntheticCalendar(sql,{date_from:"2026-01-01",date_to:"2027-01-02"}));assert.equal(calls.length,1);
});
test("announcement defaults capture a single instant used in query and return; Unicode query",async()=>{
 const {sql,calls}=capture();const r=await getSyntheticAnnouncements(sql,{});
 assert.equal(calls[0]!.values[1],"active");assert.equal(calls[0]!.values[2],r.reference_time);assert.equal(calls[0]!.values[3],20);
 await getSyntheticAnnouncements(sql,{query:"😀".repeat(500),temporal_status:"all",reference_time:"2026-10-22T05:00:00-05:00"});
 assert.equal(calls[1]!.values[2],"2026-10-22T05:00:00-05:00");
});
test("progress joins same-release courses, controlled profile and normalizes physical progress",async()=>{
 const {sql,calls}=capture();const r=await getSyntheticProgress(sql,{profile_key:"demo-student",statuses:["completed"]});
 assert.deepEqual(calls[0]!.values,["demo-student",["completed"],20]);assert.match(calls[0]!.text,/c.dataset_release_id = pc.dataset_release_id/);
 assert.match(calls[0]!.text,/pc.dataset_release_id = mcp_current.release_id/);assert.equal(r.profile.profile_key,"demo-student");assert.equal(r.courses[0]!.progress_percent,100);
});
test("missing current/synthetic guard returns NOT_FOUND, never history fallback",async()=>{
 const {sql,calls}=capture({async query<T>(){return {rows:[] as T[]};}});
 await assert.rejects(getSyntheticCourses(sql,{}),e=>e instanceof McpReadError&&e.code==="NOT_FOUND");assert.equal(calls.length,1);
});
test("empty arrays keep release; malformed version label rejected",async()=>{
 const empty:SqlQueryClient={async query<T>(){return {rows:[{release_id:R,items:[]}] as T[]};}};
 assert.deepEqual(await getSyntheticCourses(empty,{}),{release_id:R,courses:[]});
 const missing:SqlQueryClient={async query<T>(){return {rows:[{release_id:R,items:[{}]}] as T[]};}};
 await assert.rejects(findSyntheticDocuments(missing,{query:"demo"}));
});
test("vector retrieval calls approved functions, hashes exact UTF-8, locator and no model metadata",async()=>{
 const {sql,calls}=capture();const r=await searchSyntheticKnowledge(sql,embedding,{query:"contenido"});
 assert.equal(calls.length,2);assert.match(calls[0]!.text,/current_retrieval_context\(\)/);assert.match(calls[1]!.text,/search_chunks_cosine\(\$1::public.vector,\$2,\$3::uuid\)/);
 assert.deepEqual(calls[1]!.values.slice(1),[5,R,E]);assert.equal(r.matches[0]!.source.source_locator,"section:uno");
 assert.equal(r.matches[0]!.content_sha256,createHash("sha256").update("Contenido ficticio.","utf8").digest("hex"));assert.equal(r.evidence.match_count,1);
 assert.ok(!("embedding_config_id" in r.matches[0]!));
});
test("release change causes exactly one full context + embedding retry, then uses new release",async()=>{
 const next="55555555-5555-4555-8555-555555555555";let n=0,embeds=0;
 const responses=[{rows:[config]},{rows:[]},{rows:[{...config,dataset_release_id:next}]},{rows:[{release_id:next,embedding_config_id:E,items:[]}]}];
 const calls:readonly unknown[][]=[];
 const sql:SqlQueryClient={async query<T>(_text:string,values?:readonly unknown[]){(calls as unknown[][]).push([...(values??[])]);return responses[n++] as {rows:T[]};}};
 const r=await searchSyntheticKnowledge(sql,{async embedQuery(){embeds++;return [embeds,...Array<number>(1023).fill(0)];}},{query:"pregunta"});
 assert.equal(embeds,2);assert.equal(n,4);assert.equal(r.release_id,next);assert.equal(calls[1]![2],R);assert.equal(calls[3]![2],next);assert.notEqual(calls[1]![0],calls[3]![0]);
});
test("second concurrent release change terminates; SQL errors are not blindly retried",async()=>{
 let calls=0,embeds=0;const sql:SqlQueryClient={async query<T>(){calls++;return {rows:calls%2?[config] as T[]:[]};}};
 await assert.rejects(searchSyntheticKnowledge(sql,{async embedQuery(){embeds++;return embedding.embedQuery("x",{} as never);}},{query:"pregunta"}),e=>e instanceof McpReadError&&e.code==="DEPENDENCY_UNAVAILABLE");assert.equal(calls,4);assert.equal(embeds,2);
 let failedCalls=0;const failing:SqlQueryClient={async query<T>(){failedCalls++;if(failedCalls===1)return {rows:[config] as T[]};throw Object.assign(new Error("internal invalid vector"),{code:"22023"});}};
 await assert.rejects(searchSyntheticKnowledge(failing,embedding,{query:"pregunta"}));assert.equal(failedCalls,2);
});
test("zero vector is rejected before SQL search",async()=>{
 const {sql,calls}=capture();await assert.rejects(searchSyntheticKnowledge(sql,{async embedQuery(){return Array<number>(1024).fill(0);}},{query:"pregunta"}));assert.equal(calls.length,1);
});
test("same-distance matches must retain document-key and ordinal order",async()=>{
 let n=0;const row={dataset_release_id:R,embedding_config_id:E,chunk_id:C,document_version_id:D,document_title:"Ficticio",content:"á\n",cosine_distance:0.1,locator:"section:1",page_start:null,page_end:null,source_path:"documents/demo.md",source_sha256:H};
 const sql:SqlQueryClient={async query<T>(){n++;return {rows:n===1?[config] as T[]:[{release_id:R,embedding_config_id:E,items:[{...row,document_key:"doc-z",ordinal:1},{...row,document_key:"doc-a",ordinal:2}]}] as T[]};}};
 await assert.rejects(searchSyntheticKnowledge(sql,embedding,{query:"pregunta"}),e=>e instanceof McpReadError&&e.code==="INTERNAL_ERROR");
});
test("runtime rejects CCD, remote hosts, owner credentials not implicitly inherited, arbitrary profiles",()=>{
 const good={MCP_POSTGRES_DB:"demo",MCP_POSTGRES_USER:"reader",MCP_POSTGRES_PASSWORD:"test-only"};
 assert.equal(runtimeConfig(good).postgres.host,"127.0.0.1");
 for(const extra of [{MCP_POSTGRES_DB:"banuchat_ccd_dev"},{MCP_POSTGRES_PORT:"55433"},{MCP_POSTGRES_HOST:"0.0.0.0"},{BANUCHAT_DEMO_MODE:"ccd_local"},{MCP_PROFILE_KEY:"../other"}])assert.throws(()=>runtimeConfig({...good,...extra}));
 assert.throws(()=>runtimeConfig({POSTGRES_DB:"demo",POSTGRES_USER:"owner",POSTGRES_PASSWORD:"secret"}));
});
test("read-only preflight fails closed and inspects effective table/schema/function privileges",async()=>{
 let query="";await assert.rejects(assertReadOnlySynthetic({async query<T>(text:string){query=text;return {rows:[{safe:false}] as T[]};}}));
 assert.match(query,/rolsuper/);assert.match(query,/has_table_privilege/);assert.match(query,/has_function_privilege/);assert.match(query,/transaction_read_only/);assert.match(query,/manifest->'synthetic'/);
 await assertReadOnlySynthetic({async query<T>(){return {rows:[{safe:true}] as T[]};}});
});
