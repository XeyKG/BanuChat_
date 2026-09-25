-- BanuChat: fixtures de prueba obviamente sinteticos, NO corpus funcional ni seed.
-- Rutas, revisiones y hashes simulados; no se leen archivos ni se invocan servicios.
-- Ejecutar con psql -X -v ON_ERROR_STOP=1 sobre una base recien migrada.
\set ON_ERROR_STOP on
\pset pager off
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL search_path = banuchat, public, pg_catalog;
SET LOCAL client_min_messages = notice;

CREATE FUNCTION pg_temp.check_true(ok boolean, detail text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', detail; END IF;
END;
$$;

-- El fallo esperado se aisla en una subtransaccion. Un exito inesperado falla fuera
-- del handler; tambien se exige SQLSTATE y texto, para no aceptar errores ajenos.
CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text, message_pattern text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_state text; actual_message text;
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE, actual_message = MESSAGE_TEXT;
    END;
    PERFORM pg_temp.check_true(actual_state = expected_state AND actual_message LIKE message_pattern,
        format('esperado %s / %s; recibido %s / %s', expected_state, message_pattern,
               coalesce(actual_state, 'SIN ERROR'), coalesce(actual_message, 'SIN ERROR')));
END;
$$;

CREATE FUNCTION pg_temp.uid(label text) RETURNS uuid LANGUAGE sql IMMUTABLE
AS $$ SELECT md5('banuchat-synthetic-test:' || label)::uuid $$;

-- Bases canonicas ortogonales e1/e2; eje 0 produce el vector cero negativo.
CREATE FUNCTION pg_temp.axis(axis_number integer) RETURNS public.vector LANGUAGE sql IMMUTABLE
AS $$ SELECT array_agg((CASE WHEN n = axis_number THEN 1 ELSE 0 END)::real ORDER BY n)::public.vector
      FROM generate_series(1,1024) n $$;

CREATE TEMP TABLE results (case_id text PRIMARY KEY, result text, evidence text);
CREATE TEMP TABLE fixtures (
    kind text, key text, path text, locator text, sha256 text, retrieval_mode text
);
INSERT INTO fixtures VALUES
    ('document','test_text','documents/test_text.txt','test-document',repeat('a',64),'chunked'),
    ('document','test_guide','documents/test_guide.pdf','test-whole-document',repeat('b',64),'full_document'),
    ('course','test_course','courses/test.json','test-course',repeat('c',64),NULL),
    ('announcement','test_notice','announcements/test.json','test-notice',repeat('d',64),NULL),
    ('calendar_event','test_event','calendars/test.json','test-event',repeat('e',64),NULL),
    ('profile','test_profile','profiles/test.json','test-profile',repeat('f',64),NULL),
    ('profile_course','test_profile/test_course','profiles/test.json','test-progress',repeat('f',64),NULL);

CREATE FUNCTION pg_temp.prepare_release(release_name text, revision_char text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO banuchat.dataset_releases
        (id,git_revision,dataset_schema_version,manifest,pipeline_config,embedding_config_id)
    SELECT pg_temp.uid(release_name),repeat(revision_char,40),'synthetic-test-v1',
        jsonb_build_object('synthetic',true,'items',jsonb_agg(jsonb_strip_nulls(to_jsonb(f)) ORDER BY kind,key)),
        '{"synthetic_test":true,"embedding":"deterministic-axis"}',pg_temp.uid('config')
    FROM pg_temp.fixtures f;
END;
$$;

CREATE FUNCTION pg_temp.load_release(release_name text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE rid uuid := pg_temp.uid(release_name); runid uuid := pg_temp.uid(release_name || '-run');
BEGIN
    INSERT INTO banuchat.ingestion_runs(id,dataset_release_id,attempt_no,workflow_ref,trigger_type)
    VALUES (runid,rid,1,'synthetic-sql-test-only','manual');
    INSERT INTO banuchat.document_versions
        (id,dataset_release_id,document_id,version_label,title,source_path,source_locator,
         source_sha256,content_sha256,mime_type,processing_status,ingestion_run_id)
    SELECT pg_temp.uid(release_name || '-' || f.key),rid,d.id,release_name,
        'SYNTHETIC TEST ' || f.key || ' ' || release_name,f.path,f.locator,f.sha256,f.sha256,
        CASE WHEN f.retrieval_mode='chunked' THEN 'text/plain' ELSE 'application/pdf' END,'ready',runid
    FROM pg_temp.fixtures f JOIN banuchat.documents d ON d.document_key=f.key WHERE f.kind='document';
    INSERT INTO banuchat.document_chunks
        (id,dataset_release_id,document_version_id,ordinal,content,locator,page_start,page_end,
         embedding,embedding_generated_at,generation_run_id)
    SELECT pg_temp.uid(release_name || '-chunk-' || n),rid,pg_temp.uid(release_name || '-test_text'),n-1,
        'SYNTHETIC TEST ' || release_name || ' chunk ' || n,'test-section-' || n,n,n,
        pg_temp.axis(n),clock_timestamp(),runid FROM generate_series(1,2) n;
    INSERT INTO banuchat.courses
        (dataset_release_id,course_key,name,description,status,source_path,source_locator,source_sha256)
    SELECT rid,key,'SYNTHETIC TEST course','Fictional SQL fixture','available',path,locator,sha256
    FROM pg_temp.fixtures WHERE kind='course';
    INSERT INTO banuchat.announcements
        (dataset_release_id,announcement_key,title,description,valid_from,valid_until,source_path,source_locator,source_sha256)
    SELECT rid,key,'SYNTHETIC TEST notice','Fictional SQL fixture','2030-01-01Z','2030-02-01Z',path,locator,sha256
    FROM pg_temp.fixtures WHERE kind='announcement';
    INSERT INTO banuchat.calendar_events
        (dataset_release_id,event_key,title,event_type,starts_at,ends_at,description,course_key,
         source_path,source_locator,source_sha256)
    SELECT rid,key,'SYNTHETIC TEST event','course_session','2030-01-02T10:00:00Z','2030-01-02T11:00:00Z',
        'Fictional SQL fixture','test_course',path,locator,sha256
    FROM pg_temp.fixtures WHERE kind='calendar_event';
    INSERT INTO banuchat.synthetic_profiles(dataset_release_id,profile_key,alias,source_path,source_locator,source_sha256)
    SELECT rid,key,'SYNTHETIC TEST character',path,locator,sha256 FROM pg_temp.fixtures WHERE kind='profile';
    INSERT INTO banuchat.profile_courses
        (dataset_release_id,profile_key,course_key,status,progress_percent,source_path,source_locator,source_sha256)
    SELECT rid,'test_profile','test_course','in_progress',50,path,locator,sha256
    FROM pg_temp.fixtures WHERE kind='profile_course';
    INSERT INTO banuchat.ingestion_items
        (dataset_release_id,ingestion_run_id,source_kind,record_key,source_path,source_locator,
         source_sha256,document_version_id,status,finished_at)
    SELECT rid,runid,kind,key,path,locator,sha256,
        CASE WHEN kind='document' THEN pg_temp.uid(release_name || '-' || key) END,
        'processed',clock_timestamp() FROM pg_temp.fixtures;
    UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=clock_timestamp() WHERE id=runid;
END;
$$;

-- Catálogo real: no contar helpers temporales, objetos de extension ni triggers FK.
DO $$
DECLARE actual_tables text[];
BEGIN
    PERFORM pg_temp.check_true(current_setting('transaction_isolation')='read committed','READ COMMITTED');
    SELECT array_agg(relname::text ORDER BY relname) INTO actual_tables FROM pg_class
    WHERE relnamespace='banuchat'::regnamespace AND relkind IN ('r','p');
    PERFORM pg_temp.check_true(actual_tables = ARRAY[
        'announcements','calendar_events','conversations','courses','dataset_releases','datasets',
        'document_chunks','document_versions','documents','embedding_configs','ingestion_items',
        'ingestion_runs','message_citations','messages','profile_courses','synthetic_profiles'], '16 tablas exactas');
    PERFORM pg_temp.check_true((SELECT count(*)=17 FROM pg_proc WHERE pronamespace='banuchat'::regnamespace), '17 funciones');
    PERFORM pg_temp.check_true((SELECT count(*)=20 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        WHERE c.relnamespace='banuchat'::regnamespace AND NOT t.tgisinternal), '20 triggers propios');
    PERFORM pg_temp.check_true(EXISTS(SELECT FROM pg_extension WHERE extname='vector'), 'extension vector');
    PERFORM pg_temp.check_true(NOT EXISTS(SELECT FROM pg_extension WHERE extname='pgcrypto'), 'sin pgcrypto');
    PERFORM pg_temp.check_true((SELECT format_type(atttypid,atttypmod)='vector(1024)' FROM pg_attribute
        WHERE attrelid='banuchat.document_chunks'::regclass AND attname='embedding'), 'vector(1024)');
    PERFORM pg_temp.check_true(NOT EXISTS(SELECT FROM pg_class c JOIN pg_am a ON a.oid=c.relam
        WHERE c.relnamespace='banuchat'::regnamespace AND a.amname IN ('hnsw','ivfflat')), 'sin ANN');
    PERFORM pg_temp.check_true(NOT EXISTS(SELECT FROM banuchat.datasets)
        AND NOT EXISTS(SELECT FROM banuchat.embedding_configs), 'base migrada sin seeds');
    RAISE NOTICE 'CATALOGO PASS: 16 tablas, 17 funciones, 20 triggers, vector(1024), sin pgcrypto ni ANN';
END;
$$;

-- A: hash automatico verificado contra la receta canonica, sin hash de entrada.
INSERT INTO embedding_configs(id,provider,model,model_revision,dimension,distance_metric,parameters)
VALUES (pg_temp.uid('config'),'ollama','qwen3-embedding:0.6b','SYNTHETIC-TEST-NOT-A-MODEL-DIGEST',1024,'cosine',
        '{"query":{},"document":{},"runtime_version":"synthetic-test-no-runtime"}');
SELECT pg_temp.check_true((SELECT config_sha256=encode(sha256(convert_to(jsonb_build_object(
    'provider',provider,'model',model,'revision',model_revision,'dimension',dimension,
    'metric',distance_metric,'parameters',parameters)::text,'UTF8')),'hex') AND dimension=1024
    AND config_sha256 ~ '^[0-9a-f]{64}$' FROM embedding_configs WHERE id=pg_temp.uid('config')), 'A hash canonico');
SELECT pg_temp.expect_error($s$ INSERT INTO embedding_configs(model_revision,parameters)
    VALUES ('synthetic-invalid','{}') $s$, 'P0001', 'Registrar preprocesamiento%');
SELECT pg_temp.expect_error($s$ INSERT INTO embedding_configs(model_revision,dimension,parameters)
    SELECT 'synthetic-invalid-dim',512,parameters FROM embedding_configs $s$, '23514', '%check constraint%');
SELECT pg_temp.expect_error($s$ INSERT INTO embedding_configs(provider,model_revision,parameters)
    SELECT ' ','synthetic-invalid-provider',parameters FROM embedding_configs $s$, '23514', '%check constraint%');
SELECT pg_temp.expect_error($s$ INSERT INTO embedding_configs(model_revision,parameters)
    SELECT model_revision,parameters FROM embedding_configs $s$, '23505', '%unique constraint%');
INSERT INTO results VALUES ('A','PASS','Hash automatico canonico; rechaza parameters, dimension, proveedor vacio y duplicado');

-- B: publicacion fallida debe revertir estado, fecha y puntero.
INSERT INTO datasets(name) VALUES ('SYNTHETIC SQL TEST ONLY');
INSERT INTO dataset_releases(id,git_revision,dataset_schema_version,manifest,pipeline_config,embedding_config_id)
SELECT pg_temp.uid('incomplete'),repeat('0',40),'synthetic-test-v1',
    jsonb_build_object('synthetic',true,'items',jsonb_build_array(jsonb_strip_nulls(to_jsonb(f)))),
    '{"synthetic_test":true}',pg_temp.uid('config') FROM fixtures f WHERE kind='course';
SELECT pg_temp.expect_error($s$ SELECT publish_release(pg_temp.uid('incomplete')) $s$,
    'P0001','La representaci%n procesada no coincide con el manifiesto completo');
SELECT pg_temp.check_true((SELECT current_release_id IS NULL FROM datasets) AND
    (SELECT status='staging' AND validated_at IS NULL FROM dataset_releases WHERE id=pg_temp.uid('incomplete')), 'B rollback atomico');
INSERT INTO results VALUES ('B','PASS','Release incompleta sigue staging, validated_at NULL y puntero NULL');

-- C: siete unidades, dos documentos, dos chunks y relaciones dentro de la release.
INSERT INTO documents(id,document_key,retrieval_mode)
SELECT pg_temp.uid(key),key,retrieval_mode FROM fixtures WHERE kind='document';
SELECT pg_temp.prepare_release('r1','1');
SELECT pg_temp.load_release('r1');
SELECT publish_release(pg_temp.uid('r1'));
SELECT assert_release_complete(pg_temp.uid('r1'));
SELECT pg_temp.check_true((SELECT current_release_id=pg_temp.uid('r1') FROM datasets)
    AND (SELECT status='ready' AND validated_at IS NOT NULL FROM dataset_releases WHERE id=pg_temp.uid('r1'))
    AND (SELECT count(*)=7 FROM release_records(pg_temp.uid('r1')))
    AND (SELECT count(*)=7 FROM ingestion_items WHERE dataset_release_id=pg_temp.uid('r1') AND status='processed')
    AND (SELECT count(*)=1 FROM profile_courses pc JOIN courses c USING(dataset_release_id,course_key)
         JOIN synthetic_profiles p USING(dataset_release_id,profile_key) WHERE pc.dataset_release_id=pg_temp.uid('r1')),
    'C release completa publicada y relacionada');
-- Mismo rechazo con puntero previo no nulo.
SELECT pg_temp.expect_error($s$ SELECT publish_release(pg_temp.uid('incomplete')) $s$,
    'P0001','La representaci%n procesada no coincide con el manifiesto completo');
SELECT pg_temp.check_true((SELECT current_release_id=pg_temp.uid('r1') FROM datasets), 'B conserva puntero previo');
INSERT INTO results VALUES ('C','PASS','Release r1 ready vigente; 7 unidades procesadas; completitud y FK validas');

-- D: UPDATE/DELETE protegidos, sin desactivar triggers.
SELECT pg_temp.expect_error($s$ UPDATE documents SET retrieval_mode='full_document' WHERE document_key='test_text' $s$,
    'P0001','Operaci%n UPDATE no permitida%');
SELECT pg_temp.expect_error($s$ DELETE FROM documents WHERE document_key='test_guide' $s$,
    'P0001','Operaci%n DELETE no permitida%');
SELECT pg_temp.expect_error($s$ UPDATE document_versions SET title='SYNTHETIC MUTATION' WHERE dataset_release_id=pg_temp.uid('r1') $s$,
    'P0001','Solo se puede escribir en una release staging');
SELECT pg_temp.expect_error($s$ UPDATE document_chunks SET embedding=pg_temp.axis(2) WHERE id=pg_temp.uid('r1-chunk-1') $s$,
    'P0001','Solo se puede escribir en una release staging');
SELECT pg_temp.expect_error($s$ DELETE FROM document_chunks WHERE id=pg_temp.uid('r1-chunk-1') $s$,
    'P0001','Solo se puede escribir en una release staging');
SELECT pg_temp.expect_error($s$ UPDATE embedding_configs SET model='synthetic-other' $s$,
    'P0001','Operaci%n UPDATE no permitida%');
SELECT pg_temp.expect_error($s$ DELETE FROM embedding_configs $s$,
    'P0001','Operaci%n DELETE no permitida%');
SELECT pg_temp.expect_error($s$ UPDATE courses SET name='SYNTHETIC MUTATION' WHERE dataset_release_id=pg_temp.uid('r1') $s$,
    'P0001','Solo se puede escribir en una release staging');
INSERT INTO results VALUES ('D','PASS','8 mutaciones rechazadas en documentos, versiones, chunks, configuracion y curso');

-- E: claves presentes en r1 pero ausentes en r2 no satisfacen FK compuestas.
SELECT pg_temp.prepare_release('r2','2');
SELECT pg_temp.expect_error($s$ INSERT INTO profile_courses
    (dataset_release_id,profile_key,course_key,status,progress_percent,source_path,source_locator,source_sha256)
    VALUES (pg_temp.uid('r2'),'test_profile','test_course','enrolled',0,'profiles/test.json','test-progress',repeat('f',64)) $s$,
    '23503','%foreign key constraint%');
SELECT pg_temp.expect_error($s$ INSERT INTO calendar_events
    (dataset_release_id,event_key,title,event_type,starts_at,description,announcement_key,source_path,source_locator,source_sha256)
    VALUES (pg_temp.uid('r2'),'test_cross_event','SYNTHETIC TEST','announcement_deadline','2030-01-01Z',
    'SYNTHETIC TEST','test_notice','calendars/test.json','test-cross',repeat('e',64)) $s$,
    '23503','%foreign key constraint%');
SELECT pg_temp.check_true(NOT EXISTS(SELECT FROM profile_courses WHERE dataset_release_id=pg_temp.uid('r2'))
    AND NOT EXISTS(SELECT FROM calendar_events WHERE dataset_release_id=pg_temp.uid('r2')), 'E no filas cruzadas');
INSERT INTO results VALUES ('E','PASS','Progreso y evento cruzados rechazados por FK (23503)');

-- F: probar en staging, para que el rechazo sea por modo, no por inmutabilidad.
SELECT pg_temp.load_release('r2');
SELECT pg_temp.expect_error($s$ INSERT INTO document_chunks
    (dataset_release_id,document_version_id,ordinal,content,locator)
    VALUES(pg_temp.uid('r2'),pg_temp.uid('r2-test_guide'),0,'SYNTHETIC FORBIDDEN','test-section') $s$,
    'P0001','La versi%n no existe en esta release o el documento se sirve completo');
SELECT pg_temp.check_true(NOT EXISTS(SELECT FROM document_chunks c JOIN document_versions v ON v.id=c.document_version_id
    JOIN documents d ON d.id=v.document_id WHERE d.retrieval_mode='full_document')
    AND (SELECT count(*)=2 FROM search_chunks_cosine(pg_temp.axis(1),50,pg_temp.uid('r1'))), 'F politica documental');
INSERT INTO results VALUES ('F','PASS','Full_document sin chunks; insercion staging rechazada; chunked recuperable');

-- G: ranking conocido e1 antes que e2, distancias 0 y 1; r2 staging excluida.
CREATE TEMP TABLE first_ranking AS
SELECT s.* FROM search_chunks_cosine(pg_temp.axis(1),50,pg_temp.uid('r1')) WITH ORDINALITY AS s(
    chunk_id,chunk_key,ordinal,content,cosine_distance,cosine_similarity,dataset_release_id,embedding_config_id,
    document_id,document_key,document_title,document_version_id,source_path,source_sha256,locator,page_start,page_end,
    git_revision,manifest_sha256,pipeline_sha256,config_sha256,n);
SELECT pg_temp.check_true((SELECT dataset_release_id=pg_temp.uid('r1') AND embedding_config_id=pg_temp.uid('config')
    AND dimension=1024 AND distance_metric='cosine' FROM current_retrieval_context()), 'G contexto vigente');
SELECT pg_temp.check_true((SELECT count(*)=2 AND bool_and(dataset_release_id=pg_temp.uid('r1')
    AND document_key='test_text' AND document_id=pg_temp.uid('test_text')
    AND document_version_id=pg_temp.uid('r1-test_text') AND source_path='documents/test_text.txt'
    AND source_sha256=repeat('a',64) AND document_title='SYNTHETIC TEST test_text r1'
    AND embedding_config_id=pg_temp.uid('config') AND chunk_key ~ '^[0-9a-f]{64}$') FROM first_ranking), 'G metadatos');
SELECT pg_temp.check_true((SELECT chunk_id=pg_temp.uid('r1-chunk-1') AND content='SYNTHETIC TEST r1 chunk 1'
    AND locator='test-section-1' AND abs(cosine_distance)<1e-12 AND abs(cosine_similarity-1)<1e-12
    FROM first_ranking WHERE n=1) AND (SELECT chunk_id=pg_temp.uid('r1-chunk-2')
    AND abs(cosine_distance-1)<1e-12 FROM first_ranking WHERE n=2), 'G ranking e1,e2');
INSERT INTO results VALUES ('G','PASS','e1 primero (distancia 0); e2 segundo (1); texto/origen/version correctos, solo r1');

-- H: errores de parametros deben ser 22023, no fallos SQL accidentales.
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(pg_temp.axis(1),0,pg_temp.uid('r1')) $s$,'22023','top_k%');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(pg_temp.axis(1),51,pg_temp.uid('r1')) $s$,'22023','top_k%');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(pg_temp.axis(1),NULL,pg_temp.uid('r1')) $s$,'22023','top_k%');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(pg_temp.axis(0),2,pg_temp.uid('r1')) $s$,'22023','Consulta vectorial inv%');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(NULL,2,pg_temp.uid('r1')) $s$,'22023','Consulta vectorial inv%');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine('[1,0]'::vector,2,pg_temp.uid('r1')) $s$,'22023','Consulta vectorial inv%');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(pg_temp.axis(1),2,pg_temp.uid('r2')) $s$,'22023','Cambi%');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(pg_temp.axis(1),2,NULL) $s$,'22023','Cambi%');
INSERT INTO results VALUES ('H','PASS','8 entradas invalidas rechazadas con 22023: top_k, NULL, cero, dimension y release');

