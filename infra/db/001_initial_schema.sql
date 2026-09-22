BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS banuchat;

COMMENT ON SCHEMA banuchat IS
    'Esquema relacional y vectorial de BanuChat para el corpus institucional del CCD.';

-- Mantiene updated_at sin delegar esta responsabilidad a cada consumidor.
CREATE OR REPLACE FUNCTION banuchat.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Fuentes institucionales de las que provienen los documentos.
CREATE TABLE banuchat.sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    source_type text NOT NULL CHECK (
        source_type IN ('website', 'pdf', 'excel', 'google_sheet', 'manual')
    ),
    canonical_uri text,
    authority text NOT NULL DEFAULT 'Centro de Competencias Digitales UNAB',
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sources_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT sources_uri_not_blank CHECK (
        canonical_uri IS NULL OR btrim(canonical_uri) <> ''
    ),
    CONSTRAINT sources_canonical_uri_unique UNIQUE (canonical_uri)
);

COMMENT ON TABLE banuchat.sources IS
    'Registra fuentes institucionales autorizadas para ingesta o consulta.';

-- Documento lógico; sus versiones permiten conservar procedencia y cambios.
CREATE TABLE banuchat.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES banuchat.sources(id) ON DELETE RESTRICT,
    external_key text NOT NULL,
    title text NOT NULL,
    document_type text NOT NULL CHECK (
        document_type IN ('pdf', 'excel', 'html', 'google_sheet', 'other')
    ),
    vectorization_policy text NOT NULL DEFAULT 'chunk' CHECK (
        vectorization_policy IN ('chunk', 'full_document_link')
    ),
    canonical_uri text,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT documents_external_key_not_blank CHECK (btrim(external_key) <> ''),
    CONSTRAINT documents_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT documents_uri_not_blank CHECK (
        canonical_uri IS NULL OR btrim(canonical_uri) <> ''
    ),
    CONSTRAINT documents_source_external_key_unique UNIQUE (source_id, external_key)
);

COMMENT ON COLUMN banuchat.documents.vectorization_policy IS
    'chunk permite fragmentación y embeddings; full_document_link sirve el enlace completo, obligatorio para guías de cátedra.';

CREATE TABLE banuchat.document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES banuchat.documents(id) ON DELETE CASCADE,
    version_label text,
    content_sha256 text NOT NULL,
    source_updated_at timestamptz,
    extracted_at timestamptz NOT NULL DEFAULT now(),
    processing_status text NOT NULL DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'ready', 'failed', 'ignored')
    ),
    mime_type text,
    language_code text NOT NULL DEFAULT 'es',
    byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
    error_detail text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT document_versions_sha256_format CHECK (
        content_sha256 ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT document_versions_language_not_blank CHECK (btrim(language_code) <> ''),
    CONSTRAINT document_versions_document_hash_unique UNIQUE (document_id, content_sha256)
);

COMMENT ON TABLE banuchat.document_versions IS
    'Versiones inmutables del contenido extraído; permiten reproducir respuestas y evaluaciones.';

CREATE TABLE banuchat.document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_version_id uuid NOT NULL
        REFERENCES banuchat.document_versions(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL CHECK (chunk_index >= 0),
    content text NOT NULL,
    content_sha256 text NOT NULL,
    section_title text,
    section_path text,
    page_start integer,
    page_end integer,
    token_count integer CHECK (token_count IS NULL OR token_count > 0),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT document_chunks_content_not_blank CHECK (btrim(content) <> ''),
    CONSTRAINT document_chunks_sha256_format CHECK (
        content_sha256 ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT document_chunks_page_start_positive CHECK (
        page_start IS NULL OR page_start > 0
    ),
    CONSTRAINT document_chunks_page_end_valid CHECK (
        page_end IS NULL OR (page_end > 0 AND (page_start IS NULL OR page_end >= page_start))
    ),
    CONSTRAINT document_chunks_version_index_unique UNIQUE (document_version_id, chunk_index),
    CONSTRAINT document_chunks_version_hash_unique UNIQUE (document_version_id, content_sha256)
);

COMMENT ON TABLE banuchat.document_chunks IS
    'Fragmentos semánticos recuperables con localizadores suficientes para citar documento y sección.';

-- Impide vectorizar guías de cátedra u otros documentos declarados como enlace completo.
CREATE OR REPLACE FUNCTION banuchat.enforce_chunk_vectorization_policy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    policy text;
BEGIN
    SELECT d.vectorization_policy
      INTO policy
      FROM banuchat.document_versions dv
      JOIN banuchat.documents d ON d.id = dv.document_id
     WHERE dv.id = NEW.document_version_id;

    IF policy IS NULL THEN
        RAISE EXCEPTION 'No existe la versión documental %', NEW.document_version_id;
    END IF;

    IF policy <> 'chunk' THEN
        RAISE EXCEPTION
            'El documento usa la política % y no admite fragmentación', policy;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER document_chunks_enforce_vectorization_policy
BEFORE INSERT OR UPDATE OF document_version_id
ON banuchat.document_chunks
FOR EACH ROW
EXECUTE FUNCTION banuchat.enforce_chunk_vectorization_policy();

CREATE OR REPLACE FUNCTION banuchat.enforce_document_vectorization_policy_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.vectorization_policy = 'full_document_link'
       AND OLD.vectorization_policy <> 'full_document_link'
       AND EXISTS (
           SELECT 1
             FROM banuchat.document_versions dv
             JOIN banuchat.document_chunks dc ON dc.document_version_id = dv.id
            WHERE dv.document_id = NEW.id
       ) THEN
        RAISE EXCEPTION
            'No se puede usar full_document_link mientras existan chunks para el documento %',
            NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER documents_enforce_vectorization_policy_change
BEFORE UPDATE OF vectorization_policy
ON banuchat.documents
FOR EACH ROW
EXECUTE FUNCTION banuchat.enforce_document_vectorization_policy_change();

-- Catálogo independiente del proveedor para soportar API aprobada u Ollama local.
CREATE TABLE banuchat.embedding_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    provider text NOT NULL,
    dimensions integer NOT NULL CHECK (dimensions > 0),
    distance_metric text NOT NULL DEFAULT 'cosine' CHECK (distance_metric = 'cosine'),
    is_normalized boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT embedding_models_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT embedding_models_provider_not_blank CHECK (btrim(provider) <> ''),
    CONSTRAINT embedding_models_provider_name_unique UNIQUE (provider, name)
);

