import type {SqlQueryClient} from "../../api/src/data/sql-client.js";

export function runtimeConfig(env:NodeJS.ProcessEnv=process.env) {
  if(env.BANUCHAT_DEMO_MODE && env.BANUCHAT_DEMO_MODE!=="synthetic") throw new Error("mcp_synthetic_only");
  const database=env.MCP_POSTGRES_DB;
  if(!database || database.toLowerCase().includes("ccd")) throw new Error("mcp_destination_rejected");
  const port=Number(env.MCP_POSTGRES_PORT ?? "5432");
  if(!Number.isInteger(port) || port<1 || port>65535 || port===55433) throw new Error("mcp_port_rejected");
  if(env.MCP_POSTGRES_HOST && env.MCP_POSTGRES_HOST!=="127.0.0.1") throw new Error("mcp_loopback_required");
  if(!env.MCP_POSTGRES_USER || !env.MCP_POSTGRES_PASSWORD) throw new Error("mcp_read_credentials_required");
  const profileKey=env.MCP_PROFILE_KEY;
  if(profileKey!==undefined && !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(profileKey)) throw new Error("mcp_profile_invalid");
  return {postgres:{host:"127.0.0.1",port,database,user:env.MCP_POSTGRES_USER,password:env.MCP_POSTGRES_PASSWORD,
    options:"-c default_transaction_read_only=on -c statement_timeout=15000",max:1},...(profileKey===undefined?{}:{profileKey})};
}

/** Fail closed: session read_only is defense in depth, not a substitute for privileges. */
export async function assertReadOnlySynthetic(sql:SqlQueryClient):Promise<void> {
  const r=await sql.query<{safe:boolean}>(`SELECT
 current_database() !~* 'ccd' AND current_setting('transaction_read_only')='on'
 AND current_setting('server_encoding')='UTF8'
 AND EXISTS(SELECT 1 FROM pg_collation WHERE collname='C.utf8' AND collnamespace='pg_catalog'::regnamespace)
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls))
 AND NOT has_schema_privilege(current_user,'banuchat','CREATE')
 AND NOT EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='banuchat' AND t.relkind IN ('r','p','v','m','f')
  AND has_table_privilege(current_user,t.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
 AND NOT EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='banuchat' AND t.relkind='S'
  AND has_sequence_privilege(current_user,t.oid,'USAGE,UPDATE'))
 AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='banuchat' AND p.prosecdef
  AND p.oid NOT IN ('banuchat.current_retrieval_context()'::regprocedure,'banuchat.search_chunks_cosine(public.vector,integer,uuid)'::regprocedure)
  AND has_function_privilege(current_user,p.oid,'EXECUTE'))
 AND EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id
  WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb)
 AS safe`);
  if(r.rows.length!==1 || r.rows[0]?.safe!==true) throw new Error("mcp_read_only_synthetic_identity_required");
}
