import {Pool} from "pg";
import {serveStdio} from "@modelcontextprotocol/server/stdio";
import {OllamaQueryEmbeddingClient} from "../../api/src/retrieval/ollama-query-embedding-client.js";
import {createServer} from "./server.js";
import {runtimeConfig,assertReadOnlySynthetic} from "./runtime.js";

const log=(message:string)=>process.stderr.write(message+"\n");
let pool:InstanceType<typeof Pool>|undefined;
try {
  const config=runtimeConfig();
  pool=new Pool(config.postgres);
  pool.on("error",()=>{log("mcp_database_error");});
  const sql={async query<T>(text:string,values?:readonly unknown[]) {const r=await pool!.query(text,values===undefined?undefined:[...values]);return {rows:r.rows as T[]};}};
  await assertReadOnlySynthetic(sql);
  const handle=serveStdio(()=>createServer({sql,embedding:new OllamaQueryEmbeddingClient("http://127.0.0.1:11434"),
    ...(config.profileKey===undefined?{}:{profileKey:config.profileKey}),log:entry=>{log(JSON.stringify(entry));}}),
    {legacy:"reject",onerror:()=>{log("mcp_transport_error");}});
  let closed=false;
  const close=async()=>{
    if(closed)return;
    closed=true;
    try {await handle.close();await pool?.end();}
    catch {log("mcp_shutdown_error");process.exitCode=1;}
  };
  process.stdin.once("end",()=>{void close();});
  process.once("SIGINT",()=>{void close();});
  process.once("SIGTERM",()=>{void close();});
} catch {log("mcp_startup_rejected");await pool?.end();process.exitCode=1;}