COMMENT ON TABLE banuchat.embedding_models IS
    'Modelos de embeddings autorizados; no almacena API keys ni secretos.';

CREATE TABLE banuchat.chunk_embeddings (
    chunk_id uuid NOT NULL REFERENCES banuchat.document_chunks(id) ON DELETE CASCADE,
    embedding_model_id uuid NOT NULL
        REFERENCES banuchat.embedding_models(id) ON DELETE RESTRICT,
    embedding vector NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (chunk_id, embedding_model_id)
);

COMMENT ON COLUMN banuchat.chunk_embeddings.embedding IS
    'Vector sin dimensión fija hasta aprobar el modelo; un trigger valida vector_dims contra embedding_models.dimensions.';

CREATE OR REPLACE FUNCTION banuchat.validate_embedding_dimensions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    expected_dimensions integer;
BEGIN
    SELECT dimensions
      INTO expected_dimensions
      FROM banuchat.embedding_models
     WHERE id = NEW.embedding_model_id;

    IF expected_dimensions IS NULL THEN
        RAISE EXCEPTION 'No existe el modelo de embeddings %', NEW.embedding_model_id;
    END IF;

    IF vector_dims(NEW.embedding) <> expected_dimensions THEN
        RAISE EXCEPTION
            'Dimensión inválida: se esperaban %, se recibieron %',
            expected_dimensions,
            vector_dims(NEW.embedding);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER chunk_embeddings_validate_dimensions
BEFORE INSERT OR UPDATE OF embedding, embedding_model_id
ON banuchat.chunk_embeddings
FOR EACH ROW
EXECUTE FUNCTION banuchat.validate_embedding_dimensions();

-- Ejecuciones de ingesta para auditoría de n8n y cálculo de calidad de extracción.
CREATE TABLE banuchat.ingestion_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid REFERENCES banuchat.sources(id) ON DELETE SET NULL,
    workflow_ref text NOT NULL,
    trigger_type text NOT NULL CHECK (
        trigger_type IN ('scheduled', 'manual', 'webhook', 'retry')
    ),
    status text NOT NULL DEFAULT 'running' CHECK (
        status IN ('running', 'succeeded', 'partially_succeeded', 'failed')
    ),
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    documents_discovered integer NOT NULL DEFAULT 0 CHECK (documents_discovered >= 0),
    documents_processed integer NOT NULL DEFAULT 0 CHECK (documents_processed >= 0),
    documents_failed integer NOT NULL DEFAULT 0 CHECK (documents_failed >= 0),
    error_detail text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ingestion_runs_workflow_not_blank CHECK (btrim(workflow_ref) <> ''),
    CONSTRAINT ingestion_runs_finished_after_start CHECK (
        finished_at IS NULL OR finished_at >= started_at
    )
);

CREATE TABLE banuchat.ingestion_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ingestion_run_id uuid NOT NULL REFERENCES banuchat.ingestion_runs(id) ON DELETE CASCADE,
    document_version_id uuid REFERENCES banuchat.document_versions(id) ON DELETE SET NULL,
    external_key text NOT NULL,
    status text NOT NULL CHECK (
        status IN ('discovered', 'processed', 'skipped', 'failed')
    ),
    error_detail text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ingestion_items_external_key_not_blank CHECK (btrim(external_key) <> ''),
    CONSTRAINT ingestion_items_run_external_key_unique UNIQUE (ingestion_run_id, external_key)
);

