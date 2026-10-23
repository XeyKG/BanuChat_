-- BCH-D31 / AUTH-P3.1. Explicit synthetic target only; no contacts, accounts or backfill.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$
DECLARE runtime_name text:=current_setting('banuchat_auth.runtime_role',true);
BEGIN
 IF current_setting('banuchat_auth.target_database',true) IS DISTINCT FROM current_database()
 OR current_database() ~* 'ccd' OR to_regclass('banuchat_auth.runtime_scope') IS NULL
 OR to_regclass('banuchat_auth.recovery_contacts') IS NOT NULL
 OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
 OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NOT NULL
 OR EXISTS(SELECT 1 FROM banuchat.dataset_releases r WHERE r.dataset_id<>1 OR (r.manifest->'synthetic'='true'::jsonb) IS NOT TRUE)
 OR NOT EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id
  WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready')
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=runtime_name AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolreplication)
 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Recovery migration target rejected';END IF;
END $guard$;

-- Intrinsic account metadata, not the shared academic alias. Legacy NULL is explicit.
ALTER TABLE banuchat_auth.accounts ADD COLUMN synthetic_display_name text
 CHECK(synthetic_display_name IS NULL OR (char_length(synthetic_display_name) BETWEEN 1 AND 80
 AND synthetic_display_name ~ U&'[^\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]'
 AND synthetic_display_name !~ '[[:cntrl:]]'));
CREATE TABLE banuchat_auth.recovery_contacts (
 id uuid PRIMARY KEY,principal_id uuid NOT NULL UNIQUE REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
 email_ciphertext bytea NOT NULL CHECK(octet_length(email_ciphertext) BETWEEN 3 AND 254),
 nonce bytea NOT NULL CHECK(octet_length(nonce)=12),tag bytea NOT NULL CHECK(octet_length(tag)=16),
 encryption_key_id text NOT NULL CHECK(encryption_key_id ~ '^[a-z0-9_-]{1,40}$'),
 email_lookup_hmac banuchat.sha256_hex NOT NULL UNIQUE,lookup_key_id text NOT NULL CHECK(lookup_key_id ~ '^[a-z0-9_-]{1,40}$'),
 revision bigint NOT NULL CHECK(revision>0),status text NOT NULL CHECK(status IN('pending_verification','verified','suspended')),
 consent_reference uuid NOT NULL,consented_at banuchat.finite_time NOT NULL,
 verified_at banuchat.finite_time,verification_reference uuid,verification_channel text CHECK(verification_channel IN('local_test','external_email')),
 created_at banuchat.finite_time NOT NULL,updated_at banuchat.finite_time NOT NULL,
 UNIQUE(principal_id,id),CHECK(updated_at>=created_at AND consented_at>=created_at AND consented_at<=updated_at),
 CHECK((verified_at IS NULL)=(verification_reference IS NULL)),
 CHECK((verified_at IS NULL)=(verification_channel IS NULL)),
 CHECK(verified_at IS NULL OR (verified_at>=consented_at AND verified_at<=updated_at)),
 CHECK(status<>'verified' OR verified_at IS NOT NULL)
);
CREATE TABLE banuchat_auth.recovery_challenges (
 id uuid PRIMARY KEY,principal_id uuid NOT NULL REFERENCES banuchat_auth.accounts(id),contact_id uuid NOT NULL,
 contact_revision bigint NOT NULL CHECK(contact_revision>0),deployment_id uuid NOT NULL,auth_version bigint NOT NULL CHECK(auth_version>0),
 purpose text NOT NULL CHECK(purpose IN('verify_contact','initial_set','reset')),
 delivery_channel text NOT NULL CHECK(delivery_channel IN('local_test','external_email')),
 code_mac banuchat.sha256_hex NOT NULL,mac_key_id text NOT NULL CHECK(mac_key_id ~ '^[a-z0-9_-]{1,40}$'),
 created_at banuchat.finite_time NOT NULL,expires_at banuchat.finite_time NOT NULL,
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 5),
 consumed_at banuchat.finite_time,invalidated_at banuchat.finite_time,
 invalidation_reason text CHECK(invalidation_reason IN('reissued','expired','attempts','contact_changed','delivery_failed','sibling_consumed')),
 FOREIGN KEY(principal_id,contact_id) REFERENCES banuchat_auth.recovery_contacts(principal_id,id),
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '300 seconds'),
 CHECK(consumed_at IS NULL OR (consumed_at>=created_at AND consumed_at<expires_at)),
 CHECK(invalidated_at IS NULL OR invalidated_at>=created_at),CHECK(consumed_at IS NULL OR invalidated_at IS NULL),
 CHECK((invalidated_at IS NULL)=(invalidation_reason IS NULL)),CHECK(failed_attempts<5 OR invalidated_at IS NOT NULL)
);
CREATE UNIQUE INDEX recovery_challenges_one_active ON banuchat_auth.recovery_challenges
 (principal_id,(CASE WHEN purpose='verify_contact' THEN 'contact' ELSE 'password' END)) WHERE consumed_at IS NULL AND invalidated_at IS NULL;
