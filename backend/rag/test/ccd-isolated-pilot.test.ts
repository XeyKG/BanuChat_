import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareIsolatedPilot,assertIsolatedPilotWriter,stageIsolatedPilot,type PilotClaim,type PilotSql} from '../src/ccd/isolated-pilot.js';
const c:PilotClaim={claim_id:'TEST-001',title:'Scoped example',statement:'A reviewed documentary statement.',period:'Delivered edition',population:'General orientation',topics:['academic'],basis:[{kind:'DOCUMENT_SOURCE',references:[{sha256:'a'.repeat(64),locator:'page:2'}]}],review_status:'ADMITTED_ISOLATED_PROJECT_PILOT',evidence_visible_allowed:false,isolated_evaluation_allowed:true,conditions:[],exceptions:[]};
test('unapproved, public and duplicate claims never prepare',()=>{
 for(const change of [{review_status:'NOT_APPROVED'},{evidence_visible_allowed:true},{isolated_evaluation_allowed:false}])assert.throws(()=>prepareIsolatedPilot('test',[{...c,...change}]));
 assert.throws(()=>prepareIsolatedPilot('test',[c,c]));
});
test('prepared provenance retains confirmation as distinct from document evidence',()=>{
 const p=prepareIsolatedPilot('test',[{...c,basis:[...c.basis,{kind:'DOMAIN_CONFIRMATION',references:[{locator:'R2'}]}]}]);
 assert.deepEqual(p.provenance['TEST-001']?.map(x=>x.kind),['DOCUMENT_SOURCE','DOMAIN_CONFIRMATION']);
 assert.match(p.documents[0]!.content,/DOMAIN_CONFIRMATION/u);
});
test('unknown email and personal telephone are not accepted in derivatives',()=>{
 for(const text of ['person@example.invalid','300 123 4567'])assert.throws(()=>prepareIsolatedPilot('test',[{...c,statement:text}]));
});
test('writer guard rejects product DB, wrong role and publication pointer',async()=>{
 for(const row of [{name:'banuchat_unified',role:'banuchat_pilot_writer',marker:true,no_current:true},{name:'banuchat_p0_operational',role:'admin',marker:true,no_current:true},{name:'banuchat_p0_operational',role:'banuchat_pilot_writer',marker:true,no_current:false}]){
  const sql:PilotSql={query:async<T>()=>({rows:[row] as T[]})};await assert.rejects(assertIsolatedPilotWriter(sql));
 }
});
test('tampered prepared metadata rejected before embeddings or transaction',async()=>{
 const p=prepareIsolatedPilot('test',[c]);p.documents[0]!.metadata.period='altered';let embedded=false;
 const sql:PilotSql={query:async<T>()=>({rows:[{name:'banuchat_p0_operational',role:'banuchat_pilot_writer',marker:true,no_current:true}] as T[]})};
 await assert.rejects(stageIsolatedPilot(sql,{inspect:async()=>{throw Error();},embed:async()=>{embedded=true;return [];}},p,{} as never));assert.equal(embedded,false);
});
test('presentation is manifest-bound while original period and provenance remain internal',()=>{
 const p=prepareIsolatedPilot('test',[{...c,period:'202660',presentation_units:[{key:'scope',aspects:['schedule'],text:'Consulta una nueva jornada programada; no se presenta cualquier día.'}]}]);
 assert.equal(p.documents[0]!.metadata.period,'202660');assert.match(p.documents[0]!.metadata.presentation_units![0]!.text,/no se presenta cualquier día/u);
 assert.match(p.documents[0]!.content,/202660/u);assert.deepEqual(p.provenance['TEST-001'],c.basis);
 const q=prepareIsolatedPilot('test',[{...c,period:'202660',presentation_units:[{key:'scope',aspects:['schedule'],text:'Otra redacción revisada.'}]}]);
 assert.equal(p.documents[0]!.sha256,q.documents[0]!.sha256);assert.notEqual(p.manifest_sha256,q.manifest_sha256);
});
test('presentation rejects audit labels, internal periods and unapproved contact detail',()=>{
 for(const text of ['Referencia documental','DOMAIN_CONFIRMATION','OP-001','Periodo 202660','person@example.invalid','300 123 4567'])assert.throws(()=>prepareIsolatedPilot('test',[{...c,presentation_units:[{key:'fact',aspects:['purpose'],text}]}]));
});
