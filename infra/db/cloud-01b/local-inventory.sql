-- Private evidence. Includes fingerprints of auth/session tables, never row contents.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $guard$
BEGIN
  IF current_database() <> 'banuchat_cloud01a'
     OR (SELECT count(*) FROM banuchat.datasets) <> 1
     OR NOT EXISTS (SELECT 1 FROM banuchat.datasets WHERE id=1 AND name='banuchat-synthetic')
     OR EXISTS (SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id<>1
       OR manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb)
     OR to_regnamespace('banuchat_aux') IS NOT NULL
     OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
  THEN RAISE EXCEPTION 'CLOUD-01B.0: synthetic lab scope rejected'; END IF;
END
$guard$;
SELECT format($sql$SELECT %L AS table_name, count(*) AS rows,
  encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\n'
    ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS sha256 FROM %I.%I t$sql$,
  table_schema||'.'||table_name,table_schema,table_name)
FROM information_schema.tables WHERE table_type='BASE TABLE'
  AND table_schema IN ('banuchat','banuchat_auth','banuchat_academic')
ORDER BY table_schema,table_name
\gexec

SELECT d.current_release_id, r.id, r.status, r.manifest_sha256, r.embedding_config_id,
       c.provider, c.model, c.model_revision, c.dimension, c.distance_metric,
       count(ch.id) AS chunks, count(ch.embedding) AS vectors,
       count(ch.id) FILTER (WHERE public.vector_dims(ch.embedding)=1024) AS vectors_1024
FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id
JOIN banuchat.embedding_configs c ON c.id=r.embedding_config_id
LEFT JOIN banuchat.document_chunks ch ON ch.dataset_release_id=r.id
GROUP BY d.current_release_id,r.id,c.id ORDER BY r.id;
SELECT n.nspname AS schema,p.oid::regprocedure AS signature,pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef,p.proconfig,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('banuchat','banuchat_auth','banuchat_academic')
ORDER BY n.nspname,p.oid::regprocedure::text;
SELECT nspname,nspacl FROM pg_namespace
WHERE nspname IN ('banuchat','banuchat_auth','banuchat_academic') ORDER BY nspname;
SELECT n.nspname,c.relname,pg_get_userbyid(c.relowner) AS owner,c.relacl,c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('banuchat','banuchat_auth','banuchat_academic') AND c.relkind='r'
ORDER BY n.nspname,c.relname;
ROLLBACK;
