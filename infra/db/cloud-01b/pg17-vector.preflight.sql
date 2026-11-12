-- Guard for the reviewed public.vector transfer path. No provider changes.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, pg_temp;
DO $check$
DECLARE installed_schema text;
BEGIN
  IF current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'Expected PostgreSQL major 17';
  END IF;
  SELECT n.nspname INTO installed_schema FROM pg_extension e
  JOIN pg_namespace n ON n.oid=e.extnamespace
  WHERE e.extname='vector' AND e.extversion='0.8.2';
  IF installed_schema IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Expected pgvector 0.8.2 in public; review qualified SQL before using another schema';
  END IF;
  IF to_regtype('public.vector') IS NULL
     OR to_regoperator('public.<=>(public.vector,public.vector)') IS NULL
     OR to_regprocedure('public.vector_dims(public.vector)') IS NULL
     OR to_regprocedure('public.vector_norm(public.vector)') IS NULL THEN
    RAISE EXCEPTION 'Expected vector type, cosine operator and vector functions';
  END IF;
END
$check$;
ROLLBACK;
