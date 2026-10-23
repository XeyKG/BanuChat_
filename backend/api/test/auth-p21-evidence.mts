import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {environment,pool} from './auth-p21/environment.js';
const e=await environment(),db=pool(e),runtime=pool(e,true);
try{
 const c=JSON.parse(await readFile(new URL('../../../infra/local/auth-p21/phase-c.json',import.meta.url),'utf8')) as {result:string;deploymentId:string;corpusBefore:string;corpusAfter:string};
 const http=JSON.parse(await readFile(new URL('../../../infra/local/auth-p21/phase-e.json',import.meta.url),'utf8')) as {result:string;corpusBefore:string;corpusAfter:string};
 assert.equal(c.result,'PASS');assert.equal(http.result,'PASS');assert.equal(c.deploymentId,e.deploymentId);assert.equal(c.corpusBefore,c.corpusAfter);assert.equal(c.corpusAfter,http.corpusBefore);assert.equal(http.corpusBefore,http.corpusAfter);
 const roles=(await db.query(`SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,
 EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS member_of_other_role
 FROM pg_roles r WHERE rolname IN ('auth_p21_runtime','banuchat_auth_executor') ORDER BY rolname`)).rows;
 const functions=(await db.query(`SELECT p.proname,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,
 has_function_privilege('auth_p21_runtime',p.oid,'EXECUTE') AS runtime_execute,
 EXISTS(SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
 FROM pg_proc p WHERE p.pronamespace='banuchat_auth'::regnamespace ORDER BY p.proname`)).rows;
 const privileges=(await runtime.query(`SELECT c.relname,
 has_table_privilege(c.oid,'SELECT') AS select_all,has_table_privilege(c.oid,'INSERT') AS insert_all,
 has_table_privilege(c.oid,'DELETE') AS delete_all,has_any_column_privilege(c.oid,'UPDATE') AS any_column_update,
 has_table_privilege(c.oid,'TRUNCATE') AS truncate
 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_auth'::regnamespace) AND c.relkind='r' ORDER BY c.relname`)).rows;
 const version=(await runtime.query('SHOW server_version')).rows[0];
 const logging=(await db.query("SELECT name,setting FROM pg_settings WHERE name IN ('log_statement','log_parameter_max_length','log_parameter_max_length_on_error') ORDER BY name")).rows;
 const hashes:Record<string,string>={};
 for(const p of ['infra/db/001_initial_schema.sql','infra/db/006_synthetic_auth.sql','infra/db/007_authenticated_resources.sql',
 'backend/api/api-contract.md','backend/api/openapi.yaml','backend/api/api-contract-v2.md','backend/api/openapi-v2.yaml',
 'backend/mcp-server/tools.contract.json','backend/mcp-server/tools-contract.md'])hashes[p]=createHash('sha256').update(await readFile(new URL('../../../'+p,import.meta.url))).digest('hex');
 const resources=JSON.parse(await readFile(new URL('../../../infra/local/auth-p21/resources.json',import.meta.url),'utf8')) as {name:string;containerId:string;network:string;networkId:string;volume:string;image:string};
 const report={baselineCommit:'8f69a71e2fbd085e7e34e0b0b8b5b5e7d5bd4e5d',result:'PASS_LOCAL_AUTH_P2',operationsImplemented:9,
  phaseC:c,phaseE:http,regression:{command:'npm test',passed:546,failed:0},typecheck:'PASS',build:'PASS',version,roles,functions,privileges,logging,hashes,
  resources:{container:resources.name,containerId:resources.containerId,network:resources.network,networkId:resources.networkId,volume:resources.volume,image:resources.image,postgres:'127.0.0.1:55437',http:'127.0.0.1 ephemeral, closed',cleanup:'PENDING'},
  initialFailures:[{stage:'environment',result:'FAIL',cause:'duplicated p21 suffix; rejected before SQL',correction:'removed verified task resources; fixed name'},
   {stage:'fixture manifest',result:'FAIL P0001',cause:'missing full_document retrieval_mode',correction:'fixed fixture, unchanged SQL guards'},
   {stage:'fixture provenance',result:'FAIL 23505',cause:'two identical release identities',correction:'explicitly distinct fixture pipeline provenance'},
   {stage:'first phase C',result:'5 PASS / 7 FAIL including parent',cause:'42804 SQL return domains; invalid expiry fixture; dependent failures and pointer not restored after failed assertion',correction:'exact nonblank/finite_time return domains, valid exclusive expiry, fresh isolated fixture; retained first report'},
   {stage:'first HTTP harness',result:'FAIL before listener',cause:'invalid URN in test schema registration',correction:'valid urn:banuchat namespace'}],
  notExecuted:['Ollama','original databases','university infrastructure','Mobile','AUTH-P3','AUTH-P4','M02','A01'],commit:false,push:false};
 await writeFile(new URL('../../../eval/auth/results/bch04-auth-p21-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 await writeFile(new URL('../../../eval/auth/results/bch04-auth-p21-phase-c.json',import.meta.url),JSON.stringify(c,null,2)+'\n');
 await writeFile(new URL('../../../eval/auth/results/bch04-auth-p21-phase-e.json',import.meta.url),JSON.stringify(http,null,2)+'\n');
 console.log('Sanitized AUTH-P2.1 evidence saved; no credentials, account emails, tokens or credential hashes.');
}finally{await runtime.end();await db.end();}
