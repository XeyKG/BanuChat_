-- BCH-D37 / CCD-AUTH-I1B: explicit CCD branch, not sequential 006-010.
-- Shared objects derived from frozen 006/007/008/010; differences tested by bootstrap-source.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$
DECLARE runtime_name text:=current_setting('banuchat_auth.runtime_role',true);
BEGIN
 IF current_setting('banuchat_auth.target_database',true) IS DISTINCT FROM current_database()
 OR current_database()<>'banuchat_ccd_auth_i1b_test'
 OR to_regnamespace('banuchat_auth') IS NOT NULL
 OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NULL
 OR EXISTS(SELECT 1 FROM banuchat.synthetic_profiles)
 OR EXISTS(SELECT 1 FROM banuchat.conversations)
 OR EXISTS(SELECT 1 FROM banuchat.messages)
 OR EXISTS(SELECT 1 FROM banuchat.message_citations)
 OR (SELECT count(*) FROM banuchat.datasets)<>1
 OR (SELECT count(*) FROM banuchat.dataset_releases)<>3
 OR EXISTS(SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id<>1 OR status<>'ready'
   OR (manifest->'synthetic'='false'::jsonb) IS NOT TRUE
   OR manifest->>'schema_version' NOT IN ('ccd-1.0.0','ccd-1.1.0','ccd-1.2.0'))
 OR NOT EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id
   JOIN banuchat.ccd_demo_contexts c ON c.dataset_release_id=r.id AND c.profile_key='ccd-local-demo'
   WHERE d.id=1 AND d.name='banuchat-ccd-local' AND r.id='3d6cedac-0e86-40c8-909b-d3ff6e8ab741'::uuid)
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='banuchat.conversations'::regclass
   AND confrelid='banuchat.ccd_demo_contexts'::regclass AND contype='f' AND convalidated)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=runtime_name AND rolcanlogin AND NOT rolsuper
   AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls)
 OR current_setting('banuchat_auth.deployment_id',true) IS NULL
 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='CCD authenticated bootstrap target rejected'; END IF;
END $guard$;

CREATE SCHEMA banuchat_auth;
COMMENT ON SCHEMA banuchat_auth IS
    'Own authentication for permanently synthetic BanuChat accounts; no UNAB credentials, corpus mutation or legacy-history adoption.';

CREATE TABLE banuchat_auth.accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    synthetic_uid text NOT NULL UNIQUE
        CHECK ((char_length(synthetic_uid)=13 AND synthetic_uid COLLATE "C" ~ '^BCH-DEMO-[0-9]{4}$') OR (char_length(synthetic_uid)=9 AND synthetic_uid COLLATE "C" ~ '^U[0-9]{8}$')),
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
    profile_key banuchat.stable_key NOT NULL CHECK (profile_key='ccd-local-demo'),
    assigned_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (principal_id, dataset_id, profile_key)
);