-- I: segunda publicacion; evidencia historica sigue direccionable explicitamente.
SELECT publish_release(pg_temp.uid('r2'));
SELECT assert_release_complete(pg_temp.uid('r2'));
SELECT pg_temp.check_true((SELECT current_release_id=pg_temp.uid('r2') FROM datasets)
    AND (SELECT dataset_release_id=pg_temp.uid('r2') FROM current_retrieval_context())
    AND (SELECT count(*)=2 FROM dataset_releases WHERE status='ready')
    AND (SELECT count(*)=2 AND bool_and(dataset_release_id=pg_temp.uid('r2'))
        FROM search_chunks_cosine(pg_temp.axis(1),50,pg_temp.uid('r2')))
    AND (SELECT count(*)=2 FROM document_chunks WHERE dataset_release_id=pg_temp.uid('r1'))
    AND (SELECT count(*)=7 FROM release_records(pg_temp.uid('r1'))), 'I vigencia e historia');
SELECT pg_temp.expect_error($s$ SELECT * FROM search_chunks_cosine(pg_temp.axis(1),2,pg_temp.uid('r1')) $s$,'22023','Cambi%');
INSERT INTO results VALUES ('I','PASS','r2 vigente, solo sus 2 chunks; r1 y sus 7 fuentes conservadas, retrieval historico rechazado');

