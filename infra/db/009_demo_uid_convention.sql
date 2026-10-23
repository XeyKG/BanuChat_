-- BCH-D37: existing AUTH synthetic COPY only, after 008; no UID/account backfill.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$
BEGIN
 IF current_setting('banuchat_auth.target_database',true) IS DISTINCT FROM current_database()
 OR current_database()<>'banuchat_auth_i1b_uid_test'
 OR to_regclass('banuchat_auth.recovery_contacts') IS NULL
 OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM banuchat_auth.runtime_scope WHERE singleton AND database_name=current_database()
   AND deployment_id::text=current_setting('banuchat_auth.deployment_id',true))
 OR NOT EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
   AND r.dataset_id=d.id WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb)
 OR EXISTS(SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id<>1 OR (manifest->'synthetic'='true'::jsonb) IS NOT TRUE)
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='banuchat_auth.accounts'::regclass
   AND conname='accounts_synthetic_uid_check' AND contype='c' AND convalidated
   AND pg_get_constraintdef(oid) LIKE '%char_length(synthetic_uid) = 13%'
   AND pg_get_constraintdef(oid) LIKE '%^BCH-DEMO-[0-9]{4}$%')
 OR EXISTS(SELECT 1 FROM banuchat_auth.accounts WHERE char_length(synthetic_uid)<>13 OR synthetic_uid COLLATE "C" !~ '^BCH-DEMO-[0-9]{4}$')
 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='UID migration target rejected'; END IF;
END $guard$;
ALTER TABLE banuchat_auth.accounts DROP CONSTRAINT accounts_synthetic_uid_check;
ALTER TABLE banuchat_auth.accounts ADD CONSTRAINT accounts_synthetic_uid_format_check CHECK (
 (char_length(synthetic_uid)=13 AND synthetic_uid COLLATE "C" ~ '^BCH-DEMO-[0-9]{4}$')
 OR (char_length(synthetic_uid)=9 AND synthetic_uid COLLATE "C" ~ '^U[0-9]{8}$')
) NOT VALID;
ALTER TABLE banuchat_auth.accounts VALIDATE CONSTRAINT accounts_synthetic_uid_format_check;
COMMIT;
