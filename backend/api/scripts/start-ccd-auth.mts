/** Canonical local CCD authenticated API launcher. It never creates or mutates Docker resources. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {startAuthenticatedApi} from '../src/authenticated-main.js';

interface Config {
 container:string;project:string;service:string;database:string;database_port:number;volume:string;network:string;api_port:number;
 deployment:string;runtime_user:string;runtime_password:string;rate_key:string;evidence_mode:'ccd_local';ollama_base_url:string;
 generator_model:string;generator_model_revision:string;generator_runtime_version:string;
}
const root=new URL('../../../',import.meta.url);
async function main(){
 const config=JSON.parse(await readFile(new URL('infra/local/banuchat-dev/ccd-auth-api.json',root),'utf8')) as Config;
 assert.deepEqual({container:config.container,project:config.project,service:config.service,database:config.database,database_port:config.database_port,
  volume:config.volume,network:config.network,api_port:config.api_port,evidence_mode:config.evidence_mode,ollama_base_url:config.ollama_base_url},
 {container:'banuchat-dev-postgres-ccd-auth-1',project:'banuchat-dev',service:'postgres-ccd-auth',database:'banuchat_ccd_auth_i1b_test',database_port:55453,
  volume:'banuchat-dev-ccd-auth-data',network:'banuchat-dev-ccd-auth',api_port:3003,evidence_mode:'ccd_local',ollama_base_url:'http://127.0.0.1:11434'});
 for(const value of [config.deployment,config.runtime_user,config.runtime_password,config.generator_model,config.generator_model_revision,config.generator_runtime_version])assert.ok(typeof value==='string'&&value.length>0);
 assert.match(config.rate_key,/^[a-f0-9]{64}$/iu);
 const actual=JSON.parse(execFileSync('docker',['inspect',config.container],{encoding:'utf8',stdio:['pipe','pipe','pipe']}))[0];
 assert.equal(actual.Name,'/'+config.container);assert.equal(actual.State.Running,true);assert.equal(actual.State.Health?.Status,'healthy');
 assert.equal(actual.Config.Labels['com.docker.compose.project'],config.project);assert.equal(actual.Config.Labels['com.docker.compose.service'],config.service);
 assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostPort,String(config.database_port));
 assert.ok(actual.Mounts.some((m:{Name?:string;Destination?:string})=>m.Name===config.volume&&m.Destination==='/var/lib/postgresql/data'));
 assert.ok(Object.hasOwn(actual.NetworkSettings.Networks,config.network));
 Object.assign(process.env,{BANUCHAT_AUTH_DATABASE:config.database,BANUCHAT_AUTH_DEPLOYMENT:config.deployment,BANUCHAT_AUTH_RATE_KEY:config.rate_key,
  BANUCHAT_AUTH_DB_PORT:String(config.database_port),BANUCHAT_AUTH_API_PORT:String(config.api_port),BANUCHAT_AUTH_EVIDENCE_MODE:config.evidence_mode,
  BANUCHAT_AUTH_RUNTIME_USER:config.runtime_user,BANUCHAT_AUTH_RUNTIME_PASSWORD:config.runtime_password,
  BANUCHAT_OLLAMA_BASE_URL:config.ollama_base_url,BANUCHAT_GENERATOR_MODEL:config.generator_model,
  BANUCHAT_GENERATOR_MODEL_REVISION:config.generator_model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:config.generator_runtime_version});
 await startAuthenticatedApi();
}
try{await main();}catch{console.error('No se pudo validar o iniciar el entorno CCD autenticado canónico.');process.exitCode=1;}
