-- BanuChat: migración inicial para una base VACÍA, PostgreSQL 16 + pgvector.
-- Fuente funcional exclusiva: /data/synthetic. No aplica datos ni arranca servicios.
-- Reescritura autorizada; NO ejecutar sobre una instalación del borrador anterior.
BEGIN;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
CREATE SCHEMA banuchat;
COMMENT ON SCHEMA banuchat IS 'Representación procesada del dataset sintético de BanuChat.';

-- PostgreSQL 16 ofrece gen_random_uuid() y sha256(bytea) sin extensiones adicionales.
-- Dominios pequeños: reglas de valores, no una jerarquía de entidades.
CREATE DOMAIN banuchat.nonblank AS text CHECK (btrim(VALUE) <> '');
CREATE DOMAIN banuchat.stable_key AS text
    CHECK (VALUE ~ '^[a-z0-9][a-z0-9_-]{0,127}$');
CREATE DOMAIN banuchat.sha256_hex AS text CHECK (VALUE ~ '^[0-9a-f]{64}$');
CREATE DOMAIN banuchat.source_path AS text CHECK (
    VALUE ~ '^(documents|courses|calendars|announcements|profiles)/[A-Za-z0-9_./-]+$'
    AND VALUE !~ '(^|/)[.]{1,2}(/|$)'
    AND VALUE !~ '//|/$'
);
CREATE DOMAIN banuchat.source_kind AS text CHECK (
    VALUE IN ('document', 'course', 'calendar_event', 'announcement', 'profile', 'profile_course')
);
CREATE DOMAIN banuchat.finite_time AS timestamptz CHECK (isfinite(VALUE));

CREATE FUNCTION banuchat.text_sha256(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT
SET search_path = pg_catalog, banuchat, pg_temp
AS $$ SELECT encode(sha256(convert_to(p_value, 'UTF8')), 'hex') $$;

-- Hash de la representación canónica JSONB de PostgreSQL 16, no del archivo bruto.
CREATE FUNCTION banuchat.jsonb_sha256(p_value jsonb)
RETURNS text LANGUAGE sql IMMUTABLE STRICT
SET search_path = pg_catalog, banuchat, pg_temp
AS $$ SELECT encode(sha256(convert_to(p_value::text, 'UTF8')), 'hex') $$;

CREATE TABLE banuchat.datasets (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name banuchat.nonblank NOT NULL,
    current_release_id uuid
);

CREATE TABLE banuchat.embedding_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL DEFAULT 'ollama' CHECK (btrim(provider) <> ''),
    model text NOT NULL DEFAULT 'qwen3-embedding:0.6b' CHECK (btrim(model) <> ''),
    model_revision banuchat.nonblank NOT NULL,
    dimension integer NOT NULL DEFAULT 1024 CHECK (dimension = 1024),
    distance_metric text NOT NULL DEFAULT 'cosine' CHECK (distance_metric = 'cosine'),
    parameters jsonb NOT NULL CHECK (jsonb_typeof(parameters) = 'object'),
    config_sha256 banuchat.sha256_hex NOT NULL UNIQUE
);
COMMENT ON TABLE banuchat.embedding_configs IS
    'Sin seed ficticio: la ingesta registra revisión/digest local y parámetros; PostgreSQL calcula el hash al insertar. Sin secretos.';
COMMENT ON COLUMN banuchat.embedding_configs.parameters IS
    'Receta efectiva: runtime/version, instrucciones y preprocesamiento de consulta/documento, opciones y truncamiento.';

CREATE TABLE banuchat.dataset_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id smallint NOT NULL DEFAULT 1 REFERENCES banuchat.datasets(id),
    git_revision text NOT NULL CHECK (git_revision ~ '^([0-9a-f]{40}|[0-9a-f]{64})$'),
    dataset_schema_version banuchat.nonblank NOT NULL,
    manifest jsonb NOT NULL,
    manifest_sha256 text GENERATED ALWAYS AS (banuchat.jsonb_sha256(manifest)) STORED,
    pipeline_config jsonb NOT NULL CHECK (jsonb_typeof(pipeline_config) = 'object'),
    pipeline_sha256 text GENERATED ALWAYS AS (banuchat.jsonb_sha256(pipeline_config)) STORED,
    embedding_config_id uuid NOT NULL REFERENCES banuchat.embedding_configs(id),
    status text NOT NULL DEFAULT 'staging' CHECK (status IN ('staging', 'ready', 'failed')),
    imported_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    validated_at banuchat.finite_time,
    UNIQUE (dataset_id, id),
    UNIQUE (dataset_id, git_revision, manifest_sha256, pipeline_sha256, embedding_config_id),
    CHECK ((status = 'ready' AND validated_at IS NOT NULL AND validated_at >= imported_at)
        OR (status <> 'ready' AND validated_at IS NULL))
);
ALTER TABLE banuchat.datasets ADD CONSTRAINT datasets_current_release_fk
    FOREIGN KEY (id, current_release_id)
    REFERENCES banuchat.dataset_releases(dataset_id, id);

COMMENT ON COLUMN banuchat.dataset_releases.manifest IS
    'Copia procesada del manifiesto versionado: synthetic:true, items con kind/key/path/locator/sha256 y retrieval_mode documental. La BD no verifica archivos ni la ficción del texto.';

CREATE TABLE banuchat.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id smallint NOT NULL DEFAULT 1 REFERENCES banuchat.datasets(id),
    document_key banuchat.stable_key NOT NULL,
    retrieval_mode text NOT NULL CHECK (retrieval_mode IN ('chunked', 'full_document')),
    UNIQUE (dataset_id, document_key),
    UNIQUE (dataset_id, id)
);
COMMENT ON COLUMN banuchat.documents.retrieval_mode IS
    'Única política funcional y estable. La ingesta debe clasificar toda guía como full_document.';

