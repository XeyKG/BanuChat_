import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {managedRuntimeConfig,assertManagedMcpContext} from '../src/managed-runtime.js';

const env:NodeJS.ProcessEnv={MCP_POSTGRES_HOST:'aws-0-us-west-2.pooler.supabase.com',MCP_POSTGRES_DB:'postgres',
 MCP_POSTGRES_PORT:'5432',MCP_PROJECT_REF:'swtywnndzehgisyidnyu',MCP_POSTGRES_USER:'cloud_mcp_reader.swtywnndzehgisyidnyu',
 MCP_SSLMODE:'verify-full',MCP_POSTGRES_PASSWORD:'unit-test-placeholder',MCP_POSTGRES_CA_FILE:'/private/test-ca.crt',
 MCP_PRINCIPAL_ID:'11111111-1111-4111-8111-111111111111',MCP_STRUCTURED_RELEASE:'22222222-2222-4222-8222-222222222222',
 MCP_DEPLOYMENT_ID:'33333333-3333-4333-8333-333333333333',MCP_PROFILE_KEY:'demo-student'};
const ca=async()=> '-----BEGIN CERTIFICATE-----\nunit-test-placeholder\n-----END CERTIFICATE-----';

test('managed config pins authorized destination, hostname verification and read-only pool',async()=>{
 const c=await managedRuntimeConfig(env,ca);
 assert.equal(c.postgres.ssl.rejectUnauthorized,true);
 assert.equal(c.postgres.ssl.servername,env.MCP_POSTGRES_HOST);
 assert.equal(c.postgres.max,1);assert.match(c.postgres.options,/default_transaction_read_only=on/);
 assert.equal(c.profileKey,'demo-student');
});

for(const [key,value] of Object.entries({MCP_POSTGRES_HOST:'unrelated.example.test',MCP_POSTGRES_DB:'banuchat_unified',
 MCP_POSTGRES_PORT:'6543',MCP_PROJECT_REF:'anotherproject',MCP_POSTGRES_USER:'postgres.swtywnndzehgisyidnyu',
 MCP_SSLMODE:'require',MCP_PRINCIPAL_ID:'not-a-uuid',MCP_STRUCTURED_RELEASE:'',MCP_DEPLOYMENT_ID:'',MCP_PROFILE_KEY:'../other'})){
 test(`managed config rejects incompatible ${key}`,async()=>{
  await assert.rejects(managedRuntimeConfig({...env,[key]:value},ca),/mcp_managed_/);
 });
}

test('managed config rejects missing credentials or a noncertificate CA',async()=>{
 await assert.rejects(managedRuntimeConfig({...env,MCP_POSTGRES_PASSWORD:''},ca),/configuration_rejected/);
 await assert.rejects(managedRuntimeConfig(env,async()=> 'not a certificate'),/ca_rejected/);
});

test('managed authorization binds principal, profile, release and deployment as SQL parameters',async()=>{
 let calls=0;
 const ctx={principal:env.MCP_PRINCIPAL_ID!,profileKey:env.MCP_PROFILE_KEY!,release:env.MCP_STRUCTURED_RELEASE!,deployment:env.MCP_DEPLOYMENT_ID!};
 await assertManagedMcpContext({async query<T>(sql:string,values?:readonly unknown[]){
  calls++;assert.deepEqual(values,[ctx.principal,ctx.profileKey,ctx.release,ctx.deployment]);
  assert.ok(!sql.includes(ctx.principal));assert.match(sql,/profile_binding_versions/);
  assert.doesNotMatch(sql,/pg_stat_ssl/); // Pooler backend hop is not client certificate verification.
  assert.match(sql,/rolbypassrls/);assert.match(sql,/has_function_privilege/);assert.match(sql,/has_any_column_privilege/);
  return {rows:[{safe:true}] as T[]};
 }},ctx);
 assert.equal(calls,1);
});

for(const rows of [[],[{safe:false}],[{safe:true},{safe:true}]]){
 test(`managed authorization rejects unsafe or ambiguous query result ${JSON.stringify(rows)}`,async()=>{
  await assert.rejects(assertManagedMcpContext({async query<T>(){return {rows:rows as T[]};}},
   {principal:'',profileKey:'',release:'',deployment:''}),/mcp_managed_context_rejected/);
 });
}

test('managed stdio entrypoint rejects missing configuration without leaking errors or opening a DB',async()=>{
 const child=spawn(process.execPath,['--import','tsx','src/managed-main.ts'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,
  env:{...process.env,MCP_POSTGRES_HOST:'',MCP_POSTGRES_PASSWORD:''},stdio:['pipe','pipe','pipe']
 });
 let stdout='',stderr='';
 child.stdout.on('data',b=>stdout+=String(b));child.stderr.on('data',b=>stderr+=String(b));
 const code=await new Promise<number|null>((resolve,reject)=>{
  const timer=setTimeout(()=>{child.kill();reject(Error('Managed startup did not terminate'));},8000);
  child.once('error',e=>{clearTimeout(timer);reject(e);});
  child.once('exit',c=>{clearTimeout(timer);resolve(c);});
 });
 assert.equal(code,1);assert.equal(stdout,'');assert.equal(stderr,'mcp_managed_startup_rejected\n');
});
