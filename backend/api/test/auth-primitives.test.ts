import assert from "node:assert/strict";
import {createHash,randomBytes} from "node:crypto";
import test from "node:test";
import type {Pool} from "pg";
import {PgTransactionRunner} from "../src/data/transaction.js";
import {Argon2idHasher,AuthError,bucketKey,digestToken,exactObject,issueToken,newPassword,password,uid} from "../src/auth/primitives.js";
import {usableSession} from "../src/auth/auth-service.js";
import type {AccountRow,SessionRow} from "../src/auth/pg-auth-store.js";

test("AUTH tokens use independent CSPRNG values and SHA-256 of canonical decoded bytes",()=>{
  const tokens=Array.from({length:100},()=>issueToken());assert.equal(new Set(tokens.map(t=>t.token)).size,100);
  for(const t of tokens) {
    assert.equal(t.token.length,43);assert.equal(t.digest.length,64);
    assert.equal(t.digest,createHash("sha256").update(Buffer.from(t.token,"base64url")).digest("hex"));
  }
  for(const t of [null,"",123,"A".repeat(42),"A".repeat(42)+"B","A".repeat(43)+"="])assert.throws(()=>digestToken(t),AuthError);
});
test("AUTH Argon2id really hashes and verifies with random salts and the frozen cost",async()=>{
  const hasher=new Argon2idHasher();const plain="frase exclusivamente ficticia";
  const first=await hasher.hash(plain);const second=await hasher.hash(plain);
  assert.equal(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/u.test(first),true);
  assert.equal(first!==second,true);assert.equal(await hasher.verify(first,plain),true);
  assert.equal(await hasher.verify(first,"otra frase exclusivamente ficticia"),false);
  assert.equal(await hasher.verify("plaintext",plain),false);
  assert.equal(await hasher.verify(first.replace("m=19456","m=999999999"),plain),false);
});
test("AUTH bounds hash concurrency without an unbounded waiting queue",async()=>{
  const hasher=new Argon2idHasher();
  const operations=[hasher.hash("frase ficticia de concurrencia uno"),hasher.hash("frase ficticia de concurrencia dos")];
  await assert.rejects(new Argon2idHasher().hash("frase ficticia de concurrencia tres"),(e:unknown)=>e instanceof AuthError && e.code==="DEPENDENCY_UNAVAILABLE");
  await Promise.all(operations);assert.equal(typeof await hasher.hash("frase ficticia posterior al limite"),"string");
});
test("AUTH validates exact fields, synthetic UID, Unicode and local password policy",()=>{
  assert.equal(uid("BCH-DEMO-0001"),"BCH-DEMO-0001");
  for(const value of ["BCH-DEMO-0001\n","bch-demo-0001",null,"BCH-DEMO-000１"])assert.throws(()=>uid(value),AuthError);
  assert.equal([...newPassword("😀a".repeat(64))].length,128);
  for(const value of ["a".repeat(15),"passwordpassword","short","x".repeat(129),"\ud800"+"valid fictitious phrase"])assert.throws(()=>newPassword(value),AuthError);
  assert.equal(password("x"),"x");assert.throws(()=>exactObject({profile_key:"other"},[]),AuthError);
});
test("AUTH HMAC buckets separate action/identity and never store raw UID or origin",()=>{
  const key=randomBytes(32);const original=bucketKey(key,"login_uid","BCH-DEMO-0001");
  assert.match(original,/^[0-9a-f]{64}$/u);
  assert.equal(original,bucketKey(key,"login_uid","BCH-DEMO-0001"));
  assert.notEqual(original,bucketKey(key,"reset_uid","BCH-DEMO-0001"));
  assert.notEqual(original,bucketKey(randomBytes(32),"login_uid","BCH-DEMO-0001"));
});
test("AUTH controlled-clock session boundaries, version, inactivity and deployment fail closed",()=>{
  const now=new Date("2030-01-01T00:10:00Z");
  const a:AccountRow={id:"account",synthetic_uid:"BCH-DEMO-0001",status:"active",auth_version:"1",password_hash:"shape fixture"};
  const s:SessionRow={id:"session",principal_id:a.id,deployment_id:"deployment",auth_version:"1",created_at:new Date("2030-01-01Z"),
    access_expires_at:new Date("2030-01-01T00:15:00Z"),last_seen_at:new Date("2030-01-01Z"),absolute_expires_at:new Date("2030-01-08Z"),revoked_at:null};
  assert.equal(usableSession(a,s,now,"deployment",true),true);
  assert.equal(usableSession(a,s,s.access_expires_at,"deployment",true),false);
  assert.equal(usableSession(a,s,s.access_expires_at,"deployment",false),true);
  assert.equal(usableSession(a,s,new Date("2030-01-02Z"),"deployment",false),false);
  assert.equal(usableSession(a,s,s.absolute_expires_at,"deployment",false),false);
  assert.equal(usableSession({...a,auth_version:"2"},s,now,"deployment",true),false);
  assert.equal(usableSession({...a,status:"disabled"},s,now,"deployment",true),false);
  assert.equal(usableSession(a,{...s,revoked_at:now},now,"deployment",true),false);
  assert.equal(usableSession(a,s,now,"ccd",true),false);
});
test("AUTH transaction runner reserves one connection and commits or rolls back before release",async()=>{
  const events:string[]=[];let connected=0;
  const pool={connect:async()=>{connected++;return {query:async(sql:string)=>{events.push(sql);return {rows:[]};},release:()=>events.push("release")};}} as unknown as Pool;
  const runner=new PgTransactionRunner(pool);
  await runner.run(async c=>{await c.query("work");});
  assert.deepEqual(events,["BEGIN","work","COMMIT","release"]);events.length=0;
  await assert.rejects(runner.run(async c=>{await c.query("work");throw new Error("controlled test failure");}));
  assert.deepEqual(events,["BEGIN","work","ROLLBACK","release"]);assert.equal(connected,2);
});
test("AUTH transaction runner discards a connection whose rollback failed",async()=>{
  let discarded=false;
  const pool={connect:async()=>({query:async(sql:string)=>{if(sql==="ROLLBACK")throw new Error("controlled connection loss");return {rows:[]};},
    release:(discard:boolean)=>{discarded=discard;}})} as unknown as Pool;
  await assert.rejects(new PgTransactionRunner(pool).run(async()=>{throw new Error("controlled work failure");}));
  assert.equal(discarded,true);
});
