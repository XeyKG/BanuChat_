-- Apply only with ON_ERROR_STOP and one transaction after the managed preflight.
-- No passwords. The new role remains NOLOGIN until private credential setup.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'postgres' OR
  NOT EXISTS(SELECT 1 FROM banuchat_auth.runtime_scope WHERE singleton AND database_name='postgres') OR
  NOT EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
   WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb)
 THEN RAISE EXCEPTION 'Managed BanuChat destination rejected'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='cloud_mcp_reader')
 THEN RAISE EXCEPTION 'MCP reader already exists; inspect before applying'; END IF;
END $guard$;
CREATE ROLE cloud_mcp_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
GRANT CONNECT ON DATABASE postgres TO cloud_mcp_reader;
GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO cloud_mcp_reader;
GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.embedding_configs,
 banuchat.documents,banuchat.document_versions,banuchat.document_chunks,
 banuchat.courses,banuchat.synthetic_profiles,banuchat.profile_courses,
 banuchat.calendar_events,banuchat.announcements TO cloud_mcp_reader;
GRANT SELECT ON banuchat_auth.runtime_scope,banuchat_auth.profile_bindings,
 banuchat_auth.profile_binding_versions TO cloud_mcp_reader;
GRANT EXECUTE ON FUNCTION banuchat.current_retrieval_context(),
 banuchat.search_chunks_cosine(public.vector,integer,uuid) TO cloud_mcp_reader;
ALTER ROLE cloud_mcp_reader SET default_transaction_read_only=on;
ALTER ROLE cloud_mcp_reader SET statement_timeout='15s';
COMMIT;
