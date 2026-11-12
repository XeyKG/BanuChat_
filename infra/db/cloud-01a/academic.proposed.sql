-- Propuesta CLOUD-01A. Fuera de la cadena histórica de migraciones.
-- Ejecutar solo en un destino local dedicado después de validar la receta.
BEGIN;
SET LOCAL search_path = pg_catalog;

DO $guard$
BEGIN
  IF current_database() <> 'banuchat_cloud01a'
     OR current_setting('banuchat_auth.target_database', true) IS DISTINCT FROM current_database()
     OR to_regclass('banuchat_aux.product_config') IS NOT NULL
     OR to_regclass('banuchat.ccd_demo_contexts') IS NOT NULL
     OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NOT NULL
     OR (SELECT count(*) FROM banuchat.datasets) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM banuchat.datasets d
       JOIN banuchat.dataset_releases r
         ON r.id = d.current_release_id AND r.dataset_id = d.id
       WHERE d.id = 1 AND d.name = 'banuchat-synthetic' AND r.status = 'ready'
     )
     OR EXISTS (
       SELECT 1 FROM banuchat.dataset_releases
       WHERE dataset_id <> 1 OR manifest->'synthetic' IS DISTINCT FROM 'true'::jsonb
     )
  THEN
    RAISE EXCEPTION 'CLOUD-01A requires a dedicated synthetic database and an explicit target';
  END IF;
END
$guard$;

CREATE SCHEMA banuchat_academic;
REVOKE ALL ON SCHEMA banuchat_academic FROM PUBLIC;

CREATE TABLE banuchat_academic.programs (
  dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
  program_key banuchat.stable_key NOT NULL,
  name banuchat.nonblank NOT NULL,
  PRIMARY KEY (dataset_release_id, program_key)
);

CREATE TABLE banuchat_academic.periods (
  dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
  period_key banuchat.stable_key NOT NULL,
  label banuchat.nonblank NOT NULL,
  PRIMARY KEY (dataset_release_id, period_key)
);

CREATE TABLE banuchat_academic.students (
  dataset_release_id uuid NOT NULL,
  profile_key banuchat.stable_key NOT NULL,
  academic_id text NOT NULL CHECK (academic_id ~ '^SIM-[0-9]{4}$'),
  given_name banuchat.nonblank NOT NULL,
  family_name banuchat.nonblank NOT NULL,
  email text NOT NULL CHECK (email ~ '^student-[0-9]{4}@banuchat[.]test$'),
  program_key banuchat.stable_key NOT NULL,
  current_semester smallint NOT NULL CHECK (current_semester > 0),
  current_period_key banuchat.stable_key NOT NULL,
  PRIMARY KEY (dataset_release_id, profile_key),
  UNIQUE (dataset_release_id, academic_id),
  UNIQUE (dataset_release_id, email),
  FOREIGN KEY (dataset_release_id, profile_key)
    REFERENCES banuchat.synthetic_profiles(dataset_release_id, profile_key),
  FOREIGN KEY (dataset_release_id, program_key)
    REFERENCES banuchat_academic.programs(dataset_release_id, program_key),
  FOREIGN KEY (dataset_release_id, current_period_key)
    REFERENCES banuchat_academic.periods(dataset_release_id, period_key)
);

CREATE TABLE banuchat_academic.course_attempts (
  dataset_release_id uuid NOT NULL,
  profile_key banuchat.stable_key NOT NULL,
  course_key banuchat.stable_key NOT NULL,
  attempt_number smallint NOT NULL CHECK (attempt_number > 0),
  period_key banuchat.stable_key NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('in_progress', 'passed', 'failed')),
  -- Escala 0–100 de demostración. El resultado se declara por separado.
  grade_percent numeric(5,2) CHECK (grade_percent BETWEEN 0 AND 100),
  CHECK (outcome <> 'in_progress' OR grade_percent IS NULL),
  PRIMARY KEY (dataset_release_id, profile_key, course_key, attempt_number),
  FOREIGN KEY (dataset_release_id, profile_key)
    REFERENCES banuchat_academic.students(dataset_release_id, profile_key),
  FOREIGN KEY (dataset_release_id, course_key)
    REFERENCES banuchat.courses(dataset_release_id, course_key),
  FOREIGN KEY (dataset_release_id, period_key)
    REFERENCES banuchat_academic.periods(dataset_release_id, period_key)
);

REVOKE ALL ON ALL TABLES IN SCHEMA banuchat_academic FROM PUBLIC;
COMMIT;
