-- Proposal for review in CLOUD-01B.1. Do not apply during the read-only preflight.
-- Supply independently verified expected settings on the same connection.
-- The client must already have authenticated the dedicated project's endpoint
-- using verify-full. A database name or a custom setting alone is not identity.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $bind$
DECLARE
  source_deployment uuid := nullif(current_setting('banuchat_cloud.source_deployment',true),'')::uuid;
  target_deployment uuid := nullif(current_setting('banuchat_cloud.target_deployment',true),'')::uuid;
  source_database text := nullif(current_setting('banuchat_cloud.source_database',true),'');
  expected_database text := nullif(current_setting('banuchat_cloud.expected_database',true),'');
  expected_manifest text := nullif(current_setting('banuchat_cloud.expected_manifest_sha256',true),'');
BEGIN
  IF source_deployment IS NULL OR target_deployment IS NULL OR source_deployment = target_deployment
     OR source_database IS NULL OR current_database() IS DISTINCT FROM expected_database
     OR (expected_manifest ~ '^[0-9a-f]{64}$') IS NOT TRUE
     OR to_regnamespace('banuchat_aux') IS NOT NULL
     OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
     OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NOT NULL
  THEN RAISE EXCEPTION 'CLOUD-01B: destination identity rejected'; END IF;

  PERFORM 1 FROM banuchat.datasets WHERE id=1 AND name='banuchat-synthetic' FOR SHARE;
  IF NOT FOUND OR (SELECT count(*) FROM banuchat.datasets) <> 1
     OR (SELECT count(*) FROM banuchat.dataset_releases) <> 2
     OR EXISTS (SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id<>1 OR status<>'ready'
       OR manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb)
     OR NOT EXISTS (SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
       WHERE d.id=1 AND r.manifest_sha256=expected_manifest
       AND r.manifest->'academic_successor'->>'vector_provenance'='copied_from_base')
     OR EXISTS (SELECT 1 FROM banuchat_auth.sessions)
     OR EXISTS (SELECT 1 FROM banuchat_auth.refresh_tokens)
  THEN RAISE EXCEPTION 'CLOUD-01B: transfer state rejected'; END IF;

  UPDATE banuchat_auth.runtime_scope
     SET database_name=current_database(), deployment_id=target_deployment
   WHERE singleton AND database_name::text=source_database AND deployment_id=source_deployment;
  IF NOT FOUND THEN RAISE EXCEPTION 'CLOUD-01B: original runtime scope rejected'; END IF;
END
$bind$;
COMMIT;
