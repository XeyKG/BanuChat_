import test from 'node:test';
import assert from 'node:assert/strict';
import {assessConfiguration,assessUnifiedContainer,assessPublication,assessServicePort,safeFailure} from '../scripts/demo-preflight.mjs';
const cfg={database:'banuchat_unified',database_port:55463,api_port:3004,ollama_base_url:'http://127.0.0.1:11434',generator_model:'qwen3:4b-instruct',generator_model_revision:'a'.repeat(64),generator_runtime_version:'0.35.0',runtime_user:'synthetic',runtime_password:'synthetic-secret-never-printed'};
const container={Name:'/banuchat-unified-postgres',State:{Running:true},NetworkSettings:{Ports:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'55463'}]}},Mounts:[{Type:'volume',Name:'banuchat-unified-data'}]};
test('preflight accepts only existing Unified configuration, not historical lab or remote Ollama',()=>{
 assert.equal(assessConfiguration(cfg).status,'PASS');for(const delta of [{database:'historical_lab'},{api_port:3003},{database_port:55443},{ollama_base_url:'https://example.invalid'},{generator_model:'another-model'}])assert.equal(assessConfiguration({...cfg,...delta}).status,'FAIL');
});
test('container identity distinguishes stopped service and rejects replaced volume or exposed binding',()=>{
 assert.equal(assessUnifiedContainer(container).status,'PASS');assert.equal(assessUnifiedContainer({...container,State:{Running:false}}).reason,'EXISTING_CONTAINER_STOPPED_DO_NOT_RECREATE');assert.equal(assessUnifiedContainer({...container,Mounts:[]}).status,'FAIL');assert.equal(assessUnifiedContainer({...container,NetworkSettings:{Ports:{'5432/tcp':[{HostIp:'0.0.0.0',HostPort:'55463'}]}}}).status,'FAIL');assert.equal(assessUnifiedContainer(undefined).status,'FAIL');
});
test('current release and manifest guards reject drift independently',()=>{
 const r={id:'10af4ffd-effb-41fc-bbfe-4dc48cb3398f',current_release_id:'10af4ffd-effb-41fc-bbfe-4dc48cb3398f',status:'ready',dataset_schema_version:'ccd-1.4.0',manifest_sha256:'fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852'};
 assert.equal(assessPublication(r).status,'PASS');for(const delta of [{current_release_id:'other'},{manifest_sha256:'a'.repeat(64)},{status:'preparing'}])assert.equal(assessPublication({...r,...delta}).status,'FAIL');
});
test('free startup ports differ from missing running services; occupied wrong services never pass',()=>{
 assert.equal(assessServicePort('api',[],false,false).status,'PASS');assert.equal(assessServicePort('api',[],false,true).status,'FAIL');assert.equal(assessServicePort('api',['127.0.0.1'],true,true).status,'PASS');assert.equal(assessServicePort('api',['127.0.0.1'],false,false).reason,'PORT_OCCUPIED_BY_UNEXPECTED_OR_UNHEALTHY_SERVICE');assert.equal(assessServicePort('api',['0.0.0.0'],true,true).status,'FAIL');
});
test('error reports suppress credentials, provider bodies, command arguments and native stacks',()=>{
 for(const error of [{code:'42501',message:cfg.runtime_password,stderr:'private provider body',stack:'private stack'},{code:'ENOENT',cmd:'private command'},{message:cfg.runtime_password}]){const result=safeFailure('synthetic_probe',error);assert.equal(result.status,'FAIL');assert.doesNotMatch(JSON.stringify(result),/synthetic-secret|private provider|private stack|private command/u);}
 assert.equal(safeFailure('sql',{code:'42501'}).reason,'READ_PRIVILEGE_MISSING_NO_ESCALATION');
});
