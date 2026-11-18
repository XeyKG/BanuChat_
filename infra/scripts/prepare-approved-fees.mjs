// Local-only exporter: six approved fee references, or the reviewed 107-claim corpus with --full.
// and must remain outside Git. Does not upload, alter source rows or regenerate vectors.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const full=process.argv.includes('--full');
const expectedCount=full?107:6;
const releaseId=randomUUID();
const output=resolve(process.argv[2]??'');
const outputRelative=relative(resolve(root,'infra/local'),output);
if(!outputRelative||outputRelative.startsWith('..')||isAbsolute(outputRelative))throw Error('Private local output required');
const owner=(await readFile(resolve(root,'infra/local/unified/postgres.env'),'utf8')).match(/^POSTGRES_USER=(.+)$/m)?.[1]?.trim();
if(!owner)throw Error('Source owner unavailable');
const ids=['OP-008','OP-016','CAN-DIAG-RETRY','CAN-FEE-EXTEMPORANEOUS','CAN-FEE-EXTRAORDINARY','CAN-FUTURE-FEE'];
const sql=`BEGIN READ ONLY;
 SELECT jsonb_build_object('embedding',jsonb_build_object('provider',e.provider,'model',e.model,'model_revision',e.model_revision,'dimension',e.dimension,'distance_metric',e.distance_metric,'parameters',e.parameters),
 'source_manifest_sha256',r.manifest_sha256,'documents',(SELECT jsonb_agg(jsonb_build_object('claim',c,'document_id',d.id,'id',v.id,'chunk_id',ch.id,'content',ch.content,'locator',ch.locator,'embedding',ch.embedding::text,'original_source_sha256',v.source_sha256))
 FROM jsonb_array_elements(r.manifest->'ccd_knowledge'->'claims') c JOIN banuchat.documents d ON d.document_key=c->>'document_key'
 JOIN banuchat.document_versions v ON v.document_id=d.id AND v.dataset_release_id=r.id JOIN banuchat.document_chunks ch ON ch.document_version_id=v.id
 WHERE ${full?'true':"c->>'claim_id'=ANY(ARRAY["+ids.map(id=>"'"+id+"'").join(',')+"])"} AND ch.dataset_release_id=r.id))
 FROM banuchat.dataset_releases r JOIN banuchat.embedding_configs e ON e.id=r.embedding_config_id
 WHERE r.id='10af4ffd-effb-41fc-bbfe-4dc48cb3398f' AND r.status='ready'; COMMIT;`;
let raw;
try{raw=execFileSync('docker',['exec','banuchat-unified-postgres','psql','-X','-qAt','-U',owner,'-d','banuchat_unified','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});}
catch{throw Error('Local source export failed; documentary payload suppressed');}
const source=JSON.parse(raw.trim());
if(source.documents.length!==expectedCount||new Set(source.documents.map(d=>d.claim.claim_id)).size!==expectedCount||source.source_manifest_sha256!=='fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852')throw Error('Approved source inventory rejected');
const hash=value=>createHash('sha256').update(value).digest('hex');
const documents=source.documents.map(d=>{
 const c=d.claim;
 if((!full&&!ids.includes(c.claim_id))||c.reference_status!=='adopted')throw Error('Unapproved source');
 const metadata={claim_id:c.claim_id,topics:c.topics,course:c.course,period:c.period,population:c.population,conditions:c.conditions,exceptions:c.exceptions,
  basis_kinds:[...new Set(c.basis.map(b=>b.kind))],reference_status:'adopted',knowledge_version:2,domain_metadata:c.domain_metadata,presentation_units:c.presentation_units};
 const provenance=metadata.basis_kinds.includes('DOMAIN_CONFIRMATION')?'Incluye confirmación de dominio incorporada al proyecto; no equivale a una cita documental independiente.':'Referencia documental seleccionada del corpus local autorizado.';
 const artifact=['Procedencia: CCD seleccionado para demostración; sin aval institucional.','No es material ficticio. Referencia acotada; no garantiza vigencia o aplicación individual.',provenance,'# '+c.title,
  'Período: '+c.period,'Población: '+c.population,c.statement,...c.presentation_units.map(u=>u.text),...c.conditions.map(x=>'Condición: '+x),...c.exceptions.map(x=>'Excepción: '+x)].join('\n\n')+'\n';
 const inspected=(artifact+'\n'+d.content).replace(/\bccdigital@unab\.edu\.co\b/giu,'');
 if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b[A-Z]:[\\/]|\/Users\/|\/home\//iu.test(inspected))throw Error('Private address/path requires sanitization in '+c.claim_id);
 const vector=JSON.parse(d.embedding);
 if(vector.length!==1024||vector.some(x=>!Number.isFinite(x))||!vector.some(x=>x!==0))throw Error('Invalid copied embedding');
 return {id:full?randomUUID():d.id,document_id:full?randomUUID():d.document_id,chunk_id:full?randomUUID():d.chunk_id,original_document_version_id:d.id,original_chunk_id:d.chunk_id,document_key:c.document_key,title:c.title,content:d.content,locator:d.locator,embedding:d.embedding,artifact,
  source_sha256:hash(artifact),original_source_sha256:d.original_source_sha256,original_chunk_sha256:hash(d.content),embedding_sha256:hash(d.embedding),metadata};
});
const manifest={schema_version:full?'banuchat-approved-ccd-1':'banuchat-approved-fees-1',synthetic:false,approval:full?'Owner explicitly authorized the complete curated CCD derivative corpus and private Markdown/Drive use on 2026-11-17; no raw personal records or source PDFs included':'Owner explicitly authorized six sanitized fee derivatives for Supabase and existing EC2 on 2026-11-17',
 source_release_id:'10af4ffd-effb-41fc-bbfe-4dc48cb3398f',source_manifest_sha256:source.source_manifest_sha256,embedding:source.embedding,
 documents:documents.map(({embedding,content,artifact,...d})=>d)};
const bundle={release_id:releaseId,manifest,documents};
await writeFile(output,JSON.stringify(bundle,null,2)+'\n',{encoding:'utf8',flag:'wx'});
console.log(JSON.stringify({documents:documents.length,dimensions:1024,release_id:bundle.release_id,bundle_sha256:hash(await readFile(output))}));
