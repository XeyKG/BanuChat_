-- Run as the restricted runtime role with fresh access tokens supplied in the
-- process environment. Changes to session timestamps are rolled back.
\set ON_ERROR_STOP on
\getenv cloud_a CLOUD01A_TOKEN_A
\getenv cloud_b CLOUD01A_TOKEN_B
\getenv cloud_empty CLOUD01A_TOKEN_EMPTY
\getenv cloud_legacy_profile CLOUD01A_TOKEN_LEGACY_PROFILE
BEGIN;
SET LOCAL search_path = pg_catalog, pg_temp;
SELECT set_config('banuchat_cloud.token_a', :'cloud_a', true) IS NOT NULL,
       set_config('banuchat_cloud.token_b', :'cloud_b', true) IS NOT NULL,
       set_config('banuchat_cloud.token_empty', :'cloud_empty', true) IS NOT NULL,
       set_config('banuchat_cloud.token_legacy_profile', :'cloud_legacy_profile', true) IS NOT NULL;
DO $check$
DECLARE
  a record;
  b record;
  empty_student record;
BEGIN
  IF current_database() <> 'banuchat_cloud01a'
     OR has_table_privilege(current_user, 'banuchat_academic.students', 'SELECT')
     OR has_any_column_privilege(current_user, 'banuchat_academic.students', 'SELECT')
     OR has_table_privilege(current_user, 'banuchat_academic.course_attempts', 'SELECT')
     OR has_any_column_privilege(current_user, 'banuchat_academic.course_attempts', 'SELECT')
     OR to_regprocedure('banuchat_academic.read_me(text,text)') IS NOT NULL
  THEN RAISE EXCEPTION 'CLOUD-01A.2: acceso directo o selector no permitido'; END IF;

  SELECT * INTO STRICT a FROM banuchat_academic.read_me(current_setting('banuchat_cloud.token_a'));
  SELECT * INTO STRICT b FROM banuchat_academic.read_me(current_setting('banuchat_cloud.token_b'));
  SELECT * INTO STRICT empty_student FROM banuchat_academic.read_me(current_setting('banuchat_cloud.token_empty'));
  IF EXISTS (SELECT 1 FROM banuchat_academic.read_me(current_setting('banuchat_cloud.token_legacy_profile')))
  THEN RAISE EXCEPTION 'CLOUD-01A.2: se esperaba un perfil sin estudiante académico'; END IF;
  IF a.student->>'academic_id' IS DISTINCT FROM 'SIM-0001'
     OR b.student->>'academic_id' IS DISTINCT FROM 'SIM-0002'
     OR empty_student.student->>'academic_id' IS DISTINCT FROM 'SIM-0032'
     OR a.attempts->0->>'outcome' IS DISTINCT FROM 'failed'
     OR a.attempts->1->>'outcome' IS DISTINCT FROM 'passed'
     OR b.attempts->1->>'outcome' IS DISTINCT FROM 'in_progress'
     OR empty_student.attempts IS DISTINCT FROM '[]'::jsonb
  THEN RAISE EXCEPTION 'CLOUD-01A.2: identidad o historial inesperados'; END IF;
END
$check$;
ROLLBACK;
