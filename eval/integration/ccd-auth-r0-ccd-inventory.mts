/** Existing selected CCD only: read-only metadata, historical citations and derived artifacts. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {assertCcdChatDatabase} from '../../backend/api/src/ccd-runtime.js';
import {getDocumentArtifact} from '../../backend/api/src/application/document-artifact.js';
const require=createRequire(new URL('../../backend/api/package.json',import.meta.url));
const {Pool}=require('pg') as typeof import('pg');
const root=new URL('../../',import.meta.url),env=parseEnv(await readFile(new URL('infra/.env.ccd',root),'utf8'));
assert.equal(Number(env.CCD_POSTGRES_PORT??55433),55433);
const pool=new Pool({host:'127.0.0.1',port:55433,database:'banuchat_ccd_dev',user:env.CCD_POSTGRES_USER,password:env.CCD_POSTGRES_PASSWORD,connectionTimeoutMillis:5000});
const client=await pool.connect();
try{
 await client.query('BEGIN READ ONLY');await assertCcdChatDatabase(client);
 const baseline=JSON.parse(await readFile(new URL('data/ccd/evidence/increment-5/http-1792693227245.json',root),'utf8'));
 const releases=(await client.query(`SELECT r.id,r.status,d.current_release_id=r.id AS current,r.dataset_schema_version,
  r.manifest_sha256,r.pipeline_sha256,r.manifest->>'synthetic' AS synthetic,
  (SELECT count(*)::int FROM banuchat.document_versions v WHERE v.dataset_release_id=r.id) AS documents,
  (SELECT count(*)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id) AS chunks,
  (SELECT count(*)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id AND c.embedding IS NOT NULL) AS embeddings,
  e.model,e.dimension,e.distance_metric,e.config_sha256
  FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id JOIN banuchat.embedding_configs e ON e.id=r.embedding_config_id ORDER BY r.id`)).rows;
 assert.equal(releases.find(r=>r.current)?.id,baseline.release_id);
 for(const old of baseline.counts){const actual=releases.find(r=>r.id===old.id);assert.ok(actual);for(const key of ['status','current','documents','chunks','embeddings'])assert.equal(actual[key],old[key]);}
 let checkedCitations=0;for(const old of baseline.citations){
  const row=(await client.query(`SELECT c.dataset_release_id,c.locator,v.source_sha256,v.source_path
   FROM banuchat.document_chunks c JOIN banuchat.document_versions v ON v.id=c.document_version_id AND v.dataset_release_id=c.dataset_release_id
   WHERE c.id=$1 AND v.id=$2`,[old.chunk_id,old.document_version_id])).rows[0];
  assert.ok(row);assert.equal(row.dataset_release_id,old.dataset_release_id);assert.equal(row.locator,old.source_locator);assert.equal(row.source_sha256,old.source_sha256);assert.equal(row.source_path,old.source_path);checkedCitations++;
 }
 const storage={root:fileURLToPath(new URL('data/ccd/local/m01-m12/',root)),version_roots:{
  'bch03-m01-m12-local-1':fileURLToPath(new URL('data/ccd/local/m01-m12/',root)),
  'bch03-ccd-local-2':fileURLToPath(new URL('data/ccd/local/expanded-v2/',root)),
  'bch03-ccd-local-3':fileURLToPath(new URL('data/ccd/local/guidance-v3/',root))}};
 const versions=(await client.query('SELECT id,source_sha256 FROM banuchat.document_versions ORDER BY id')).rows;
 for(const v of versions){const artifact=await getDocumentArtifact(client,{document_version_id:v.id},storage);assert.equal(createHash('sha256').update(artifact.bytes).digest('hex'),v.source_sha256);}
 const result={checkpoint:'BCH-05/CCD-AUTH-R0',observed_at:new Date().toISOString(),read_only:true,original_external_access:false,
  releases,baseline_citations_verified:checkedCitations,derived_artifact_versions_verified:versions.length,new_http_or_generation:false};
 await client.query('ROLLBACK');
 await writeFile(new URL('eval/integration/results/bch05-ccd-auth-r0-ccd-inventory.json',root),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({releases:releases.length,current:baseline.release_id,citations:checkedCitations,artifacts:versions.length,read_only:true}));
}finally{client.release();await pool.end();}