-- Perfil deliberadamente pseudónimo; no requiere nombre, correo ni documento real.
CREATE TABLE banuchat.student_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonymous_key text NOT NULL UNIQUE,
    academic_program_code text,
    is_synthetic boolean NOT NULL DEFAULT true,
    lawful_basis_reference text,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT student_profiles_key_not_blank CHECK (btrim(pseudonymous_key) <> ''),
    CONSTRAINT student_profiles_lawful_basis_for_real_data CHECK (
        is_synthetic OR (
            lawful_basis_reference IS NOT NULL
            AND btrim(lawful_basis_reference) <> ''
        )
    )
);

COMMENT ON TABLE banuchat.student_profiles IS
    'Perfiles sintéticos o seudonimizados; los datos reales exigen referencia a una base legal o consentimiento.';

CREATE TABLE banuchat.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id uuid REFERENCES banuchat.student_profiles(id) ON DELETE SET NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT conversations_end_after_start CHECK (
        ended_at IS NULL OR ended_at >= started_at
    )
);

CREATE TABLE banuchat.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES banuchat.conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content text NOT NULL,
    insufficient_evidence boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT messages_content_not_blank CHECK (btrim(content) <> ''),
    CONSTRAINT messages_insufficient_evidence_role CHECK (
        NOT insufficient_evidence OR role = 'assistant'
    )
);

-- Admite citas de chunks y enlaces al documento completo, pero nunca ambos a la vez.
CREATE TABLE banuchat.message_citations (
    message_id uuid NOT NULL REFERENCES banuchat.messages(id) ON DELETE CASCADE,
    citation_index integer NOT NULL CHECK (citation_index >= 0),
    chunk_id uuid REFERENCES banuchat.document_chunks(id) ON DELETE RESTRICT,
    document_version_id uuid REFERENCES banuchat.document_versions(id) ON DELETE RESTRICT,
    cited_section text,
    cited_uri text,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, citation_index),
    CONSTRAINT message_citations_single_target CHECK (
        (chunk_id IS NOT NULL)::integer
        + (document_version_id IS NOT NULL)::integer = 1
    )
);

-- Registra la recuperación para reproducibilidad y evaluación de MRR/precision/recall.
CREATE TABLE banuchat.retrieval_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES banuchat.messages(id) ON DELETE SET NULL,
    embedding_model_id uuid NOT NULL
        REFERENCES banuchat.embedding_models(id) ON DELETE RESTRICT,
    query_text text NOT NULL,
    query_embedding vector NOT NULL,
    top_k integer NOT NULL CHECK (top_k > 0),
    duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT retrieval_runs_query_not_blank CHECK (btrim(query_text) <> '')
);

CREATE OR REPLACE FUNCTION banuchat.validate_query_embedding_dimensions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    expected_dimensions integer;
BEGIN
    SELECT dimensions
      INTO expected_dimensions
      FROM banuchat.embedding_models
     WHERE id = NEW.embedding_model_id;

    IF expected_dimensions IS NULL THEN
        RAISE EXCEPTION 'No existe el modelo de embeddings %', NEW.embedding_model_id;
    END IF;

    IF vector_dims(NEW.query_embedding) <> expected_dimensions THEN
        RAISE EXCEPTION
            'Dimensión de consulta inválida: se esperaban %, se recibieron %',
            expected_dimensions,
            vector_dims(NEW.query_embedding);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER retrieval_runs_validate_dimensions
BEFORE INSERT OR UPDATE OF query_embedding, embedding_model_id
ON banuchat.retrieval_runs
FOR EACH ROW
EXECUTE FUNCTION banuchat.validate_query_embedding_dimensions();

CREATE TABLE banuchat.retrieval_results (
    retrieval_run_id uuid NOT NULL REFERENCES banuchat.retrieval_runs(id) ON DELETE CASCADE,
    chunk_id uuid NOT NULL REFERENCES banuchat.document_chunks(id) ON DELETE RESTRICT,
    rank integer NOT NULL CHECK (rank > 0),
    cosine_distance double precision NOT NULL CHECK (
        cosine_distance >= 0 AND cosine_distance <= 2
    ),
    relevance_label boolean,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (retrieval_run_id, rank),
    CONSTRAINT retrieval_results_run_chunk_unique UNIQUE (retrieval_run_id, chunk_id)
);

COMMENT ON COLUMN banuchat.retrieval_results.relevance_label IS
    'Etiqueta opcional de evaluación; permite calcular precision, recall y MRR sobre datasets controlados.';

