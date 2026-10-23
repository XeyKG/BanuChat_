-- AUTH-P1 disposable-instance fixture ONLY. No files, history, embeddings or runtime provenance.
BEGIN;
INSERT INTO banuchat.datasets(id,name) VALUES (1,'banuchat-synthetic');
INSERT INTO banuchat.embedding_configs(id,provider,model,model_revision,parameters)
VALUES ('10000000-0000-4000-8000-000000000001','synthetic-test','auth-fixture-no-model',
        'AUTH-P1-NO-MODEL-OR-EMBEDDINGS','{"query":{},"document":{},"runtime_version":"auth-p1-fixture-only"}');
INSERT INTO banuchat.dataset_releases(id,git_revision,dataset_schema_version,manifest,pipeline_config,embedding_config_id)
VALUES ('10000000-0000-4000-8000-000000000002',repeat('1',40),'auth-p1-test-only',
        jsonb_build_object('synthetic',true,'items',jsonb_build_array(jsonb_build_object(
          'kind','profile','key','auth_fixture','path','profiles/auth-fixture.json',
          'locator','auth-fixture-only','sha256',repeat('f',64)))),
        '{"synthetic_auth_test":true}', '10000000-0000-4000-8000-000000000001');
INSERT INTO banuchat.ingestion_runs(id,dataset_release_id,attempt_no,workflow_ref,trigger_type)
VALUES ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002',1,'auth-p1-sql-fixture-only','manual');
INSERT INTO banuchat.synthetic_profiles(dataset_release_id,profile_key,alias,source_path,source_locator,source_sha256)
VALUES ('10000000-0000-4000-8000-000000000002','auth_fixture','Perfil ficticio AUTH-P1',
        'profiles/auth-fixture.json','auth-fixture-only',repeat('f',64));
INSERT INTO banuchat.ingestion_items(dataset_release_id,ingestion_run_id,source_kind,record_key,
                                    source_path,source_locator,source_sha256,status,finished_at)
VALUES ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003',
        'profile','auth_fixture','profiles/auth-fixture.json','auth-fixture-only',repeat('f',64),'processed',clock_timestamp());
UPDATE banuchat.ingestion_runs SET status='succeeded',finished_at=clock_timestamp()
WHERE id='10000000-0000-4000-8000-000000000003';
SELECT banuchat.publish_release('10000000-0000-4000-8000-000000000002');
COMMIT;
