-- Additive CCD-only admission of U03/U04; historical and synthetic validators remain intact.
BEGIN;
DO $$ BEGIN
  IF current_database()<>'banuchat_ccd_dev' OR
    (SELECT count(*) FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id
     WHERE d.name='banuchat-ccd-local' AND r.status='ready' AND r.dataset_schema_version='ccd-1.1.0')<>1 THEN
    RAISE EXCEPTION 'CCD guidance requires the isolated expanded predecessor';
  END IF;
END $$;
CREATE FUNCTION banuchat.validate_ccd_guidance_manifest(m jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,banuchat,pg_temp AS $$
DECLARE c jsonb; base jsonb; u jsonb; i jsonb; s jsonb; grp text; src text; cs jsonb; cell text; period text; refs jsonb;
BEGIN
  c:=m#>'{ccd_provenance,corpus}';
  IF (m->>'schema_version'='ccd-1.2.0' AND c->>'schema_version'='ccd-1.2.0'
    AND c#>>'{validation,authorization_ref}'='BCH-03/incremento-5'
    AND (c#>>'{validation,review_package_sha256}')~'^[a-f0-9]{64}$'
    AND jsonb_array_length(c->'units')=12 AND jsonb_array_length(m->'items')=12
    AND jsonb_array_length(m->'files')=12 AND jsonb_array_length(c->'sources')=11
    AND (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'units'))=12
    AND (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(c->'sources'))=11
    AND (SELECT count(DISTINCT value->>'path') FROM jsonb_array_elements(c->'sources'))=11) IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid CCD guidance scope';
  END IF;
  -- Validate the unchanged ten-unit projection using the frozen expanded validator.
  -- This is a validation-only copy, never written as provenance or a release.
  base:=jsonb_set(m,'{schema_version}','"ccd-1.1.0"');
  base:=jsonb_set(base,'{ccd_provenance,corpus,schema_version}','"ccd-1.1.0"');
  base:=jsonb_set(base,'{ccd_provenance,corpus,validation,authorization_ref}','"BCH-03/incremento-4"');
  base:=jsonb_set(base,'{ccd_provenance,corpus,units}',(SELECT jsonb_agg(value) FROM jsonb_array_elements(c->'units') WHERE value->>'id' NOT IN ('ccd-u03','ccd-u04')));
  base:=jsonb_set(base,'{ccd_provenance,corpus,sources}',(SELECT jsonb_agg(value) FROM jsonb_array_elements(c->'sources') WHERE value->>'id' NOT IN ('DOC-116','DOC-076')));
  base:=jsonb_set(base,'{items}',(SELECT jsonb_agg(value) FROM jsonb_array_elements(m->'items') WHERE value->>'key' NOT IN ('ccd-u03','ccd-u04')));
  base:=jsonb_set(base,'{files}',(SELECT jsonb_agg(value) FROM jsonb_array_elements(m->'files') WHERE value->>'path' NOT IN ('documents/artifacts/ccd-u03.md','documents/artifacts/ccd-u04.md')));
  PERFORM banuchat.validate_ccd_expanded_manifest(base);
  FOR s IN SELECT value FROM jsonb_array_elements(c->'sources') WHERE value->>'id' IN ('DOC-116','DOC-076') LOOP
    IF ((s->>'sha256')~'^[a-f0-9]{64}$' AND length(btrim(s->>'path'))>0
      AND (s->>'path')!~'(^/|[\\:]|(^|/)\.\.(/|$))') IS NOT TRUE THEN RAISE EXCEPTION 'Invalid guidance source'; END IF;
  END LOOP;
  FOR grp IN SELECT unnest(ARRAY['U03','U04']) LOOP
    SELECT value INTO u FROM jsonb_array_elements(c->'units') WHERE value->>'id'=CASE grp WHEN 'U03' THEN 'ccd-u03' ELSE 'ccd-u04' END;
    src:=CASE grp WHEN 'U03' THEN 'DOC-110' ELSE 'DOC-116' END;
    cs:=CASE grp WHEN 'U03' THEN '["C53"]'::jsonb ELSE '["C09","C10"]'::jsonb END;
    cell:=CASE grp WHEN 'U03' THEN '01_Admision_M01_M12!F5' ELSE '01_Admision_M01_M12!F11' END;
    period:=CASE grp WHEN 'U03' THEN '202660' ELSE 'Transición 202560–202610; actualidad no confirmada' END;
    refs:=CASE grp WHEN 'U03' THEN '["R07"]'::jsonb ELSE '["R12","R13","R14","R15","R16","R17","R18"]'::jsonb END;
    IF (u->>'group'=grp AND u->'c_units'=cs AND u->>'period'=period AND u->'scenario_refs'=refs
      AND u->>'retrieval_mode'='chunked' AND u->>'applicability_status'='current_applicability_unconfirmed'
      AND u->>'editorial_status'='source_checked_local_candidate'
      AND length(btrim(u->>'title'))>0 AND length(btrim(u->>'population'))>0 AND length(btrim(u->>'content'))>0
      AND jsonb_typeof(u->'limits')='array' AND jsonb_typeof(u->'references')='array' AND NOT u?'topics') IS NOT TRUE THEN
      RAISE EXCEPTION 'Invalid guidance unit';
    END IF;
    IF jsonb_array_length(u->'limits')<1 OR EXISTS(SELECT 1 FROM jsonb_array_elements(u->'limits') l WHERE jsonb_typeof(l)<>'string' OR length(btrim(l#>>'{}'))=0)
      OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(u->'references') r WHERE r->>'source_id'=src AND length(btrim(r->>'locator'))>0)
      OR (grp='U04' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(u->'references') r WHERE r->>'source_id'='DOC-076'))
      OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(u->'references') r WHERE r->>'source_id'='BCH01-CIERRE' AND r->>'locator'=cell)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(u->'references') r WHERE length(btrim(r->>'locator')) IS NULL
        OR length(btrim(r->>'locator'))=0 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c->'sources') x WHERE x->>'id'=r->>'source_id')) THEN
      RAISE EXCEPTION 'Missing guidance limits or references';
    END IF;
    SELECT value INTO i FROM jsonb_array_elements(m->'items') WHERE value->>'key'=u->>'id';
    IF (i->>'kind'='document' AND i->>'retrieval_mode'='chunked' AND i->>'locator'='document'
      AND i->>'path'='documents/artifacts/'||(u->>'id')||'.md' AND (i->>'sha256')~'^[a-f0-9]{64}$') IS NOT TRUE
      OR (SELECT count(*) FROM jsonb_array_elements(m->'files') f WHERE f->>'path'=i->>'path'
        AND f->>'sha256'=i->>'sha256' AND f->>'kind'='document_artifact')<>1 THEN RAISE EXCEPTION 'Guidance inventory mismatch'; END IF;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION banuchat.validate_ccd_manifest(m jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,banuchat,pg_temp AS $$ BEGIN
  IF m->>'schema_version'='ccd-1.2.0' THEN PERFORM banuchat.validate_ccd_guidance_manifest(m);
  ELSIF m->>'schema_version'='ccd-1.1.0' THEN PERFORM banuchat.validate_ccd_expanded_manifest(m);
  ELSE PERFORM banuchat.validate_ccd_manifest_v1(m); END IF;
END $$;
COMMIT;
