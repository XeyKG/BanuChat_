import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { createConversation } from "../src/application/conversations.js";
import { sendMessage } from "../src/application/messages.js";
import type { SqlQueryClient } from "../src/data/sql-client.js";

/** Disposable preflight only. No authorization implementation or HTTP composition. */
test("AUTH-P2 preflight: approved runtime privileges versus existing turn locks", async t => {
  const env = JSON.parse(await readFile(new URL("../../../infra/local/auth-p2/environment.json", import.meta.url), "utf8")) as {
    container:string;network:string;volume:string;host:string;port:number;database:string;
    adminUser:string;adminPassword:string;runtimeUser:string;runtimePassword:string;
  };
  assert.equal(env.container,"banuchat-auth-p2-preflight-20261022");
  assert.equal(env.network,"banuchat-auth-p2-preflight-20261022-isolated");
  assert.equal(env.volume,"banuchat-auth-p2-preflight-20261022-data");
  assert.equal(env.host,"127.0.0.1");assert.equal(env.port,55436);
  assert.equal(env.database,"banuchat_auth_p2_test");
  assert.equal(env.adminUser,"auth_p2_migrator");assert.equal(env.runtimeUser,"auth_p2_runtime");
  const makePool=(runtime=false)=>new pg.Pool({host:env.host,port:env.port,database:env.database,
    user:runtime?env.runtimeUser:env.adminUser,password:runtime?env.runtimePassword:env.adminPassword,
    connectionTimeoutMillis:5000,statement_timeout:10000,application_name:"BanuChat-AUTH-P2-preflight"});
  const admin=makePool();const runtime=makePool(true);
  const sql:SqlQueryClient={query:async<T,>(text:string,values?:readonly unknown[])=>({rows:(await runtime.query(text,values?[...values]:undefined)).rows as T[]})};
  const evidence:Array<{name:string;result:string;sqlstate?:string}>=[];
  const output=new URL("../../../infra/local/auth-p2/preflight.json",import.meta.url);
  let failures=0;let conversation:string|undefined;
  const corpusTables=["datasets","dataset_releases","embedding_configs","documents","document_versions","document_chunks",
    "courses","announcements","calendar_events","synthetic_profiles","profile_courses","ingestion_runs","ingestion_items"];
  async function fingerprint():Promise<string> {
    const hash=createHash("sha256");
    for(const table of corpusTables) {
      // Fixed source-code allowlist, never interpolated client identifiers.
      const rows=await admin.query(`SELECT to_jsonb(r)::text AS row FROM banuchat.${table} r ORDER BY to_jsonb(r)::text`);
      hash.update(table+"\n"+JSON.stringify(rows.rows)+"\n");
    }return hash.digest("hex");
  }
  async function check(name:string,work:()=>Promise<void>,sqlstate?:string) {
    await t.test(name,async()=>{try{await work();evidence.push({name,result:"PASS",...(sqlstate?{sqlstate}:{})});}
      catch {failures++;evidence.push({name,result:"FAIL"});throw new Error("AUTH-P2 preflight check failed: "+name);}});
  }
  async function denied(query:string,values:unknown[]=[]) {
    let code:string|undefined;try{await runtime.query(query,values);}catch(error){code=(error as {code?:string}).code;}
    assert.equal(code,"42501");
  }
  try {
    await writeFile(output,JSON.stringify({result:"RUNNING",implementation:"NOT_STARTED"})+"\n");
    const version=(await admin.query("SHOW server_version_num")).rows[0].server_version_num as string;
    assert.ok(Number(version)>=160000 && Number(version)<170000);
    assert.equal((await admin.query("SELECT current_database() AS db,to_regnamespace('banuchat') IS NULL AS empty")).rows[0].db,env.database);
    assert.equal((await admin.query("SELECT to_regnamespace('banuchat') IS NULL AS empty")).rows[0].empty,true);
    await admin.query(await readFile(new URL("../../../infra/db/001_initial_schema.sql",import.meta.url),"utf8"));
    // Reuse the already reviewed, fictional P1 fixture in this NEW database only.
    await admin.query(await readFile(new URL("auth-p1/fixture.sql",import.meta.url),"utf8"));
    const migrationConnection=await admin.connect();
    try {
      await migrationConnection.query("SELECT set_config('banuchat_auth.target_database',$1,false)",[env.database]);
      await migrationConnection.query(await readFile(new URL("../../../infra/db/006_synthetic_auth.sql",import.meta.url),"utf8"));
    }finally {migrationConnection.release();}
    await admin.query(`CREATE ROLE auth_p2_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${pg.escapeLiteral(env.runtimePassword)}`);
    // This is a newly created task-only cluster. No original cluster connections exist here.
    for(const row of (await admin.query("SELECT datname FROM pg_database")).rows)
      await admin.query(`REVOKE ALL ON DATABASE ${pg.escapeIdentifier(String(row.datname))} FROM PUBLIC`);
    await admin.query(`GRANT CONNECT ON DATABASE banuchat_auth_p2_test TO auth_p2_runtime;
      GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO auth_p2_runtime;
      GRANT USAGE ON TYPE banuchat.finite_time,banuchat.sha256_hex,banuchat.stable_key TO auth_p2_runtime;
      GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.synthetic_profiles,
        banuchat.conversations,banuchat.messages,banuchat.message_citations TO auth_p2_runtime;
      GRANT SELECT,INSERT ON banuchat_auth.conversation_owners TO auth_p2_runtime;
      GRANT INSERT ON banuchat.conversations,banuchat.messages,banuchat.message_citations TO auth_p2_runtime;
      GRANT DELETE ON banuchat.conversations TO auth_p2_runtime;`);
    const before=await fingerprint();
    await check("001 and 006 applied unchanged in exclusively new PostgreSQL 16",async()=>{
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace='banuchat_auth'::regnamespace AND relkind='r'")).rows[0].n,11);
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_constraint WHERE connamespace='banuchat_auth'::regnamespace AND contype='f' AND convalidated")).rows[0].n,16);
    });
    await check("runtime has no administrative flags, corpus writes or UPDATE on conversations",async()=>{
      const r=(await runtime.query(`SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,
        has_database_privilege(current_database(),'CREATE') OR has_database_privilege(current_database(),'TEMP') AS ddl,
        has_any_column_privilege('banuchat.conversations','UPDATE') AS conversation_update,
        has_any_column_privilege('banuchat.datasets','UPDATE') AS dataset_update,
        has_any_column_privilege('banuchat.dataset_releases','UPDATE') AS release_update FROM pg_roles WHERE rolname=current_user`)).rows[0];
      assert.ok(Object.values(r).every(value=>value===false));
    });
    await check("existing createConversation service works with INSERT and SELECT only",async()=>{
      const created=await createConversation(sql,{profile_key:"auth_fixture"});conversation=created.conversation_id;
      assert.equal(created.profile_key,"auth_fixture");
    });
    await check("conversation FOR UPDATE rejected by approved no-UPDATE policy",()=>denied(
      "SELECT id FROM banuchat.conversations WHERE id=$1 FOR UPDATE",[conversation]),"42501");
    await check("dataset FOR SHARE rejected by approved no-corpus-DML policy",()=>denied(
      "SELECT id FROM banuchat.datasets WHERE id=1 FOR SHARE"),"42501");
    await check("release FOR SHARE rejected by approved no-corpus-DML policy",()=>denied(
      "SELECT id FROM banuchat.dataset_releases WHERE status='ready' FOR SHARE"),"42501");
    await check("actual sendMessage reaches controlled generator then fails 42501 at unchanged persistence",async()=>{
      assert.ok(conversation);let generated=0;let code:string|undefined;
      try {
        await sendMessage({sql,router:{catalog_valid:true,catalog_version:"auth-p2-preflight",route:()=>({route:"agent_fallback",parameters:{},response_variant:null})},
          document_rag:async input=>{generated++;return {release_id:input.release_id,content:"Respuesta ficticia controlada para preflight.",
            insufficient_evidence:true,citations:[],citation_records:[]};}},
        {conversation_id:conversation,content:"Consulta ficticia de preflight.",now:new Date().toISOString()});
      }catch(error){code=(error as {code?:string}).code;}
      assert.equal(generated,1);assert.equal(code,"42501");
    },"42501");
    await check("failed turn leaves zero messages and citations; corpus fingerprint unchanged",async()=>{
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM banuchat.messages")).rows[0].n,0);
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM banuchat.message_citations")).rows[0].n,0);
      assert.equal(await fingerprint(),before);
    });
    const hashes:Record<string,string>={};
    for(const path of ["infra/db/001_initial_schema.sql","infra/db/006_synthetic_auth.sql","infra/db/auth-permissions.md",
      "backend/api/api-contract-v2.md","backend/api/openapi-v2.yaml","backend/api/src/application/messages.ts"])
      hashes[path]=createHash("sha256").update(await readFile(new URL("../../../"+path,import.meta.url))).digest("hex");
    await writeFile(output,JSON.stringify({result:failures?"FAIL":"CONFIRMED_BLOCKER",implementation:"NOT_STARTED",database:env.database,
      serverVersion:version,fixture:"unchanged AUTH-P1 synthetic fixture in new AUTH-P2 database",runtimeSuperuser:false,
      locks:"unchanged existing persistence",corpusFingerprintBefore:before,corpusFingerprintAfter:await fingerprint(),
      checks:evidence,hashes,notExecuted:["protected HTTP v2","A/B isolation","revocation during generation","Ollama","original databases"]},null,2)+"\n");
  }finally {
    if(conversation)await runtime.query("DELETE FROM banuchat.conversations WHERE id=$1",[conversation]);
    await runtime.end();await admin.end();
  }
});
