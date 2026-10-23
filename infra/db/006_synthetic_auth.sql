-- BanuChat AUTH-P0: additive candidate, NOT APPLIED. PostgreSQL 16.
-- No business-schema changes, accounts, backfill, roles, grants or corpus writes.
-- Before any FUTURE authorized run, SET banuchat_auth.target_database to the
-- exact reviewed database name in the SAME connection. Missing/mismatch aborts.
BEGIN;
SET LOCAL search_path = pg_catalog;
SET LOCAL TIME ZONE 'UTC';

DO $guard$
DECLARE
    expected_database text := current_setting('banuchat_auth.target_database', true);
BEGIN
    IF expected_database IS NULL OR expected_database = ''
       OR current_database() <> expected_database
       OR current_database() ~* 'ccd'
       OR to_regnamespace('banuchat_auth') IS NOT NULL
       OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
       OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NOT NULL THEN
        RAISE EXCEPTION 'AUTH migration requires an explicitly reviewed synthetic destination without auth or CCD';
    END IF;
    IF to_regclass('banuchat.datasets') IS NULL
       OR to_regclass('banuchat.dataset_releases') IS NULL
       OR to_regclass('banuchat.synthetic_profiles') IS NULL
       OR to_regclass('banuchat.conversations') IS NULL THEN
        RAISE EXCEPTION 'AUTH migration requires the unchanged business schema';
    END IF;
    IF (SELECT count(*) FROM banuchat.datasets) <> 1
       OR NOT EXISTS (
           SELECT 1 FROM banuchat.datasets d
           JOIN banuchat.dataset_releases r
             ON r.dataset_id = d.id AND r.id = d.current_release_id
           WHERE d.id = 1 AND d.name = 'banuchat-synthetic'
             AND r.status = 'ready' AND r.manifest->'synthetic' = 'true'::jsonb
       )
       OR EXISTS (
           SELECT 1 FROM banuchat.dataset_releases r
           WHERE r.dataset_id <> 1
              OR (r.manifest->'synthetic' = 'true'::jsonb) IS NOT TRUE
       ) THEN
        RAISE EXCEPTION 'AUTH migration requires only the published synthetic corpus';
    END IF;
    -- The FK must still reference synthetic_profiles, not the CCD context.
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint c
        WHERE c.conrelid = 'banuchat.conversations'::regclass
          AND c.confrelid = 'banuchat.synthetic_profiles'::regclass
          AND c.contype = 'f'
          AND c.convalidated
          AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
               FROM unnest(c.conkey) WITH ORDINALITY AS k(attribute_number, ord)
               JOIN pg_catalog.pg_attribute a
                 ON a.attrelid = c.conrelid AND a.attnum = k.attribute_number)
              = ARRAY['dataset_release_id', 'profile_key']::text[]
          AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
               FROM unnest(c.confkey) WITH ORDINALITY AS k(attribute_number, ord)
               JOIN pg_catalog.pg_attribute a
                 ON a.attrelid = c.confrelid AND a.attnum = k.attribute_number)
              = ARRAY['dataset_release_id', 'profile_key']::text[]
    ) THEN
        RAISE EXCEPTION 'AUTH migration requires the synthetic conversation relationship';
    END IF;
END;
$guard$;

CREATE SCHEMA banuchat_auth;
COMMENT ON SCHEMA banuchat_auth IS
    'Own authentication for permanently synthetic BanuChat accounts; no UNAB credentials, corpus mutation or legacy-history adoption.';

CREATE TABLE banuchat_auth.accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    synthetic_uid text NOT NULL UNIQUE
        CHECK (char_length(synthetic_uid) = 13 AND synthetic_uid ~ '^BCH-DEMO-[0-9]{4}$'),
    recovery_email text NOT NULL UNIQUE
        CHECK (recovery_email ~ '^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?@banuchat[.]test$'
               AND recovery_email !~ '[.][.]'),
    status text NOT NULL DEFAULT 'pending_password'
        CHECK (status IN ('pending_password', 'active', 'disabled')),
    auth_version bigint NOT NULL DEFAULT 1 CHECK (auth_version > 0),
    created_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    updated_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    disabled_at banuchat.finite_time,
    CHECK (updated_at >= created_at),
    CHECK ((status = 'disabled') = (disabled_at IS NOT NULL)),
    CHECK (disabled_at IS NULL OR (disabled_at >= created_at AND disabled_at <= updated_at))
);