CREATE TABLE banuchat_auth.profile_binding_versions (
    principal_id uuid NOT NULL,
    dataset_id smallint NOT NULL CHECK (dataset_id = 1),
    dataset_release_id uuid NOT NULL,
    profile_key banuchat.stable_key NOT NULL CHECK (profile_key='ccd-local-demo'),
    approved_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (principal_id, dataset_release_id),
    FOREIGN KEY (principal_id, dataset_id, profile_key)
        REFERENCES banuchat_auth.profile_bindings(principal_id, dataset_id, profile_key) ON DELETE RESTRICT,
    FOREIGN KEY (dataset_id, dataset_release_id)
        REFERENCES banuchat.dataset_releases(dataset_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (dataset_release_id, profile_key)
        REFERENCES banuchat.ccd_demo_contexts(dataset_release_id, profile_key) ON DELETE RESTRICT
);
CREATE INDEX profile_binding_versions_release_idx
    ON banuchat_auth.profile_binding_versions(dataset_release_id, profile_key);

CREATE TABLE banuchat_auth.corpus_grants (
    principal_id uuid NOT NULL REFERENCES banuchat_auth.accounts(id) ON DELETE RESTRICT,
    dataset_id smallint NOT NULL CHECK (dataset_id = 1)
        REFERENCES banuchat.datasets(id) ON DELETE RESTRICT,
    mode text NOT NULL DEFAULT 'ccd_local' CHECK (mode = 'ccd_local'),
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

CREATE ROLE banuchat_auth_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE TABLE banuchat_auth.runtime_scope (
  singleton boolean PRIMARY KEY CHECK(singleton), deployment_id uuid NOT NULL, database_name name NOT NULL, evidence_mode text NOT NULL CHECK(evidence_mode='ccd_local'), dataset_name text NOT NULL CHECK(dataset_name='banuchat-ccd-local')
);
INSERT INTO banuchat_auth.runtime_scope VALUES(true,current_setting('banuchat_auth.deployment_id')::uuid,current_database(),'ccd_local','banuchat-ccd-local');
REVOKE ALL ON banuchat_auth.runtime_scope FROM PUBLIC;
GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO banuchat_auth_executor;
GRANT SELECT ON banuchat_auth.runtime_scope,banuchat_auth.accounts,banuchat_auth.sessions,
  banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,banuchat_auth.corpus_grants,
  banuchat_auth.conversation_owners TO banuchat_auth_executor;
GRANT SELECT ON banuchat.ccd_demo_contexts TO banuchat_auth_executor;
GRANT SELECT(principal_id) ON banuchat_auth.password_credentials TO banuchat_auth_executor;
GRANT SELECT ON banuchat.datasets,banuchat.dataset_releases,banuchat.conversations,banuchat.messages,
  banuchat.message_citations,banuchat.synthetic_profiles,banuchat.profile_courses,banuchat.courses,
  banuchat.announcements,banuchat.calendar_events,banuchat.documents,banuchat.document_versions,
  banuchat.document_chunks TO banuchat_auth_executor;
-- Column UPDATE is required by PostgreSQL for row locks; never granted to runtime.
GRANT UPDATE(id) ON banuchat.conversations,banuchat.datasets,banuchat.dataset_releases TO banuchat_auth_executor;
GRANT UPDATE(updated_at) ON banuchat_auth.accounts TO banuchat_auth_executor;
GRANT UPDATE(last_seen_at) ON banuchat_auth.sessions TO banuchat_auth_executor;
GRANT INSERT ON banuchat.messages,banuchat.message_citations TO banuchat_auth_executor;
GRANT EXECUTE ON FUNCTION banuchat.release_records(uuid) TO banuchat_auth_executor;

CREATE FUNCTION banuchat_auth.resource_context(p_access_token text,p_conversation uuid DEFAULT NULL,
  p_binding boolean DEFAULT false,p_turn boolean DEFAULT false)
RETURNS TABLE(principal_id uuid,session_id uuid,profile_key text,release_id uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,banuchat_auth,pg_temp
AS $context$
DECLARE token_digest text; found_session banuchat_auth.sessions%ROWTYPE;
  found_account banuchat_auth.accounts%ROWTYPE; scope banuchat_auth.runtime_scope%ROWTYPE;
  selected_principal uuid; selected_session uuid; reference_time timestamptz; opening_profile text;
BEGIN
  IF p_access_token IS NULL OR length(p_access_token)<>43
     OR p_access_token !~ '^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$'
  THEN RAISE EXCEPTION USING ERRCODE='P0401',MESSAGE='Unauthenticated'; END IF;
  token_digest := encode(sha256(decode(translate(p_access_token,'-_','+/') || '=','base64')),'hex');
  SELECT s.principal_id,s.id INTO selected_principal,selected_session FROM banuchat_auth.sessions s WHERE s.access_token_digest=token_digest;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0401',MESSAGE='Unauthenticated'; END IF;
  SELECT a.* INTO found_account FROM banuchat_auth.accounts a WHERE a.id=selected_principal FOR UPDATE;
  SELECT s.* INTO found_session FROM banuchat_auth.sessions s WHERE s.id=selected_session FOR UPDATE;
  SELECT rs.* INTO scope FROM banuchat_auth.runtime_scope rs WHERE rs.singleton;
  reference_time:=clock_timestamp();
  IF found_account.status IS DISTINCT FROM 'active' OR scope.database_name IS DISTINCT FROM current_database()
    OR scope.deployment_id IS DISTINCT FROM found_session.deployment_id
    OR found_session.principal_id IS DISTINCT FROM found_account.id
    OR found_session.access_token_digest IS DISTINCT FROM token_digest OR found_session.revoked_at IS NOT NULL
    OR found_session.auth_version IS DISTINCT FROM found_account.auth_version
    OR reference_time<found_session.created_at OR reference_time<found_session.last_seen_at
    OR reference_time>=found_session.access_expires_at OR reference_time>=found_session.absolute_expires_at
    OR reference_time>=found_session.last_seen_at+interval '86400 seconds'
    OR NOT EXISTS(SELECT 1 FROM banuchat_auth.password_credentials c WHERE c.principal_id=found_account.id)
  THEN RAISE EXCEPTION USING ERRCODE='P0401',MESSAGE='Unauthenticated'; END IF;
  IF NOT EXISTS(SELECT 1 FROM banuchat_auth.corpus_grants g WHERE g.principal_id=found_account.id AND g.dataset_id=1
    AND g.mode='ccd_local' AND g.permission='read' AND g.revoked_at IS NULL)
  THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='Forbidden'; END IF;
  IF p_conversation IS NOT NULL THEN
    SELECT c.profile_key INTO opening_profile FROM banuchat.conversations c
      JOIN banuchat_auth.conversation_owners o ON o.conversation_id=c.id AND o.principal_id=found_account.id
      WHERE c.id=p_conversation FOR UPDATE OF c;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Not found'; END IF;
  END IF;
  IF p_binding OR p_turn THEN
    -- Short binding reads/create must not cross a publication between gate and service.
    -- Turn commits retain the historical current_context locks below, unchanged.
    IF NOT p_turn THEN
      PERFORM d.id FROM banuchat.datasets d WHERE d.id=1 FOR SHARE;
    END IF;
    SELECT r.id INTO release_id FROM banuchat.datasets d JOIN banuchat.dataset_releases r
      ON r.id=d.current_release_id AND r.dataset_id=d.id WHERE d.id=1 AND d.name='banuchat-ccd-local'
      AND r.status='ready' AND r.manifest->'synthetic'='false'::jsonb;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Not found'; END IF;
    SELECT b.profile_key INTO profile_key FROM banuchat_auth.profile_bindings b
      JOIN banuchat_auth.profile_binding_versions v ON v.principal_id=b.principal_id AND v.dataset_id=b.dataset_id
        AND v.profile_key=b.profile_key AND v.dataset_release_id=release_id
      WHERE b.principal_id=found_account.id AND b.dataset_id=1;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='Forbidden'; END IF;
    IF p_turn AND (p_conversation IS NULL OR opening_profile IS DISTINCT FROM profile_key)
    THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='Conflict'; END IF;
  END IF;
  UPDATE banuchat_auth.sessions SET last_seen_at=reference_time WHERE id=found_session.id;
  principal_id:=found_account.id;session_id:=found_session.id;RETURN NEXT;
END $context$;

CREATE FUNCTION banuchat_auth.persist_turn(p_access_token text,p_conversation uuid,p_release uuid,p_ordinal integer,
  p_user text,p_answer text,p_insufficient boolean,p_citations jsonb)
RETURNS TABLE(status text,user_message_id uuid,user_ordinal integer,user_content banuchat.nonblank,user_created_at banuchat.finite_time,
  assistant_message_id uuid,assistant_ordinal integer,assistant_content banuchat.nonblank,assistant_created_at banuchat.finite_time,assistant_insufficient_evidence boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,banuchat_auth,pg_temp
AS $persist$
#variable_conflict use_column
BEGIN
  PERFORM * FROM banuchat_auth.resource_context(p_access_token,p_conversation,true,true);
  IF p_conversation IS NULL OR p_release IS NULL OR p_ordinal IS NULL OR p_ordinal<0 OR p_ordinal>2147483645
    OR p_user IS NULL OR char_length(p_user) NOT BETWEEN 1 AND 4000
    OR p_user !~ U&'[^\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]'
    OR p_answer IS NULL OR p_answer !~ U&'[^\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]' OR p_insufficient IS NULL
    OR jsonb_typeof(p_citations) IS DISTINCT FROM 'array' OR octet_length(p_citations::text)>1048576
  THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid argument'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_citations) WITH ORDINALITY e(value,n)
    WHERE jsonb_typeof(e.value)<>'object' OR NOT e.value ?& ARRAY['citation_index','dataset_release_id','source_kind',
      'source_path','source_locator','source_sha256','document_version_id','chunk_id','course_key','event_key','announcement_key','profile_key']
      OR e.value - ARRAY['citation_index','dataset_release_id','source_kind','source_path','source_locator','source_sha256',
        'document_version_id','chunk_id','course_key','event_key','announcement_key','profile_key'] <> '{}'::jsonb
      OR e.value->'citation_index' IS DISTINCT FROM to_jsonb(e.n-1))
  THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid argument'; END IF;
  -- Exact historical CTE, parameter substitution only. Equivalence test guards drift.
  RETURN QUERY
-- BEGIN HISTORICAL TURN
WITH locked_conversation AS MATERIALIZED (
  SELECT c.id, c.dataset_release_id
  FROM banuchat.conversations c
  WHERE c.id = p_conversation
  FOR UPDATE
), current_context AS MATERIALIZED (
  SELECT d.current_release_id
  FROM banuchat.datasets d
  JOIN banuchat.dataset_releases current_release
    ON current_release.id = d.current_release_id
   AND current_release.dataset_id = d.id
   AND current_release.status = 'ready'
  WHERE d.id = 1
  FOR SHARE OF d, current_release
), ordinal_state AS MATERIALIZED (
  SELECT COALESCE(MAX(m.ordinal) + 1, 0) AS next_ordinal
  FROM locked_conversation lc
  LEFT JOIN banuchat.messages m
    ON m.conversation_id = lc.id
), persistence_gate AS MATERIALIZED (
  SELECT lc.id
  FROM locked_conversation lc
  CROSS JOIN current_context cc
  CROSS JOIN ordinal_state os
  WHERE lc.dataset_release_id = p_release::uuid
    AND cc.current_release_id = p_release::uuid
    AND os.next_ordinal = p_ordinal
), inserted_messages AS (
  INSERT INTO banuchat.messages (
    conversation_id,
    ordinal,
    role,
    content,
    answer_dataset_release_id,
    insufficient_evidence
  )
  SELECT
    persistence_gate.id,
    turn.ordinal,
    turn.role,
    turn.content,
    turn.answer_dataset_release_id,
    turn.insufficient_evidence
  FROM persistence_gate
  CROSS JOIN LATERAL (
    VALUES
      (p_ordinal, 'user', p_user, NULL::uuid, false),
      (p_ordinal + 1, 'assistant', p_answer, p_release::uuid, p_insufficient)
  ) AS turn(ordinal, role, content, answer_dataset_release_id, insufficient_evidence)
  ORDER BY turn.ordinal
  RETURNING id, ordinal, role, content, created_at, insufficient_evidence
), citation_input AS MATERIALIZED (
  SELECT citation.*
  FROM jsonb_to_recordset(p_citations::jsonb) AS citation(
    citation_index integer,
    dataset_release_id uuid,
    source_kind text,
    source_path text,
    source_locator text,
    source_sha256 text,
    document_version_id uuid,
    chunk_id uuid,
    course_key text,
    event_key text,
    announcement_key text,
    profile_key text
  )
), inserted_citations AS (
  INSERT INTO banuchat.message_citations (
    message_id,
    citation_index,
    dataset_release_id,
    source_kind,
    source_path,
    source_locator,
    source_sha256,
    document_version_id,
    chunk_id,
    course_key,
    event_key,
    announcement_key,
    profile_key
  )
  SELECT
    assistant.id,
    citation.citation_index,
    citation.dataset_release_id,
    citation.source_kind::banuchat.source_kind,
    citation.source_path,
    citation.source_locator,
    citation.source_sha256,
    citation.document_version_id,
    citation.chunk_id,
    citation.course_key,
    citation.event_key,
    citation.announcement_key,
    citation.profile_key
  FROM inserted_messages assistant
  CROSS JOIN citation_input citation
  WHERE assistant.role = 'assistant'
  RETURNING citation_index
)
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM locked_conversation)
      THEN 'conversation_not_found'
    WHEN NOT EXISTS (
      SELECT 1
      FROM locked_conversation lc
      CROSS JOIN current_context cc
      WHERE lc.dataset_release_id = p_release::uuid
        AND cc.current_release_id = p_release::uuid
    ) THEN 'current_release_changed'
    WHEN (SELECT next_ordinal FROM ordinal_state) IS DISTINCT FROM p_ordinal
      THEN 'conversation_conflict'
    WHEN (SELECT COUNT(*) FROM inserted_messages) <> 2
      OR (SELECT COUNT(*) FROM inserted_citations) <> jsonb_array_length(p_citations::jsonb)
      THEN 'invalid_database_result'
    ELSE 'inserted'
  END AS status,
  (SELECT id FROM inserted_messages WHERE role = 'user') AS user_message_id,
  (SELECT ordinal FROM inserted_messages WHERE role = 'user') AS user_ordinal,
  (SELECT content FROM inserted_messages WHERE role = 'user') AS user_content,
  (SELECT created_at FROM inserted_messages WHERE role = 'user') AS user_created_at,
  (SELECT id FROM inserted_messages WHERE role = 'assistant') AS assistant_message_id,
  (SELECT ordinal FROM inserted_messages WHERE role = 'assistant') AS assistant_ordinal,
  (SELECT content FROM inserted_messages WHERE role = 'assistant') AS assistant_content,
  (SELECT created_at FROM inserted_messages WHERE role = 'assistant') AS assistant_created_at,
  (SELECT insufficient_evidence FROM inserted_messages WHERE role = 'assistant')
    AS assistant_insufficient_evidence;
-- END HISTORICAL TURN
EXCEPTION
  WHEN SQLSTATE 'P0400' OR SQLSTATE 'P0401' OR SQLSTATE 'P0403' OR SQLSTATE 'P0404' OR SQLSTATE 'P0409' THEN RAISE;
  WHEN unique_violation THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='Conflict';
  WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='P0500',MESSAGE='Persistence rejected';
END $persist$;

REVOKE ALL ON FUNCTION banuchat_auth.resource_context(text,uuid,boolean,boolean),
  banuchat_auth.persist_turn(text,uuid,uuid,integer,text,text,boolean,jsonb) FROM PUBLIC;
GRANT CREATE ON SCHEMA banuchat_auth TO banuchat_auth_executor;
ALTER FUNCTION banuchat_auth.resource_context(text,uuid,boolean,boolean) OWNER TO banuchat_auth_executor;
ALTER FUNCTION banuchat_auth.persist_turn(text,uuid,uuid,integer,text,text,boolean,jsonb) OWNER TO banuchat_auth_executor;
REVOKE CREATE ON SCHEMA banuchat_auth FROM banuchat_auth_executor;
DO $permissions$
DECLARE runtime_name text:=current_setting('banuchat_auth.runtime_role');
BEGIN
  EXECUTE format('GRANT SELECT ON banuchat_auth.runtime_scope TO %I',runtime_name);
  EXECUTE format('GRANT EXECUTE ON FUNCTION banuchat_auth.resource_context(text,uuid,boolean,boolean),banuchat_auth.persist_turn(text,uuid,uuid,integer,text,text,boolean,jsonb) TO %I',runtime_name);
END $permissions$;

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
  JOIN banuchat.datasets d ON d.id = 1 AND d.name = 'banuchat-ccd-local'
  JOIN banuchat.dataset_releases r ON r.id = d.current_release_id AND r.dataset_id = d.id
  WHERE s.singleton AND s.database_name = current_database()
    AND r.status = 'ready' AND r.manifest->'synthetic' = 'false'::jsonb;
  IF NOT FOUND OR current_database() <> 'banuchat_ccd_auth_i1b_test'
    OR (SELECT count(*) FROM banuchat.datasets) <> 1
    OR EXISTS (SELECT 1 FROM banuchat.dataset_releases r WHERE r.dataset_id <> 1
      OR (r.manifest->'synthetic' = 'false'::jsonb) IS NOT TRUE)
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
