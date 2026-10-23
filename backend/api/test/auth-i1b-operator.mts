/** Explicit operator entry point. Never prints secrets unless accounts was requested. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {environment,root} from './auth-i1b/environment.js';
import {demoAccounts} from './auth-i1b/accounts.js';
import {startAuthenticatedApi} from '../src/authenticated-main.js';
const action=process.argv[2];
assert.ok(action==='api'||action==='accounts','Use api or accounts in a private operator terminal');
if(action==='accounts'){
 console.log('PRIVATE: fictitious local accounts; do not copy into reports or chats.');
 for(const account of await demoAccounts())console.log(`${account.uid}\t${account.name}\t${account.password}`);
}else{
 const e=await environment();
 const generator=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1a-http.json',root),'utf8')).generator;
 Object.assign(process.env,{BANUCHAT_AUTH_DATABASE:e.database,BANUCHAT_AUTH_DEPLOYMENT:e.deployment,BANUCHAT_AUTH_RATE_KEY:e.rateKey,
  BANUCHAT_AUTH_DB_PORT:String(e.port),BANUCHAT_AUTH_API_PORT:'3003',BANUCHAT_AUTH_EVIDENCE_MODE:'ccd_local',
  BANUCHAT_AUTH_RUNTIME_USER:e.runtime,BANUCHAT_AUTH_RUNTIME_PASSWORD:e.runtimePassword,
  BANUCHAT_OLLAMA_BASE_URL:'http://127.0.0.1:11434',BANUCHAT_GENERATOR_MODEL:generator.model,
  BANUCHAT_GENERATOR_MODEL_REVISION:generator.model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:generator.runtime_version});
 await startAuthenticatedApi();
}
