\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $check$
DECLARE
  active_release uuid;
  base_release uuid;
BEGIN
  IF current_database() <> 'banuchat_cloud01a' THEN
    RAISE EXCEPTION 'CLOUD-01A.2: destino rechazado';
  END IF;
  SELECT r.id, (r.manifest->'academic_successor'->>'base_release_id')::uuid
    INTO STRICT active_release, base_release
  FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id = d.current_release_id
  WHERE d.id = 1 AND d.name = 'banuchat-synthetic' AND r.status = 'ready';

  IF base_release IS NULL OR NOT EXISTS (
    SELECT 1 FROM banuchat.dataset_releases r JOIN banuchat.dataset_releases b
      ON b.id = base_release AND b.status = 'ready' AND b.embedding_config_id = r.embedding_config_id
    WHERE r.id = active_release
  ) OR (SELECT count(*) FROM banuchat.document_chunks WHERE dataset_release_id = active_release) <> 60
  THEN RAISE EXCEPTION 'CLOUD-01A.2: configuración o conteo vectorial inesperado'; END IF;

  IF EXISTS (
    WITH vectors AS (
      SELECT c.dataset_release_id, v.document_id, c.ordinal, c.content_sha256,
        c.embedding::text AS embedding, public.vector_dims(c.embedding) AS dims
      FROM banuchat.document_chunks c JOIN banuchat.document_versions v ON v.id = c.document_version_id
      WHERE c.dataset_release_id IN (base_release, active_release)
    )
    SELECT 1 FROM (SELECT * FROM vectors WHERE dataset_release_id = base_release) b
    FULL JOIN (SELECT * FROM vectors WHERE dataset_release_id = active_release) a
      USING (document_id, ordinal)
    WHERE a.dims IS DISTINCT FROM 1024 OR b.dims IS DISTINCT FROM 1024
      OR a.content_sha256 IS DISTINCT FROM b.content_sha256 OR a.embedding IS DISTINCT FROM b.embedding
  ) THEN RAISE EXCEPTION 'CLOUD-01A.2: los vectores o chunks difieren de la release base'; END IF;
END
$check$;
ROLLBACK;