CREATE TABLE banuchat.ingestion_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
    attempt_no integer NOT NULL CHECK (attempt_no > 0),
    workflow_ref banuchat.nonblank NOT NULL,
    trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'retry')),
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
    started_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    finished_at banuchat.finite_time,
    error_code banuchat.nonblank,
    UNIQUE (dataset_release_id, id),
    UNIQUE (dataset_release_id, attempt_no),
    CHECK ((status = 'running' AND finished_at IS NULL)
        OR (status <> 'running' AND finished_at IS NOT NULL AND finished_at >= started_at)),
    CHECK (error_code IS NULL OR status = 'failed')
);

CREATE TABLE banuchat.document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id smallint NOT NULL DEFAULT 1,
    dataset_release_id uuid NOT NULL,
    document_id uuid NOT NULL,
    version_label banuchat.nonblank,
    title banuchat.nonblank NOT NULL,
    source_path banuchat.source_path NOT NULL CHECK (source_path LIKE 'documents/%'),
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    content_sha256 banuchat.sha256_hex NOT NULL,
    mime_type banuchat.nonblank NOT NULL,
    processing_status text NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'ready', 'failed')),
    ingested_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    ingestion_run_id uuid NOT NULL,
    UNIQUE (dataset_release_id, document_id),
    UNIQUE (dataset_release_id, id),
    FOREIGN KEY (dataset_id, dataset_release_id)
        REFERENCES banuchat.dataset_releases(dataset_id, id),
    FOREIGN KEY (dataset_id, document_id) REFERENCES banuchat.documents(dataset_id, id),
    FOREIGN KEY (dataset_release_id, ingestion_run_id)
        REFERENCES banuchat.ingestion_runs(dataset_release_id, id)
);

CREATE TABLE banuchat.document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_release_id uuid NOT NULL,
    document_version_id uuid NOT NULL,
    ordinal integer NOT NULL CHECK (ordinal >= 0),
    content banuchat.nonblank NOT NULL,
    content_sha256 text GENERATED ALWAYS AS
        (banuchat.text_sha256(content::text)) STORED,
    locator banuchat.nonblank NOT NULL,
    page_start integer CHECK (page_start > 0),
    page_end integer,
    embedding public.vector(1024),
    embedding_generated_at banuchat.finite_time,
    generation_run_id uuid,
    UNIQUE (document_version_id, ordinal),
    UNIQUE (dataset_release_id, document_version_id, id),
    FOREIGN KEY (dataset_release_id, document_version_id)
        REFERENCES banuchat.document_versions(dataset_release_id, id),
    FOREIGN KEY (dataset_release_id, generation_run_id)
        REFERENCES banuchat.ingestion_runs(dataset_release_id, id),
    CHECK (page_end IS NULL OR (page_start IS NOT NULL AND page_end >= page_start)),
    CHECK ((embedding IS NULL AND embedding_generated_at IS NULL AND generation_run_id IS NULL)
        OR (embedding IS NOT NULL AND embedding_generated_at IS NOT NULL AND generation_run_id IS NOT NULL)),
    CHECK (embedding IS NULL OR public.vector_norm(embedding) > 0)
);
COMMENT ON COLUMN banuchat.document_chunks.dataset_release_id IS
    'Redundancia controlada por FK compuestas: impide cruzar versión y ejecución de generación.';
COMMENT ON COLUMN banuchat.document_chunks.embedding IS
    'Un vector por chunk. pgvector rechaza componentes no finitos; norma cero prohibida. Puede faltar solo en staging.';

CREATE TABLE banuchat.ingestion_items (
    dataset_release_id uuid NOT NULL,
    ingestion_run_id uuid NOT NULL,
    source_kind banuchat.source_kind NOT NULL,
    record_key banuchat.nonblank NOT NULL,
    source_path banuchat.source_path NOT NULL,
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    document_version_id uuid,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processed', 'skipped', 'failed')),
    result_code banuchat.nonblank,
    finished_at banuchat.finite_time,
    PRIMARY KEY (ingestion_run_id, source_kind, record_key),
    FOREIGN KEY (dataset_release_id, ingestion_run_id)
        REFERENCES banuchat.ingestion_runs(dataset_release_id, id),
    FOREIGN KEY (dataset_release_id, document_version_id)
        REFERENCES banuchat.document_versions(dataset_release_id, id),
    CHECK (source_kind = 'document' OR document_version_id IS NULL),
    CHECK (source_kind <> 'document' OR status IN ('pending', 'failed') OR document_version_id IS NOT NULL),
    CHECK ((status = 'pending' AND finished_at IS NULL)
        OR (status <> 'pending' AND finished_at IS NOT NULL)),
    CHECK (status NOT IN ('failed', 'skipped') OR result_code IS NOT NULL)
);

CREATE TABLE banuchat.courses (
    dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
    course_key banuchat.stable_key NOT NULL,
    name banuchat.nonblank NOT NULL,
    description banuchat.nonblank NOT NULL,
    status text NOT NULL CHECK (status IN ('available', 'closed', 'archived')),
    source_path banuchat.source_path NOT NULL CHECK (source_path LIKE 'courses/%'),
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    PRIMARY KEY (dataset_release_id, course_key)
);

