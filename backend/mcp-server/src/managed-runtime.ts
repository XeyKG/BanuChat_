import {readFile} from 'node:fs/promises';
import type {SqlQueryClient} from '../../api/src/data/sql-client.js';

const PROJECT='swtywnndzehgisyidnyu';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;

/** Separate managed adapter; historical local/unified destination guards remain intact. */
export async function managedRuntimeConfig(env:NodeJS.ProcessEnv=process.env,
 readCa:(path:string)=>Promise<string>=path=>readFile(path,'utf8')) {
 const need=(key:string)=>{const value=env[key];if(!value)throw Error('mcp_managed_configuration_rejected');return value;};
 const host=need('MCP_POSTGRES_HOST'),user=need('MCP_POSTGRES_USER');
 if(env.MCP_POSTGRES_DB!=='postgres'||env.MCP_POSTGRES_PORT!=='5432'||env.MCP_PROJECT_REF!==PROJECT||
  host!=='aws-0-us-west-2.pooler.supabase.com'||user!==`cloud_mcp_reader.${PROJECT}`||
  env.MCP_SSLMODE!=='verify-full')throw Error('mcp_managed_destination_rejected');
 const principal=need('MCP_PRINCIPAL_ID'),release=need('MCP_STRUCTURED_RELEASE'),deployment=need('MCP_DEPLOYMENT_ID');
 if(![principal,release,deployment].every(v=>UUID.test(v)))throw Error('mcp_managed_identity_rejected');
 const profileKey=need('MCP_PROFILE_KEY');
 if(!/^[a-z0-9][a-z0-9_-]{0,127}$/u.test(profileKey))throw Error('mcp_managed_identity_rejected');
 const ca=await readCa(need('MCP_POSTGRES_CA_FILE'));
 if(!ca.includes('-----BEGIN CERTIFICATE-----'))throw Error('mcp_managed_ca_rejected');
 return {principal,release,deployment,profileKey,postgres:{host,port:5432,database:'postgres',user,
  password:need('MCP_POSTGRES_PASSWORD'),ssl:{ca,rejectUnauthorized:true as const,servername:host},
  options:'-c default_transaction_read_only=on -c statement_timeout=15000',max:1,connectionTimeoutMillis:5000}};
}

/** Validate the reader, its deployment and account binding on each tool read.
 * Client TLS is enforced by managedRuntimeConfig. Supavisor's backend hop can
 * report pg_stat_ssl=false despite the verified TLS connection to the pooler.
 * API session authorization remains mandatory before invoking this process. */
export async function assertManagedMcpContext(sql:SqlQueryClient,context:{principal:string;profileKey:string;release:string;deployment:string}):Promise<void>{
 const result=await sql.query<{safe:boolean}>(`SELECT
 current_database()='postgres' AND current_user='cloud_mcp_reader'
 AND current_setting('transaction_read_only')='on'
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND
   (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user))
 AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE has_schema_privilege(n.oid,'CREATE') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$')
 AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('banuchat','banuchat_auth','banuchat_academic','banuchat_reference') AND p.prosecdef
  AND has_function_privilege(p.oid,'EXECUTE') AND p.oid NOT IN
   ('banuchat.current_retrieval_context()'::regprocedure,'banuchat.search_chunks_cosine(public.vector,integer,uuid)'::regprocedure))
 AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('banuchat','banuchat_auth','banuchat_academic','banuchat_reference')
  AND (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)
   OR (c.relkind IN ('r','p','v','m','f') AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(c.oid,'INSERT,UPDATE,REFERENCES')))
   OR (c.relkind='S' AND has_sequence_privilege(c.oid,'USAGE,UPDATE'))))
 AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('banuchat_auth','banuchat_academic') AND c.relkind IN ('r','p','v','m','f')
  AND NOT (n.nspname='banuchat_auth' AND c.relname IN ('profile_bindings','profile_binding_versions','runtime_scope'))
  AND (has_table_privilege(c.oid,'SELECT') OR has_any_column_privilege(c.oid,'SELECT')))
 AND EXISTS(SELECT 1 FROM banuchat_auth.runtime_scope WHERE singleton AND deployment_id=$4::uuid AND database_name='postgres')
 AND EXISTS(SELECT 1 FROM banuchat_auth.profile_bindings b
  JOIN banuchat_auth.profile_binding_versions v ON v.principal_id=b.principal_id AND v.dataset_id=b.dataset_id AND v.profile_key=b.profile_key
  JOIN banuchat.datasets d ON d.id=1 AND d.current_release_id=v.dataset_release_id
  JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id
  WHERE b.dataset_id=1 AND b.principal_id=$1::uuid AND b.profile_key=$2 AND r.id=$3::uuid
   AND d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb)
 AS safe`,[context.principal,context.profileKey,context.release,context.deployment]);
 if(result.rows.length!==1||result.rows[0]?.safe!==true)throw Error('mcp_managed_context_rejected');
}
