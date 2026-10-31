import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCES,assertSource,assertTarget,safeRelative,roleSQL,redactDefinitions,assertCustodyPhysical} from './verify-unified-recovery.mjs';
import {resolve} from 'node:path';
const id='a'.repeat(64),image='sha256:'+'b'.repeat(64),run='11111111-2222-3333-4444-555555555555';
const source=()=>({Id:id,Name:'/banuchat-unified-postgres',Image:image,State:{Running:true},Config:{Labels:{'banuchat.scope':'unified-isolated'}},Mounts:[{Type:'volume',Name:SOURCES.unified.volume,Destination:'/var/lib/postgresql/data'}],HostConfig:{PortBindings:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'55463'}]}}});
const target=()=>({Id:id,Name:'/banuchat-recovery-unified-11111111',Image:image,Config:{Labels:{'banuchat.recovery.task':'OE6-UNIFIED-RECOVERY-01','banuchat.recovery.run':run}},Mounts:[],HostConfig:{NetworkMode:'none',Tmpfs:{'/var/lib/postgresql/data':'rw'},PortBindings:{},Binds:[]}});
const expected={id,name:'banuchat-recovery-unified-11111111',image,run};
test('custody permits MSIX local redirection but rejects an external root or child junction',()=>{
 const local=resolve('local-profile'),base=resolve(local,'Packages/App/LocalCache/Local/BanuChat/recovery/OE6-UNIFIED-RECOVERY-01');
 assert.doesNotThrow(()=>assertCustodyPhysical(local,base,resolve(base,run),run));
 assert.throws(()=>assertCustodyPhysical(local,resolve('cloud/BanuChat/recovery/OE6-UNIFIED-RECOVERY-01'),resolve(base,run),run));
 assert.throws(()=>assertCustodyPhysical(local,base,resolve(base,'foreign'),run));
});
test('source identity gate rejects an alternate volume, public binding or stopped source',()=>{
 assert.equal(assertSource(source(),'unified').id,id);
 for(const change of [s=>s.Mounts[0].Name='other',s=>s.Mounts[0].Destination='/other',s=>s.HostConfig.PortBindings['5432/tcp'][0].HostIp='0.0.0.0',s=>s.State.Running=false,s=>s.Name='/foreign']){
  const s=source();change(s);assert.throws(()=>assertSource(s,'unified'));
 }
});
test('cleanup refuses another run, container, image or a source-volume mount',()=>{
 assert.equal(assertTarget(target(),expected),true);
 for(const change of [t=>t.Id='other',t=>t.Config.Labels['banuchat.recovery.run']='other',t=>t.Image='other',t=>t.Mounts=[{Type:'volume',Name:SOURCES.unified.volume}],t=>t.HostConfig.Binds=['source:/source:ro']]){
  const t=target();change(t);assert.throws(()=>assertTarget(t,expected));
 }
});
test('restore cannot proceed with a connected target or published port',()=>{
 for(const change of [t=>t.HostConfig.NetworkMode='bridge',t=>t.HostConfig.PortBindings={'5432/tcp':[{HostPort:'55464'}]},t=>t.HostConfig.Tmpfs={}]){
  const t=target();change(t);assert.throws(()=>assertTarget(t,expected));
 }
});
test('artifact references cannot leave their approved root',()=>{
 assert.equal(safeRelative('documents/artifacts/demo.md'),'documents/artifacts/demo.md');
 for(const p of ['../private','documents/../secret','documents//x','documents/./x','C:/private','documents/a\\b','documents/x:stream'])assert.throws(()=>safeRelative(p));
});
test('roles retain privilege flags but cannot restore login credentials',()=>{
 const sql=roleSQL([{rolname:'reader"test',rolsuper:false,rolinherit:false,rolcreaterole:false,rolcreatedb:false,rolreplication:false,rolbypassrls:false,rolconnlimit:-1,rolconfig:['default_transaction_read_only=on']}],[]);
 assert.match(sql,/"reader""test" NOLOGIN NOSUPERUSER NOINHERIT/);
 assert.doesNotMatch(sql,/PASSWORD|LOGIN TRUE/);
 assert.throws(()=>roleSQL([{rolname:'postgres'}],[]));
 assert.throws(()=>roleSQL([{rolname:'reader',rolconfig:['custom.secret=synthetic']}],[]));
});
test('membership restoration includes grantor and all three PG16 options',()=>{
 const sql=roleSQL([],[{role:'group',member:'reader',grantor:'owner',admin_option:false,inherit_option:true,set_option:false}]);
 assert.match(sql,/WITH ADMIN FALSE GRANTED BY "owner"/);
 assert.match(sql,/WITH INHERIT TRUE/);assert.match(sql,/WITH SET FALSE/);
 assert.match(sql,/SET ROLE "owner";\nGRANT/);assert.match(sql,/RESET ROLE;/);
});
test('built-in monitoring memberships retain the target cluster bootstrap identity',()=>{
 assert.equal(roleSQL([],[{role:'pg_read_all_stats',member:'pg_monitor',grantor:'source_bootstrap'}]),'');
});
test('redactor handles JSON-encoded node parameters, headers and embedded known secrets',()=>{
 const secret='SYNTHETIC-ONLY-SECRET-123456789';
 const original={workflows:[{nodes:JSON.stringify([{parameters:{password:'example',headers:[{name:'Authorization',value:'Bearer fake'}],code:'const key="'+secret+'";'}}]),connections:'{}',settings:'{}'}],history:[],published:[]};
 const result=redactDefinitions(original,[secret]);
 assert.ok(result.redactions>=3);assert.doesNotMatch(JSON.stringify(result.data),new RegExp(secret+'|Bearer fake|example'));
 assert.ok(typeof original.workflows[0].nodes==='string');
});
test('credential references and source activation are metadata, with no runtime activation',()=>{
 const original={workflows:[{active:1,nodes:'[{"credentials":{"httpHeaderAuth":{"id":"fixture-reference"}},"parameters":{"authentication":"genericCredentialType"}}]',connections:'{}',settings:'{}'}],history:[],published:[]};
 const result=redactDefinitions(original);
 assert.equal(result.redactions,0);assert.equal(result.data.workflows[0].active,1);
 assert.equal(result.data.workflows[0].nodes[0].credentials.httpHeaderAuth.id,'fixture-reference');
});