CREATE TABLE banuchat.announcements (
    dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
    announcement_key banuchat.stable_key NOT NULL,
    title banuchat.nonblank NOT NULL,
    description banuchat.nonblank NOT NULL,
    valid_from banuchat.finite_time NOT NULL,
    valid_until banuchat.finite_time,
    source_path banuchat.source_path NOT NULL CHECK (source_path LIKE 'announcements/%'),
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    PRIMARY KEY (dataset_release_id, announcement_key),
    CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE TABLE banuchat.calendar_events (
    dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
    event_key banuchat.stable_key NOT NULL,
    title banuchat.nonblank NOT NULL,
    event_type text NOT NULL CHECK (event_type IN ('course_session', 'announcement_deadline', 'general')),
    starts_at banuchat.finite_time NOT NULL,
    ends_at banuchat.finite_time,
    description banuchat.nonblank NOT NULL,
    course_key banuchat.stable_key,
    announcement_key banuchat.stable_key,
    source_path banuchat.source_path NOT NULL CHECK (source_path LIKE 'calendars/%'),
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    PRIMARY KEY (dataset_release_id, event_key),
    FOREIGN KEY (dataset_release_id, course_key) REFERENCES banuchat.courses(dataset_release_id, course_key),
    FOREIGN KEY (dataset_release_id, announcement_key)
        REFERENCES banuchat.announcements(dataset_release_id, announcement_key),
    CHECK (ends_at IS NULL OR ends_at >= starts_at),
    CHECK ((event_type = 'course_session' AND course_key IS NOT NULL AND announcement_key IS NULL)
        OR (event_type = 'announcement_deadline' AND announcement_key IS NOT NULL AND course_key IS NULL)
        OR (event_type = 'general' AND course_key IS NULL AND announcement_key IS NULL))
);

CREATE TABLE banuchat.synthetic_profiles (
    dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
    profile_key banuchat.stable_key NOT NULL,
    alias banuchat.nonblank NOT NULL,
    source_path banuchat.source_path NOT NULL CHECK (source_path LIKE 'profiles/%'),
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    PRIMARY KEY (dataset_release_id, profile_key)
);

CREATE TABLE banuchat.profile_courses (
    dataset_release_id uuid NOT NULL,
    profile_key banuchat.stable_key NOT NULL,
    course_key banuchat.stable_key NOT NULL,
    status text NOT NULL CHECK (status IN ('enrolled', 'in_progress', 'completed')),
    progress_percent numeric(5,2) NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
    started_at banuchat.finite_time,
    completed_at banuchat.finite_time,
    source_path banuchat.source_path NOT NULL CHECK (source_path LIKE 'profiles/%'),
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    PRIMARY KEY (dataset_release_id, profile_key, course_key),
    FOREIGN KEY (dataset_release_id, profile_key)
        REFERENCES banuchat.synthetic_profiles(dataset_release_id, profile_key),
    FOREIGN KEY (dataset_release_id, course_key) REFERENCES banuchat.courses(dataset_release_id, course_key),
    CHECK ((status = 'enrolled' AND progress_percent = 0 AND completed_at IS NULL)
        OR (status = 'in_progress' AND progress_percent > 0 AND progress_percent < 100 AND completed_at IS NULL)
        OR (status = 'completed' AND progress_percent = 100 AND completed_at IS NOT NULL)),
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE banuchat.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_release_id uuid NOT NULL,
    profile_key banuchat.stable_key NOT NULL,
    started_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (dataset_release_id, profile_key)
        REFERENCES banuchat.synthetic_profiles(dataset_release_id, profile_key)
);

CREATE TABLE banuchat.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES banuchat.conversations(id) ON DELETE CASCADE,
    ordinal integer NOT NULL CHECK (ordinal >= 0),
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content banuchat.nonblank NOT NULL,
    created_at banuchat.finite_time NOT NULL DEFAULT clock_timestamp(),
    answer_dataset_release_id uuid REFERENCES banuchat.dataset_releases(id),
    insufficient_evidence boolean NOT NULL DEFAULT false,
    UNIQUE (conversation_id, ordinal),
    UNIQUE (id, answer_dataset_release_id),
    CHECK ((role = 'user' AND answer_dataset_release_id IS NULL AND NOT insufficient_evidence)
        OR (role = 'assistant' AND answer_dataset_release_id IS NOT NULL))
);
COMMENT ON TABLE banuchat.messages IS
    'Solo texto visible de demostración. El importador/API debe minimizar datos de entrada; un CHECK no puede clasificar semánticamente el texto.';

CREATE TABLE banuchat.message_citations (
    message_id uuid NOT NULL,
    citation_index integer NOT NULL CHECK (citation_index >= 0),
    dataset_release_id uuid NOT NULL,
    source_kind banuchat.source_kind NOT NULL,
    source_path banuchat.source_path NOT NULL,
    source_locator banuchat.nonblank NOT NULL,
    source_sha256 banuchat.sha256_hex NOT NULL,
    document_version_id uuid,
    chunk_id uuid,
    course_key banuchat.stable_key,
    event_key banuchat.stable_key,
    announcement_key banuchat.stable_key,
    profile_key banuchat.stable_key,
    PRIMARY KEY (message_id, citation_index),
    -- Usuario tiene release NULL: esta FK + NOT NULL solo admite mensajes assistant.
    FOREIGN KEY (message_id, dataset_release_id)
        REFERENCES banuchat.messages(id, answer_dataset_release_id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_release_id, document_version_id)
        REFERENCES banuchat.document_versions(dataset_release_id, id),
    FOREIGN KEY (dataset_release_id, document_version_id, chunk_id)
        REFERENCES banuchat.document_chunks(dataset_release_id, document_version_id, id),
    FOREIGN KEY (dataset_release_id, course_key) REFERENCES banuchat.courses(dataset_release_id, course_key),
    FOREIGN KEY (dataset_release_id, event_key) REFERENCES banuchat.calendar_events(dataset_release_id, event_key),
    FOREIGN KEY (dataset_release_id, announcement_key)
        REFERENCES banuchat.announcements(dataset_release_id, announcement_key),
    FOREIGN KEY (dataset_release_id, profile_key)
        REFERENCES banuchat.synthetic_profiles(dataset_release_id, profile_key),
    FOREIGN KEY (dataset_release_id, profile_key, course_key)
        REFERENCES banuchat.profile_courses(dataset_release_id, profile_key, course_key),
    CHECK (
        (source_kind = 'document' AND document_version_id IS NOT NULL
            AND course_key IS NULL AND event_key IS NULL AND announcement_key IS NULL AND profile_key IS NULL)
        OR (source_kind = 'course' AND course_key IS NOT NULL
            AND document_version_id IS NULL AND chunk_id IS NULL AND event_key IS NULL AND announcement_key IS NULL AND profile_key IS NULL)
        OR (source_kind = 'calendar_event' AND event_key IS NOT NULL
            AND document_version_id IS NULL AND chunk_id IS NULL AND course_key IS NULL AND announcement_key IS NULL AND profile_key IS NULL)
        OR (source_kind = 'announcement' AND announcement_key IS NOT NULL
            AND document_version_id IS NULL AND chunk_id IS NULL AND course_key IS NULL AND event_key IS NULL AND profile_key IS NULL)
        OR (source_kind = 'profile' AND profile_key IS NOT NULL
            AND document_version_id IS NULL AND chunk_id IS NULL AND course_key IS NULL AND event_key IS NULL AND announcement_key IS NULL)
        OR (source_kind = 'profile_course' AND profile_key IS NOT NULL AND course_key IS NOT NULL
            AND document_version_id IS NULL AND chunk_id IS NULL AND event_key IS NULL AND announcement_key IS NULL)
    )
);

