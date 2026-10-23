-- AUTH-P2.1: additive, synthetic-only, explicit target/runtime/deployment required.
BEGIN;
DO $guard$
DECLARE runtime_name text := current_setting('banuchat_auth.runtime_role',true);
BEGIN
  IF current_setting('banuchat_auth.target_database',true) IS DISTINCT FROM current_database()
     OR lower(current_database()) LIKE '%ccd%'
     OR to_regclass('banuchat_auth.sessions') IS NULL
     OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
     OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NOT NULL
     OR to_regclass('banuchat_auth.runtime_scope') IS NOT NULL
     OR NOT EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
       AND r.dataset_id=d.id WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb)
     OR EXISTS(SELECT 1 FROM banuchat.dataset_releases r WHERE r.dataset_id<>1 OR (r.manifest->'synthetic'='true'::jsonb) IS NOT TRUE)
     OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=runtime_name AND rolcanlogin AND NOT rolsuper
       AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls)
     OR current_setting('banuchat_auth.deployment_id',true) IS NULL
  THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='AUTH migration target rejected'; END IF;
END $guard$;

CREATE ROLE banuchat_auth_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE TABLE banuchat_auth.runtime_scope (
  singleton boolean PRIMARY KEY CHECK(singleton), deployment_id uuid NOT NULL, database_name name NOT NULL
);
INSERT INTO banuchat_auth.runtime_scope VALUES(true,current_setting('banuchat_auth.deployment_id')::uuid,current_database());
REVOKE ALL ON banuchat_auth.runtime_scope FROM PUBLIC;
GRANT USAGE ON SCHEMA banuchat,banuchat_auth TO banuchat_auth_executor;
GRANT SELECT ON banuchat_auth.runtime_scope,banuchat_auth.accounts,banuchat_auth.sessions,
  banuchat_auth.profile_bindings,banuchat_auth.profile_binding_versions,banuchat_auth.corpus_grants,
  banuchat_auth.conversation_owners TO banuchat_auth_executor;
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
    AND g.mode='synthetic' AND g.permission='read' AND g.revoked_at IS NULL)
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
      ON r.id=d.current_release_id AND r.dataset_id=d.id WHERE d.id=1 AND d.name='banuchat-synthetic'
      AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb;
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
COMMIT;
