-- Fixture-only tables in the existing, previously empty postgres database of the
-- isolated synthetic container. Never apply to Unified, CCD, or the demo baseline.
BEGIN;
DO $$ BEGIN
 IF current_database()<>'postgres' OR to_regnamespace('banuchat') IS NOT NULL
 OR to_regclass('public.oe2_pipeline_scope') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public')
 THEN RAISE EXCEPTION 'OE2 isolated bootstrap target rejected'; END IF;
END $$;
CREATE TABLE public.oe2_pipeline_scope(singleton boolean PRIMARY KEY CHECK(singleton),
 marker text NOT NULL CHECK(marker='fictional-oe2-pipeline-demo-02'),embedding_config_id uuid NOT NULL);
COMMENT ON COLUMN public.oe2_pipeline_scope.embedding_config_id IS
 'Existing synthetic baseline identity for read-service compatibility only; no embeddings generated or copied by OE2.';
CREATE TABLE public.oe2_pipeline_releases(id uuid PRIMARY KEY,dataset_id smallint NOT NULL DEFAULT 1 CHECK(dataset_id=1),
 status text NOT NULL CHECK(status IN ('staging','ready')),embedding_config_id uuid NOT NULL,
 content_sha256 text NOT NULL UNIQUE CHECK(content_sha256 ~ '^[a-f0-9]{64}$'),
 approval_ref text NOT NULL, candidate_text text NOT NULL CHECK((candidate_text::jsonb)->>'policy'='oe2-pipeline-demo-1'
 AND (candidate_text::jsonb)->'synthetic'='true'::jsonb),
 published_at timestamptz, CHECK((status='ready')=(published_at IS NOT NULL)));
CREATE TABLE public.oe2_pipeline_datasets(id smallint PRIMARY KEY CHECK(id=1),
 name text NOT NULL CHECK(name='banuchat-oe2-pipeline-fixtures'),current_release_id uuid REFERENCES public.oe2_pipeline_releases(id));
INSERT INTO public.oe2_pipeline_datasets VALUES(1,'banuchat-oe2-pipeline-fixtures',NULL);
CREATE TABLE public.oe2_pipeline_sources(dataset_release_id uuid NOT NULL REFERENCES public.oe2_pipeline_releases(id),
 category text NOT NULL CHECK(category IN ('academic_offer','calls','news')),source_id text NOT NULL,
 CHECK((category='academic_offer' AND source_id='fixture-academic-offer-v1') OR (category='calls' AND source_id='fixture-calls-v1') OR (category='news' AND source_id='fixture-news-v1')),
 fixture_sha256 text NOT NULL CHECK(fixture_sha256 ~ '^[a-f0-9]{64}$'),snapshot_sha256 text NOT NULL,
 snapshot_json text NOT NULL CHECK(snapshot_sha256=encode(sha256(convert_to(snapshot_json,'UTF8')),'hex')),
 PRIMARY KEY(dataset_release_id,category),UNIQUE(dataset_release_id,category,source_id));
CREATE TABLE public.oe2_pipeline_origins(dataset_release_id uuid NOT NULL,category text NOT NULL,source_id text NOT NULL,
 record_id text NOT NULL,record_sha256 text NOT NULL CHECK(record_sha256 ~ '^[a-f0-9]{64}$'),
 source_version text NOT NULL,published_at timestamptz NOT NULL,fields jsonb NOT NULL,
 PRIMARY KEY(dataset_release_id,category,record_id),
 FOREIGN KEY(dataset_release_id,category,source_id) REFERENCES public.oe2_pipeline_sources(dataset_release_id,category,source_id));
CREATE TABLE public.oe2_pipeline_announcements(dataset_release_id uuid NOT NULL,
 announcement_key text NOT NULL CHECK(announcement_key ~ '^[a-z0-9][a-z0-9_-]{0,127}$'),
 category text NOT NULL CHECK(category IN ('calls','news')),record_id text NOT NULL,title text NOT NULL,description text NOT NULL,
 valid_from timestamptz NOT NULL,valid_until timestamptz,source_path text NOT NULL CHECK(source_path LIKE 'announcements/%'),
 source_locator text NOT NULL,source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(dataset_release_id,announcement_key),CHECK(valid_until IS NULL OR valid_until>=valid_from),
 CHECK(category<>'news' OR valid_until IS NULL),
 FOREIGN KEY(dataset_release_id,category,record_id) REFERENCES public.oe2_pipeline_origins(dataset_release_id,category,record_id));
CREATE TABLE public.oe2_pipeline_programming(dataset_release_id uuid NOT NULL,programming_key text NOT NULL,
 category text NOT NULL CHECK(category='academic_offer'),record_id text NOT NULL,title text NOT NULL,
 course_code text NOT NULL,period text NOT NULL,mode text NOT NULL,start_date date NOT NULL,end_date date NOT NULL,
 source_path text NOT NULL,source_locator text NOT NULL,source_sha256 text NOT NULL,
 PRIMARY KEY(dataset_release_id,programming_key),CHECK(start_date<=end_date),
 FOREIGN KEY(dataset_release_id,category,record_id) REFERENCES public.oe2_pipeline_origins(dataset_release_id,category,record_id));
CREATE FUNCTION public.oe2_pipeline_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='oe2_pipeline_releases' THEN
  IF TG_OP='DELETE' OR OLD.status='ready' THEN RAISE EXCEPTION 'Immutable demo release'; END IF;
 ELSE
  IF TG_OP<>'INSERT' OR NOT EXISTS(SELECT 1 FROM public.oe2_pipeline_releases WHERE id=NEW.dataset_release_id AND status='staging')
  THEN RAISE EXCEPTION 'Immutable demo records'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.oe2_pipeline_releases FOR EACH ROW EXECUTE FUNCTION public.oe2_pipeline_immutable();
CREATE TRIGGER immutable BEFORE INSERT OR UPDATE OR DELETE ON public.oe2_pipeline_sources FOR EACH ROW EXECUTE FUNCTION public.oe2_pipeline_immutable();
CREATE TRIGGER immutable BEFORE INSERT OR UPDATE OR DELETE ON public.oe2_pipeline_origins FOR EACH ROW EXECUTE FUNCTION public.oe2_pipeline_immutable();
CREATE TRIGGER immutable BEFORE INSERT OR UPDATE OR DELETE ON public.oe2_pipeline_announcements FOR EACH ROW EXECUTE FUNCTION public.oe2_pipeline_immutable();
CREATE TRIGGER immutable BEFORE INSERT OR UPDATE OR DELETE ON public.oe2_pipeline_programming FOR EACH ROW EXECUTE FUNCTION public.oe2_pipeline_immutable();
CREATE FUNCTION public.oe2_pipeline_pointer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.current_release_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.oe2_pipeline_releases WHERE id=NEW.current_release_id AND status='ready')
 THEN RAISE EXCEPTION 'Invalid demo pointer'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER pointer_ready BEFORE UPDATE ON public.oe2_pipeline_datasets FOR EACH ROW EXECUTE FUNCTION public.oe2_pipeline_pointer_guard();
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON FUNCTION public.oe2_pipeline_immutable(),public.oe2_pipeline_pointer_guard() FROM PUBLIC;
COMMIT;
