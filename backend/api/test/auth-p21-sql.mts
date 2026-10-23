import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import test from 'node:test';
import {AuthService} from '../src/auth/auth-service.js';
import {digestToken,issueToken} from '../src/auth/primitives.js';
import {environment,pool,account,phrase,fingerprint} from './auth-p21/environment.js';
test('AUTH-P2.1 phase C: limited SQL boundary, ownership and races',async t=>{
 const e=await environment(),db=pool(e),runtime=pool(e,true);
 const fixture=JSON.parse(await readFile(new URL('../../../infra/local/auth-p21/fixture.json',import.meta.url),'utf8')) as {first:{release:string};second:{release:string}};
 const release=fixture.second.release,other=fixture.first.release;let failed=0;const checks:Array<{name:string;result:string}>=[];
 const core=await AuthService.create({pool:runtime,expectedDatabase:e.database,deploymentId:e.deploymentId,rateKey:Buffer.from(e.rateKey,'hex')});
 const login=async(uid:string)=>(await core.login({synthetic_uid:uid,password:phrase},{origin:'sql-test',requestId:randomUUID()})).access_token;
 const context=(token:string,id:string|null=null)=>runtime.query('SELECT * FROM banuchat_auth.resource_context($1,$2,true,$3)',[token,id,id!==null]);
 const citation={citation_index:0,dataset_release_id:release,source_kind:'profile',source_path:'profiles/auth-fixture.json',source_locator:'profile:auth_fixture',source_sha256:'f'.repeat(64),document_version_id:null,chunk_id:null,course_key:null,event_key:null,announcement_key:null,profile_key:'auth_fixture'};
 const persist=(token:string,id:string,ordinal=0,cites:unknown=[citation],r=release)=>runtime.query('SELECT * FROM banuchat_auth.persist_turn($1,$2,$3,$4,$5,$6,false,$7)',[token,id,r,ordinal,'Pregunta ficticia','Respuesta ficticia',JSON.stringify(cites)]);
 const rejected=(code:string)=>(err:unknown)=>{const x=err as {code?:string;message?:string;detail?:string};assert.equal(x.code,code);assert.ok(![phrase,'@banuchat.test','profiles/auth'].some(v=>(x.message??'').includes(v)||(x.detail??'').includes(v)));return true;};
 const run=async(name:string,work:()=>Promise<void>)=>t.test(name,async()=>{try{await work();checks.push({name,result:'PASS'});}catch(error){failed++;checks.push({name,result:'FAIL'});throw error;}});
 async function conversation(owner:string){const c=(await db.query("INSERT INTO banuchat.conversations(dataset_release_id,profile_key) VALUES($1,'auth_fixture') RETURNING id",[release])).rows[0].id as string;await db.query('INSERT INTO banuchat_auth.conversation_owners(conversation_id,principal_id) VALUES($1,$2)',[c,owner]);return c;}
 try{
 const before=await fingerprint(db);const a=await account(db,'2101',[release,other]),b=await account(db,'2102',[release,other]);const ta=await login(a.uid),tb=await login(b.uid);const chat=await conversation(a.id);
 await run('NOLOGIN owner, safe search_path, PUBLIC denied, exact approved EXECUTE list',async()=>{
  const funcs=(await db.query("SELECT p.proname,p.prosecdef,p.proconfig,r.rolcanlogin,r.rolsuper FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.pronamespace='banuchat_auth'::regnamespace ORDER BY p.proname")).rows;
  assert.equal(funcs.length,2);for(const f of funcs){assert.equal(f.prosecdef,true);assert.equal(f.rolcanlogin,false);assert.equal(f.rolsuper,false);assert.ok(f.proconfig.includes('search_path=pg_catalog, banuchat_auth, pg_temp'));}
  const exec=(await runtime.query("SELECT n.nspname,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('banuchat','banuchat_auth') AND has_function_privilege(p.oid,'EXECUTE') ORDER BY p.proname")).rows.map(r=>r.proname).sort();
  assert.deepEqual(exec,['current_retrieval_context','persist_turn','resource_context','search_chunks_cosine']);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_proc p,aclexplode(p.proacl) a WHERE p.pronamespace='banuchat_auth'::regnamespace AND a.grantee=0 AND a.privilege_type='EXECUTE'")).rows[0].n,0);
 });
 await run('runtime direct UPDATE, direct message INSERT, unapproved function and SET ROLE denied',async()=>{
  for(const table of ['conversations','datasets','dataset_releases']){assert.equal((await runtime.query('SELECT has_any_column_privilege($1,\'UPDATE\') AS allowed',['banuchat.'+table])).rows[0].allowed,false);await assert.rejects(runtime.query(`UPDATE banuchat.${table} SET id=id WHERE false`),rejected('42501'));}
  await assert.rejects(runtime.query('SELECT banuchat.release_records($1)',[release]),rejected('42501'));
  await assert.rejects(runtime.query('SELECT banuchat.publish_release($1)',[release]),rejected('42501'));
  await assert.rejects(runtime.query('SET ROLE banuchat_auth_executor'),rejected('42501'));
  await assert.rejects(runtime.query("INSERT INTO banuchat.messages(conversation_id,ordinal,role,content) VALUES($1,0,'user','ficticio')",[chat]),rejected('42501'));
 });
 await run('A/B same profile, foreign and manipulated UUID reject before writing',async()=>{
  assert.equal((await context(ta,chat)).rows[0].principal_id,a.id);
  await assert.rejects(persist(tb,chat),rejected('P0404'));await assert.rejects(persist(ta,randomUUID()),rejected('P0404'));
 });
 await run('raw access possession required: unknown, stored digest, UUID and wrong deployment rejected',async()=>{
  for(const value of [issueToken().token,digestToken(ta),a.id])await assert.rejects(persist(value,chat),rejected('P0401'));
  const session=await core.authenticate(ta);await db.query('UPDATE banuchat_auth.sessions SET deployment_id=$2 WHERE id=$1',[session.sessionId,randomUUID()]);
  await assert.rejects(persist(ta,chat),rejected('P0401'));await db.query('UPDATE banuchat_auth.sessions SET deployment_id=$2 WHERE id=$1',[session.sessionId,e.deploymentId]);
 });
 await run('SQL enforces Unicode/nonblank/length limits and closed indexed citation records',async()=>{
  for(const user of ['', '\u00a0\ufeff\u2003', 'x'.repeat(4001)])await assert.rejects(runtime.query('SELECT * FROM banuchat_auth.persist_turn($1,$2,$3,0,$4,$5,false,$6)',[ta,chat,release,user,'Respuesta ficticia','[]']),rejected('P0400'));
  await assert.rejects(persist(ta,chat,0,[{...citation,principal_id:a.id}]),rejected('P0400'));
  await assert.rejects(persist(ta,chat,0,[{...citation,citation_index:1}]),rejected('P0400'));
 });
 await run('all three protected row locks are held until transaction commit',async()=>{
  const c=await runtime.connect(),probe=await db.connect();try{await c.query('BEGIN');assert.equal((await c.query('SELECT * FROM banuchat_auth.persist_turn($1,$2,$3,0,$4,$5,false,$6)',[ta,chat,release,'Pregunta ficticia','Respuesta ficticia',JSON.stringify([citation])])).rows[0].status,'inserted');
   for(const [table,key] of [['conversations',chat],['datasets',1],['dataset_releases',release]] as const){await probe.query('BEGIN');await assert.rejects(probe.query(`SELECT id FROM banuchat.${table} WHERE id=$1 FOR UPDATE NOWAIT`,[key]),rejected('55P03'));await probe.query('ROLLBACK');}
   await c.query('COMMIT');
  }finally{await c.query('ROLLBACK');c.release();probe.release();}
 });
 await run('invalid provenance rolls back both messages and citations',async()=>{
  await assert.rejects(persist(ta,chat,2,[{...citation,source_sha256:'e'.repeat(64)}]),rejected('P0500'));
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.messages WHERE conversation_id=$1',[chat])).rows[0].n,2);
  assert.equal((await db.query('SELECT count(*)::int n FROM banuchat.message_citations')).rows[0].n,1);
 });
 await run('two simultaneous sends preserve ordinals and only one succeeds',async()=>{
  const result=await Promise.all([persist(ta,chat,2),persist(ta,chat,2)]);assert.deepEqual(result.map(r=>r.rows[0].status).sort(),['conversation_conflict','inserted']);
  assert.deepEqual((await db.query('SELECT ordinal FROM banuchat.messages WHERE conversation_id=$1 ORDER BY ordinal',[chat])).rows.map(r=>r.ordinal),[0,1,2,3]);
 });
 await run('winning revocation under account lock rejects a waiting commit',async()=>{
  const token=await login(a.uid),s=await core.authenticate(token);const blocker=await db.connect();await blocker.query('BEGIN');await blocker.query('SELECT id FROM banuchat_auth.accounts WHERE id=$1 FOR UPDATE',[a.id]);
  const waiting=persist(token,chat,4);await blocker.query('UPDATE banuchat_auth.sessions SET revoked_at=clock_timestamp() WHERE id=$1',[s.sessionId]);await blocker.query('COMMIT');blocker.release();await assert.rejects(waiting,rejected('P0401'));
 });
 await run('winning publication preserves original current_release_changed policy',async()=>{
  const blocker=await db.connect();await blocker.query('BEGIN');await blocker.query('SELECT id FROM banuchat.datasets WHERE id=1 FOR UPDATE');
  const waiting=persist(ta,chat,4);await blocker.query('UPDATE banuchat.datasets SET current_release_id=$1 WHERE id=1',[other]);await blocker.query('COMMIT');blocker.release();
  assert.equal((await waiting).rows[0].status,'current_release_changed');await db.query('UPDATE banuchat.datasets SET current_release_id=$1 WHERE id=1',[release]);
 });
 await run('auth_version, grant and expiry revalidated by SQL independently of API',async()=>{
  await db.query('UPDATE banuchat_auth.accounts SET auth_version=auth_version+1 WHERE id=$1',[b.id]);await assert.rejects(persist(tb,chat),rejected('P0401'));
  const token=await login(b.uid);await db.query('UPDATE banuchat_auth.corpus_grants SET revoked_at=clock_timestamp() WHERE principal_id=$1',[b.id]);await assert.rejects(context(token),rejected('P0403'));
  await db.query('UPDATE banuchat_auth.corpus_grants SET revoked_at=NULL WHERE principal_id=$1',[b.id]);
  const s=await core.authenticate(token);await db.query("UPDATE banuchat_auth.sessions SET access_expires_at=access_issued_at+interval '1 millisecond' WHERE id=$1",[s.sessionId]);await assert.rejects(context(token),rejected('P0401'));
 });
 await run('historical CTE exact parameter-only equivalence; corpus unchanged',async()=>{
  const ts=await readFile(new URL('../src/application/messages.ts',import.meta.url),'utf8'),migration=await readFile(new URL('../../../infra/db/007_authenticated_resources.sql',import.meta.url),'utf8');
  let historical=/const PERSIST_TURN_QUERY = `([\s\S]+?)`;/u.exec(ts)![1]!.trim();const names=['p_conversation','p_release','p_ordinal','p_user','p_answer','p_insufficient','p_citations'];for(let i=7;i>=1;i--)historical=historical.replaceAll('$'+i,names[i-1]!);
  assert.equal(migration.split('-- BEGIN HISTORICAL TURN\n')[1]!.split(';\n-- END HISTORICAL TURN')[0]!.replaceAll('\r\n','\n').trim(),historical.replaceAll('\r\n','\n'));
  assert.equal(await fingerprint(db),before);
 });
 await writeFile(new URL('../../../infra/local/auth-p21/phase-c.json',import.meta.url),JSON.stringify({result:failed?'FAIL':'PASS',deploymentId:e.deploymentId,database:e.database,release,checks,corpusBefore:before,corpusAfter:await fingerprint(db)},null,2)+'\n');
 }finally{await runtime.end();await db.end();}
});