-- Índices no implícitos: historial, agenda y validación de integridad/publicación.
CREATE INDEX document_versions_document_idx ON banuchat.document_versions(document_id);
CREATE INDEX document_versions_run_idx ON banuchat.document_versions(dataset_release_id, ingestion_run_id);
CREATE INDEX document_chunks_generation_idx ON banuchat.document_chunks(dataset_release_id, generation_run_id);
CREATE INDEX ingestion_items_release_idx ON banuchat.ingestion_items(dataset_release_id, source_kind, record_key);
CREATE INDEX calendar_events_release_start_idx ON banuchat.calendar_events(dataset_release_id, starts_at);
CREATE INDEX conversations_profile_started_idx ON banuchat.conversations(profile_key, started_at DESC, id);
CREATE INDEX message_citations_version_idx ON banuchat.message_citations(dataset_release_id, document_version_id);
CREATE INDEX message_citations_chunk_idx ON banuchat.message_citations(chunk_id) WHERE chunk_id IS NOT NULL;

-- Contrato mínimo del manifiesto procesado. Se valida forma/procedencia, no archivos.
CREATE FUNCTION banuchat.validate_manifest(p_manifest jsonb)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    entry jsonb;
    field_name text;
    checked_path banuchat.source_path;
    checked_hash banuchat.sha256_hex;
    checked_kind banuchat.source_kind;
BEGIN
    IF jsonb_typeof(p_manifest) IS DISTINCT FROM 'object'
       OR p_manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb
       OR jsonb_typeof(p_manifest->'items') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Manifiesto sintético inválido';
    END IF;
    IF jsonb_array_length(p_manifest->'items') = 0 THEN
        RAISE EXCEPTION 'La publicación debe enumerar sus unidades fuente';
    END IF;
    FOR entry IN SELECT value FROM jsonb_array_elements(p_manifest->'items') LOOP
        FOREACH field_name IN ARRAY ARRAY['kind','key','path','locator','sha256'] LOOP
            IF jsonb_typeof(entry->field_name) IS DISTINCT FROM 'string'
               OR btrim(entry->>field_name) = '' THEN
                RAISE EXCEPTION 'Campo inválido en manifiesto: %', field_name;
            END IF;
        END LOOP;
        checked_kind := entry->>'kind';
        checked_path := entry->>'path';
        checked_hash := entry->>'sha256';
        IF checked_kind = 'profile_course' THEN
            IF (entry->>'key') !~ '^[a-z0-9][a-z0-9_-]{0,127}/[a-z0-9][a-z0-9_-]{0,127}$' THEN
                RAISE EXCEPTION 'Clave de progreso inválida';
            END IF;
        ELSIF (entry->>'key') !~ '^[a-z0-9][a-z0-9_-]{0,127}$' THEN
            RAISE EXCEPTION 'Clave fuente inválida';
        END IF;
        IF checked_kind = 'document' THEN
            IF (entry->>'retrieval_mode' IN ('chunked','full_document')) IS NOT TRUE THEN
                RAISE EXCEPTION 'Falta modo documental en manifiesto';
            END IF;
        ELSIF entry ? 'retrieval_mode' THEN
            RAISE EXCEPTION 'Solo documentos tienen retrieval_mode';
        END IF;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_manifest->'items') e
        GROUP BY e->>'kind', e->>'key' HAVING count(*) > 1
    ) OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_manifest->'items') e
        GROUP BY e->>'path' HAVING count(DISTINCT e->>'sha256') > 1
    ) THEN
        RAISE EXCEPTION 'Identidades duplicadas o hashes de archivo contradictorios';
    END IF;
END;
$$;

-- Lectura interna de procedencia: unión de las seis clases de registros, no supertabla.
CREATE FUNCTION banuchat.release_records(p_release_id uuid)
RETURNS TABLE (
    source_kind text, record_key text, source_path text, source_locator text,
    source_sha256 text, retrieval_mode text, document_version_id uuid
) LANGUAGE sql STABLE
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
    SELECT 'document'::text, d.document_key::text, v.source_path::text,
           v.source_locator::text, v.source_sha256::text, d.retrieval_mode, v.id
    FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id = v.document_id
    WHERE v.dataset_release_id = p_release_id
    UNION ALL
    SELECT 'course', course_key::text, source_path::text, source_locator::text, source_sha256::text, NULL, NULL
    FROM banuchat.courses WHERE dataset_release_id = p_release_id
    UNION ALL
    SELECT 'calendar_event', event_key::text, source_path::text, source_locator::text, source_sha256::text, NULL, NULL
    FROM banuchat.calendar_events WHERE dataset_release_id = p_release_id
    UNION ALL
    SELECT 'announcement', announcement_key::text, source_path::text, source_locator::text, source_sha256::text, NULL, NULL
    FROM banuchat.announcements WHERE dataset_release_id = p_release_id
    UNION ALL
    SELECT 'profile', profile_key::text, source_path::text, source_locator::text, source_sha256::text, NULL, NULL
    FROM banuchat.synthetic_profiles WHERE dataset_release_id = p_release_id
    UNION ALL
    SELECT 'profile_course', profile_key || '/' || course_key,
           source_path::text, source_locator::text, source_sha256::text, NULL, NULL
    FROM banuchat.profile_courses WHERE dataset_release_id = p_release_id
$$;

