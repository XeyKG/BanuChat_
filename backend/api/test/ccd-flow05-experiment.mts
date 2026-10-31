/** Explicit opt-in local experiment; not discovered by npm test. No database or HTTP sessions. */
import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {flow05Scenarios,flow05Fixture} from './fixtures/ccd-flow05.js';
import {parseGroundedAnswer} from '../src/chat/document-evidence.js';
import {loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';

assert.equal(process.argv[2],'--run-once','Explicit opt-in required');
const dir=new URL('../../../infra/local/oe1-quality-04/',import.meta.url),configFile=new URL('../unified/application.json',dir);
// test/ is three levels below the repository root.
const output=new URL('experiment-private.json',dir),stream=new URL('experiment-private.jsonl',dir);
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
assert.ok(execFileSync('git',['check-ignore',fileURLToPath(output)],{encoding:'utf8'}).trim());
const cfgBytes=await readFile(configFile),cfg=JSON.parse(cfgBytes.toString('utf8'))as Record<string,string>;
const runtime=loadGeneratorRuntimeConfig({BANUCHAT_OLLAMA_BASE_URL:cfg.ollama_base_url,BANUCHAT_GENERATOR_MODEL:cfg.generator_model,BANUCHAT_GENERATOR_MODEL_REVISION:cfg.generator_model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:cfg.generator_runtime_version});
const frozen=JSON.parse(await readFile(new URL('preregistered.json',dir),'utf8'))as {scenarios_sha256:string};
assert.equal(sha(JSON.stringify(flow05Scenarios)),frozen.scenarios_sha256);
const client=new OllamaGeneratorClient(runtime.base_url),records=[];
await mkdir(dir,{recursive:true});await writeFile(stream,JSON.stringify({started_at:new Date().toISOString(),mode:'synthetic_fixed_retrieval_real_generator',planned:flow05Scenarios.length,scenario_sha256:frozen.scenarios_sha256,config_sha256:sha(cfgBytes),generator:runtime.generator,retries:0})+'\n',{flag:'wx'});
for(const scenario of flow05Scenarios){
 const f=flow05Fixture(scenario,client,runtime.generator),start=performance.now();
 try{const answer=await f.ask();assert.equal(f.calls.length,1);const raw=f.calls[0]!.output!.content;
  const record={name:scenario.name,expectation:scenario.expected,forbidden:scenario.forbidden,query:scenario.query,input:f.calls[0]!.input,raw_output:f.calls[0]!.output,parser:parseGroundedAnswer(raw,f.chunks.length)??null,exact_marker:raw.trim()==='EVIDENCIA_INSUFICIENTE',answer,retrievals:f.retrievals,duration_ms:Math.round(performance.now()-start)};
  records.push(record);await appendFile(stream,JSON.stringify(record)+'\n');console.log(JSON.stringify({name:scenario.name,exact_marker:record.exact_marker,parser_valid:!!record.parser,abstention:answer.insufficient_evidence,strategy:answer.pilot_strategy,citations:answer.citations.length,duration_ms:record.duration_ms}));
 }catch(error){await appendFile(stream,JSON.stringify({name:scenario.name,status:'error',reason:(error as {reason?:string}).reason??'experiment_invariant',duration_ms:Math.round(performance.now()-start)})+'\n');throw error;}
}
assert.equal(sha(await readFile(configFile)),sha(cfgBytes));
await writeFile(output,JSON.stringify({finished_at:new Date().toISOString(),cases:records,generator:runtime.generator,configuration_unchanged:true,database_used:false,authenticated_composition_used:false,requires_material_review:true},null,2)+'\n',{flag:'wx'});
