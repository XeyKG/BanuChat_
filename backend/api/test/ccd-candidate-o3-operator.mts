/** O3-only operator: validates the authorized candidate identity before API startup. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {candidateEnvironment} from './ccd-candidate-o3/environment.js';
import {root} from './auth-i1b/environment.js';
import {startAuthenticatedApi} from '../src/authenticated-main.js';

const e=await candidateEnvironment();
const generator=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1a-http.json',root),'utf8')).generator;
const port=Number(process.env.BANUCHAT_O3_API_PORT??'3013');
assert.ok(Number.isInteger(port)&&port>=1024&&port<=65535&&port!==3003);
Object.assign(process.env,{BANUCHAT_AUTH_DATABASE:e.database,BANUCHAT_AUTH_DEPLOYMENT:e.deployment,BANUCHAT_AUTH_RATE_KEY:e.rateKey,
 BANUCHAT_AUTH_DB_PORT:String(e.port),BANUCHAT_AUTH_API_PORT:String(port),BANUCHAT_AUTH_EVIDENCE_MODE:'ccd_local',
 BANUCHAT_AUTH_RUNTIME_USER:e.runtime,BANUCHAT_AUTH_RUNTIME_PASSWORD:e.runtimePassword,
 BANUCHAT_OLLAMA_BASE_URL:'http://127.0.0.1:11434',BANUCHAT_GENERATOR_MODEL:generator.model,
 BANUCHAT_GENERATOR_MODEL_REVISION:generator.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:generator.runtime_version});
await startAuthenticatedApi();