-- J: cita historica valida aun despues del cambio de release; sin redireccionar.
INSERT INTO conversations(id,dataset_release_id,profile_key) VALUES(pg_temp.uid('conversation'),pg_temp.uid('r1'),'test_profile');
INSERT INTO messages(id,conversation_id,ordinal,role,content,answer_dataset_release_id) VALUES
    (pg_temp.uid('user'),pg_temp.uid('conversation'),0,'user','SYNTHETIC TEST question',NULL),
    (pg_temp.uid('assistant'),pg_temp.uid('conversation'),1,'assistant','SYNTHETIC TEST answer',pg_temp.uid('r1'));
INSERT INTO message_citations(message_id,citation_index,dataset_release_id,source_kind,source_path,
    source_locator,source_sha256,document_version_id,chunk_id)
VALUES(pg_temp.uid('assistant'),0,pg_temp.uid('r1'),'document','documents/test_text.txt',
    'test-section-1',repeat('a',64),pg_temp.uid('r1-test_text'),pg_temp.uid('r1-chunk-1'));
SELECT pg_temp.expect_error($s$ INSERT INTO message_citations
    (message_id,citation_index,dataset_release_id,source_kind,source_path,source_locator,source_sha256,document_version_id,chunk_id)
    VALUES(pg_temp.uid('assistant'),1,pg_temp.uid('r2'),'document','documents/test_text.txt','test-section-1',repeat('a',64),
    pg_temp.uid('r2-test_text'),pg_temp.uid('r2-chunk-1')) $s$, '23503','%foreign key constraint%');
