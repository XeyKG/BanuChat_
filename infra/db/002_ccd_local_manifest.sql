-- BCH-03: exclusivamente banuchat_ccd_dev, después de 001 y ANTES de cargar datos.
-- No cambia la migración histórica ni introduce multidataset.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'banuchat_ccd_dev'
     OR EXISTS (SELECT 1 FROM banuchat.datasets)
     OR EXISTS (SELECT 1 FROM banuchat.dataset_releases) THEN
    RAISE EXCEPTION 'CCD migration requires the empty isolated CCD database';
  END IF;
END $$;

ALTER FUNCTION banuchat.validate_manifest(jsonb) RENAME TO validate_synthetic_manifest_v1;

CREATE FUNCTION banuchat.validate_ccd_manifest(m jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, banuchat, pg_temp AS $$
DECLARE c jsonb; s jsonb; u jsonb; i jsonb; expected_c jsonb; expected_cell text;
  checked_hash banuchat.sha256_hex;
BEGIN
  c := m #> '{ccd_provenance,corpus}';
  IF (jsonb_typeof(m) = 'object' AND m->'synthetic' = 'false'::jsonb
      AND m->>'corpus_kind' = 'ccd_local' AND m->>'dataset_key' = 'banuchat-ccd-local'
      AND m->>'schema_version' = 'ccd-1.0.0' AND m->>'timezone' = 'America/Bogota'
      AND jsonb_typeof(m->'items') = 'array' AND jsonb_typeof(m->'files') = 'array'
      AND jsonb_typeof(c) = 'object' AND c->'synthetic' = 'false'::jsonb
      AND c->>'schema_version' = 'ccd-1.0.0' AND c->>'dataset_key' = 'banuchat-ccd-local'
      AND c->>'version' = m->>'manifest_version' AND c->>'use_scope' = 'local_development_only'
      AND c #>> '{validation,status}' = 'team_validated'
      AND c #> '{validation,institutional_approval}' = 'false'::jsonb
      AND c #>> '{validation,authorization_ref}' = 'BCH-03/incremento-1'
      AND jsonb_typeof(c->'sources') = 'array' AND jsonb_typeof(c->'units') = 'array'
      AND (m #>> '{ccd_provenance,corpus_sha256}') ~ '^[0-9a-f]{64}$'
      AND (m #>> '{ccd_provenance,schema_sha256}') ~ '^[0-9a-f]{64}$') IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid CCD manifest scope or provenance';
  END IF;
  IF jsonb_array_length(m->'items') <> 2 OR jsonb_array_length(m->'files') <> 2
     OR jsonb_array_length(c->'units') <> 2 OR jsonb_array_length(c->'sources') <> 2
     OR (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'sources')) <> 2
     OR (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'units')) <> 2 THEN
    RAISE EXCEPTION 'CCD requires exactly the admitted sources and units';
  END IF;
  FOR s IN SELECT value FROM jsonb_array_elements(c->'sources') LOOP
    IF (s->>'id' IN ('DOC-110','BCH01-CIERRE') AND (s->>'sha256') ~ '^[0-9a-f]{64}$'
        AND length(btrim(s->>'path')) > 0 AND (s->>'path') !~ '(^/|[\\:]|(^|/)\.\.(/|$))') IS NOT TRUE THEN
      RAISE EXCEPTION 'Invalid CCD source';
    END IF;
    checked_hash := s->>'sha256';
  END LOOP;
  FOR u IN SELECT value FROM jsonb_array_elements(c->'units') LOOP
    IF u->>'id' = 'ccd-m01' THEN
      expected_c := '["C04","C07"]'; expected_cell := '02_Respuestas_6!D2';
      IF u->>'group' IS DISTINCT FROM 'M01' THEN RAISE EXCEPTION 'Invalid CCD group'; END IF;
    ELSIF u->>'id' = 'ccd-m12' THEN
      expected_c := '["C44","C45"]'; expected_cell := '02_Respuestas_6!D7';
      IF u->>'group' IS DISTINCT FROM 'M12' THEN RAISE EXCEPTION 'Invalid CCD group'; END IF;
    ELSE RAISE EXCEPTION 'Unadmitted CCD unit'; END IF;
    IF (u->'c_units' = expected_c AND u->>'period' = '202660'
        AND u->>'retrieval_mode' = 'chunked' AND length(btrim(u->>'title')) > 0
        AND length(btrim(u->>'content')) > 0 AND length(btrim(u->>'population')) > 0
        AND u->>'editorial_status' = 'team_validated_local_candidate'
        AND u->>'applicability_status' = 'current_applicability_unconfirmed'
        AND jsonb_typeof(u->'limits') = 'array' AND jsonb_typeof(u->'references') = 'array') IS NOT TRUE THEN
      RAISE EXCEPTION 'Invalid CCD unit scope';
    END IF;
    IF jsonb_array_length(u->'limits') = 0 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(u->'limits') l
      WHERE jsonb_typeof(l) <> 'string' OR length(btrim(l #>> '{}')) = 0)
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(u->'references') r
        WHERE r->>'source_id' = 'DOC-110' AND length(btrim(r->>'locator')) > 0)
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(u->'references') r
        WHERE r->>'source_id' = 'BCH01-CIERRE' AND r->>'locator' = expected_cell)
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(u->'references') r
        WHERE (r->>'source_id' IN ('DOC-110','BCH01-CIERRE') AND length(btrim(r->>'locator')) > 0) IS NOT TRUE) THEN
      RAISE EXCEPTION 'Missing CCD limits or documentary references';
    END IF;
    SELECT value INTO i FROM jsonb_array_elements(m->'items')
      WHERE value->>'key' = u->>'id';
    IF (i->>'kind' = 'document' AND i->>'retrieval_mode' = 'chunked' AND i->>'locator' = 'document'
        AND i->>'path' = 'documents/artifacts/' || (u->>'id') || '.md'
        AND (i->>'sha256') ~ '^[0-9a-f]{64}$') IS NOT TRUE
       OR (SELECT count(*) FROM jsonb_array_elements(m->'items') v WHERE v->>'key' = u->>'id') <> 1
       OR (SELECT count(*) FROM jsonb_array_elements(m->'files') f
         WHERE f->>'path' = i->>'path' AND f->>'sha256' = i->>'sha256'
           AND f->>'kind' = 'document_artifact') <> 1 THEN
      RAISE EXCEPTION 'CCD artifact inventory mismatch';
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION banuchat.validate_manifest(p_manifest jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, banuchat, pg_temp AS $$
BEGIN
  IF p_manifest->'synthetic' = 'true'::jsonb THEN
    PERFORM banuchat.validate_synthetic_manifest_v1(p_manifest);
  ELSE
    PERFORM banuchat.validate_ccd_manifest(p_manifest);
  END IF;
END $$;
COMMENT ON COLUMN banuchat.dataset_releases.git_revision IS
  'v1: source Git revision. CCD: code baseline Git revision only; external source identity and executed code hashes are explicit in pipeline_config and ccd_provenance.';
COMMIT;
