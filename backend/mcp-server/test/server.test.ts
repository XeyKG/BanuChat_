import test from "node:test";
import assert from "node:assert/strict";
import {Client} from "@modelcontextprotocol/client";
import {StdioClientTransport} from "@modelcontextprotocol/client/stdio";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {contract,PROTOCOL} from "../src/server.js";
const cwd=fileURLToPath(new URL("../",import.meta.url));
async function connect(env:Record<string,string>={}) {
  const transport=new StdioClientTransport({command:process.execPath,args:["--import","tsx","test/stdio-fixture.ts"],cwd,stderr:"pipe",env});
  const client=new Client({name:"banuchat-contract-tests",version:"1.0.0"},{versionNegotiation:{mode:{pin:PROTOCOL}}});
  await client.connect(transport);
  return client;
}
const calls:[string,Record<string,unknown>][]=[
  ["search_knowledge",{query:"contenido"}],["find_documents",{query:"GUÍA"}],
  ["get_courses",{query:"curso"}],["get_calendar_events",{date_from:"2026-10-22",date_to:"2026-10-22"}],
  ["get_announcements",{reference_time:"2026-10-22T10:00:00Z"}],["get_profile_progress",{}]
];
test("real SDK client and stdio server: modern discovery, exact catalogue, all six executable",async()=>{
  const c=await connect();
  try {
    assert.equal(c.getProtocolEra(),"modern");
    const list=await c.listTools();assert.deepEqual(list.tools,contract.tools);
    for(const [name,args] of calls) {
      const r=await c.callTool({name,arguments:args});
      assert.equal(r.isError,false,name); // SDK public client strips wire-only resultType.
      assert.equal(r.content.length,1);
      assert.equal(r.content[0]!.type,"text");
      assert.deepEqual(JSON.parse((r.content[0] as {text:string}).text),r.structuredContent);
    }
  } finally {await c.close();}
});
test("schema and unknown-tool errors remain JSON-RPC, no coercion or arbitrary profile",async()=>{
  const c=await connect();
  try {
    for(const [name,args] of [["nonexistent",{}],["get_profile_progress",{profile_key:"other"}],["search_knowledge",{query:"x"}],["get_courses",{limit:"2"}],["find_documents",{query:"xx",limit:null}],["get_calendar_events",{date_from:"2026-02-30",date_to:"2026-03-01"}],["get_announcements",{reference_time:"yesterday"}],["get_courses",{statuses:["available","available"]}]] as [string,Record<string,unknown>][]) {
      await assert.rejects(c.callTool({name,arguments:args}),error=> (error as {code:number}).code===-32602);
    }
  }finally{await c.close();}
});
test("semantic calendar error is an execution error, distinct from schema",async()=>{
 const c=await connect();try {const r=await c.callTool({name:"get_calendar_events",arguments:{date_from:"2026-10-23",date_to:"2026-10-22"}});
 assert.equal(r.isError,true);assert.equal(r.structuredContent,undefined);assert.equal(JSON.parse((r.content[0] as {text:string}).text).code,"INVALID_ARGUMENT");}finally{await c.close();}
});
for(const [env,expected] of [[{FIXTURE_FAIL:"1"},"DEPENDENCY_UNAVAILABLE"],[{FIXTURE_INVALID:"1"},"INTERNAL_ERROR"],[{FIXTURE_EMPTY:"1"},"NOT_FOUND"]] as [Record<string,string>,string][]) {
 test(`safe operational errors: ${expected}`,async()=>{const c=await connect(env);try{for(const [name,args]of calls){const r=await c.callTool({name,arguments:args});assert.equal(r.isError,true);assert.equal(r.structuredContent,undefined);const text=(r.content[0] as {text:string}).text;const e=JSON.parse(text);assert.equal(e.code,expected,name);assert.equal(e.retryable,expected==="DEPENDENCY_UNAVAILABLE");assert.doesNotMatch(text,/SECRET|password|private-path|SELECT|must not escape/);}}finally{await c.close();}});
}
test("missing trusted profile is PROFILE_CONTEXT_REQUIRED",async()=>{const c=await connect({FIXTURE_NO_PROFILE:"1"});try{const r=await c.callTool({name:"get_profile_progress",arguments:{}});assert.equal(JSON.parse((r.content[0] as {text:string}).text).code,"PROFILE_CONTEXT_REQUIRED");}finally{await c.close();}});
test("production startup fails closed without explicit read credentials; stdout stays clean",async()=>{
 const child=spawn(process.execPath,["--import","tsx","src/main.ts"],{cwd,env:{PATH:process.env.PATH??"",SYSTEMROOT:process.env.SYSTEMROOT??""},stdio:["pipe","pipe","pipe"],windowsHide:true});
 let out="",err="";child.stdout.on("data",b=>{out+=String(b);});child.stderr.on("data",b=>{err+=String(b);});
 const code=await new Promise<number|null>((resolve,reject)=>{child.once("error",reject);child.once("close",resolve);});
 assert.equal(code,1);assert.equal(out,"");assert.equal(err.trim(),"mcp_startup_rejected");
});
test("stdio rejects legacy initialization and incompatible modern revision",async()=>{
 const child=spawn(process.execPath,["--import","tsx","test/stdio-fixture.ts"],{cwd,stdio:["pipe","pipe","pipe"],windowsHide:true});
 let buffer="";const messages:Record<string,unknown>[]=[];
 const result=new Promise<void>((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error("stdio rejection timeout")),10000);
  child.on("error",reject);child.stdout.on("data",(b:Buffer)=>{buffer+=b.toString();let n;while((n=buffer.indexOf("\n"))>=0){messages.push(JSON.parse(buffer.slice(0,n)));buffer=buffer.slice(n+1);}if(messages.length>=4){clearTimeout(timeout);resolve();}});
 });
 child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"old",version:"1"}}})+"\n");
 child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:2,method:"server/discover",params:{_meta:{"io.modelcontextprotocol/protocolVersion":"2099-01-01","io.modelcontextprotocol/clientCapabilities":{}}}})+"\n");
 const meta={"io.modelcontextprotocol/protocolVersion":PROTOCOL,"io.modelcontextprotocol/clientCapabilities":{}};
 child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:3,method:"server/discover",params:{_meta:meta}})+"\n");
 child.stdin.write(JSON.stringify({jsonrpc:"2.0",id:4,method:"tools/list",params:{_meta:meta}})+"\n");
 try{await result;assert.ok(messages.filter(m=>m.id===1||m.id===2).every(m=>m.error && !m.result));
 const discovery=messages.find(m=>m.id===3)!.result as {resultType:string;supportedVersions:string[];capabilities:unknown};
 assert.equal(discovery.resultType,"complete");assert.deepEqual(discovery.supportedVersions,[PROTOCOL]);assert.ok(discovery.capabilities);
 assert.equal((messages.find(m=>m.id===4)!.result as {resultType:string}).resultType,"complete");
 }finally{child.stdin.end();child.kill();}
});
