// Deliberately separate from production startup. Synthetic, in-memory SQL/embedding only.
import {serveStdio} from "@modelcontextprotocol/server/stdio";
import {createServer} from "../src/server.js";
import {fixtureSql,embedding} from "./fixtures.js";
import type {SqlQueryClient} from "../../api/src/data/sql-client.js";
const sql=fixtureSql({fail:process.env.FIXTURE_FAIL==="1",invalid:process.env.FIXTURE_INVALID==="1",empty:process.env.FIXTURE_EMPTY==="1"});
const slow:SqlQueryClient={async query<T>(text:string,values?:readonly unknown[]){await new Promise(r=>setTimeout(r,50));return sql.query<T>(text,values);}};
serveStdio(()=>createServer({sql:process.env.FIXTURE_SLOW==="1"?slow:sql,embedding,
  ...(process.env.FIXTURE_NO_PROFILE==="1"?{}:{profileKey:"demo-student"})}),{legacy:"reject",onerror:()=>{process.stderr.write("fixture_transport_error\n");}});
