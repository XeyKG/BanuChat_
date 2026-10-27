import assert from 'node:assert/strict';
import test from 'node:test';
import {CCD_AUTH_NOTICE,CCD_AUXILIARY_NOTICE} from '../src/config/demo-mode';
import {AuthSession} from '../src/auth/auth-session';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

test('CCD notice describes demonstration scope without globally denying evidence currency',()=>{
 assert.match(CCD_AUTH_NOTICE,/demostración/u);assert.match(CCD_AUTH_NOTICE,/sin aval institucional/iu);
 assert.match(CCD_AUTH_NOTICE,/no representan.*expediente.*real/u);
 assert.doesNotMatch(CCD_AUTH_NOTICE,/sin actualidad|actualidad.*no.*ratific|interfaz.*no.*verific/iu);
 assert.match(CCD_AUXILIARY_NOTICE,/ficticios.*demostración/u);assert.match(CCD_AUXILIARY_NOTICE,/no corresponden.*expediente.*real/iu);
});

test('failed login preserves the navigation tree; authentication boundaries replace it',async()=>{
 // Evaluate the actual Stack key with real AuthSession transitions. This catches
 // a remount that erases Login error state while still requiring logout purging.
 const source=ts.createSourceFile('layout.tsx',readFileSync(new URL('../src/app/_layout.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let expression:string|undefined;
 function visit(node:ts.Node){
  if(ts.isJsxOpeningElement(node)&&node.tagName.getText(source)==='Stack'){
   const key=node.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(source)==='key');
   if(key&&ts.isJsxAttribute(key)&&key.initializer&&ts.isJsxExpression(key.initializer))expression=key.initializer.expression?.getText(source);
  }
  ts.forEachChild(node,visit);
 }
 visit(source);assert.ok(expression);
 const evaluate=new Function('ccd','authenticated','snapshot',`return (${expression});`) as (ccd:boolean,authenticated:boolean,snapshot:ReturnType<AuthSession['getSnapshot']>)=>string;
 process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';let saved:string|null=null,deny=true;
 const id='11111111-1111-4111-8111-111111111111';
 const tokens={access_token:'A'.repeat(43),refresh_token:'B'.repeat(42)+'A',token_type:'Bearer',expires_in:900,session_expires_at:'2035-01-01T00:00:00Z'};
 const me={principal_id:id,session_id:id,synthetic_uid:'U08000001',session_expires_at:tokens.session_expires_at,release_id:id,evidence_mode:'ccd_local',profile:{profile_key:'auxiliary-fixture',alias:'Perfil ficticio'},capabilities:['chat','history','progress','calendar','announcements','documents']};
 const client=new AuthSession({available:async()=>true,get:async()=>saved,set:async v=>{saved=v;},clear:async()=>{saved=null;}},()=> 'http://127.0.0.1:3004/api/v2',async url=>{
  if(String(url).endsWith('/auth/login'))return deny?Response.json({}, {status:401}):Response.json(tokens);
  if(String(url).endsWith('/auth/logout'))return new Response(null,{status:204});
  return Response.json(me);
 });
 const key=()=>evaluate(false,client.getSnapshot().phase==='authenticated',client.getSnapshot());
 await client.restore();const signedOutKey=key(),observed:string[]=[];
 client.subscribe(()=>{if(client.getSnapshot().phase==='signed_out')observed.push(key());});
 await assert.rejects(client.login(me.synthetic_uid,'Fictitious wrong password'));
 assert.ok(observed.length>=2);assert.ok(observed.every(value=>value===signedOutKey));
 deny=false;await client.login(me.synthetic_uid,'Fictitious valid password');const firstAccountKey=key();assert.notEqual(firstAccountKey,signedOutKey);
 await client.logout();assert.equal(key(),signedOutKey);assert.equal(saved,null);
 await client.login(me.synthetic_uid,'Fictitious valid password');assert.notEqual(key(),firstAccountKey);
 assert.equal(evaluate(true,true,client.getSnapshot()),'ccd');
});

test('Mobile accepts documentary current from me independently of the auxiliary profile and release identity',async()=>{
 process.env.EXPO_PUBLIC_DEMO_MODE='ccd_authenticated';
 const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
 for(const release of ids){let saved:string|null=null;
  const pair={access_token:'A'.repeat(43),refresh_token:'B'.repeat(42)+'A',token_type:'Bearer',expires_in:900,session_expires_at:'2035-01-01T00:00:00Z'};
  const me={principal_id:ids[0],session_id:ids[1],synthetic_uid:'U08000001',session_expires_at:pair.session_expires_at,release_id:release,evidence_mode:'ccd_local',profile:{profile_key:'auxiliary-fixture',alias:'Perfil ficticio'},capabilities:['chat','history','progress','calendar','announcements','documents']};
  const client=new AuthSession({available:async()=>true,get:async()=>saved,set:async v=>{saved=v;},clear:async()=>{saved=null;}},()=> 'http://127.0.0.1:3004/api/v2',async url=>Response.json(String(url).endsWith('/auth/login')?pair:me));
  await client.login(me.synthetic_uid,'Fictitious unit-test password');assert.equal(client.getSnapshot().me?.release_id,release);assert.equal(client.getSnapshot().me?.profile.profile_key,'auxiliary-fixture');assert.equal(saved,pair.refresh_token);
 }
});