-- READ COMMITTED es el comportamiento esperado/default, no una restricción del DDL.
-- PostgreSQL gestiona snapshots y conflictos de niveles superiores; revisar sus riesgos
-- en README. El bloqueo se conserva hasta COMMIT, también para COPY y escrituras directas.
CREATE FUNCTION banuchat.guard_corpus_write()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    release_id uuid;
    release_status text;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.dataset_release_id IS DISTINCT FROM OLD.dataset_release_id THEN
        RAISE EXCEPTION 'No se permite mover registros entre releases';
    END IF;
    -- Evita convertir indirectamente una versión con chunks en documento completo.
    -- Las identidades/propietarios de versiones y chunks no se reasignan en staging.
    IF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'document_versions' THEN
            IF ROW(NEW.id, NEW.document_id, NEW.dataset_id)
                IS DISTINCT FROM ROW(OLD.id, OLD.document_id, OLD.dataset_id) THEN
                RAISE EXCEPTION 'Identidad y documento propietario de versión son inmutables';
            END IF;
        ELSIF TG_TABLE_NAME = 'document_chunks' THEN
            IF ROW(NEW.id, NEW.document_version_id, NEW.ordinal)
                IS DISTINCT FROM ROW(OLD.id, OLD.document_version_id, OLD.ordinal) THEN
                RAISE EXCEPTION 'Identidad, versión y ordinal del chunk son inmutables';
            END IF;
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN release_id := OLD.dataset_release_id;
    ELSE release_id := NEW.dataset_release_id; END IF;
    SELECT r.status INTO release_status FROM banuchat.dataset_releases r
    WHERE r.id = release_id FOR UPDATE;
    IF release_status IS DISTINCT FROM 'staging' THEN
        RAISE EXCEPTION 'Solo se puede escribir en una release staging';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION banuchat.reject_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Operación % no permitida sobre %: identidad o evidencia inmutable', TG_OP, TG_TABLE_NAME;
END;
$$;

CREATE FUNCTION banuchat.validate_embedding_config()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    canonical_config jsonb;
BEGIN
    -- Los defaults conservan la opción inicial; proveedor/modelo compatibles no están fijados por CHECK.
    canonical_config := jsonb_build_object(
        'provider', NEW.provider, 'model', NEW.model, 'revision', NEW.model_revision,
        'dimension', NEW.dimension, 'metric', NEW.distance_metric, 'parameters', NEW.parameters
    );
    -- El llamador omite el hash; siempre se deriva de los valores efectivos de la fila.
    NEW.config_sha256 := banuchat.jsonb_sha256(canonical_config);
    IF NOT (NEW.parameters ?& ARRAY['query','document','runtime_version'])
       OR jsonb_typeof(NEW.parameters->'query') IS DISTINCT FROM 'object'
       OR jsonb_typeof(NEW.parameters->'document') IS DISTINCT FROM 'object'
       OR jsonb_typeof(NEW.parameters->'runtime_version') IS DISTINCT FROM 'string'
       OR btrim(NEW.parameters->>'runtime_version') = '' THEN
        RAISE EXCEPTION 'Registrar preprocesamiento de consulta/documento y versión de runtime';
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION banuchat.validate_chunk()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    mode text;
    run_start timestamptz;
BEGIN
    SELECT d.retrieval_mode INTO mode
    FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id = v.document_id
    WHERE v.id = NEW.document_version_id AND v.dataset_release_id = NEW.dataset_release_id;
    IF mode IS DISTINCT FROM 'chunked' THEN
        RAISE EXCEPTION 'La versión no existe en esta release o el documento se sirve completo';
    END IF;
    IF NEW.embedding IS NOT NULL THEN
        SELECT started_at INTO run_start FROM banuchat.ingestion_runs
        WHERE id = NEW.generation_run_id AND dataset_release_id = NEW.dataset_release_id;
        IF run_start IS NULL OR NEW.embedding_generated_at < run_start THEN
            RAISE EXCEPTION 'Procedencia temporal de generación inválida';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION banuchat.validate_ingestion()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    manifest_items jsonb;
    run_row banuchat.ingestion_runs%ROWTYPE;
    version_key text;
