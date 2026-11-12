-- Reviewed transfer delta for PostgreSQL 17. Run only after separate authorization
-- and authentication of the dedicated endpoint by the client. Never run in B.2.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $install$
DECLARE
  target_schema text := current_setting('banuchat_cloud.expected_vector_schema',true);
BEGIN
  IF current_database() <> 'postgres'
     OR current_database() IS DISTINCT FROM current_setting('banuchat_cloud.expected_database',true)
     OR current_setting('server_version_num')::integer / 10000 <> 17
     OR (target_schema IN ('public','extensions')) IS NOT TRUE
     OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=target_schema)
     OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN
       ('banuchat','banuchat_auth','banuchat_academic','banuchat_aux'))
  THEN RAISE EXCEPTION 'CLOUD-01B: extension target rejected'; END IF;

  IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='vector') THEN
    EXECUTE format('CREATE EXTENSION vector WITH SCHEMA %I VERSION %L',target_schema,'0.8.2');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
    WHERE e.extname='vector' AND e.extversion='0.8.2' AND n.nspname=target_schema)
  THEN RAISE EXCEPTION 'CLOUD-01B: installed vector version or schema differs'; END IF;
END
$install$;
COMMIT;
