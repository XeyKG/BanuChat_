-- BCH-D36 / CCD-AUTH-I1A. Synthetic AUTH only; apply solely to a reviewed destination.
-- No runtime_scope mutation, corpus writes, UID changes or CCD flag.
BEGIN;
SET LOCAL search_path = pg_catalog;

DO $guard$
DECLARE
  runtime_name text := current_setting('banuchat_auth.runtime_role', true);
BEGIN
  IF current_setting('banuchat_auth.target_database', true) IS DISTINCT FROM current_database()
    OR current_database() ~* 'ccd'
    OR to_regclass('banuchat_auth.recovery_contacts') IS NULL
    OR to_regclass('banuchat_auth.runtime_scope') IS NULL
    OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
    OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NOT NULL
    OR to_regprocedure('banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)') IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_name AND rolcanlogin
      AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls)
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'banuchat_auth_executor'
      AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
      AND NOT rolreplication AND NOT rolbypassrls)
    OR NOT EXISTS (SELECT 1 FROM banuchat_auth.runtime_scope WHERE singleton
      AND database_name = current_database()
      AND deployment_id::text = current_setting('banuchat_auth.deployment_id', true))
    OR (SELECT count(*) FROM banuchat.datasets) <> 1
    OR NOT EXISTS (SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r
      ON r.id = d.current_release_id AND r.dataset_id = d.id
      WHERE d.id = 1 AND d.name = 'banuchat-synthetic' AND r.status = 'ready'
        AND r.manifest->'synthetic' = 'true'::jsonb)
    OR EXISTS (SELECT 1 FROM banuchat.dataset_releases r WHERE r.dataset_id <> 1
      OR (r.manifest->'synthetic' = 'true'::jsonb) IS NOT TRUE)
  THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Document read migration target rejected'; END IF;
  IF has_any_column_privilege(runtime_name, 'banuchat.document_chunks', 'SELECT')
    OR has_any_column_privilege(runtime_name, 'banuchat.conversations', 'UPDATE')
    OR EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace = 'banuchat'::regnamespace
      AND c.relkind = 'r' AND c.relname NOT IN ('conversations','messages','message_citations')
      AND (has_table_privilege(runtime_name, c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')
        OR has_any_column_privilege(runtime_name, c.oid, 'INSERT,UPDATE')))
    OR EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
      WHERE r.rolname IN (runtime_name, 'banuchat_auth_executor'))
  THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Document read role rejected'; END IF;
END $guard$;

CREATE FUNCTION banuchat_auth.retrieve_document_chunks(p_release uuid, p_query public.vector, p_top_k integer)
RETURNS TABLE (
  chunk_id uuid, document_version_id uuid, document_id uuid, document_key text,
  title text, ordinal integer, content text, chunk_locator text, page_start integer,
  page_end integer, source_path text, source_locator text, source_sha256 text,
  release_id uuid, cosine_distance double precision
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, banuchat_auth, pg_temp
AS $read$
DECLARE current_id uuid;
BEGIN
  IF p_release IS NULL OR p_top_k IS NULL OR p_top_k < 1 OR p_top_k > 20
    OR p_query IS NULL OR public.vector_dims(p_query) <> 1024
    OR public.vector_norm(p_query) <= 0
  THEN RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'Invalid document query'; END IF;
  -- pgvector rejects NaN/infinity at vector input. STABLE uses one statement snapshot.
  -- Scope is fixed by 007, never a caller GUC, principal, UID or evidence-mode flag.
  SELECT r.id INTO current_id
  FROM banuchat_auth.runtime_scope s
  JOIN banuchat.datasets d ON d.id = 1 AND d.name = 'banuchat-synthetic'
  JOIN banuchat.dataset_releases r ON r.id = d.current_release_id AND r.dataset_id = d.id
  WHERE s.singleton AND s.database_name = current_database()
    AND r.status = 'ready' AND r.manifest->'synthetic' = 'true'::jsonb;
  IF NOT FOUND OR current_database() ~* 'ccd'
    OR (SELECT count(*) FROM banuchat.datasets) <> 1
    OR EXISTS (SELECT 1 FROM banuchat.dataset_releases r WHERE r.dataset_id <> 1
      OR (r.manifest->'synthetic' = 'true'::jsonb) IS NOT TRUE)
  THEN RAISE EXCEPTION USING ERRCODE = 'P0403', MESSAGE = 'Document scope rejected'; END IF;
  IF p_release <> current_id
  THEN RAISE EXCEPTION USING ERRCODE = 'P0409', MESSAGE = 'Document release changed'; END IF;
  RETURN QUERY
  -- Same projection, joins, filters, tie-break and LIMIT as document-retrieval.ts.
  SELECT dc.id, dc.document_version_id, dv.document_id, d.document_key::text,
    dv.title::text, dc.ordinal, dc.content::text, dc.locator::text, dc.page_start, dc.page_end,
    dv.source_path::text, dv.source_locator::text, dv.source_sha256::text,
    dc.dataset_release_id, (dc.embedding OPERATOR(public.<=>) p_query)::double precision AS cosine_distance
  FROM banuchat.document_chunks dc
  JOIN banuchat.document_versions dv ON dv.id = dc.document_version_id
    AND dv.dataset_release_id = dc.dataset_release_id
  JOIN banuchat.documents d ON d.id = dv.document_id AND d.dataset_id = dv.dataset_id
  WHERE dc.dataset_release_id = p_release AND dv.dataset_release_id = p_release
    AND dv.processing_status = 'ready' AND d.retrieval_mode = 'chunked' AND dc.embedding IS NOT NULL
  ORDER BY cosine_distance ASC, dc.document_version_id ASC, dc.ordinal ASC
  LIMIT p_top_k;
EXCEPTION
  WHEN SQLSTATE 'P0400' OR SQLSTATE 'P0403' OR SQLSTATE 'P0409' THEN RAISE;
  WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE = 'P0500', MESSAGE = 'Document read rejected';
END $read$;

REVOKE ALL ON FUNCTION banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer) FROM PUBLIC;
-- Reuse the existing NOLOGIN executor and its SELECTs; no new role or corpus ACL.
GRANT CREATE ON SCHEMA banuchat_auth TO banuchat_auth_executor;
ALTER FUNCTION banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer) OWNER TO banuchat_auth_executor;
REVOKE CREATE ON SCHEMA banuchat_auth FROM banuchat_auth_executor;
DO $grant$
BEGIN
  EXECUTE format('GRANT EXECUTE ON FUNCTION banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer) TO %I',
    current_setting('banuchat_auth.runtime_role'));
END $grant$;
COMMIT;