BEGIN
    IF TG_TABLE_NAME = 'ingestion_runs' THEN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar intentos de ingesta'; END IF;
        IF TG_OP = 'INSERT' AND NEW.status <> 'running' THEN
            RAISE EXCEPTION 'El intento debe comenzar en running';
        END IF;
        IF TG_OP = 'INSERT' AND NEW.attempt_no <= coalesce((
            SELECT max(attempt_no) FROM banuchat.ingestion_runs
            WHERE dataset_release_id = NEW.dataset_release_id
        ), 0) THEN
            RAISE EXCEPTION 'El número de intento debe ser creciente dentro de la release';
        END IF;
        IF TG_OP = 'UPDATE' THEN
            IF OLD.status <> 'running' OR ROW(NEW.id, NEW.attempt_no, NEW.started_at, NEW.workflow_ref, NEW.trigger_type)
                IS DISTINCT FROM ROW(OLD.id, OLD.attempt_no, OLD.started_at, OLD.workflow_ref, OLD.trigger_type) THEN
                RAISE EXCEPTION 'Identidad e intentos terminados son inmutables';
            END IF;
            IF NEW.status <> 'running' AND EXISTS (
                SELECT 1 FROM banuchat.ingestion_items i
                WHERE i.ingestion_run_id = NEW.id
                  AND (i.status = 'pending' OR i.finished_at > NEW.finished_at
                       OR (NEW.status = 'succeeded' AND i.status = 'failed'))
            ) THEN RAISE EXCEPTION 'Cerrar items antes de finalizar el intento'; END IF;
        END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar resultados de ingesta'; END IF;
    IF TG_OP = 'UPDATE' AND (OLD.status <> 'pending' OR
        ROW(NEW.ingestion_run_id, NEW.source_kind, NEW.record_key)
        IS DISTINCT FROM ROW(OLD.ingestion_run_id, OLD.source_kind, OLD.record_key)) THEN
        RAISE EXCEPTION 'Identidad y resultados terminados de item son inmutables';
    END IF;
    SELECT * INTO run_row FROM banuchat.ingestion_runs
    WHERE id = NEW.ingestion_run_id AND dataset_release_id = NEW.dataset_release_id;
    IF run_row.status IS DISTINCT FROM 'running' THEN
        RAISE EXCEPTION 'El intento debe estar abierto';
    END IF;
    IF NEW.finished_at < run_row.started_at THEN RAISE EXCEPTION 'Tiempo de item inválido'; END IF;
    SELECT manifest->'items' INTO manifest_items FROM banuchat.dataset_releases
    WHERE id = NEW.dataset_release_id;
    IF NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(manifest_items)
        AS e(kind text, key text, path text, locator text, sha256 text)
        WHERE (e.kind,e.key,e.path,e.locator,e.sha256) =
            (NEW.source_kind,NEW.record_key,NEW.source_path,NEW.source_locator,NEW.source_sha256)
    ) THEN RAISE EXCEPTION 'El item no coincide con el manifiesto'; END IF;
    IF NEW.status = 'skipped' AND NOT EXISTS (
        SELECT 1 FROM banuchat.release_records(NEW.dataset_release_id) a
        WHERE (a.source_kind,a.record_key,a.source_path,a.source_locator,a.source_sha256) =
            (NEW.source_kind,NEW.record_key,NEW.source_path,NEW.source_locator,NEW.source_sha256)
    ) THEN RAISE EXCEPTION 'No se puede omitir una unidad sin representación existente'; END IF;
    IF NEW.document_version_id IS NOT NULL THEN
        SELECT d.document_key INTO version_key
        FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id = v.document_id
        WHERE v.id = NEW.document_version_id AND v.dataset_release_id = NEW.dataset_release_id;
        IF version_key IS DISTINCT FROM NEW.record_key THEN
            RAISE EXCEPTION 'Item y versión documental no corresponden';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION banuchat.assert_release_complete(p_release_id uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    release_manifest jsonb;
BEGIN
    -- El llamador ya bloqueó la fila padre. Comparación bidireccional: ni faltantes ni extras.
    SELECT manifest INTO release_manifest FROM banuchat.dataset_releases WHERE id = p_release_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Release no encontrada'; END IF;
    IF EXISTS (
        WITH expected AS (
            SELECT kind,key,path,locator,sha256,retrieval_mode
            FROM jsonb_to_recordset(release_manifest->'items')
            AS e(kind text,key text,path text,locator text,sha256 text,retrieval_mode text)
        ), actual AS (
            SELECT source_kind,record_key,source_path,source_locator,source_sha256,retrieval_mode
            FROM banuchat.release_records(p_release_id)
        )
        SELECT 1 FROM (
            (SELECT * FROM expected EXCEPT SELECT * FROM actual)
            UNION ALL
            (SELECT * FROM actual EXCEPT SELECT * FROM expected)
        ) differences
    ) THEN RAISE EXCEPTION 'La representación procesada no coincide con el manifiesto completo'; END IF;

    IF EXISTS (SELECT 1 FROM banuchat.ingestion_runs
               WHERE dataset_release_id = p_release_id AND status = 'running') THEN
        RAISE EXCEPTION 'Hay intentos de ingesta abiertos';
    END IF;
    IF EXISTS (
        SELECT 1 FROM banuchat.release_records(p_release_id) a
        LEFT JOIN LATERAL (
            SELECT i.status, i.document_version_id, r.status AS run_status
            FROM banuchat.ingestion_items i
            JOIN banuchat.ingestion_runs r ON r.id = i.ingestion_run_id
            WHERE i.dataset_release_id = p_release_id
              AND i.source_kind = a.source_kind AND i.record_key = a.record_key
            ORDER BY r.attempt_no DESC LIMIT 1
        ) last_item ON true
        WHERE last_item.status IS NULL OR last_item.status NOT IN ('processed','skipped')
           OR last_item.run_status IS DISTINCT FROM 'succeeded'
           OR last_item.document_version_id IS DISTINCT FROM a.document_version_id
    ) THEN RAISE EXCEPTION 'Faltan items procesados o el último intento por unidad falló'; END IF;

    IF EXISTS (
        SELECT 1 FROM banuchat.document_versions v
        JOIN banuchat.documents d ON d.id = v.document_id
        JOIN banuchat.ingestion_runs r ON r.id = v.ingestion_run_id
        WHERE v.dataset_release_id = p_release_id AND (
            v.processing_status <> 'ready' OR r.status <> 'succeeded'
            OR v.ingested_at < r.started_at OR v.ingested_at > r.finished_at
            OR (d.retrieval_mode = 'chunked' AND NOT EXISTS (
                SELECT 1 FROM banuchat.document_chunks c WHERE c.document_version_id = v.id))
            OR (d.retrieval_mode = 'full_document' AND EXISTS (
                SELECT 1 FROM banuchat.document_chunks c WHERE c.document_version_id = v.id))
        )
    ) THEN RAISE EXCEPTION 'Versiones documentales incompletas o procedencia inválida'; END IF;

    IF EXISTS (
        SELECT 1 FROM banuchat.document_chunks c
        LEFT JOIN banuchat.ingestion_runs r ON r.id = c.generation_run_id
        WHERE c.dataset_release_id = p_release_id
          AND (c.embedding IS NULL OR r.status IS DISTINCT FROM 'succeeded'
               OR c.embedding_generated_at > r.finished_at)
    ) THEN RAISE EXCEPTION 'Faltan embeddings o procedencia de generación válida'; END IF;
END;
$$;

CREATE FUNCTION banuchat.guard_release()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar releases para trazabilidad'; END IF;
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'staging' OR NEW.validated_at IS NOT NULL THEN
            RAISE EXCEPTION 'Crear release en staging, sin validación anticipada';
        END IF;
        PERFORM banuchat.validate_manifest(NEW.manifest);
        RETURN NEW;
    END IF;
    IF OLD.status = 'ready' THEN RAISE EXCEPTION 'Release lista inmutable'; END IF;
    -- No se pueden cambiar identidad ni receta una vez creada la candidata.
    IF ROW(NEW.id, NEW.dataset_id, NEW.git_revision, NEW.dataset_schema_version, NEW.manifest,
           NEW.pipeline_config, NEW.embedding_config_id, NEW.imported_at)
       IS DISTINCT FROM
       ROW(OLD.id, OLD.dataset_id, OLD.git_revision, OLD.dataset_schema_version, OLD.manifest,
           OLD.pipeline_config, OLD.embedding_config_id, OLD.imported_at) THEN
        RAISE EXCEPTION 'Crear otra release para cambiar identidad, manifiesto o receta';
    END IF;
    IF NEW.status = 'ready' THEN
        IF OLD.status <> 'staging' THEN RAISE EXCEPTION 'Reabrir candidata fallida antes de validarla'; END IF;
        PERFORM banuchat.assert_release_complete(OLD.id);
        NEW.validated_at := clock_timestamp();
    ELSE
        NEW.validated_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION banuchat.guard_dataset_pointer()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    target_status text;
BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar identidad del dataset'; END IF;
    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR (OLD.current_release_id IS NOT NULL AND NEW.current_release_id IS NULL) THEN
            RAISE EXCEPTION 'No cambiar identidad ni retirar el puntero vigente';
        END IF;
    END IF;
    IF NEW.current_release_id IS NOT NULL THEN
        SELECT status INTO target_status FROM banuchat.dataset_releases
        WHERE id = NEW.current_release_id AND dataset_id = NEW.id FOR SHARE;
        IF target_status IS DISTINCT FROM 'ready' THEN
            RAISE EXCEPTION 'El puntero solo admite release lista del mismo dataset';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Única operación recomendada de promoción: validación y activación en una transacción.
-- SECURITY INVOKER: solo el futuro rol de ingesta autorizado puede escribir.
CREATE FUNCTION banuchat.publish_release(p_release_id uuid)
RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    candidate banuchat.dataset_releases%ROWTYPE;
BEGIN
    PERFORM 1 FROM banuchat.datasets WHERE id = 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Falta dataset'; END IF;
    SELECT * INTO candidate FROM banuchat.dataset_releases WHERE id = p_release_id FOR UPDATE;
    IF NOT FOUND OR candidate.dataset_id <> 1 THEN RAISE EXCEPTION 'Release no encontrada'; END IF;
    IF candidate.status = 'staging' THEN
        UPDATE banuchat.dataset_releases SET status = 'ready' WHERE id = p_release_id;
    ELSIF candidate.status <> 'ready' THEN
        RAISE EXCEPTION 'La candidata falló: reabrir staging y corregir antes de publicar';
    END IF;
    UPDATE banuchat.datasets SET current_release_id = p_release_id WHERE id = 1;
END;
$$;

CREATE FUNCTION banuchat.validate_session_release()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    release_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'conversations' THEN release_id := NEW.dataset_release_id;
    ELSE release_id := NEW.answer_dataset_release_id; END IF;
    IF release_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM banuchat.dataset_releases WHERE id = release_id AND status = 'ready'
    ) THEN RAISE EXCEPTION 'La sesión/respuesta debe referenciar evidencia publicada'; END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION banuchat.validate_citation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    evidence record;
    expected_key text;
    expected_locator text;
