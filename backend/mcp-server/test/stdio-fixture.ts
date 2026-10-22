// Deliberately separate from production startup. Synthetic, in-memory SQL/embedding only.
import {serveStdio} from "@modelcontextprotocol/server/stdio";
import {createServer} from "../src/server.js";
import {fixtureSql,embedding} from "./fixtures.js";
serveStdio(()=>createServer({sql:fixtureSql({fail:process.env.FIXTURE_FAIL==="1",invalid:process.env.FIXTURE_INVALID==="1",empty:process.env.FIXTURE_EMPTY==="1"}),embedding,
  ...(process.env.FIXTURE_NO_PROFILE==="1"?{}:{profileKey:"demo-student"})}),{legacy:"reject",onerror:()=>{process.stderr.write("fixture_transport_error\n");}});
