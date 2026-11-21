-- Run inside the transaction emitted by build-academic-catalog.mjs.
DO $publish$
DECLARE
  input jsonb := current_setting('banuchat_cloud.academic_catalog')::jsonb;
  fixture jsonb := input->'fixture';
  course_source jsonb := input->'files'->1;
  calendar_source jsonb := input->'files'->2;
  base banuchat.dataset_releases%ROWTYPE;
  successor uuid;
  ingestion_run uuid;
  mapping record;
  replacement_items jsonb;
BEGIN
  IF NOT pg_try_advisory_xact_lock(1111576149, 1) THEN
    RAISE EXCEPTION 'Ya hay un escritor en el dataset sintético';
  END IF;
  SELECT r.* INTO STRICT base
  FROM banuchat.datasets d
  JOIN banuchat.dataset_releases r ON r.id = d.current_release_id AND r.dataset_id = d.id
  WHERE d.id = 1 AND d.name = 'banuchat-synthetic'
  FOR UPDATE OF d;

  IF base.status <> 'ready'
    OR base.manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb
    OR base.id IS DISTINCT FROM (input->>'base_id')::uuid
    OR base.manifest_sha256 IS DISTINCT FROM input->>'base_sha256'
    OR (SELECT count(*) FROM banuchat_academic.students WHERE dataset_release_id = base.id) <> 32
    OR (SELECT count(*) FROM banuchat_academic.course_attempts WHERE dataset_release_id = base.id) <> 62
    OR EXISTS (
      SELECT 1 FROM banuchat.calendar_events
      WHERE dataset_release_id = base.id AND course_key IN ('course-001','course-002')
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(fixture->'calendar_events') e
          WHERE e->>'event_key' = calendar_events.event_key AND e->>'course_key' = calendar_events.course_key
        )
    )
  THEN
    RAISE EXCEPTION 'Release de origen o cohorte distinta del inventario revisado';
  END IF;

  SELECT jsonb_agg(jsonb_build_object('kind', kind, 'key', record_key,
      'path', source->>'path', 'locator', locator, 'sha256', source->>'sha256') ORDER BY kind, locator)
  INTO replacement_items
  FROM (
    SELECT 'course' kind, value->>'course_key' record_key, '/' || (ordinality-1) locator, course_source source
    FROM jsonb_array_elements(fixture->'courses') WITH ORDINALITY
    UNION ALL
    SELECT 'calendar_event', value->>'event_key', '/' || (ordinality-1), calendar_source
    FROM jsonb_array_elements(fixture->'calendar_events') WITH ORDINALITY
  ) updates;

  INSERT INTO banuchat.dataset_releases
      (dataset_id, git_revision, dataset_schema_version, manifest, pipeline_config, embedding_config_id)
  VALUES (base.dataset_id, input->>'git_revision', base.dataset_schema_version,
    base.manifest || jsonb_build_object(
      'items', (SELECT jsonb_agg(old.value ORDER BY old.ordinality)
        FROM jsonb_array_elements(base.manifest->'items') WITH ORDINALITY old
        WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(replacement_items) new
          WHERE (new->>'kind', new->>'key') = (old.value->>'kind', old.value->>'key')))
        || replacement_items,
      'files', (base.manifest->'files') || (input->'files'),
      'academic_catalog', jsonb_build_object('base_release_id', base.id,
        'catalog_sha256', input->'files'->0->>'sha256', 'vector_provenance', 'copied_from_base')),
    base.pipeline_config, base.embedding_config_id)
  RETURNING id INTO successor;

  INSERT INTO banuchat.ingestion_runs (dataset_release_id, attempt_no, workflow_ref, trigger_type)
  VALUES (successor, 1, 'cloud-academic-catalog-2026', 'manual') RETURNING id INTO ingestion_run;

  CREATE TEMP TABLE academic_catalog_versions (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  INSERT INTO pg_temp.academic_catalog_versions
  SELECT id, gen_random_uuid() FROM banuchat.document_versions WHERE dataset_release_id = base.id;
  INSERT INTO banuchat.document_versions (id, dataset_id, dataset_release_id, document_id,
    version_label, title, source_path, source_locator, source_sha256, content_sha256, mime_type,
    processing_status, ingestion_run_id)
  SELECT m.new_id, v.dataset_id, successor, v.document_id, v.version_label, v.title,
    v.source_path, v.source_locator, v.source_sha256, v.content_sha256, v.mime_type,
    v.processing_status, ingestion_run
  FROM banuchat.document_versions v JOIN pg_temp.academic_catalog_versions m ON m.old_id = v.id;
  INSERT INTO banuchat.document_chunks (dataset_release_id, document_version_id, ordinal,
    content, locator, page_start, page_end, embedding, embedding_generated_at, generation_run_id)
  SELECT successor, m.new_id, c.ordinal, c.content, c.locator, c.page_start, c.page_end,
    c.embedding, clock_timestamp(), ingestion_run
  FROM banuchat.document_chunks c JOIN pg_temp.academic_catalog_versions m ON m.old_id = c.document_version_id;

  INSERT INTO banuchat.courses (dataset_release_id, course_key, name, description, status,
    source_path, source_locator, source_sha256)
  SELECT successor, c.course_key, c.name, c.description, c.status, c.source_path, c.source_locator, c.source_sha256
  FROM banuchat.courses c WHERE c.dataset_release_id = base.id
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(fixture->'courses') f WHERE f->>'course_key' = c.course_key);
  INSERT INTO banuchat.courses
    (dataset_release_id, course_key, name, description, status, source_path, source_locator, source_sha256)
  SELECT successor, value->>'course_key', value->>'name', value->>'description', value->>'status',
    course_source->>'path', '/' || (ordinality-1), course_source->>'sha256'
  FROM jsonb_array_elements(fixture->'courses') WITH ORDINALITY;

  FOR mapping IN SELECT * FROM (VALUES
    ('announcements', 'announcement_key,title,description,valid_from,valid_until'),
    ('synthetic_profiles', 'profile_key,alias'),
    ('profile_courses', 'profile_key,course_key,status,progress_percent,started_at,completed_at')
  ) AS copies(relation, fields) LOOP
    EXECUTE format('INSERT INTO banuchat.%I(dataset_release_id,%s,source_path,source_locator,source_sha256)
      SELECT $1,%s,source_path,source_locator,source_sha256 FROM banuchat.%I WHERE dataset_release_id=$2',
      mapping.relation, mapping.fields, mapping.fields, mapping.relation) USING successor, base.id;
  END LOOP;

  INSERT INTO banuchat.calendar_events (dataset_release_id,event_key,title,event_type,starts_at,ends_at,
    description,course_key,announcement_key,source_path,source_locator,source_sha256)
  SELECT successor, e.event_key, COALESCE(f.value->>'title', e.title), e.event_type, e.starts_at, e.ends_at,
    COALESCE(f.value->>'description', e.description), e.course_key, e.announcement_key,
    COALESCE(CASE WHEN f.ordinality IS NOT NULL THEN calendar_source->>'path' END, e.source_path),
    COALESCE('/' || (f.ordinality-1), e.source_locator),
    COALESCE(CASE WHEN f.ordinality IS NOT NULL THEN calendar_source->>'sha256' END, e.source_sha256)
  FROM banuchat.calendar_events e LEFT JOIN LATERAL jsonb_array_elements(fixture->'calendar_events')
    WITH ORDINALITY f ON f.value->>'event_key' = e.event_key AND f.value->>'course_key' = e.course_key
  WHERE e.dataset_release_id = base.id;

  INSERT INTO banuchat_academic.programs (dataset_release_id, program_key, name)
  SELECT successor, x.program_key, x.name FROM banuchat_academic.programs p
  JOIN jsonb_to_recordset(fixture->'programs') x(program_key text,name text) USING (program_key)
  WHERE p.dataset_release_id = base.id;
  INSERT INTO banuchat_academic.periods (dataset_release_id, period_key, label)
  SELECT successor, x.period_key, x.label FROM banuchat_academic.periods p
  JOIN jsonb_to_recordset(fixture->'periods') x(period_key text,label text) USING (period_key)
  WHERE p.dataset_release_id = base.id;
  INSERT INTO banuchat_academic.students (dataset_release_id,profile_key,academic_id,given_name,
    family_name,email,program_key,current_semester,current_period_key)
  SELECT successor,profile_key,academic_id,given_name,family_name,email,program_key,current_semester,current_period_key
  FROM banuchat_academic.students WHERE dataset_release_id = base.id;
  INSERT INTO banuchat_academic.course_attempts
    (dataset_release_id,profile_key,course_key,attempt_number,period_key,outcome,grade_percent)
  SELECT successor,profile_key,course_key,attempt_number,period_key,outcome,grade_percent
  FROM banuchat_academic.course_attempts WHERE dataset_release_id = base.id;
  INSERT INTO banuchat_auth.profile_binding_versions
    (principal_id,dataset_id,dataset_release_id,profile_key,approved_at)
  SELECT principal_id,dataset_id,successor,profile_key,approved_at
  FROM banuchat_auth.profile_binding_versions WHERE dataset_release_id = base.id;

  FOR mapping IN SELECT * FROM (VALUES
    ('banuchat_academic','students'), ('banuchat_academic','course_attempts'),
    ('banuchat','profile_courses'), ('banuchat','synthetic_profiles'),
    ('banuchat_auth','profile_binding_versions')
  ) AS preserved(schema_name, relation) LOOP
    DECLARE matches boolean;
    BEGIN
      EXECUTE format('SELECT NOT EXISTS (
        (SELECT to_jsonb(t)-''dataset_release_id'' FROM %I.%I t WHERE dataset_release_id=$1)
        EXCEPT
        (SELECT to_jsonb(t)-''dataset_release_id'' FROM %I.%I t WHERE dataset_release_id=$2)
        UNION ALL
        ((SELECT to_jsonb(t)-''dataset_release_id'' FROM %I.%I t WHERE dataset_release_id=$2)
        EXCEPT
        (SELECT to_jsonb(t)-''dataset_release_id'' FROM %I.%I t WHERE dataset_release_id=$1))
      )', mapping.schema_name, mapping.relation, mapping.schema_name, mapping.relation,
      mapping.schema_name, mapping.relation, mapping.schema_name, mapping.relation)
      INTO matches USING base.id, successor;
      IF NOT matches THEN
        RAISE EXCEPTION 'Los registros preservados difieren en %', mapping.relation;
      END IF;
    END;
  END LOOP;

  INSERT INTO banuchat.ingestion_items (dataset_release_id,ingestion_run_id,source_kind,record_key,
    source_path,source_locator,source_sha256,document_version_id,status,finished_at)
  SELECT successor,ingestion_run,r.source_kind::banuchat.source_kind,r.record_key,r.source_path,
    r.source_locator,r.source_sha256,r.document_version_id,'processed',clock_timestamp()
  FROM banuchat.release_records(successor) r;
  UPDATE banuchat.ingestion_runs SET status = 'succeeded', finished_at = clock_timestamp()
  WHERE id = ingestion_run;
  PERFORM banuchat.publish_release(successor);
END
$publish$;