BEGIN
    IF NEW.source_kind = 'document' THEN
        SELECT d.document_key INTO expected_key
        FROM banuchat.document_versions v JOIN banuchat.documents d ON d.id = v.document_id
        WHERE v.id = NEW.document_version_id AND v.dataset_release_id = NEW.dataset_release_id;
    ELSE
        expected_key := CASE NEW.source_kind
            WHEN 'course' THEN NEW.course_key WHEN 'calendar_event' THEN NEW.event_key
            WHEN 'announcement' THEN NEW.announcement_key WHEN 'profile' THEN NEW.profile_key
            WHEN 'profile_course' THEN NEW.profile_key || '/' || NEW.course_key END;
    END IF;
    SELECT * INTO evidence FROM banuchat.release_records(NEW.dataset_release_id)
    WHERE source_kind = NEW.source_kind AND record_key = expected_key;
    IF NOT FOUND THEN RAISE EXCEPTION 'Fuente histórica de cita inexistente'; END IF;
    expected_locator := evidence.source_locator;
    IF NEW.chunk_id IS NOT NULL THEN
        SELECT locator INTO expected_locator FROM banuchat.document_chunks
        WHERE id = NEW.chunk_id AND document_version_id = NEW.document_version_id
          AND dataset_release_id = NEW.dataset_release_id;
    END IF;
    IF expected_locator IS NULL OR ROW(NEW.source_path,NEW.source_locator,NEW.source_sha256)
        IS DISTINCT FROM ROW(evidence.source_path,expected_locator,evidence.source_sha256) THEN
        RAISE EXCEPTION 'La cita debe conservar ruta, localizador y checksum de su fuente';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.ingestion_runs
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.document_versions
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.document_chunks
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.ingestion_items
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.courses
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.announcements
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.calendar_events
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.synthetic_profiles
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER a_guard_corpus BEFORE INSERT OR UPDATE OR DELETE ON banuchat.profile_courses
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_corpus_write();

CREATE TRIGGER immutable_row BEFORE UPDATE OR DELETE ON banuchat.embedding_configs
FOR EACH ROW EXECUTE FUNCTION banuchat.reject_mutation();

CREATE TRIGGER immutable_row BEFORE UPDATE OR DELETE ON banuchat.documents
FOR EACH ROW EXECUTE FUNCTION banuchat.reject_mutation();

CREATE TRIGGER config_insert BEFORE INSERT ON banuchat.embedding_configs
FOR EACH ROW EXECUTE FUNCTION banuchat.validate_embedding_config();
CREATE TRIGGER b_chunk_content BEFORE INSERT OR UPDATE ON banuchat.document_chunks
FOR EACH ROW EXECUTE FUNCTION banuchat.validate_chunk();
CREATE TRIGGER b_ingestion_state BEFORE INSERT OR UPDATE OR DELETE ON banuchat.ingestion_runs
FOR EACH ROW EXECUTE FUNCTION banuchat.validate_ingestion();
CREATE TRIGGER b_ingestion_state BEFORE INSERT OR UPDATE OR DELETE ON banuchat.ingestion_items
FOR EACH ROW EXECUTE FUNCTION banuchat.validate_ingestion();
CREATE TRIGGER release_state BEFORE INSERT OR UPDATE OR DELETE ON banuchat.dataset_releases
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_release();
CREATE TRIGGER dataset_pointer BEFORE INSERT OR UPDATE OR DELETE ON banuchat.datasets
FOR EACH ROW EXECUTE FUNCTION banuchat.guard_dataset_pointer();
CREATE TRIGGER session_release BEFORE INSERT ON banuchat.conversations
FOR EACH ROW EXECUTE FUNCTION banuchat.validate_session_release();
CREATE TRIGGER session_release BEFORE INSERT ON banuchat.messages
FOR EACH ROW EXECUTE FUNCTION banuchat.validate_session_release();
CREATE TRIGGER citation_source BEFORE INSERT ON banuchat.message_citations
FOR EACH ROW EXECUTE FUNCTION banuchat.validate_citation();