CREATE TABLE banuchat_auth.password_credentials (
    principal_id uuid PRIMARY KEY REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    password_hash text NOT NULL,
    changed_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    -- PHC encoding, 16-byte salt / 32-byte output, no plaintext or fast hash.
    -- CASE keeps casts guarded; this is shape/cost validation, not Argon2 verification.
    CHECK (CASE WHEN password_hash ~ '^[$]argon2id[$]v=19[$]m=[0-9]{1,9},t=[0-9]{1,3},p=1[$][A-Za-z0-9+/]{22}[$][A-Za-z0-9+/]{43}$'
        THEN split_part(split_part(split_part(password_hash, '$', 4), ',', 1), '=', 2)::integer
                 BETWEEN 19456 AND 262144
         AND split_part(split_part(split_part(password_hash, '$', 4), ',', 2), '=', 2)::integer
                 BETWEEN 2 AND 10
        ELSE false END)
);

CREATE TABLE banuchat_auth.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    principal_id uuid NOT NULL REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    deployment_id uuid NOT NULL,
    auth_version bigint NOT NULL CHECK (auth_version > 0),
    access_token_digest banuchat.sha256_hex NOT NULL UNIQUE,
    created_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    access_issued_at banuchat.finite_time NOT NULL,
    access_expires_at banuchat.finite_time NOT NULL,
    last_seen_at banuchat.finite_time NOT NULL,
    absolute_expires_at banuchat.finite_time NOT NULL,
    revoked_at banuchat.finite_time,
    CHECK (access_issued_at >= created_at),
    CHECK (access_expires_at > access_issued_at
           AND access_expires_at <= access_issued_at + interval '900 seconds'),
    CHECK (absolute_expires_at > created_at
           AND absolute_expires_at <= created_at + interval '604800 seconds'),
    CHECK (access_expires_at <= absolute_expires_at),
    CHECK (last_seen_at >= created_at AND last_seen_at < absolute_expires_at),
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);
CREATE INDEX sessions_principal_idx ON banuchat_auth.sessions(principal_id, id);
CREATE INDEX sessions_expiry_idx ON banuchat_auth.sessions(absolute_expires_at);
COMMENT ON COLUMN banuchat_auth.sessions.auth_version IS
    'Snapshot compared at runtime, deliberately NOT an FK to mutable accounts.auth_version; old sessions must remain revocable.';

CREATE TABLE banuchat_auth.refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES banuchat_auth.sessions(id) ON DELETE RESTRICT,
    token_digest banuchat.sha256_hex NOT NULL UNIQUE,
    created_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    expires_at banuchat.finite_time NOT NULL,
    consumed_at banuchat.finite_time,
    replaced_by uuid UNIQUE,
    UNIQUE (session_id, id),
    FOREIGN KEY (session_id, replaced_by)
        REFERENCES banuchat_auth.refresh_tokens(session_id, id) ON DELETE RESTRICT,
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '604800 seconds'),
    CHECK ((consumed_at IS NULL) = (replaced_by IS NULL)),
    CHECK (consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at < expires_at)),
    CHECK (replaced_by IS NULL OR replaced_by <> id)
);
CREATE INDEX refresh_tokens_expiry_idx ON banuchat_auth.refresh_tokens(expires_at);
COMMENT ON TABLE banuchat_auth.refresh_tokens IS
    'One session is the token family. Insert replacement before consuming predecessor in the same transaction; revoke parent session on replay. Preserve consumed digests through family expiry.';

CREATE TABLE banuchat_auth.password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    principal_id uuid NOT NULL REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    token_digest banuchat.sha256_hex NOT NULL UNIQUE,
    purpose text NOT NULL CHECK (purpose IN ('initial_set', 'reset')),
    auth_version bigint NOT NULL CHECK (auth_version > 0),
    created_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    expires_at banuchat.finite_time NOT NULL,
    consumed_at banuchat.finite_time,
    invalidated_at banuchat.finite_time,
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '1200 seconds'),
    CHECK (consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at < expires_at)),
    CHECK (invalidated_at IS NULL OR invalidated_at >= created_at),
    CHECK (consumed_at IS NULL OR invalidated_at IS NULL)
);
CREATE INDEX password_reset_tokens_pending_idx
    ON banuchat_auth.password_reset_tokens(principal_id, expires_at)
    WHERE consumed_at IS NULL AND invalidated_at IS NULL;
CREATE INDEX password_reset_tokens_expiry_idx ON banuchat_auth.password_reset_tokens(expires_at);

-- One assigned profile per account. Many accounts may read the SAME fictional profile.
-- No aliases, grades, academic records, source hashes or documents are copied here.
CREATE TABLE banuchat_auth.profile_bindings (
    principal_id uuid PRIMARY KEY REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    dataset_id smallint NOT NULL CHECK (dataset_id = 1)
        REFERENCES banuchat.datasets(id) ON DELETE RESTRICT,
    profile_key banuchat.stable_key NOT NULL,
    assigned_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (principal_id, dataset_id, profile_key)
);

