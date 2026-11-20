\set ON_ERROR_STOP on
\conninfo
BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SELECT current_database(),current_user,current_setting('server_version') AS version,
 (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS server_observed_tls;
SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls
FROM pg_roles WHERE rolname IN ('cloud_runtime','cloud_mcp_reader');
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('banuchat','banuchat_auth','banuchat_reference')
 AND p.proname IN ('current_retrieval_context','search_chunks_cosine','resource_context','persist_turn','context','retrieve_pinned')
ORDER BY n.nspname,p.proname;
SELECT d.current_release_id,r.status,r.manifest->>'synthetic' AS synthetic
FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id WHERE d.id=1;
SELECT deployment_id IS NOT NULL AS deployment_bound,database_name FROM banuchat_auth.runtime_scope WHERE singleton;
SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='banuchat' AND c.relkind='r' ORDER BY c.relname;
COMMIT;