-- TRUNCATE se impide por permisos del futuro rol runtime/ingesta, no por triggers.
-- No conceder TRUNCATE ni propiedad/DDL a esos roles.

-- Dos superficies de solo lectura. Propietario de migración confiable, nunca usuario runtime.
-- search_path fijo; no SQL dinámico. PUBLIC no obtiene EXECUTE al terminar la migración.
CREATE FUNCTION banuchat.current_retrieval_context()
RETURNS TABLE (
    dataset_release_id uuid, embedding_config_id uuid, provider text, model text,
    model_revision text, dimension integer, distance_metric text, parameters jsonb, config_sha256 text
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
    SELECT r.id, e.id, e.provider, e.model, e.model_revision::text, e.dimension,
           e.distance_metric, e.parameters, e.config_sha256::text
    FROM banuchat.datasets d
    JOIN banuchat.dataset_releases r ON r.dataset_id = d.id AND r.id = d.current_release_id
    JOIN banuchat.embedding_configs e ON e.id = r.embedding_config_id
    WHERE d.id = 1 AND r.status = 'ready'
$$;

CREATE FUNCTION banuchat.search_chunks_cosine(
    p_query_embedding public.vector(1024),
    p_top_k integer,
    p_expected_release_id uuid
)
RETURNS TABLE (
    chunk_id uuid, chunk_key text, ordinal integer, content text,
    cosine_distance double precision, cosine_similarity double precision,
    dataset_release_id uuid, embedding_config_id uuid,
    document_id uuid, document_key text, document_title text, document_version_id uuid,
    source_path text, source_sha256 text, locator text, page_start integer, page_end integer,
    git_revision text, manifest_sha256 text, pipeline_sha256 text, config_sha256 text
) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, banuchat, pg_temp
AS $$
DECLARE
    current_id uuid;
BEGIN
    IF p_top_k IS NULL OR p_top_k < 1 OR p_top_k > 50 THEN
        RAISE EXCEPTION 'top_k debe estar entre 1 y 50' USING ERRCODE = '22023';
    END IF;
    -- PostgreSQL descarta typmods en argumentos de funciones: comprobar la dimensión.
    IF p_query_embedding IS NULL OR public.vector_dims(p_query_embedding) <> 1024
       OR public.vector_norm(p_query_embedding) = 0 THEN
        RAISE EXCEPTION 'Consulta vectorial inválida: requiere 1024 dimensiones y norma positiva'
            USING ERRCODE = '22023';
    END IF;
    SELECT d.current_release_id INTO current_id FROM banuchat.datasets d WHERE d.id = 1;
    IF current_id IS NULL THEN RAISE EXCEPTION 'No hay release vigente'; END IF;
    IF p_expected_release_id IS NULL OR p_expected_release_id <> current_id THEN
        RAISE EXCEPTION 'Cambió la release: obtener configuración vigente y regenerar consulta'
            USING ERRCODE = '22023';
    END IF;
    -- STABLE usa un único snapshot de sentencia. Una activación concurrente no mezcla
    -- la release/configuración a mitad de búsqueda. No se permite seleccionar historia.
    RETURN QUERY
    SELECT c.id,
           banuchat.jsonb_sha256(jsonb_build_array(r.git_revision, r.manifest_sha256,
               r.pipeline_sha256, ec.config_sha256, d.document_key, c.ordinal)),
           c.ordinal, c.content::text,
           (c.embedding OPERATOR(public.<=>) p_query_embedding)::double precision,
           (1 - (c.embedding OPERATOR(public.<=>) p_query_embedding))::double precision,
           r.id, ec.id, d.id, d.document_key::text, v.title::text, v.id,
           v.source_path::text, v.source_sha256::text, c.locator::text, c.page_start, c.page_end,
           r.git_revision, r.manifest_sha256, r.pipeline_sha256, ec.config_sha256::text
    FROM banuchat.dataset_releases r
    JOIN banuchat.embedding_configs ec ON ec.id = r.embedding_config_id
    JOIN banuchat.document_versions v ON v.dataset_release_id = r.id
    JOIN banuchat.documents d ON d.id = v.document_id AND d.dataset_id = r.dataset_id
    JOIN banuchat.document_chunks c ON c.document_version_id = v.id AND c.dataset_release_id = r.id
    WHERE r.id = current_id AND r.status = 'ready'
      AND v.processing_status = 'ready' AND d.retrieval_mode = 'chunked'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding OPERATOR(public.<=>) p_query_embedding, d.document_key, c.ordinal
    LIMIT p_top_k;
END;
$$;

COMMENT ON FUNCTION banuchat.search_chunks_cosine(public.vector, integer, uuid) IS
    'Búsqueda coseno exacta y vigente; expected_release enlaza la consulta a su configuración, no habilita historia.';

-- Sin usuarios, contraseñas ni roles de cluster: infraestructura hará GRANT mínimo.
-- Consulta: USAGE schema y EXECUTE solo en las dos funciones de lectura, sin tablas base.
-- Ingesta: DML permitido, helpers y publish_release; sin propiedad, DDL ni deshabilitar triggers.
-- Sesiones: futuro escritor separado con INSERT/DELETE en conversaciones/mensajes/citas.
-- Sin UPDATE por defecto: validaciones de sesión/cita existentes solo cubren INSERT.
REVOKE ALL ON SCHEMA banuchat FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA banuchat FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA banuchat FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA banuchat REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
