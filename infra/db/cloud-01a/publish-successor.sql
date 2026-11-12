-- Consumed by build-successor.mjs inside one transaction.
DO $publish$
DECLARE
  input jsonb := current_setting('banuchat_cloud.payload')::jsonb;
  f jsonb := input->'fixtures';
  runtime_role text := current_setting('banuchat_auth.runtime_role', true);
  base banuchat.dataset_releases%ROWTYPE;
  successor uuid;
  run uuid;
  mapping record;
BEGIN
  IF current_database() <> 'banuchat_cloud01a'
     OR current_setting('banuchat_auth.target_database', true) IS DISTINCT FROM current_database()
     OR to_regclass('banuchat_aux.product_config') IS NOT NULL
     OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
     OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NOT NULL
     OR (SELECT count(*) FROM banuchat.datasets) <> 1
     OR EXISTS (SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id <> 1
       OR manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb)
     OR NOT EXISTS (SELECT 1 FROM banuchat_auth.runtime_scope WHERE singleton
       AND database_name = current_database()
       AND deployment_id::text = current_setting('banuchat_auth.deployment_id', true))
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role AND rolcanlogin
       AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication))
     OR EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
       WHERE r.rolname = runtime_role)
     OR NOT has_function_privilege(runtime_role,
       'banuchat_auth.resource_context(text,uuid,boolean,boolean)', 'EXECUTE')
     OR has_schema_privilege(runtime_role, 'banuchat_academic', 'CREATE')
     OR EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace = 'banuchat_academic'::regnamespace
       AND c.relkind = 'r' AND (has_table_privilege(runtime_role, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
         OR has_any_column_privilege(runtime_role, c.oid, 'SELECT,INSERT,UPDATE')))
  THEN RAISE EXCEPTION 'CLOUD-01A.2: destino local o rol rechazado'; END IF;

  -- Same namespace/dataset as WriterLease. Pointer also serializes promotions.
  IF NOT pg_try_advisory_xact_lock(1111576149, 1) THEN
    RAISE EXCEPTION 'CLOUD-01A.2: existe otro escritor';
  END IF;
  PERFORM 1 FROM banuchat.datasets WHERE id = 1 AND name = 'banuchat-synthetic' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CLOUD-01A.2: dataset rechazado'; END IF;
  SELECT r.* INTO STRICT base FROM banuchat.datasets d
    JOIN banuchat.dataset_releases r ON r.id = d.current_release_id WHERE d.id = 1;
  IF base.status <> 'ready' OR base.manifest IS DISTINCT FROM input->'base'
     OR NOT EXISTS (SELECT 1 FROM banuchat.embedding_configs
       WHERE id = base.embedding_config_id AND provider = 'ollama'
         AND model = 'qwen3-embedding:0.6b' AND dimension = 1024 AND distance_metric = 'cosine')
     OR (SELECT count(*) FROM banuchat.document_chunks WHERE dataset_release_id = base.id) <> 60
     OR EXISTS (SELECT 1 FROM banuchat.document_chunks WHERE dataset_release_id = base.id
       AND (public.vector_dims(embedding) IS DISTINCT FROM 1024 OR public.vector_norm(embedding) <= 0))
  THEN RAISE EXCEPTION 'CLOUD-01A.2: la fuente debe ser la release v1 exacta'; END IF;

  ALTER TABLE banuchat_auth.accounts
    ADD CONSTRAINT cloud01a_uid_format CHECK (
      synthetic_uid COLLATE "C" ~ '^(BCH-DEMO-[0-9]{4}|U[0-9]{8})$');
  ALTER TABLE banuchat_auth.accounts DROP CONSTRAINT accounts_synthetic_uid_check;
  ALTER TABLE banuchat_academic.students
    DROP CONSTRAINT students_email_check,
    ADD CONSTRAINT cloud01a_academic_email CHECK (
      email COLLATE "C" ~ '^[a-z]+[.][a-z]+[.][0-9]{4}@banuchat[.]test$');

  INSERT INTO banuchat.dataset_releases
    (dataset_id,git_revision,dataset_schema_version,manifest,pipeline_config,embedding_config_id)
  VALUES (1,base.git_revision,base.dataset_schema_version,
    base.manifest || jsonb_build_object(
      'items', (base.manifest->'items') || (input->'items'),
      'files', (base.manifest->'files') || jsonb_build_array(
        jsonb_build_object('path', input->>'path', 'kind', 'academic_fixture', 'sha256', input->>'sha')),
      'academic_successor', jsonb_build_object('version', 2, 'base_release_id', base.id,
        'fixture_sha256', input->>'sha', 'vector_provenance', 'copied_from_base')),
    base.pipeline_config,base.embedding_config_id)
  RETURNING id INTO successor;
  INSERT INTO banuchat.ingestion_runs (dataset_release_id,attempt_no,workflow_ref,trigger_type)
    VALUES (successor,1,'cloud-01a-2-academic-successor','manual') RETURNING id INTO run;

  CREATE TEMP TABLE cloud_versions (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  INSERT INTO pg_temp.cloud_versions SELECT id,gen_random_uuid() FROM banuchat.document_versions
    WHERE dataset_release_id = base.id;
  INSERT INTO banuchat.document_versions
    (id,dataset_id,dataset_release_id,document_id,version_label,title,source_path,source_locator,
     source_sha256,content_sha256,mime_type,processing_status,ingestion_run_id)
  SELECT m.new_id,v.dataset_id,successor,v.document_id,v.version_label,v.title,v.source_path,
    v.source_locator,v.source_sha256,v.content_sha256,v.mime_type,v.processing_status,run
  FROM banuchat.document_versions v JOIN pg_temp.cloud_versions m ON m.old_id = v.id;
  INSERT INTO banuchat.document_chunks
    (dataset_release_id,document_version_id,ordinal,content,locator,page_start,page_end,
     embedding,embedding_generated_at,generation_run_id)
  SELECT successor,m.new_id,c.ordinal,c.content,c.locator,c.page_start,c.page_end,
    c.embedding,clock_timestamp(),run
  FROM banuchat.document_chunks c JOIN pg_temp.cloud_versions m ON m.old_id = c.document_version_id;

  FOR mapping IN SELECT * FROM (VALUES
    ('courses','course_key,name,description,status'),
    ('announcements','announcement_key,title,description,valid_from,valid_until'),
    ('calendar_events','event_key,title,event_type,starts_at,ends_at,description,course_key,announcement_key'),
    ('synthetic_profiles','profile_key,alias'),
    ('profile_courses','profile_key,course_key,status,progress_percent,started_at,completed_at')
  ) AS tables(relation, fields) LOOP
    EXECUTE format('INSERT INTO banuchat.%I(dataset_release_id,%s,source_path,source_locator,source_sha256)
      SELECT $1,%s,source_path,source_locator,source_sha256 FROM banuchat.%I WHERE dataset_release_id=$2',
      mapping.relation,mapping.fields,mapping.fields,mapping.relation) USING successor,base.id;
  END LOOP;
  INSERT INTO banuchat.synthetic_profiles
    (dataset_release_id,profile_key,alias,source_path,source_locator,source_sha256)
  SELECT successor,p.value->>'profile_key',p.value->>'alias',input->>'path',
    '/profiles/' || (p.ordinality-1),input->>'sha'
  FROM jsonb_array_elements(f->'profiles') WITH ORDINALITY p;
  INSERT INTO banuchat.profile_courses
    (dataset_release_id,profile_key,course_key,status,progress_percent,started_at,completed_at,
     source_path,source_locator,source_sha256)
  SELECT successor,p.value->>'profile_key',p.value->>'course_key',p.value->>'status',
    (p.value->>'progress_percent')::numeric,(p.value->>'started_at')::timestamptz,
    (p.value->>'completed_at')::timestamptz,input->>'path','/progress/' || (p.ordinality-1),input->>'sha'
  FROM jsonb_array_elements(f->'progress') WITH ORDINALITY p;

  FOR mapping IN SELECT * FROM (VALUES
    ('programs','program_key,name'),
    ('periods','period_key,label'),
    ('students','profile_key,academic_id,given_name,family_name,email,program_key,current_semester,current_period_key'),
    ('course_attempts','profile_key,course_key,attempt_number,period_key,outcome,grade_percent')
  ) AS tables(relation, fields) LOOP
    EXECUTE format('CREATE TRIGGER cloud_academic_guard BEFORE INSERT OR UPDATE OR DELETE ON
      banuchat_academic.%I FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write()',mapping.relation);
    EXECUTE format('INSERT INTO banuchat_academic.%I(dataset_release_id,%s)
      SELECT $1,%s FROM jsonb_populate_recordset(NULL::banuchat_academic.%I,$2)',
      mapping.relation,mapping.fields,mapping.fields,mapping.relation)
      USING successor,f->mapping.relation;
  END LOOP;
  IF (SELECT count(*) FROM banuchat_academic.students WHERE dataset_release_id = successor) <> 32
     OR (SELECT count(*) FROM banuchat_academic.course_attempts WHERE dataset_release_id = successor) <> 62
  THEN RAISE EXCEPTION 'CLOUD-01A.2: cohorte incompleta'; END IF;

  INSERT INTO banuchat_auth.profile_binding_versions
    (principal_id,dataset_id,dataset_release_id,profile_key)
  SELECT principal_id,dataset_id,successor,profile_key FROM banuchat_auth.profile_binding_versions
    WHERE dataset_release_id = base.id;
  INSERT INTO banuchat.ingestion_items
    (dataset_release_id,ingestion_run_id,source_kind,record_key,source_path,source_locator,
     source_sha256,document_version_id,status,finished_at)
  SELECT successor,run,r.source_kind::banuchat.source_kind,r.record_key,r.source_path,r.source_locator,
    r.source_sha256,r.document_version_id,'processed',clock_timestamp()
  FROM banuchat.release_records(successor) r;
  UPDATE banuchat.ingestion_runs SET status = 'succeeded', finished_at = clock_timestamp() WHERE id = run;
  PERFORM banuchat.publish_release(successor);
END
$publish$;

-- Only the auth executor may read raw academic tables. No caller-supplied identity.
GRANT USAGE ON SCHEMA banuchat_academic TO banuchat_auth_executor;
GRANT SELECT ON ALL TABLES IN SCHEMA banuchat_academic TO banuchat_auth_executor;
CREATE FUNCTION banuchat_academic.read_me(access_token text)
RETURNS TABLE(student jsonb, attempts jsonb)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $read$
  SELECT to_jsonb(s) - 'dataset_release_id', COALESCE((
    SELECT jsonb_agg(to_jsonb(a) - 'dataset_release_id' - 'profile_key'
      ORDER BY a.course_key,a.attempt_number)
    FROM banuchat_academic.course_attempts a
    WHERE (a.dataset_release_id,a.profile_key) = (s.dataset_release_id,s.profile_key)
  ), '[]'::jsonb)
  FROM banuchat_auth.resource_context(access_token,NULL,true,false) ctx
  JOIN banuchat_academic.students s
    ON s.dataset_release_id = ctx.release_id AND s.profile_key = ctx.profile_key;
$read$;
GRANT CREATE ON SCHEMA banuchat_academic TO banuchat_auth_executor;
ALTER FUNCTION banuchat_academic.read_me(text) OWNER TO banuchat_auth_executor;
REVOKE CREATE ON SCHEMA banuchat_academic FROM banuchat_auth_executor;
REVOKE ALL ON FUNCTION banuchat_academic.read_me(text) FROM PUBLIC;
DO $grant$
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA banuchat_academic TO %I',
    current_setting('banuchat_auth.runtime_role'));
  EXECUTE format('GRANT EXECUTE ON FUNCTION banuchat_academic.read_me(text) TO %I',
    current_setting('banuchat_auth.runtime_role'));
END
$grant$;
