-- LOCAL ONLY. Run with psql -X -f on a new dedicated cluster after local-v1 restore.
-- Passwords are supplied through the environment of the psql process.
\set ON_ERROR_STOP on
\getenv runtime_password BANUCHAT_LAB_RUNTIME_PASSWORD
\getenv provision_password BANUCHAT_LAB_PROVISION_PASSWORD
\getenv deployment BANUCHAT_LAB_DEPLOYMENT
SELECT set_config('banuchat_auth.target_database','banuchat_cloud01a',false),
       set_config('banuchat_auth.runtime_role','cloud_runtime',false),
       set_config('banuchat_auth.deployment_id',(:'deployment')::uuid::text,false);

DO $guard$
BEGIN
  IF current_database() <> 'banuchat_cloud01a'
     OR to_regnamespace('banuchat_auth') IS NOT NULL
     OR to_regnamespace('banuchat_aux') IS NOT NULL
     OR (SELECT count(*) FROM banuchat.datasets) <> 1
     OR NOT EXISTS (SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
       WHERE d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb)
     OR EXISTS (SELECT 1 FROM pg_database WHERE datname NOT IN ('postgres','template0','template1','banuchat_cloud01a'))
     OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname !~ '^pg_' AND rolname <> current_user)
  THEN RAISE EXCEPTION 'CLOUD-01B.0: dedicated local lab required'; END IF;
END
$guard$;
SELECT length(:'runtime_password') >= 24 AND length(:'provision_password') >= 24
       AND :'runtime_password' <> :'provision_password' AS passwords_valid \gset
\if :passwords_valid
\else
  DO $$ BEGIN RAISE EXCEPTION 'Distinct lab passwords required'; END $$;
\endif

\ir ../006_synthetic_auth.sql
BEGIN;
CREATE ROLE cloud_runtime LOGIN NOINHERIT PASSWORD :'runtime_password';
CREATE ROLE cloud_provision LOGIN NOINHERIT PASSWORD :'provision_password';
REVOKE ALL ON DATABASE postgres,template0,template1,banuchat_cloud01a FROM PUBLIC;
GRANT CONNECT ON DATABASE banuchat_cloud01a TO cloud_runtime,cloud_provision;
GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO cloud_runtime,cloud_provision;
GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.synthetic_profiles TO cloud_runtime,cloud_provision;
GRANT SELECT ON banuchat.embedding_configs,banuchat.profile_courses,banuchat.courses,banuchat.calendar_events,
  banuchat.announcements,banuchat.documents,banuchat.document_versions,
  banuchat.conversations,banuchat.messages,banuchat.message_citations TO cloud_runtime;
GRANT SELECT ON banuchat_auth.accounts,banuchat_auth.password_credentials,banuchat_auth.sessions,banuchat_auth.refresh_tokens,
  banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,banuchat_auth.corpus_grants,
  banuchat_auth.auth_rate_limits,banuchat_auth.conversation_owners TO cloud_runtime;
GRANT INSERT ON banuchat_auth.sessions,banuchat_auth.refresh_tokens,banuchat_auth.auth_rate_limits,banuchat_auth.security_events,
  banuchat.conversations,banuchat_auth.conversation_owners TO cloud_runtime;
GRANT DELETE ON banuchat.conversations TO cloud_runtime;
GRANT UPDATE(access_token_digest,access_issued_at,access_expires_at,last_seen_at,revoked_at) ON banuchat_auth.sessions TO cloud_runtime;
GRANT UPDATE(consumed_at,replaced_by) ON banuchat_auth.refresh_tokens TO cloud_runtime;
GRANT UPDATE(attempts) ON banuchat_auth.auth_rate_limits TO cloud_runtime;
GRANT INSERT ON banuchat_auth.accounts,banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,
  banuchat_auth.corpus_grants,banuchat_auth.security_events TO cloud_provision;
COMMIT;
\ir ../007_authenticated_resources.sql
\ir ../008_verified_recovery_email.sql
\ir ../010_authenticated_document_reads.sql
\ir ../cloud-01a/academic.proposed.sql
