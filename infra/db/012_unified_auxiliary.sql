-- Unified product. Additive only; run on an isolated CCD clone, never implicitly at startup.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$
BEGIN
 IF current_setting('banuchat_auth.target_database',true) IS DISTINCT FROM current_database()
 OR current_database() <> 'banuchat_unified'
 OR to_regprocedure('banuchat_auth.resource_context(text,uuid,boolean,boolean)') IS NULL
 OR EXISTS(SELECT 1 FROM banuchat.synthetic_profiles)
 OR EXISTS(SELECT 1 FROM banuchat.datasets WHERE name<>'banuchat-ccd-local')
 THEN RAISE EXCEPTION 'Unified target rejected'; END IF;
END $guard$;
CREATE SCHEMA banuchat_aux;
REVOKE ALL ON SCHEMA banuchat_aux FROM PUBLIC;
CREATE TABLE banuchat_aux.dataset_releases(
 id uuid PRIMARY KEY, dataset_id smallint NOT NULL DEFAULT 1 CHECK(dataset_id=1),
 status text NOT NULL CHECK(status='ready'), embedding_config_id uuid NOT NULL,
 provenance text NOT NULL CHECK(provenance='fictional_auxiliary'), manifest jsonb NOT NULL DEFAULT '{"synthetic":true}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE banuchat_aux.datasets(id smallint PRIMARY KEY CHECK(id=1),name text NOT NULL DEFAULT 'banuchat-auxiliary' CHECK(name='banuchat-auxiliary'),current_release_id uuid NOT NULL REFERENCES banuchat_aux.dataset_releases(id));
CREATE TABLE banuchat_aux.synthetic_profiles(LIKE banuchat.synthetic_profiles INCLUDING ALL);
CREATE TABLE banuchat_aux.courses(LIKE banuchat.courses INCLUDING ALL);
CREATE TABLE banuchat_aux.profile_courses(LIKE banuchat.profile_courses INCLUDING ALL);
CREATE TABLE banuchat_aux.calendar_events(LIKE banuchat.calendar_events INCLUDING ALL);
CREATE TABLE banuchat_aux.announcements(LIKE banuchat.announcements INCLUDING ALL);
-- BEGIN AUXILIARY REFERENCES
ALTER TABLE banuchat_aux.synthetic_profiles ADD FOREIGN KEY(dataset_release_id) REFERENCES banuchat_aux.dataset_releases(id);
ALTER TABLE banuchat_aux.courses ADD FOREIGN KEY(dataset_release_id) REFERENCES banuchat_aux.dataset_releases(id);
ALTER TABLE banuchat_aux.announcements ADD FOREIGN KEY(dataset_release_id) REFERENCES banuchat_aux.dataset_releases(id);
ALTER TABLE banuchat_aux.calendar_events ADD FOREIGN KEY(dataset_release_id) REFERENCES banuchat_aux.dataset_releases(id),
 ADD FOREIGN KEY(dataset_release_id,course_key) REFERENCES banuchat_aux.courses(dataset_release_id,course_key),
 ADD FOREIGN KEY(dataset_release_id,announcement_key) REFERENCES banuchat_aux.announcements(dataset_release_id,announcement_key);
ALTER TABLE banuchat_aux.profile_courses ADD FOREIGN KEY(dataset_release_id,profile_key) REFERENCES banuchat_aux.synthetic_profiles(dataset_release_id,profile_key),
 ADD FOREIGN KEY(dataset_release_id,course_key) REFERENCES banuchat_aux.courses(dataset_release_id,course_key);
-- END AUXILIARY REFERENCES
CREATE TABLE banuchat_aux.account_profiles(
 principal_id uuid NOT NULL REFERENCES banuchat_auth.accounts(id),
 release_id uuid NOT NULL REFERENCES banuchat_aux.dataset_releases(id),
 profile_key banuchat.stable_key NOT NULL,
 PRIMARY KEY(principal_id,release_id), UNIQUE(release_id,profile_key),
 FOREIGN KEY(release_id,profile_key) REFERENCES banuchat_aux.synthetic_profiles(dataset_release_id,profile_key)
);
CREATE TABLE banuchat_aux.turn_sources(
 message_id uuid PRIMARY KEY REFERENCES banuchat.messages(id) ON DELETE CASCADE,
 structured_release_id uuid NOT NULL REFERENCES banuchat_aux.dataset_releases(id),
 citations jsonb NOT NULL CHECK(jsonb_typeof(citations)='array'),
 records jsonb NOT NULL CHECK(jsonb_typeof(records)='array')
);
CREATE TABLE banuchat_aux.product_config(singleton boolean PRIMARY KEY CHECK(singleton),version integer NOT NULL CHECK(version=1));
INSERT INTO banuchat_aux.product_config VALUES(true,1);
-- Retain the existing retrieval function/projection/owner; scope only this isolated database.
DO $retrieval$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)'::regprocedure) INTO definition;
 IF strpos(definition,'''banuchat_ccd_auth_i1b_test''')=0 THEN RAISE EXCEPTION 'Unexpected retrieval definition'; END IF;
 EXECUTE replace(definition,'''banuchat_ccd_auth_i1b_test''','''banuchat_unified''');