-- Búsqueda coseno exacta. Es reproducible para el corpus y dataset iniciales de OE1.
CREATE OR REPLACE FUNCTION banuchat.search_chunks_cosine(
    p_query_embedding vector,
    p_embedding_model_id uuid,
    p_match_count integer DEFAULT 10,
    p_max_distance double precision DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_version_id uuid,
    document_title text,
    section_title text,
    section_path text,
    page_start integer,
    page_end integer,
    content text,
    cosine_distance double precision,
    cosine_similarity double precision
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    expected_dimensions integer;
BEGIN
    IF p_match_count <= 0 THEN
        RAISE EXCEPTION 'p_match_count debe ser mayor que cero';
    END IF;

    IF p_max_distance IS NOT NULL AND (p_max_distance < 0 OR p_max_distance > 2) THEN
        RAISE EXCEPTION 'p_max_distance debe estar entre 0 y 2';
    END IF;

    SELECT em.dimensions
      INTO expected_dimensions
      FROM banuchat.embedding_models em
     WHERE em.id = p_embedding_model_id
       AND em.is_active;

    IF expected_dimensions IS NULL THEN
        RAISE EXCEPTION 'El modelo % no existe o está inactivo', p_embedding_model_id;
    END IF;

    IF vector_dims(p_query_embedding) <> expected_dimensions THEN
        RAISE EXCEPTION
            'Dimensión de consulta inválida: se esperaban %, se recibieron %',
            expected_dimensions,
            vector_dims(p_query_embedding);
    END IF;

    RETURN QUERY
    SELECT
        dc.id,
        dc.document_version_id,
        d.title,
        dc.section_title,
        dc.section_path,
        dc.page_start,
        dc.page_end,
        dc.content,
        (ce.embedding <=> p_query_embedding)::double precision AS cosine_distance,
        (1 - (ce.embedding <=> p_query_embedding))::double precision AS cosine_similarity
    FROM banuchat.chunk_embeddings ce
    JOIN banuchat.document_chunks dc ON dc.id = ce.chunk_id
    JOIN banuchat.document_versions dv ON dv.id = dc.document_version_id
    JOIN banuchat.documents d ON d.id = dv.document_id
    WHERE ce.embedding_model_id = p_embedding_model_id
      AND dv.processing_status = 'ready'
      AND d.is_active
      AND (
          p_max_distance IS NULL
          OR (ce.embedding <=> p_query_embedding) <= p_max_distance
      )
    ORDER BY ce.embedding <=> p_query_embedding, dc.id
    LIMIT p_match_count;
END;
$$;

-- Índices relacionales para joins y filtros frecuentes.
CREATE INDEX documents_source_id_idx
    ON banuchat.documents (source_id);
CREATE INDEX document_versions_document_id_idx
    ON banuchat.document_versions (document_id);
CREATE INDEX document_versions_status_idx
    ON banuchat.document_versions (processing_status);
CREATE INDEX document_chunks_version_id_idx
    ON banuchat.document_chunks (document_version_id);
CREATE INDEX chunk_embeddings_model_id_idx
    ON banuchat.chunk_embeddings (embedding_model_id);
CREATE INDEX ingestion_runs_source_started_idx
    ON banuchat.ingestion_runs (source_id, started_at DESC);
CREATE INDEX ingestion_items_version_id_idx
    ON banuchat.ingestion_items (document_version_id);
CREATE INDEX conversations_student_started_idx
    ON banuchat.conversations (student_profile_id, started_at DESC);
CREATE INDEX messages_conversation_created_idx
    ON banuchat.messages (conversation_id, created_at);
CREATE INDEX message_citations_chunk_id_idx
    ON banuchat.message_citations (chunk_id);
CREATE INDEX message_citations_version_id_idx
    ON banuchat.message_citations (document_version_id);
CREATE INDEX retrieval_runs_message_id_idx
    ON banuchat.retrieval_runs (message_id);
CREATE INDEX retrieval_results_chunk_id_idx
    ON banuchat.retrieval_results (chunk_id);

CREATE TRIGGER sources_set_updated_at
BEFORE UPDATE ON banuchat.sources
FOR EACH ROW EXECUTE FUNCTION banuchat.set_updated_at();

CREATE TRIGGER documents_set_updated_at
BEFORE UPDATE ON banuchat.documents
FOR EACH ROW EXECUTE FUNCTION banuchat.set_updated_at();

CREATE TRIGGER document_versions_set_updated_at
BEFORE UPDATE ON banuchat.document_versions
FOR EACH ROW EXECUTE FUNCTION banuchat.set_updated_at();

CREATE TRIGGER student_profiles_set_updated_at
BEFORE UPDATE ON banuchat.student_profiles
FOR EACH ROW EXECUTE FUNCTION banuchat.set_updated_at();

COMMIT;
