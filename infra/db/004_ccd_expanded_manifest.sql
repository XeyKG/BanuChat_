-- Additive contract extension only; existing releases, chats, corpus and validators stay intact.
BEGIN;
DO $$ BEGIN
  IF current_database()<>'banuchat_ccd_dev' OR
    (SELECT count(*) FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
     WHERE d.name='banuchat-ccd-local' AND r.status='ready' AND r.dataset_schema_version='ccd-1.0.0')<>1 THEN
    RAISE EXCEPTION 'CCD expansion requires the isolated published initial CCD release';
  END IF;
END $$;
ALTER FUNCTION banuchat.validate_ccd_manifest(jsonb) RENAME TO validate_ccd_manifest_v1;
CREATE FUNCTION banuchat.validate_ccd_expanded_manifest(m jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,banuchat,pg_temp AS $$
DECLARE c jsonb; u jsonb; i jsonb; s jsonb; src text; grp text; cs jsonb; cell text; period text;
BEGIN
  c:=m#>'{ccd_provenance,corpus}';
  IF (jsonb_typeof(m)='object' AND m->'synthetic'='false'::jsonb AND m->>'corpus_kind'='ccd_local'
    AND m->>'schema_version'='ccd-1.1.0' AND m->>'dataset_key'='banuchat-ccd-local'
    AND m->>'timezone'='America/Bogota' AND jsonb_typeof(m->'items')='array' AND jsonb_typeof(m->'files')='array'
    AND c->>'schema_version'='ccd-1.1.0' AND c->'synthetic'='false'::jsonb
    AND c->>'dataset_key'='banuchat-ccd-local' AND c->>'version'=m->>'manifest_version'
    AND c->>'use_scope'='local_development_only' AND c#>>'{validation,status}'='source_checked_local'
    AND c#>'{validation,institutional_approval}'='false'::jsonb
    AND c#>>'{validation,authorization_ref}'='BCH-03/incremento-4'
    AND (m#>>'{ccd_provenance,corpus_sha256}')~'^[a-f0-9]{64}$'
    AND (m#>>'{ccd_provenance,schema_sha256}')~'^[a-f0-9]{64}$'
    AND jsonb_typeof(c->'sources')='array' AND jsonb_typeof(c->'units')='array') IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid expanded CCD scope';
  END IF;
  IF jsonb_array_length(c->'units')<>10 OR jsonb_array_length(m->'items')<>10 OR jsonb_array_length(m->'files')<>10
    OR jsonb_array_length(c->'sources')<>9
    OR (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'sources'))<>9
    OR (SELECT count(DISTINCT value->>'path') FROM jsonb_array_elements(c->'sources'))<>9
    OR (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'units'))<>10 THEN
    RAISE EXCEPTION 'Expanded CCD must enumerate the admitted units and sources exactly';
  END IF;
  FOR s IN SELECT value FROM jsonb_array_elements(c->'sources') LOOP
    IF (s->>'id' IN ('DOC-110','BCH01-CIERRE','DOC-098','DOC-099','DOC-100','DOC-101','DOC-102','DOC-103','DOC-104')
      AND (s->>'sha256')~'^[a-f0-9]{64}$' AND length(btrim(s->>'path'))>0
      AND (s->>'path')!~'(^/|[\\:]|(^|/)\.\.(/|$))') IS NOT TRUE THEN RAISE EXCEPTION 'Invalid expanded CCD source'; END IF;
  END LOOP;
  FOR u IN SELECT value FROM jsonb_array_elements(c->'units') LOOP
    src:='DOC-110'; period:='202660';
    IF u->>'id'='ccd-m01' THEN grp:='M01'; cs:='["C04","C07"]'; cell:='02_Respuestas_6!D2';
    ELSIF u->>'id'='ccd-m12' THEN grp:='M12'; cs:='["C44","C45"]'; cell:='02_Respuestas_6!D7';
    ELSIF u->>'id'='ccd-tests-overview' THEN grp:='TEST_ORIENTATION'; cs:='["C11"]'; cell:='07_Bloqueos!A3:H3';
    ELSIF (u->>'id')~'^ccd-m02-doc-(098|099|10[0-4])$' THEN
      grp:='M02'; cs:='["C05"]'; cell:='02_Respuestas_6!E3';
      src:=upper(substring(u->>'id' from 9)); period:='Edición entregada; periodo no confirmado';
    ELSE RAISE EXCEPTION 'Unadmitted expanded CCD unit'; END IF;
    IF (u->>'group'=grp AND u->'c_units'=cs AND u->>'period'=period AND u->>'retrieval_mode'='chunked'
      AND u->>'applicability_status'='current_applicability_unconfirmed'
      AND u->>'editorial_status'=CASE WHEN grp IN ('M01','M12') THEN 'team_validated_local_candidate' ELSE 'source_checked_local_candidate' END
      AND length(btrim(u->>'title'))>0 AND length(btrim(u->>'content'))>0 AND length(btrim(u->>'population'))>0
      AND jsonb_typeof(u->'limits')='array' AND jsonb_typeof(u->'references')='array') IS NOT TRUE THEN
      RAISE EXCEPTION 'Invalid expanded CCD unit conditions';
    END IF;
    IF jsonb_array_length(u->'limits')=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(u->'limits') l
      WHERE jsonb_typeof(l)<>'string' OR length(btrim(l#>>'{}'))=0) THEN RAISE EXCEPTION 'Missing CCD limits'; END IF;
    IF grp='M02' THEN
      IF jsonb_typeof(u->'topics') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Missing syllabus topics'; END IF;
      IF jsonb_array_length(u->'topics')<2 OR EXISTS(SELECT 1 FROM jsonb_array_elements(u->'topics') t
        WHERE jsonb_typeof(t)<>'string' OR length(btrim(t#>>'{}'))=0) THEN RAISE EXCEPTION 'Invalid syllabus topics'; END IF;
    ELSIF u?'topics' THEN RAISE EXCEPTION 'Topics belong only to M02'; END IF;
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(u->'references') r WHERE r->>'source_id'=src AND length(btrim(r->>'locator'))>0)
      OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(u->'references') r WHERE r->>'source_id'='BCH01-CIERRE' AND r->>'locator'=cell)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(u->'references') r WHERE length(btrim(r->>'locator')) IS NULL
        OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c->'sources') source_record WHERE source_record->>'id'=r->>'source_id')) THEN
      RAISE EXCEPTION 'Missing expanded CCD documentary references';
    END IF;
    SELECT value INTO i FROM jsonb_array_elements(m->'items') WHERE value->>'key'=u->>'id';
    IF (i->>'kind'='document' AND i->>'retrieval_mode'='chunked' AND i->>'locator'='document'
      AND i->>'path'='documents/artifacts/'||(u->>'id')||'.md' AND (i->>'sha256')~'^[a-f0-9]{64}$') IS NOT TRUE
      OR (SELECT count(*) FROM jsonb_array_elements(m->'items') v WHERE v->>'key'=u->>'id')<>1
      OR (SELECT count(*) FROM jsonb_array_elements(m->'files') f WHERE f->>'path'=i->>'path'
        AND f->>'sha256'=i->>'sha256' AND f->>'kind'='document_artifact')<>1 THEN
      RAISE EXCEPTION 'Expanded CCD inventory mismatch';
    END IF;
  END LOOP;
END $$;
CREATE FUNCTION banuchat.validate_ccd_manifest(m jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,banuchat,pg_temp AS $$ BEGIN
  IF m->>'schema_version'='ccd-1.1.0' THEN PERFORM banuchat.validate_ccd_expanded_manifest(m);
  ELSE PERFORM banuchat.validate_ccd_manifest_v1(m); END IF;
END $$;
CREATE OR REPLACE FUNCTION banuchat.validate_manifest(p_manifest jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,banuchat,pg_temp AS $$ BEGIN
  IF p_manifest->'synthetic'='true'::jsonb THEN PERFORM banuchat.validate_synthetic_manifest_v1(p_manifest);
  ELSE PERFORM banuchat.validate_ccd_manifest(p_manifest); END IF;
END $$;
COMMIT;
