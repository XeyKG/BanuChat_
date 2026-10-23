import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {handleDetachedAuth,type DetachedAuthRequest} from "../src/http/auth-handlers.js";
import {AuthError,exactObject,password,uid} from "../src/auth/primitives.js";
import type {AuthService,CurrentSession} from "../src/auth/auth-service.js";
const token="A".repeat(43);const id="11111111-1111-4111-8111-111111111111";
const pair={access_token:token,refresh_token:token,token_type:"Bearer" as const,expires_in:900,session_expires_at:"2030-01-08T00:00:00Z"};
const me:CurrentSession={principal_id:id,synthetic_uid:"BCH-DEMO-0001",session_id:id,session_expires_at:pair.session_expires_at,release_id:id,evidence_mode:'synthetic',
  profile:{profile_key:"auth_fixture",alias:"Perfil ficticio"},capabilities:["chat","history","progress","calendar","announcements","documents"]};
function fake():Pick<AuthService,"login"|"refresh"|"authenticate"|"currentSession"|"logout"> {
  return {login:async input=>{const body=exactObject(input,["synthetic_uid","password"]);uid(body.synthetic_uid);password(body.password);return pair;},
    refresh:async()=>pair,authenticate:async()=>({principalId:id,sessionId:id,syntheticUid:"BCH-DEMO-0001",authVersion:"1",deploymentId:id}),currentSession:async()=>me,logout:async()=>undefined};
}
function request(path="login",body:unknown={synthetic_uid:"BCH-DEMO-0001",password:"fictitious test phrase"}):DetachedAuthRequest {
  return {method:"POST",target:"/api/v2/auth/"+path,headers:[["Content-Type","application/json"]],body:Buffer.from(JSON.stringify(body)),origin:"127.0.0.1"};
}
test("AUTH detached handlers return exact success forms and do not expose a server or v1 bypass",async()=>{
  const service=fake();assert.equal((await handleDetachedAuth(request(),service)).status,200);
  const auth=request("me");auth.method="GET";auth.body=Buffer.alloc(0);auth.headers=[["Authorization","Bearer "+token]];
  assert.deepEqual((await handleDetachedAuth(auth,service)).body,me);
  auth.target="/api/v2/auth/logout";auth.method="POST";const logout=await handleDetachedAuth(auth,service);
  assert.equal(logout.status,204);assert.equal(logout.body,undefined);assert.equal(logout.headers["Content-Type"],undefined);
  for(const target of ["/api/v1/profiles","/api/v2/conversations","/api/v2/auth/register","/api/v2/auth/password/reset"])
    assert.equal((await handleDetachedAuth({...auth,target},service)).status,404);
});
test("AUTH detached handlers reject duplicate/escaped JSON members, invalid UTF-8 and identity selectors",async()=>{
  const service=fake();
  for(const text of ['{"synthetic_uid":"BCH-DEMO-0001","synthetic_uid":"BCH-DEMO-0002","password":"x"}',
    '{"synthetic_uid":"BCH-DEMO-0001","synthetic_\\u0075id":"BCH-DEMO-0002","password":"x"}',
    '{"synthetic_uid":"BCH-DEMO-0001","password":"x","principal_id":"extra"}',
    '{"synthetic_uid":"BCH-DEMO-0001","password":"\\ud800"}'])
    assert.equal((await handleDetachedAuth({...request(),body:Buffer.from(text)},service)).status,400);
  assert.equal((await handleDetachedAuth({...request(),body:Buffer.from([0xff])},service)).status,400);
});
test("AUTH detached handlers enforce framing/media/query/method limits and response caching",async()=>{
  const service=fake();
  const cases:Array<[DetachedAuthRequest,number]>=[
    [{...request(),body:Buffer.alloc(16385)},413],[{...request(),target:"/"+"x".repeat(8192)},413],
    [{...request(),headers:[["oversized","x".repeat(16385)]]},413],
    [{...request(),headers:[["Content-Type","text/plain"]]},400],
    [{...request(),headers:[["Content-Type","application/json"],["Content-Encoding","gzip"]]},400],
    [{...request(),target:"/api/v2/auth/login?profile_key=other"},400],
    [{...request(),method:"GET",body:Buffer.alloc(0)},405],
    [{...request(),method:"GET"},400],
  ];
  for(const [input,status] of cases){const result=await handleDetachedAuth(input,service);assert.equal(result.status,status);assert.equal(result.headers["Cache-Control"],"no-store");assert.equal(result.headers.Vary,"Authorization");}
});
test("AUTH detached handlers accept access only through one Bearer header and sanitize failures",async()=>{
  const service=fake();const base={...request("me"),method:"GET",body:Buffer.alloc(0)};
  for(const headers of [[],[["Cookie",token]],[["Authorization","Bearer "+token],["Authorization","Bearer "+token]],[["Authorization","Basic "+token]]])
    assert.equal((await handleDetachedAuth({...base,headers:headers as Array<[string,string]>},service)).status,401);
  service.login=async()=>{throw new Error("SQL private_path secret_payload "+randomUUID());};
  const failed=await handleDetachedAuth(request(),service);assert.equal(failed.status,500);
  assert.doesNotMatch(JSON.stringify(failed.body),/SQL|private_path|secret_payload|stack/u);
  service.login=async()=>{throw new AuthError("RATE_LIMITED",900);};
  const limited=await handleDetachedAuth(request(),service);assert.equal(limited.status,429);assert.equal(limited.headers["Retry-After"],"900");
});
