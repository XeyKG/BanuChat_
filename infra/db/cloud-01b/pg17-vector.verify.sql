\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $check$
BEGIN
  IF current_database() <> 'postgres'
     OR (SELECT count(*) FROM banuchat.datasets) <> 1
     OR NOT EXISTS (SELECT 1 FROM banuchat.datasets WHERE id=1 AND name='banuchat-synthetic')
     OR (SELECT count(*) FROM banuchat.dataset_releases WHERE status='ready') <> 2
     OR EXISTS (SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id<>1
       OR manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb)
     OR (SELECT count(*) FROM banuchat.document_chunks) <> 120
     OR EXISTS (SELECT 1 FROM banuchat.document_chunks WHERE
       public.vector_dims(embedding) IS DISTINCT FROM 1024 OR public.vector_norm(embedding)<=0
       OR abs(embedding OPERATOR(public.<=>) embedding)>0.000001)
     OR (SELECT format_type(atttypid,atttypmod) FROM pg_attribute
       WHERE attrelid='banuchat.document_chunks'::regclass AND attname='embedding')
       IS DISTINCT FROM 'public.vector(1024)'
     OR to_regprocedure('banuchat.search_chunks_cosine(public.vector,integer,uuid)') IS NULL
     OR to_regprocedure('banuchat_auth.retrieve_document_chunks(uuid,public.vector,integer)') IS NULL
     OR EXISTS (SELECT 1 FROM pg_index WHERE indrelid='banuchat.document_chunks'::regclass
       AND (NOT indisvalid OR NOT indisready))
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indrelid='banuchat.document_chunks'::regclass AND indisprimary)
  THEN RAISE EXCEPTION 'Synthetic vector transfer verification failed'; END IF;
END
$check$;
SELECT r.id,count(c.id) AS vectors_1024
FROM banuchat.dataset_releases r JOIN banuchat.document_chunks c ON c.dataset_release_id=r.id
GROUP BY r.id ORDER BY r.id;
ROLLBACK;