CREATE TABLE banuchat_auth.profile_binding_versions (
    principal_id uuid NOT NULL,
    dataset_id smallint NOT NULL CHECK (dataset_id = 1),
    dataset_release_id uuid NOT NULL,
    profile_key banuchat.stable_key NOT NULL,
    approved_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (principal_id, dataset_release_id),
    FOREIGN KEY (principal_id, dataset_id, profile_key)
        REFERENCES banuchat_auth.profile_bindings(principal_id, dataset_id, profile_key) ON DELETE RESTRICT,
    FOREIGN KEY (dataset_id, dataset_release_id)
        REFERENCES banuchat.dataset_releases(dataset_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (dataset_release_id, profile_key)
        REFERENCES banuchat.synthetic_profiles(dataset_release_id, profile_key) ON DELETE RESTRICT
);
CREATE INDEX profile_binding_versions_release_idx
    ON banuchat_auth.profile_binding_versions(dataset_release_id, profile_key);

CREATE TABLE banuchat_auth.corpus_grants (
    principal_id uuid NOT NULL REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    dataset_id smallint NOT NULL CHECK (dataset_id = 1)
        REFERENCES banuchat.datasets(id) ON DELETE RESTRICT,
    mode text NOT NULL DEFAULT 'synthetic' CHECK (mode = 'synthetic'),
    permission text NOT NULL DEFAULT 'read' CHECK (permission = 'read'),
    granted_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    revoked_at banuchat.finite_time,
    PRIMARY KEY (principal_id, dataset_id),
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE TABLE banuchat_auth.conversation_owners (
    conversation_id uuid PRIMARY KEY REFERENCES banuchat.conversations(id) ON DELETE CASCADE,
    principal_id uuid NOT NULL REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    created_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX conversation_owners_principal_idx
    ON banuchat_auth.conversation_owners(principal_id, conversation_id);
COMMENT ON TABLE banuchat_auth.conversation_owners IS
    'Explicit ownership only for new authenticated conversations, inserted atomically by API. No legacy backfill, ownership transfer or ownership inference from profile_key.';

CREATE TABLE banuchat_auth.auth_rate_limits (
    action text NOT NULL CHECK (action IN (
        'login_uid', 'login_origin', 'reset_uid', 'reset_origin',
        'confirm_origin', 'refresh_origin', 'hash_work'
    )),
    bucket_key banuchat.sha256_hex NOT NULL,
    window_started_at banuchat.finite_time NOT NULL,
    window_seconds integer NOT NULL,
    attempts bigint NOT NULL CHECK (attempts > 0),
    expires_at banuchat.finite_time NOT NULL,
    PRIMARY KEY (action, bucket_key, window_started_at),
    CHECK (window_seconds = CASE action
        WHEN 'reset_uid' THEN 3600 WHEN 'hash_work' THEN 60 ELSE 900 END),
    CHECK (mod(extract(epoch FROM window_started_at), window_seconds) = 0),
    CHECK (expires_at = window_started_at + window_seconds * interval '1 second')
);
CREATE INDEX auth_rate_limits_expiry_idx ON banuchat_auth.auth_rate_limits(expires_at);

CREATE TABLE banuchat_auth.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    request_id uuid NOT NULL,
    principal_id uuid REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    session_id uuid REFERENCES banuchat_auth.sessions(id) ON DELETE SET NULL,
    event_type text NOT NULL CHECK (event_type IN (
        'account_provisioned', 'login_succeeded', 'login_denied', 'refresh_succeeded',
        'refresh_reuse_detected', 'logout_succeeded', 'reset_requested',
        'reset_delivered', 'reset_delivery_failed', 'password_set', 'password_reset',
        'account_disabled', 'binding_changed', 'grant_changed', 'access_denied', 'rate_limited'
    )),
    outcome text NOT NULL CHECK (outcome IN ('success', 'denied', 'error'))
);
CREATE INDEX security_events_time_idx ON banuchat_auth.security_events(occurred_at);
CREATE INDEX security_events_principal_idx ON banuchat_auth.security_events(principal_id, occurred_at);
CREATE INDEX security_events_session_idx ON banuchat_auth.security_events(session_id) WHERE session_id IS NOT NULL;
COMMENT ON TABLE banuchat_auth.security_events IS
    'Typed minimal audit only. No arbitrary JSON/text payload, email, UID, password, token, IP, SQL, message or academic record.';

-- New objects only. No role provisioning or changes to existing/PUBLIC database ACLs.
REVOKE ALL ON SCHEMA banuchat_auth FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA banuchat_auth FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA banuchat_auth FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA banuchat_auth REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA banuchat_auth REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
COMMIT;
