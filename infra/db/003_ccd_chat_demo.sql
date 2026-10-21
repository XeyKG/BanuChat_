-- BCH-03/3: local technical context outside the immutable corpus; never a student.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'banuchat_ccd_dev'
    OR EXISTS (SELECT 1 FROM banuchat.conversations)
    OR EXISTS (SELECT 1 FROM banuchat.synthetic_profiles)
    OR (SELECT count(*) FROM banuchat.datasets d JOIN banuchat.dataset_releases r
      ON r.id=d.current_release_id WHERE d.name='banuchat-ccd-local' AND r.status='ready'
        AND r.manifest->'synthetic'='false'::jsonb AND r.manifest->>'schema_version'='ccd-1.0.0') <> 1 THEN
    RAISE EXCEPTION 'CCD chat migration requires the isolated published CCD corpus and no prior chats or student profiles';
  END IF;
END $$;

CREATE TABLE banuchat.ccd_demo_contexts (
  dataset_release_id uuid NOT NULL REFERENCES banuchat.dataset_releases(id),
  profile_key banuchat.stable_key NOT NULL CHECK (profile_key='ccd-local-demo'),
  alias banuchat.nonblank NOT NULL CHECK (alias='Demostración CCD local — sin identidad institucional'),
  PRIMARY KEY (dataset_release_id,profile_key)
);
COMMENT ON TABLE banuchat.ccd_demo_contexts IS
  'Local shared demo context; not a corpus item, synthetic student, authentication or institutional identity.';
INSERT INTO banuchat.ccd_demo_contexts
SELECT current_release_id,'ccd-local-demo','Demostración CCD local — sin identidad institucional'
FROM banuchat.datasets WHERE name='banuchat-ccd-local';
CREATE TRIGGER immutable_row BEFORE UPDATE OR DELETE ON banuchat.ccd_demo_contexts
FOR EACH ROW EXECUTE FUNCTION banuchat.reject_mutation();

ALTER TABLE banuchat.conversations DROP CONSTRAINT conversations_dataset_release_id_profile_key_fkey;
ALTER TABLE banuchat.conversations ADD CONSTRAINT conversations_ccd_demo_context_fkey
  FOREIGN KEY (dataset_release_id,profile_key)
  REFERENCES banuchat.ccd_demo_contexts(dataset_release_id,profile_key);
COMMIT;