SELECT pg_temp.expect_error($s$ INSERT INTO message_citations
    (message_id,citation_index,dataset_release_id,source_kind,source_path,source_locator,source_sha256,document_version_id)
    VALUES(pg_temp.uid('assistant'),1,pg_temp.uid('r1'),'document','documents/test_text.txt','WRONG-SYNTHETIC-LOCATOR',
    repeat('a',64),pg_temp.uid('r1-test_text')) $s$,'P0001','La cita debe conservar%');
SELECT pg_temp.expect_error($s$ INSERT INTO message_citations
    (message_id,citation_index,dataset_release_id,source_kind,source_path,source_locator,source_sha256,document_version_id)
    VALUES(pg_temp.uid('user'),0,pg_temp.uid('r1'),'document','documents/test_text.txt','test-document',
    repeat('a',64),pg_temp.uid('r1-test_text')) $s$,'23503','%foreign key constraint%');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM message_citations mc JOIN document_chunks c
    ON (c.dataset_release_id,c.document_version_id,c.id)=(mc.dataset_release_id,mc.document_version_id,mc.chunk_id)
    WHERE c.content='SYNTHETIC TEST r1 chunk 1' AND mc.source_locator=c.locator)
    AND (SELECT count(*)=2 FROM messages), 'J historial valido y rechazos sin filas residuales');
