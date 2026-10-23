import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import test from "node:test";
import {AuthService} from "../src/auth/auth-service.js";
import {SyntheticAccountProvisioner} from "../src/auth/provision-account.js";
import {Argon2idHasher,AuthError,digestToken,type AuthClock,type PasswordHasher} from "../src/auth/primitives.js";
import {PgTransactionRunner} from "../src/data/transaction.js";
import {handleDetachedAuth} from "../src/http/auth-handlers.js";
import {environment,pool} from "./auth-p1/environment.js";

test("AUTH-P1 PostgreSQL: real core, transactions, races and detached handlers",async t=>{
  const env=await environment();const admin=pool(env);const runtime=pool(env,"runtime");const provision=pool(env,"provision");
  const hasher=new Argon2idHasher();const provisioner=new SyntheticAccountProvisioner(provision,env.database);
  const evidence:Array<{name:string;result:string}>=[];let sequence=1000;
  const phrase="frase ficticia exclusiva de integracion";
  const context=()=>({origin:"isolated-test-"+randomUUID(),requestId:randomUUID()});
  const create=(options:{hasher?:PasswordHasher;clock?:AuthClock;deploymentId?:string}={})=>AuthService.create({pool:runtime,expectedDatabase:env.database,
    deploymentId:options.deploymentId??env.deploymentId,rateKey:Buffer.from(env.rateKey,"hex"),hasher:options.hasher??hasher,...(options.clock?{clock:options.clock}:{})});
  const rejectCode=(code:string)=>(error:unknown)=>error instanceof AuthError && error.code===code;
  async function account(active=true) {
    const digits=String(++sequence).padStart(4,"0");const uid="BCH-DEMO-"+digits;
    const result=await provisioner.provision({synthetic_uid:uid,recovery_email:"demo-"+digits+"@banuchat.test",profile_key:"auth_fixture"},randomUUID());
    if(active) {
      const hash=await hasher.hash(phrase);
      await new PgTransactionRunner(admin).run(async c=>{
        await c.query("SELECT id FROM banuchat_auth.accounts WHERE id=$1 FOR UPDATE",[result.principal_id]);
        await c.query("INSERT INTO banuchat_auth.password_credentials(principal_id,password_hash) VALUES($1,$2)",[result.principal_id,hash]);
        await c.query("UPDATE banuchat_auth.accounts SET status='active',updated_at=clock_timestamp() WHERE id=$1",[result.principal_id]);
      }); // Administrative test fixture only; no activation/recovery API.
    }
    return result;
  }
  async function check(name:string,work:()=>Promise<void>) {
    await t.test(name,async()=>{
      await admin.query("DELETE FROM banuchat_auth.auth_rate_limits");
      try{await work();evidence.push({name,result:"PASS"});}
      catch(error){
        if(error!==null && typeof error==="object" && "severity" in error && "code" in error) {
          throw new Error("Isolated PostgreSQL rejection: SQLSTATE="+String(error.code));
        }throw error;
      }
    });
  }
  try {
    await writeFile(new URL("../../../infra/local/auth-p1/phase-b.json",import.meta.url),JSON.stringify({result:"RUNNING"})+"\n");
    sequence=Number((await admin.query("SELECT GREATEST(COALESCE(max(substring(synthetic_uid from 10)::integer),1000),1000) AS n FROM banuchat_auth.accounts")).rows[0].n);
    const core=await create();
    await check("limited roles reject admin runtime and shared/CCD destination settings",async()=>{
      await assert.rejects(AuthService.create({pool:admin,expectedDatabase:env.database,deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,"hex")}),rejectCode("DEPENDENCY_UNAVAILABLE"));
      await assert.rejects(AuthService.create({pool:runtime,expectedDatabase:"banuchat_ccd_dev",deploymentId:env.deploymentId,rateKey:Buffer.from(env.rateKey,"hex")}),rejectCode("DEPENDENCY_UNAVAILABLE"));
    });
    await check("provision pending account atomically; no password/registration or implicit activation",async()=>{
      const a=await account(false);
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM banuchat_auth.password_credentials WHERE principal_id=$1",[a.principal_id])).rows[0].n,0);
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM banuchat_auth.profile_binding_versions WHERE principal_id=$1",[a.principal_id])).rows[0].n,1);
      await assert.rejects(core.login({synthetic_uid:a.synthetic_uid,password:phrase},context()),rejectCode("UNAUTHENTICATED"));
      await assert.rejects(provisioner.provision({synthetic_uid:"BCH-DEMO-9998",recovery_email:"bad@other.test",profile_key:"auth_fixture"},randomUUID()),rejectCode("INVALID_ARGUMENT"));
      await assert.rejects(provisioner.provision({synthetic_uid:"BCH-DEMO-9998",recovery_email:"bad@banuchat.test",profile_key:"absent"},randomUUID()),rejectCode("INVALID_ARGUMENT"));
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM banuchat_auth.accounts WHERE synthetic_uid='BCH-DEMO-9998'")).rows[0].n,0);
    });
    await check("real login, access, me and logout store only digests and revoke server-side",async()=>{
      const a=await account();const pair=await core.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      assert.equal(pair.access_token!==pair.refresh_token,true);
      const principal=await core.authenticate(pair.access_token);assert.equal(principal.principalId,a.principal_id);assert.equal(Object.isFrozen(principal),true);
      const me=await core.currentSession(pair.access_token);assert.equal(me.synthetic_uid,a.synthetic_uid);assert.equal(me.profile.profile_key,"auth_fixture");
      assert.equal(Object.hasOwn(me,"recovery_email"),false);
      const stored=(await admin.query("SELECT access_token_digest FROM banuchat_auth.sessions WHERE id=$1",[me.session_id])).rows[0];
      assert.equal(stored.access_token_digest===digestToken(pair.access_token),true);
      await core.logout(pair.access_token,context());
      await assert.rejects(core.authenticate(pair.access_token),rejectCode("UNAUTHENTICATED"));
      await assert.rejects(core.refresh({refresh_token:pair.refresh_token},context()),rejectCode("UNAUTHENTICATED"));
    });
    await check("wrong, absent, disabled and pending credentials share generic failure",async()=>{
      const a=await account();
      await assert.rejects(core.login({synthetic_uid:a.synthetic_uid,password:"wrong"},context()),rejectCode("UNAUTHENTICATED"));
      await assert.rejects(core.login({synthetic_uid:"BCH-DEMO-9997",password:phrase},context()),rejectCode("UNAUTHENTICATED"));
      await admin.query("WITH t AS MATERIALIZED (SELECT clock_timestamp() AS now) UPDATE banuchat_auth.accounts SET status='disabled',disabled_at=t.now,updated_at=t.now,auth_version=auth_version+1 FROM t WHERE id=$1",[a.principal_id]);
      await assert.rejects(core.login({synthetic_uid:a.synthetic_uid,password:phrase},context()),rejectCode("UNAUTHENTICATED"));
      await assert.rejects(core.login({synthetic_uid:a.synthetic_uid,password:phrase,profile_key:"other"},context()),rejectCode("INVALID_ARGUMENT"));
    });
    await check("refresh rotation invalidates old access; replay revocation survives the 401",async()=>{
      const a=await account();const first=await core.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      const next=await core.refresh({refresh_token:first.refresh_token},context());
      await assert.rejects(core.authenticate(first.access_token),rejectCode("UNAUTHENTICATED"));
      await core.authenticate(next.access_token);
      await assert.rejects(core.refresh({refresh_token:first.refresh_token},context()),rejectCode("UNAUTHENTICATED"));
      await assert.rejects(core.authenticate(next.access_token),rejectCode("UNAUTHENTICATED"));
      const row=(await admin.query("SELECT revoked_at FROM banuchat_auth.sessions WHERE principal_id=$1",[a.principal_id])).rows[0];assert.equal(row.revoked_at!==null,true);
    });
    await check("two concurrent refresh requests serialize: one succeeds and replay revokes family",async()=>{
      const a=await account();const first=await core.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      const results=await Promise.allSettled([core.refresh({refresh_token:first.refresh_token},context()),core.refresh({refresh_token:first.refresh_token},context())]);
      assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(results.filter(r=>r.status==="rejected").length,1);
      const winner=results.find(r=>r.status==="fulfilled");assert.ok(winner?.status==="fulfilled");
      await assert.rejects(core.authenticate(winner.value.access_token),rejectCode("UNAUTHENTICATED"));
      const counts=(await admin.query("SELECT count(*)::int AS n,count(consumed_at)::int AS consumed FROM banuchat_auth.refresh_tokens t JOIN banuchat_auth.sessions s ON s.id=t.session_id WHERE s.principal_id=$1",[a.principal_id])).rows[0];
      assert.equal(counts.n,2);assert.equal(counts.consumed,1);
    });
    await check("login hash computation holds no row lock and cannot beat credential/version replacement",async()=>{
      const a=await account();let reached!:()=>void;let proceed!:()=>void;
      const verified=new Promise<void>(r=>{reached=r;});const gate=new Promise<void>(r=>{proceed=r;});
      const gated:PasswordHasher={hash:v=>hasher.hash(v),verify:async(h,v)=>{const ok=await hasher.verify(h,v);reached();await gate;return ok;}};
      const raceCore=await create({hasher:gated});const pending=raceCore.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      try {
        await verified;const replacement=await hasher.hash("nueva frase ficticia de carrera");
        await new PgTransactionRunner(admin).run(async c=>{
          await c.query("SELECT id FROM banuchat_auth.accounts WHERE id=$1 FOR UPDATE NOWAIT",[a.principal_id]);
          await c.query("UPDATE banuchat_auth.password_credentials SET password_hash=$2,changed_at=clock_timestamp() WHERE principal_id=$1",[a.principal_id,replacement]);
          await c.query("UPDATE banuchat_auth.accounts SET auth_version=auth_version+1,updated_at=clock_timestamp() WHERE id=$1",[a.principal_id]);
        });
      }finally {proceed();}
      await assert.rejects(pending,rejectCode("UNAUTHENTICATED"));
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM banuchat_auth.sessions WHERE principal_id=$1",[a.principal_id])).rows[0].n,0);
      await core.login({synthetic_uid:a.synthetic_uid,password:"nueva frase ficticia de carrera"},context());
    });
    await check("failed session transaction rolls back both session and refresh records",async()=>{
      const a=await account();await admin.query("REVOKE INSERT ON banuchat_auth.security_events FROM auth_p1_runtime");
      try{await assert.rejects(core.login({synthetic_uid:a.synthetic_uid,password:phrase},context()),rejectCode("INTERNAL_ERROR"));}
      finally{await admin.query("GRANT INSERT ON banuchat_auth.security_events TO auth_p1_runtime");}
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM banuchat_auth.sessions WHERE principal_id=$1",[a.principal_id])).rows[0].n,0);
    });
    await check("auth_version and disabled account invalidate already issued access/refresh",async()=>{
      const a=await account();const first=await core.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      await admin.query("UPDATE banuchat_auth.accounts SET auth_version=auth_version+1,updated_at=clock_timestamp() WHERE id=$1",[a.principal_id]);
      await assert.rejects(core.authenticate(first.access_token),rejectCode("UNAUTHENTICATED"));
      await assert.rejects(core.refresh({refresh_token:first.refresh_token},context()),rejectCode("UNAUTHENTICATED"));
      const second=await core.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      await admin.query("WITH t AS MATERIALIZED (SELECT clock_timestamp() AS now) UPDATE banuchat_auth.accounts SET status='disabled',disabled_at=t.now,updated_at=t.now FROM t WHERE id=$1",[a.principal_id]);
      await assert.rejects(core.authenticate(second.access_token),rejectCode("UNAUTHENTICATED"));
    });
    await check("controlled clock exercises access, inactivity and absolute expiry with real PostgreSQL rows",async()=>{
      const a=await account();let now=new Date();const clock:AuthClock={now:async()=>new Date(now)};const timed=await create({clock});
      const first=await timed.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      const start=now.getTime();now=new Date(start+900000);
      await assert.rejects(timed.authenticate(first.access_token),rejectCode("UNAUTHENTICATED"));
      const rotated=await timed.refresh({refresh_token:first.refresh_token},context());await timed.authenticate(rotated.access_token);
      now=new Date(start+604800000);await assert.rejects(timed.refresh({refresh_token:rotated.refresh_token},context()),rejectCode("UNAUTHENTICATED"));
      now=new Date();const inactive=await timed.login({synthetic_uid:a.synthetic_uid,password:phrase},context());now=new Date(now.getTime()+86400000);
      await assert.rejects(timed.refresh({refresh_token:inactive.refresh_token},context()),rejectCode("UNAUTHENTICATED"));
    });
    await check("persistent UID/origin buckets survive a new core instance and also limit absent accounts",async()=>{
      const uid="BCH-DEMO-9996";
      for(let n=0;n<5;n++)await assert.rejects(core.login({synthetic_uid:uid,password:"wrong"},context()),rejectCode("UNAUTHENTICATED"));
      const restarted=await create();await assert.rejects(restarted.login({synthetic_uid:uid,password:"wrong"},context()),rejectCode("RATE_LIMITED"));
      const r=(await admin.query("SELECT max(attempts)::int AS n FROM banuchat_auth.auth_rate_limits WHERE action='login_uid'")).rows[0];assert.equal(r.n,6);
      assert.equal((await admin.query("SELECT bool_and(bucket_key ~ '^[0-9a-f]{64}$') AS ok FROM banuchat_auth.auth_rate_limits")).rows[0].ok,true);
    });
    await check("wrong deployment, tampered token and missing grants fail without exposing account data",async()=>{
      const a=await account();const pair=await core.login({synthetic_uid:a.synthetic_uid,password:phrase},context());
      const other=await create({deploymentId:randomUUID()});await assert.rejects(other.authenticate(pair.access_token),rejectCode("UNAUTHENTICATED"));
      await assert.rejects(core.authenticate("A".repeat(43)),rejectCode("UNAUTHENTICATED"));
      await admin.query("UPDATE banuchat_auth.corpus_grants SET revoked_at=clock_timestamp() WHERE principal_id=$1",[a.principal_id]);
      await assert.rejects(core.currentSession(pair.access_token),rejectCode("FORBIDDEN"));
    });
    await check("detached login/me/refresh/logout satisfy real v2 schemas without listening",async()=>{
      const a=await account();
      const require=createRequire(new URL("../../mcp-server/package.json",import.meta.url));
      const Ajv=require("ajv/dist/2020.js").default;const ajv=new Ajv({strict:false});require("ajv-formats")(ajv);
      const spec=JSON.parse(await readFile(new URL("../openapi-v2.yaml",import.meta.url),"utf8"));
      const defs=JSON.parse(JSON.stringify(spec.components.schemas).replaceAll("#/components/schemas/","#/$defs/"));
      const validate=(name:string,value:unknown)=>assert.equal(ajv.compile({$ref:"#/$defs/"+name,$defs:defs})(value),true,"v2 schema mismatch");
      const base={method:"POST",target:"/api/v2/auth/login",headers:[["Content-Type","application/json"]] as Array<[string,string]>,
        body:Buffer.from(JSON.stringify({synthetic_uid:a.synthetic_uid,password:phrase})),origin:"127.0.0.1"};
      const login=await handleDetachedAuth(base,core);assert.equal(login.status,200);validate("token_response",login.body);
      const first=login.body as {access_token:string;refresh_token:string};
      const me=await handleDetachedAuth({...base,method:"GET",target:"/api/v2/auth/me",headers:[["Authorization","Bearer "+first.access_token]],body:Buffer.alloc(0)},core);
      assert.equal(me.status,200);validate("current_session",me.body);
      const refresh=await handleDetachedAuth({...base,target:"/api/v2/auth/refresh",body:Buffer.from(JSON.stringify({refresh_token:first.refresh_token}))},core);assert.equal(refresh.status,200);validate("token_response",refresh.body);
      const next=refresh.body as {access_token:string};
      const logout=await handleDetachedAuth({...base,target:"/api/v2/auth/logout",headers:[["Authorization","Bearer "+next.access_token]],body:Buffer.alloc(0)},core);assert.equal(logout.status,204);
      const noAccess=await handleDetachedAuth({...base,method:"GET",target:"/api/v2/auth/me",headers:[["Authorization","Bearer "+next.access_token]],body:Buffer.alloc(0)},core);assert.equal(noAccess.status,401);validate("error_response",noAccess.body);
      assert.equal((await handleDetachedAuth({...base,target:"/api/v1/conversations"},core)).status,404);
    });
    const counts=(await admin.query(`SELECT (SELECT count(*)::int FROM banuchat_auth.accounts) AS accounts,
      (SELECT count(*)::int FROM banuchat_auth.sessions) AS sessions,(SELECT count(*)::int FROM banuchat_auth.refresh_tokens) AS refresh,
      (SELECT count(*)::int FROM banuchat.conversations) AS conversations,(SELECT count(*)::int FROM banuchat.document_chunks) AS chunks`)).rows[0];
    assert.equal(counts.conversations,0);assert.equal(counts.chunks,0);
    assert.equal(evidence.length,13,"all real PostgreSQL cases must pass before publishing evidence");
    await writeFile(new URL("../../../infra/local/auth-p1/phase-b.json",import.meta.url),JSON.stringify({phase:"AUTH-P1/B-C-D",result:"PASS",checks:evidence.length,evidence,counts,
      runtimeRole:env.runtimeUser,publicEndpoints:false,mail:false,mobile:false},null,2)+"\n");
  }finally {await admin.end();await runtime.end();await provision.end();}
});
