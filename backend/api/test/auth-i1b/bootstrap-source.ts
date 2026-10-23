/** Frozen-source equivalence oracle and reviewed construction of the CCD branch. */
import {readFile} from 'node:fs/promises';
const root=new URL('../../../../',import.meta.url);
const read=(file:string)=>readFile(new URL('infra/db/'+file,root),'utf8').then(s=>s.replaceAll('\r\n','\n'));
export async function ccdBootstrapSource(){
 const [six,seven,eight,ten]=await Promise.all(['006_synthetic_auth.sql','007_authenticated_resources.sql','008_verified_recovery_email.sql','010_authenticated_document_reads.sql'].map(read));
 let tables=six!.slice(six!.indexOf('CREATE SCHEMA banuchat_auth;'),six!.lastIndexOf('COMMIT;'));
 tables=tables.replace("CHECK (char_length(synthetic_uid) = 13 AND synthetic_uid ~ '^BCH-DEMO-[0-9]{4}$')",()=>`CHECK ((char_length(synthetic_uid)=13 AND synthetic_uid COLLATE "C" ~ '^BCH-DEMO-[0-9]{4}$') OR (char_length(synthetic_uid)=9 AND synthetic_uid COLLATE "C" ~ '^U[0-9]{8}$'))`)
  .replaceAll('profile_key banuchat.stable_key NOT NULL,',"profile_key banuchat.stable_key NOT NULL CHECK (profile_key='ccd-local-demo'),")
  .replaceAll('REFERENCES banuchat.synthetic_profiles(dataset_release_id, profile_key)','REFERENCES banuchat.ccd_demo_contexts(dataset_release_id, profile_key)')
  .replace("DEFAULT 'synthetic' CHECK (mode = 'synthetic')","DEFAULT 'ccd_local' CHECK (mode = 'ccd_local')");
 let resources=seven!.slice(seven!.indexOf('CREATE ROLE banuchat_auth_executor'),seven!.lastIndexOf('COMMIT;'))
  .replace('database_name name NOT NULL',"database_name name NOT NULL, evidence_mode text NOT NULL CHECK(evidence_mode='ccd_local'), dataset_name text NOT NULL CHECK(dataset_name='banuchat-ccd-local')")
  .replace("current_database());","current_database(),'ccd_local','banuchat-ccd-local');")
  .replaceAll("g.mode='synthetic'","g.mode='ccd_local'")
  .replaceAll("d.name='banuchat-synthetic'","d.name='banuchat-ccd-local'")
  .replaceAll("r.manifest->'synthetic'='true'::jsonb","r.manifest->'synthetic'='false'::jsonb");
 resources=resources.replace('GRANT SELECT(principal_id)', 'GRANT SELECT ON banuchat.ccd_demo_contexts TO banuchat_auth_executor;\nGRANT SELECT(principal_id)');
 const recovery=eight!.slice(eight!.indexOf('-- Intrinsic account metadata'),eight!.lastIndexOf('COMMIT;'));
 const reads=ten!.slice(ten!.indexOf('CREATE FUNCTION banuchat_auth.retrieve_document_chunks'),ten!.lastIndexOf('COMMIT;'))
  .replaceAll("d.name = 'banuchat-synthetic'","d.name = 'banuchat-ccd-local'")
  .replaceAll("r.manifest->'synthetic' = 'true'::jsonb","r.manifest->'synthetic' = 'false'::jsonb")
  .replace("OR current_database() ~* 'ccd'","OR current_database() <> 'banuchat_ccd_auth_i1b_test'");
 return `-- BCH-D37 / CCD-AUTH-I1B: explicit CCD branch, not sequential 006-010.\n-- Shared objects derived from frozen 006/007/008/010; differences tested by bootstrap-source.\nBEGIN;\nSET LOCAL search_path=pg_catalog;\nDO $guard$\nDECLARE runtime_name text:=current_setting('banuchat_auth.runtime_role',true);\nBEGIN\n IF current_setting('banuchat_auth.target_database',true) IS DISTINCT FROM current_database()\n OR current_database()<>'banuchat_ccd_auth_i1b_test'\n OR to_regnamespace('banuchat_auth') IS NOT NULL\n OR to_regprocedure('banuchat.validate_ccd_manifest(jsonb)') IS NULL\n OR EXISTS(SELECT 1 FROM banuchat.synthetic_profiles)\n OR EXISTS(SELECT 1 FROM banuchat.conversations)\n OR EXISTS(SELECT 1 FROM banuchat.messages)\n OR EXISTS(SELECT 1 FROM banuchat.message_citations)\n OR (SELECT count(*) FROM banuchat.datasets)<>1\n OR (SELECT count(*) FROM banuchat.dataset_releases)<>3\n OR EXISTS(SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id<>1 OR status<>'ready'\n   OR (manifest->'synthetic'='false'::jsonb) IS NOT TRUE\n   OR manifest->>'schema_version' NOT IN ('ccd-1.0.0','ccd-1.1.0','ccd-1.2.0'))\n OR NOT EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id AND r.dataset_id=d.id\n   JOIN banuchat.ccd_demo_contexts c ON c.dataset_release_id=r.id AND c.profile_key='ccd-local-demo'\n   WHERE d.id=1 AND d.name='banuchat-ccd-local' AND r.id='3d6cedac-0e86-40c8-909b-d3ff6e8ab741'::uuid)\n OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='banuchat.conversations'::regclass\n   AND confrelid='banuchat.ccd_demo_contexts'::regclass AND contype='f' AND convalidated)\n OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=runtime_name AND rolcanlogin AND NOT rolsuper\n   AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls)\n OR current_setting('banuchat_auth.deployment_id',true) IS NULL\n THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='CCD authenticated bootstrap target rejected'; END IF;\nEND $guard$;\n\n${tables}\n${resources}\n${recovery}\n${reads}\nCOMMIT;\n`;
}