INSERT INTO results VALUES ('J','PASS','User/assistant y cita historica valida; release, localizador y cita user incompatibles rechazados');

-- K: comparar TODOS los registros de las 13 tablas fuera del historial, no solo conteos.
CREATE FUNCTION pg_temp.corpus_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE table_name text; rows_json jsonb; snapshot jsonb := '{}'::jsonb;
BEGIN
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname='banuchat'
        AND tablename NOT IN ('conversations','messages','message_citations') ORDER BY tablename LOOP
        EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM banuchat.%I t',table_name)
        INTO rows_json;
        snapshot := snapshot || jsonb_build_object(table_name,rows_json);
    END LOOP;
    RETURN snapshot;
END;
$$;
CREATE TEMP TABLE corpus_before AS SELECT pg_temp.corpus_snapshot() AS snapshot;
SELECT pg_temp.check_true((SELECT count(*)=1 FROM conversations) AND (SELECT count(*)=2 FROM messages)
    AND (SELECT count(*)=1 FROM message_citations), 'K historial existe antes de borrar');
DELETE FROM conversations WHERE id=pg_temp.uid('conversation');
SELECT pg_temp.check_true(NOT EXISTS(SELECT FROM conversations) AND NOT EXISTS(SELECT FROM messages)
    AND NOT EXISTS(SELECT FROM message_citations) AND (SELECT snapshot=pg_temp.corpus_snapshot() FROM corpus_before),
    'K cascada exclusiva de historial; corpus identico');
INSERT INTO results VALUES ('K','PASS','1 conversacion, 2 mensajes y 1 cita eliminados; las 13 tablas restantes identicas');

SELECT pg_temp.check_true((SELECT count(*)=11 AND bool_and(result='PASS') FROM results), 'suite A-K completa');
SELECT * FROM results ORDER BY case_id;
SELECT current_setting('server_version') AS postgresql, extversion AS pgvector,
       current_setting('transaction_isolation') AS isolation FROM pg_extension WHERE extname='vector';
-- Ningun fixture ni helper persiste. Los PASS se imprimen solo tras verificar todo.
ROLLBACK;
\echo SUITE_A_K_PASS_FIXTURES_ROLLED_BACK
