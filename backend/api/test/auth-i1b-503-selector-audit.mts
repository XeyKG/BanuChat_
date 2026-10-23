/** Pure selector check from current metadata; no documents/vectors, model calls or business writes. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {environment,root,evidence,fingerprint,local} from './auth-i1b/environment.js';
import {selectCcdEvidence} from '../src/chat/document-evidence.js';
import type {RetrievedDocumentChunk} from '../src/application/document-retrieval.js';
const e=await environment();assert.equal(e.database,'banuchat_ccd_auth_i1b_test');assert.equal(e.port,55443);
const db=new Pool({host:'127.0.0.1',port:e.port,database:e.database,user:e.admin,password:e.adminPassword,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000,statement_timeout:15000});
try{
 const rows=(await db.query(`SELECT v.title,c.locator AS chunk_locator FROM banuchat.datasets d JOIN banuchat.document_chunks c ON c.dataset_release_id=d.current_release_id JOIN banuchat.document_versions v ON v.id=c.document_version_id AND v.dataset_release_id=c.dataset_release_id WHERE d.id=1 ORDER BY c.id`)).rows;
 const metadata=rows as unknown as RetrievedDocumentChunk[];
 const cases=[{case:'short_title_control',query:'Describe los temas del curso IA Generativa.'},
  {case:'long_title_reproduction',query:'Describe el temario de Inteligencia Artificial Generativa.'},
  {case:'operator_reported_wording_pure_check_only',query:'¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?'}]
  .map(c=>{const selected=selectCcdEvidence(metadata,c.query,[]);return{case:c.case,selected_count:selected.length,only_target_syllabus:selected.length===1&&selected[0]!.chunk_locator==='unit:M02:DOC-101'};});
 assert.equal(cases[0]!.selected_count,1);assert.equal(cases[1]!.selected_count,10);assert.equal(cases[2]!.selected_count,10);
 const initial=JSON.parse(await readFile(new URL('eval/auth/results/bch05-ccd-auth-i1b-503-reproduction.json',root),'utf8'));
 const corpus=await fingerprint(db,true);assert.equal(corpus,initial.corpus_before);
 const fixture=JSON.parse(await readFile(new URL('diagnosis/fixtures.json',local),'utf8'));
 const fixtureCounts=(await db.query(`SELECT (SELECT count(*)::int FROM banuchat_auth.sessions WHERE principal_id=$1 AND revoked_at IS NULL) AS unrevoked_fixture_sessions,(SELECT count(*)::int FROM banuchat.messages WHERE conversation_id=ANY($2::uuid[])) AS fixture_messages`,[fixture.principal,fixture.conversations])).rows[0];
 await evidence('503-selector-audit',{checkpoint:'BCH-05/CCD-AUTH-I1B/503 diagnosis',at:new Date().toISOString(),database:e.database,metadata_rows:rows.length,cases,sql_read_only:true,model_calls:0,corpus_unchanged:true,corpus_sha256:corpus,fixture_counts:fixtureCounts,operator_wording_not_sent_over_http:true});
 console.log(JSON.stringify({cases,corpus_unchanged:true,fixture_counts:fixtureCounts}));
}finally{await db.end();}