CREATE INDEX recovery_challenges_recent ON banuchat_auth.recovery_challenges(principal_id,created_at);
CREATE TABLE banuchat_auth.recovery_uid_limits (
 uid_bucket banuchat.sha256_hex NOT NULL,window_started_at banuchat.finite_time NOT NULL,attempts bigint NOT NULL CHECK(attempts>0),
 expires_at banuchat.finite_time NOT NULL,PRIMARY KEY(uid_bucket,window_started_at),
 CHECK(mod(extract(epoch FROM window_started_at),300)=0),CHECK(expires_at=window_started_at+interval '300 seconds')
);
CREATE TABLE banuchat_auth.recovery_mail_dispatches (
 challenge_id uuid PRIMARY KEY REFERENCES banuchat_auth.recovery_challenges(id),contact_id uuid NOT NULL REFERENCES banuchat_auth.recovery_contacts(id),
 contact_revision bigint NOT NULL CHECK(contact_revision>0),purpose text NOT NULL CHECK(purpose IN('verify_contact','initial_set','reset','change_notice')),
 state text NOT NULL CHECK(state IN('created','accepted','rejected','unknown')),
 provider_reference text CHECK(provider_reference ~ '^[A-Za-z0-9_-]{1,128}$'),
 created_at banuchat.finite_time NOT NULL,finished_at banuchat.finite_time,
 CHECK((state='created')=(finished_at IS NULL)),CHECK(finished_at IS NULL OR finished_at>=created_at)
);
REVOKE ALL ON banuchat_auth.recovery_contacts,banuchat_auth.recovery_challenges,banuchat_auth.recovery_uid_limits,banuchat_auth.recovery_mail_dispatches FROM PUBLIC;
DO $grants$
DECLARE r text:=current_setting('banuchat_auth.runtime_role');
BEGIN
 EXECUTE format('GRANT SELECT,INSERT ON banuchat_auth.recovery_contacts,banuchat_auth.recovery_challenges,banuchat_auth.recovery_uid_limits,banuchat_auth.recovery_mail_dispatches TO %I',r);
 EXECUTE format('GRANT UPDATE(email_ciphertext,nonce,tag,encryption_key_id,email_lookup_hmac,lookup_key_id,revision,status,consent_reference,consented_at,verified_at,verification_reference,verification_channel,updated_at) ON banuchat_auth.recovery_contacts TO %I',r);
 EXECUTE format('GRANT UPDATE(failed_attempts,consumed_at,invalidated_at,invalidation_reason) ON banuchat_auth.recovery_challenges TO %I',r);
 EXECUTE format('GRANT UPDATE(attempts) ON banuchat_auth.recovery_uid_limits TO %I',r);
 EXECUTE format('GRANT UPDATE(state,provider_reference,finished_at) ON banuchat_auth.recovery_mail_dispatches TO %I',r);
 EXECUTE format('GRANT INSERT ON banuchat_auth.password_credentials TO %I',r);
 EXECUTE format('GRANT UPDATE(password_hash,changed_at) ON banuchat_auth.password_credentials TO %I',r);
 EXECUTE format('GRANT UPDATE(status,auth_version,updated_at,synthetic_display_name) ON banuchat_auth.accounts TO %I',r);
END $grants$;
COMMIT;
