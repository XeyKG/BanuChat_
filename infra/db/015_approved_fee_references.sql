-- Six explicitly approved CCD derivatives. No historical migration is rewritten.
-- Run in a transaction after checking target identity. Data are loaded separately.
DO $$ BEGIN
 IF to_regnamespace('banuchat_reference') IS NOT NULL THEN RAISE EXCEPTION 'Reference schema collision'; END IF;
 IF to_regclass('banuchat_auth.runtime_scope') IS NULL THEN RAISE EXCEPTION 'Missing authenticated scope'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='banuchat_auth_executor' AND NOT(rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole))
 THEN RAISE EXCEPTION 'Unsafe reference executor'; END IF;
END $$;
CREATE SCHEMA banuchat_reference;
REVOKE ALL ON SCHEMA banuchat_reference FROM PUBLIC;
CREATE TABLE banuchat_reference.releases(
 id uuid PRIMARY KEY,deployment_id uuid NOT NULL,manifest jsonb NOT NULL,
 manifest_sha256 text GENERATED ALWAYS AS (banuchat.jsonb_sha256(manifest)) STORED,
 enabled boolean NOT NULL DEFAULT false,
 CHECK(manifest->>'schema_version'='banuchat-approved-fees-1' AND manifest->'synthetic'='false'::jsonb
 AND jsonb_array_length(manifest->'documents')=6)
);
CREATE TABLE banuchat_reference.documents(
 release_id uuid NOT NULL REFERENCES banuchat_reference.releases(id),id uuid NOT NULL,chunk_id uuid NOT NULL UNIQUE,
 document_id uuid NOT NULL,document_key text NOT NULL,title text NOT NULL,content text NOT NULL,locator text NOT NULL,
 artifact text NOT NULL,source_sha256 text GENERATED ALWAYS AS (banuchat.text_sha256(artifact)) STORED,
 embedding public.vector(1024) NOT NULL,
 PRIMARY KEY(release_id,id),UNIQUE(id),UNIQUE(release_id,document_key),CHECK(public.vector_norm(embedding)>0),
 CHECK(length(title)>0 AND length(content)>0 AND length(locator)>0),
 CHECK(artifact LIKE 'Procedencia: CCD seleccionado para demostración; sin aval institucional.%')
);
CREATE TABLE banuchat_reference.turn_sources(
 message_id uuid NOT NULL REFERENCES banuchat.messages(id) ON DELETE CASCADE,citation_index integer NOT NULL CHECK(citation_index>=0),
 release_id uuid NOT NULL,document_version_id uuid NOT NULL,record jsonb NOT NULL,
 PRIMARY KEY(message_id,citation_index),FOREIGN KEY(release_id,document_version_id) REFERENCES banuchat_reference.documents(release_id,id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA banuchat_reference FROM PUBLIC;
ALTER TABLE banuchat_reference.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE banuchat_reference.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE banuchat_reference.turn_sources ENABLE ROW LEVEL SECURITY;
-- Existing executor is a non-login, non-bypass role. Its only new writes are citations.
GRANT USAGE ON SCHEMA banuchat_reference TO banuchat_auth_executor;
GRANT SELECT ON ALL TABLES IN SCHEMA banuchat_reference TO banuchat_auth_executor;
GRANT INSERT ON banuchat_reference.turn_sources TO banuchat_auth_executor;
CREATE POLICY executor_read_releases ON banuchat_reference.releases FOR SELECT TO banuchat_auth_executor USING(true);
CREATE POLICY executor_read_documents ON banuchat_reference.documents FOR SELECT TO banuchat_auth_executor USING(true);
CREATE POLICY executor_read_sources ON banuchat_reference.turn_sources FOR SELECT TO banuchat_auth_executor USING(true);
CREATE POLICY executor_write_sources ON banuchat_reference.turn_sources FOR INSERT TO banuchat_auth_executor WITH CHECK(true);

CREATE FUNCTION banuchat_reference.context(p_release uuid) RETURNS TABLE(manifest jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT r.manifest FROM banuchat_reference.releases r JOIN banuchat_auth.runtime_scope s ON s.singleton
 AND s.deployment_id=r.deployment_id AND s.database_name=current_database()
 WHERE r.id=p_release AND r.enabled AND (SELECT count(*) FROM banuchat_reference.documents d WHERE d.release_id=r.id)=6
 AND NOT EXISTS(SELECT 1 FROM banuchat_reference.documents d LEFT JOIN LATERAL
  (SELECT x FROM jsonb_array_elements(r.manifest->'documents') x WHERE x->>'document_key'=d.document_key) m ON true
  WHERE d.release_id=r.id AND (m.x IS NULL OR m.x->>'id' IS DISTINCT FROM d.id::text OR m.x->>'source_sha256' IS DISTINCT FROM d.source_sha256
   OR m.x->>'original_chunk_sha256' IS DISTINCT FROM encode(sha256(convert_to(d.content,'UTF8')),'hex')
   OR m.x->>'embedding_sha256' IS DISTINCT FROM encode(sha256(convert_to(d.embedding::text,'UTF8')),'hex')))
$$;
CREATE FUNCTION banuchat_reference.retrieve(p_release uuid,p_query public.vector,p_top_k integer,p_keys text[])
RETURNS TABLE(chunk_id uuid,document_version_id uuid,document_id uuid,document_key text,title text,ordinal integer,content text,
 chunk_locator text,page_start integer,page_end integer,source_path text,source_locator text,source_sha256 text,release_id uuid,cosine_distance double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM banuchat_reference.context(p_release)) THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='Reference scope rejected'; END IF;
 IF p_top_k IS NULL OR p_top_k<1 OR p_top_k>20 OR p_query IS NULL OR public.vector_dims(p_query)<>1024 OR public.vector_norm(p_query)<=0
 OR cardinality(p_keys) IS NULL OR cardinality(p_keys)<1 OR cardinality(p_keys)>6 OR array_position(p_keys,NULL) IS NOT NULL
 OR (SELECT count(DISTINCT x) FROM unnest(p_keys) x)<>cardinality(p_keys)
 OR EXISTS(SELECT 1 FROM unnest(p_keys) k WHERE NOT EXISTS(SELECT 1 FROM banuchat_reference.documents d WHERE d.release_id=p_release AND d.document_key=k))
 THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid reference query'; END IF;
 RETURN QUERY SELECT d.chunk_id,d.id,d.document_id,d.document_key,d.title,0,d.content,d.locator,NULL::integer,NULL::integer,
 'documents/artifacts/'||d.document_key||'.md',d.locator,d.source_sha256,d.release_id,(d.embedding OPERATOR(public.<=>) p_query)::double precision
 FROM banuchat_reference.documents d WHERE d.release_id=p_release AND d.document_key=ANY(p_keys)
 ORDER BY (d.embedding OPERATOR(public.<=>) p_query),d.id LIMIT p_top_k;
END $$;
CREATE FUNCTION banuchat_reference.artifact(p_token text,p_document uuid,p_release uuid) RETURNS TABLE(artifact text,sha256 text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 PERFORM * FROM banuchat_auth.resource_context(p_token,NULL,false,false);
 RETURN QUERY SELECT d.artifact,d.source_sha256 FROM banuchat_reference.documents d
 JOIN banuchat_reference.releases r ON r.id=d.release_id JOIN banuchat_auth.runtime_scope s ON s.singleton
 AND r.deployment_id=s.deployment_id AND s.database_name=current_database()
 WHERE d.id=p_document AND r.id=p_release AND r.enabled;
END $$;
CREATE FUNCTION banuchat_reference.sources(p_token text,p_conversation uuid) RETURNS TABLE(message_id uuid,citations jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 PERFORM * FROM banuchat_auth.resource_context(p_token,p_conversation,false,false);
 RETURN QUERY SELECT t.message_id,jsonb_agg(jsonb_build_object('index',t.citation_index,'source_kind','document','label',d.title,
 'locator',t.record->>'source_locator','release_id',t.release_id,'document_version_id',d.id,'artifact_url','/api/v1/documents/'||d.id||'/artifact') ORDER BY t.citation_index)
 FROM banuchat_reference.turn_sources t JOIN banuchat.messages m ON m.id=t.message_id AND m.conversation_id=p_conversation
 JOIN banuchat_reference.documents d ON d.id=t.document_version_id AND d.release_id=t.release_id
 GROUP BY t.message_id;
END $$;
CREATE FUNCTION banuchat_reference.persist_turn(p_access_token text,p_conversation uuid,p_release uuid,p_ordinal integer,
 p_user text,p_answer text,p_insufficient boolean,p_citations jsonb)
RETURNS TABLE(status text,user_message_id uuid,user_ordinal integer,user_content banuchat.nonblank,user_created_at banuchat.finite_time,
 assistant_message_id uuid,assistant_ordinal integer,assistant_content banuchat.nonblank,assistant_created_at banuchat.finite_time,assistant_insufficient_evidence boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE e record;d record;t record;
BEGIN
 PERFORM * FROM banuchat_auth.resource_context(p_access_token,p_conversation,true,true);
 IF jsonb_typeof(p_citations) IS DISTINCT FROM 'array' OR jsonb_array_length(p_citations) NOT BETWEEN 1 AND 6 OR octet_length(p_citations::text)>65536
 THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid reference citations'; END IF;
 FOR e IN SELECT value,n FROM jsonb_array_elements(p_citations) WITH ORDINALITY x(value,n) LOOP
  SELECT a.* INTO d FROM banuchat_reference.documents a WHERE a.id=(e.value->>'document_version_id')::uuid
  AND a.release_id=(e.value->>'dataset_release_id')::uuid AND EXISTS(SELECT 1 FROM banuchat_reference.context(a.release_id));
  IF NOT FOUND OR e.value IS DISTINCT FROM jsonb_build_object('citation_index',e.n-1,'dataset_release_id',d.release_id,'source_kind','document',
   'source_path','documents/artifacts/'||d.document_key||'.md','source_locator',d.locator,'source_sha256',d.source_sha256,
   'document_version_id',d.id,'chunk_id',d.chunk_id,'course_key',NULL,'event_key',NULL,'announcement_key',NULL,'profile_key',NULL)
  THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Reference provenance rejected'; END IF;
 END LOOP;
 SELECT * INTO t FROM banuchat_auth.persist_turn(p_access_token,p_conversation,p_release,p_ordinal,p_user,p_answer,p_insufficient,'[]'::jsonb);
 IF t.status='inserted' THEN
  INSERT INTO banuchat_reference.turn_sources(message_id,citation_index,release_id,document_version_id,record)
  SELECT t.assistant_message_id,(x.value->>'citation_index')::integer,(x.value->>'dataset_release_id')::uuid,(x.value->>'document_version_id')::uuid,x.value
  FROM jsonb_array_elements(p_citations) x(value);
 END IF;
 RETURN QUERY SELECT t.status,t.user_message_id,t.user_ordinal,t.user_content,t.user_created_at,t.assistant_message_id,t.assistant_ordinal,t.assistant_content,t.assistant_created_at,t.assistant_insufficient_evidence;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA banuchat_reference FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','authenticator'] LOOP
  IF to_regrole(r) IS NOT NULL THEN
   EXECUTE format('REVOKE ALL ON SCHEMA banuchat_reference FROM %I',r);
   EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA banuchat_reference FROM %I',r);
   EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA banuchat_reference FROM %I',r);
  END IF;
 END LOOP;
END $$;
DO $$ DECLARE r text:=current_setting('banuchat_reference.runtime_role'); BEGIN
 EXECUTE format('GRANT USAGE ON SCHEMA banuchat_reference TO %I',r);
 EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA banuchat_reference TO %I',r);
END $$;
-- Set ACLs while the migrator still owns the functions. Supabase's postgres
-- has ADMIN but deliberately no INHERIT/SET on the executor. A temporary grant
-- from this migrator is distinct from the pre-existing administrator's grant.
DO $$ BEGIN
 IF NOT pg_has_role(session_user,'banuchat_auth_executor','SET') THEN
  IF current_user<>session_user OR EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='banuchat_auth_executor'::regrole
   AND member=session_user::regrole AND grantor=current_user::regrole)
  THEN RAISE EXCEPTION 'Unexpected migrator membership'; END IF;
  EXECUTE format('GRANT banuchat_auth_executor TO %I WITH INHERIT FALSE, SET TRUE',session_user);
  PERFORM set_config('banuchat_reference.temporary_member',session_user,true);
 END IF;
END $$;
GRANT CREATE ON SCHEMA banuchat_reference TO banuchat_auth_executor;
ALTER FUNCTION banuchat_reference.context(uuid) OWNER TO banuchat_auth_executor;
ALTER FUNCTION banuchat_reference.retrieve(uuid,public.vector,integer,text[]) OWNER TO banuchat_auth_executor;
ALTER FUNCTION banuchat_reference.artifact(text,uuid,uuid) OWNER TO banuchat_auth_executor;
ALTER FUNCTION banuchat_reference.sources(text,uuid) OWNER TO banuchat_auth_executor;
ALTER FUNCTION banuchat_reference.persist_turn(text,uuid,uuid,integer,text,text,boolean,jsonb) OWNER TO banuchat_auth_executor;
REVOKE CREATE ON SCHEMA banuchat_reference FROM banuchat_auth_executor;
DO $$ DECLARE r text:=nullif(current_setting('banuchat_reference.temporary_member',true),''); BEGIN
 IF r IS NOT NULL THEN EXECUTE format('REVOKE banuchat_auth_executor FROM %I GRANTED BY %I',r,current_user); END IF;
END $$;
