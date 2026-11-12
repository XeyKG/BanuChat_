-- Run with psql -X over a previously verified connection. Catalogs only.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, pg_temp;
SET LOCAL statement_timeout = '10s';

SELECT current_database() AS database, current_setting('server_version') AS server_version,
       pg_database_size(current_database()) AS database_bytes,
       current_setting('transaction_read_only') AS read_only;
SELECT ssl, version AS tls_version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();
SELECT a.name, a.default_version, e.extversion AS installed, n.nspname AS extension_schema
FROM pg_available_extensions a LEFT JOIN pg_extension e ON e.extname = a.name
LEFT JOIN pg_namespace n ON n.oid = e.extnamespace WHERE a.name = 'vector';

SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls,
       has_database_privilege(rolname,current_database(),'CONNECT') AS can_connect,
       has_database_privilege(rolname,current_database(),'CREATE') AS can_create,
       has_database_privilege(rolname,current_database(),'TEMP') AS can_temp,
       EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid) AS has_membership
FROM pg_roles r
WHERE rolname IN (current_user,'postgres','anon','authenticated','service_role','authenticator',
                  'cloud_runtime','cloud_provision','banuchat_auth_executor','banuchat_mcp_reader','banuchat_ingestion')
ORDER BY rolname;

SELECT n.nspname, pg_get_userbyid(n.nspowner) AS owner,
       has_schema_privilege(current_user,n.oid,'CREATE') AS can_create
FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
ORDER BY n.nspname;
SELECT current_setting('pgrst.db_schemas',true) AS session_data_api_hint;
-- The dashboard remains authoritative for Data API exposure. NULL is inconclusive.
SELECT p.oid::regprocedure AS signature, pg_get_userbyid(p.proowner) AS owner, p.prosecdef,
       p.proconfig, has_function_privilege(current_user,p.oid,'EXECUTE') AS can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('banuchat','banuchat_auth','banuchat_academic')
ORDER BY p.oid::regprocedure::text;
SELECT n.nspname, r.rolname,
       has_schema_privilege(r.oid,n.oid,'USAGE') AS can_use_schema,
       EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace=n.oid AND c.relkind IN ('r','p','v','m','f')
         AND (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
           OR has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) AS any_relation_access,
       EXISTS (SELECT 1 FROM pg_proc p WHERE p.pronamespace=n.oid
         AND has_function_privilege(r.oid,p.oid,'EXECUTE')) AS any_function_execute
FROM pg_namespace n CROSS JOIN pg_roles r
WHERE n.nspname IN ('banuchat','banuchat_auth','banuchat_academic')
  AND r.rolname IN ('anon','authenticated','service_role','authenticator','cloud_runtime','cloud_provision','banuchat_auth_executor')
ORDER BY n.nspname,r.rolname;
ROLLBACK;
