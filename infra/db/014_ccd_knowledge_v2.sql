-- Additive canonical CCD v2. No release, pointer, grant or binding mutation.
BEGIN;
DO $$ BEGIN
 IF current_database()<>'banuchat_unified' OR NOT EXISTS(SELECT 1 FROM banuchat_aux.product_config WHERE singleton AND version=1)
 OR NOT EXISTS(SELECT 1 FROM banuchat.datasets WHERE id=1 AND name='banuchat-ccd-local')
 THEN RAISE EXCEPTION 'CCD v2 requires the unified model'; END IF;
 IF to_regprocedure('banuchat.validate_ccd_knowledge_manifest_v2(jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'CCD v2 already installed; inspect instead of replacing'; END IF;
END $$;
CREATE FUNCTION banuchat.validate_ccd_knowledge_manifest_v2(m jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE k jsonb;c jsonb;i jsonb;b jsonb;r jsonb;n integer;
BEGIN
 k:=m->'ccd_knowledge';
 n:=jsonb_array_length(k->'claims');
 IF (m->>'schema_version'='ccd-1.4.0' AND m->>'dataset_key'='banuchat-ccd-local' AND m->'synthetic'='false'::jsonb
 AND m->>'corpus_kind'='ccd_local' AND m->>'timezone'='America/Bogota' AND k->>'schema_version'='ccd-knowledge-2'
 AND (k->>'source_registry_sha256')~'^[a-f0-9]{64}$' AND (k->>'source_review_sha256')~'^[a-f0-9]{64}$'
 AND (k->>'domain_decision_sha256')~'^[a-f0-9]{64}$' AND n>0 AND jsonb_array_length(k->'claims')=n
 AND jsonb_array_length(m->'files')=n AND jsonb_array_length(m->'items')=n
 AND (SELECT count(DISTINCT x->>'claim_id') FROM jsonb_array_elements(k->'claims') x)=n
 AND (SELECT count(DISTINCT x->>'document_key') FROM jsonb_array_elements(k->'claims') x)=n
 AND (SELECT count(DISTINCT x->>'key') FROM jsonb_array_elements(m->'items') x)=n) IS NOT TRUE
 THEN RAISE EXCEPTION 'Invalid CCD knowledge inventory'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(k->'claims') LOOP
  IF (c->>'reference_status'='adopted' AND length(btrim(c->>'claim_id'))>0 AND length(btrim(c->>'title'))>0
   AND length(btrim(c->>'statement'))>0 AND length(btrim(c->>'period'))>0 AND length(btrim(c->>'population'))>0
   AND jsonb_typeof(c->'domain_metadata')='object' AND length(btrim(c->'domain_metadata'->>'entity_type'))>0
   AND c->'domain_metadata'->>'temporal_class' IN ('TIMELESS_WITHIN_SCOPE','CURRENT_GENERAL','YEAR_SCOPED','TERM_SCOPED','HISTORICAL','DYNAMIC','UNKNOWN_TEMPORAL_SCOPE')
   AND jsonb_typeof(c->'domain_metadata'->'current')='boolean'
   AND c->'domain_metadata'->>'source_access_class' IN ('LOCAL_AUTHORIZED','AUTHENTICATED_INSTITUTIONAL','DOMAIN_REFERENCE')
   AND jsonb_typeof(c->'conditions')='array' AND jsonb_typeof(c->'exceptions')='array'
   AND jsonb_array_length(c->'basis')>0 AND jsonb_array_length(c->'presentation_units')>0
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(c->'basis') x WHERE x->>'kind'<>'PENDING_CLARIFICATION')) IS NOT TRUE
  THEN RAISE EXCEPTION 'Invalid adopted CCD reference'; END IF;
  FOR b IN SELECT value FROM jsonb_array_elements(c->'basis') LOOP
   IF (b->>'kind' IN ('DOCUMENT_SOURCE','DOMAIN_CONFIRMATION','INFERENCE','PENDING_CLARIFICATION') AND jsonb_array_length(b->'references')>0) IS NOT TRUE
   THEN RAISE EXCEPTION 'Invalid CCD provenance'; END IF;
   FOR r IN SELECT value FROM jsonb_array_elements(b->'references') LOOP
    IF (b->>'kind'='INFERENCE' AND length(btrim(r->>'operation'))>0 AND length(btrim(r->>'scope'))>0) IS NOT TRUE
    AND (length(btrim(r->>'source'))>0 AND length(btrim(r->>'locator'))>0 AND (r->>'sha256')~'^[a-f0-9]{64}$') IS NOT TRUE
    THEN RAISE EXCEPTION 'Missing CCD source integrity'; END IF;
   END LOOP;
  END LOOP;
  SELECT value INTO i FROM jsonb_array_elements(m->'items') WHERE value->>'key'=c->>'document_key';
  IF (i->>'kind'='document' AND i->>'retrieval_mode'='chunked' AND i->>'path'='documents/artifacts/'||(c->>'document_key')||'.md'
    AND i->>'locator'='document' AND (i->>'sha256')~'^[a-f0-9]{64}$'
    AND (SELECT count(*) FROM jsonb_array_elements(m->'files') f WHERE f->>'path'=i->>'path' AND f->>'sha256'=i->>'sha256' AND f->>'kind'='document_artifact')=1) IS NOT TRUE
  THEN RAISE EXCEPTION 'CCD derivative mismatch'; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION banuchat.validate_ccd_knowledge_manifest_v2(jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION banuchat.validate_ccd_manifest(m jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,banuchat,pg_temp AS $$ BEGIN
 IF m->>'schema_version'='ccd-1.4.0' THEN PERFORM banuchat.validate_ccd_knowledge_manifest_v2(m);
 ELSIF m->>'schema_version'='ccd-1.3.0' THEN PERFORM banuchat.validate_ccd_knowledge_manifest(m);
 ELSIF m->>'schema_version'='ccd-1.2.0' THEN PERFORM banuchat.validate_ccd_guidance_manifest(m);
 ELSIF m->>'schema_version'='ccd-1.1.0' THEN PERFORM banuchat.validate_ccd_expanded_manifest(m);
 ELSE PERFORM banuchat.validate_ccd_manifest_v1(m); END IF;
END $$;

CREATE OR REPLACE FUNCTION banuchat_auth.retrieve_ccd_knowledge_chunks(p_release uuid,p_query public.vector,p_top_k integer,p_keys text[])
RETURNS TABLE(chunk_id uuid,document_version_id uuid,document_id uuid,document_key text,title text,ordinal integer,content text,chunk_locator text,page_start integer,page_end integer,source_path text,source_locator text,source_sha256 text,release_id uuid,cosine_distance double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE current_id uuid;manifest jsonb;
BEGIN
 IF p_release IS NULL OR p_top_k IS NULL OR p_top_k<1 OR p_top_k>20 OR p_query IS NULL OR public.vector_dims(p_query)<>1024
 OR public.vector_norm(p_query)<=0 OR cardinality(p_keys) IS NULL OR cardinality(p_keys)<1
 OR array_position(p_keys,NULL) IS NOT NULL OR (SELECT count(DISTINCT x) FROM unnest(p_keys) x)<>cardinality(p_keys)
 THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid document query'; END IF;
 SELECT r.id,r.manifest INTO current_id,manifest FROM banuchat_auth.runtime_scope s JOIN banuchat.datasets d ON d.id=1 AND d.name='banuchat-ccd-local'
 JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id WHERE s.singleton AND s.database_name=current_database()
 AND s.evidence_mode='ccd_local' AND r.status='ready' AND r.manifest->'synthetic'='false'::jsonb AND r.manifest->>'schema_version' IN ('ccd-1.3.0','ccd-1.4.0');
 IF NOT FOUND OR current_database()<>'banuchat_unified' THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='Document scope rejected'; END IF;
 IF p_release<>current_id THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='Document release changed'; END IF;
 IF cardinality(p_keys)>jsonb_array_length(manifest->'items') OR EXISTS(SELECT 1 FROM unnest(p_keys) x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(manifest->'items') i WHERE i->>'key'=x))
 THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid document query'; END IF;
 RETURN QUERY SELECT dc.id,v.id,v.document_id,d.document_key::text,v.title::text,dc.ordinal,dc.content::text,dc.locator::text,dc.page_start,dc.page_end,
 v.source_path::text,v.source_locator::text,v.source_sha256::text,dc.dataset_release_id,(dc.embedding OPERATOR(public.<=>) p_query)::double precision
 FROM banuchat.document_chunks dc JOIN banuchat.document_versions v ON v.id=dc.document_version_id AND v.dataset_release_id=dc.dataset_release_id
 JOIN banuchat.documents d ON d.id=v.document_id AND d.dataset_id=v.dataset_id
 WHERE dc.dataset_release_id=p_release AND v.processing_status='ready' AND d.retrieval_mode='chunked' AND d.document_key=ANY(p_keys) AND dc.embedding IS NOT NULL
 ORDER BY (dc.embedding OPERATOR(public.<=>) p_query),dc.id LIMIT p_top_k;
END $$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
 WHERE p.oid='banuchat_auth.retrieve_ccd_knowledge_chunks(uuid,public.vector,integer,text[])'::regprocedure
 AND r.rolname='banuchat_ccd_reference_reader' AND NOT(r.rolcanlogin OR r.rolsuper OR r.rolbypassrls)
 AND p.prosecdef AND p.proconfig=ARRAY['search_path=pg_catalog']::text[])
 THEN RAISE EXCEPTION 'CCD retrieval security changed'; END IF;
END $$;
COMMIT;