END $retrieval$;
REVOKE ALL ON ALL TABLES IN SCHEMA banuchat_aux FROM PUBLIC;
GRANT USAGE ON SCHEMA banuchat_aux TO banuchat_auth_executor;
GRANT SELECT ON ALL TABLES IN SCHEMA banuchat_aux TO banuchat_auth_executor;
GRANT INSERT ON banuchat_aux.turn_sources TO banuchat_auth_executor;
GRANT UPDATE(id) ON banuchat_aux.datasets TO banuchat_auth_executor;

CREATE FUNCTION banuchat_auth.persist_unified_turn(p_token text,p_conversation uuid,p_release uuid,p_ordinal integer,
 p_user text,p_answer text,p_insufficient boolean,p_records jsonb,p_presentations jsonb,p_structured uuid)
RETURNS SETOF record
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $body$
DECLARE ctx record; stored record; citation jsonb; doc_records jsonb; own_profile text; source_row jsonb;
BEGIN
 SELECT * INTO ctx FROM banuchat_auth.resource_context(p_token,p_conversation,true,true);
 PERFORM id FROM banuchat_aux.datasets WHERE id=1 AND current_release_id=p_structured FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='Conflict'; END IF;
 SELECT profile_key INTO own_profile FROM banuchat_aux.account_profiles WHERE principal_id=ctx.principal_id AND release_id=p_structured;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='Forbidden'; END IF;
 IF jsonb_typeof(p_records)<>'array' OR jsonb_typeof(p_presentations)<>'array'
 OR jsonb_array_length(p_records)<>jsonb_array_length(p_presentations) OR octet_length(p_presentations::text)>1048576
 THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid argument'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_records) WITH ORDINALITY e(value,n)
  CROSS JOIN LATERAL (SELECT p_presentations->(e.n::integer-1) AS p) v
  WHERE e.value->'citation_index' IS DISTINCT FROM to_jsonb(e.n-1)
   OR v.p->'index' IS DISTINCT FROM e.value->'citation_index'
   OR v.p->>'source_kind' IS DISTINCT FROM e.value->>'source_kind'
   OR v.p->>'release_id' IS DISTINCT FROM e.value->>'dataset_release_id'
   OR v.p->>'locator' IS DISTINCT FROM e.value->>'source_locator'
   OR v.p->'document_version_id' IS DISTINCT FROM e.value->'document_version_id'
   OR coalesce(v.p->>'label','') !~ '\S'
   OR (e.value->>'source_kind'='document' AND v.p->>'artifact_url' IS DISTINCT FROM '/api/v1/documents/'||(e.value->>'document_version_id')||'/artifact')
   OR (e.value->>'source_kind'<>'document' AND v.p->'artifact_url' IS DISTINCT FROM 'null'::jsonb))
 THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid citation pair'; END IF;
 FOR citation IN SELECT value FROM jsonb_array_elements(p_records) LOOP
  IF citation->>'source_kind'='document' THEN
   IF (citation->>'dataset_release_id')::uuid<>p_release THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='Conflict'; END IF;
   CONTINUE;
  END IF;
  IF (citation->>'dataset_release_id')::uuid<>p_structured THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='Conflict'; END IF;
  source_row:=NULL;
  CASE citation->>'source_kind'
   WHEN 'profile' THEN SELECT to_jsonb(t) INTO source_row FROM banuchat_aux.synthetic_profiles t WHERE dataset_release_id=p_structured AND profile_key=own_profile AND profile_key=citation->>'profile_key';
   WHEN 'profile_course' THEN SELECT to_jsonb(t) INTO source_row FROM banuchat_aux.profile_courses t WHERE dataset_release_id=p_structured AND profile_key=own_profile AND profile_key=citation->>'profile_key' AND course_key=citation->>'course_key';
   WHEN 'course' THEN SELECT to_jsonb(t) INTO source_row FROM banuchat_aux.courses t WHERE dataset_release_id=p_structured AND course_key=citation->>'course_key';
   WHEN 'calendar_event' THEN SELECT to_jsonb(t) INTO source_row FROM banuchat_aux.calendar_events t WHERE dataset_release_id=p_structured AND event_key=citation->>'event_key';
   WHEN 'announcement' THEN SELECT to_jsonb(t) INTO source_row FROM banuchat_aux.announcements t WHERE dataset_release_id=p_structured AND announcement_key=citation->>'announcement_key';
   ELSE RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid argument';
  END CASE;
  IF source_row IS NULL OR source_row->>'source_path' IS DISTINCT FROM citation->>'source_path'
   OR source_row->>'source_locator' IS DISTINCT FROM citation->>'source_locator'
   OR source_row->>'source_sha256' IS DISTINCT FROM citation->>'source_sha256'
  THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='Forbidden'; END IF;
 END LOOP;
 SELECT coalesce(jsonb_agg(value||jsonb_build_object('citation_index',n-1)),'[]') INTO doc_records
 FROM (SELECT value,row_number() OVER() n FROM jsonb_array_elements(p_records) WHERE value->>'source_kind'='document') q;
 SELECT * INTO stored FROM banuchat_auth.persist_turn(p_token,p_conversation,p_release,p_ordinal,p_user,p_answer,p_insufficient,doc_records);
 IF stored.status='inserted' THEN
  INSERT INTO banuchat_aux.turn_sources VALUES(stored.assistant_message_id,p_structured,p_presentations,p_records);
 END IF;
 RETURN NEXT stored;
END $body$;
REVOKE ALL ON FUNCTION banuchat_auth.persist_unified_turn(text,uuid,uuid,integer,text,text,boolean,jsonb,jsonb,uuid) FROM PUBLIC;
GRANT CREATE ON SCHEMA banuchat_auth TO banuchat_auth_executor;
ALTER FUNCTION banuchat_auth.persist_unified_turn(text,uuid,uuid,integer,text,text,boolean,jsonb,jsonb,uuid) OWNER TO banuchat_auth_executor;
REVOKE CREATE ON SCHEMA banuchat_auth FROM banuchat_auth_executor;
DO $acl$
DECLARE runtime_name text:=current_setting('banuchat_auth.runtime_role');
BEGIN
 EXECUTE format('GRANT USAGE ON SCHEMA banuchat_aux TO %I',runtime_name);
 EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA banuchat_aux TO %I',runtime_name);
 EXECUTE format('GRANT EXECUTE ON FUNCTION banuchat_auth.persist_unified_turn(text,uuid,uuid,integer,text,text,boolean,jsonb,jsonb,uuid) TO %I',runtime_name);
END $acl$;
COMMIT;

