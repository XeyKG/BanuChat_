import {readFile} from 'node:fs/promises';
import {startAuthenticatedApi} from '../src/authenticated-main.js';
const root=new URL('../../../',import.meta.url);
const config=JSON.parse(await readFile(new URL('infra/local/unified/application.json',root),'utf8'));
if(config.database!=='banuchat_unified'||config.database_port!==55463||config.api_port!==3004)throw new Error('unified_configuration_rejected');
const n8n=await readFile(new URL('infra/local/oe6/n8n-conversation.env',root),'utf8');
for(const line of n8n.split(/\r?\n/u)){const match=/^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);if(match)process.env[match[1]!]=match[2]!;}
process.env.BANUCHAT_N8N_CONVERSATION_URL='http://127.0.0.1:15679/webhook/banuchat/internal/oe4/conversation';
Object.assign(process.env,{
 BANUCHAT_AUTH_PRODUCT:'unified',BANUCHAT_AUTH_EVIDENCE_MODE:'ccd_local',BANUCHAT_AUTH_DATABASE:config.database,
 BANUCHAT_AUTH_DEPLOYMENT:config.deployment,BANUCHAT_AUTH_RATE_KEY:config.rate_key,BANUCHAT_AUTH_DB_PORT:String(config.database_port),
 BANUCHAT_AUTH_API_PORT:String(config.api_port),BANUCHAT_AUTH_RUNTIME_USER:config.runtime_user,BANUCHAT_AUTH_RUNTIME_PASSWORD:config.runtime_password,
 BANUCHAT_OLLAMA_BASE_URL:config.ollama_base_url,BANUCHAT_GENERATOR_MODEL:config.generator_model,
 BANUCHAT_GENERATOR_MODEL_REVISION:config.generator_model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:config.generator_runtime_version,
 MCP_POSTGRES_DB:config.database,MCP_POSTGRES_PORT:String(config.database_port),MCP_POSTGRES_USER:config.mcp_user,MCP_POSTGRES_PASSWORD:config.mcp_password,
});
await startAuthenticatedApi();

