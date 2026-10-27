import {fileURLToPath} from 'node:url';
import {Ajv2020} from 'ajv/dist/2020.js';
import type {Pool} from 'pg';
import {SafeReader} from '../source/safe-reader.js';
import {parseStrictJson} from '../preflight/json.js';
import {sha256} from '../crypto/sha256.js';
import type {DocumentRecord,DocumentDerivatives,ManifestItem} from '../types.js';
import {invariant} from '../db/errors.js';
import {captureCcdCode} from './ingest.js';
import {withWriterLease} from '../db/writer-lock.js';
import {resolveEmbeddingConfig} from '../db/embedding-config.js';
import {openRun} from '../db/runs.js';
import {stageDocuments} from '../db/documents.js';
import {generateEmbeddings} from '../db/embeddings.js';
import {finalizeCandidate} from '../db/finalize.js';
import {withAttemptFailure} from '../db/failure.js';
import {assertSameRuntime} from '../ollama/config.js';
import type {EmbeddingClient} from '../ollama/types.js';
import type {StorageRecipe} from '../db/recipe.js';
export interface KnowledgeClaim {
 claim_id:string;document_key:string;title:string;statement:string;period:string;population:string;topics:string[];course:string|null;
 reference_status:'adopted';conditions:string[];exceptions:string[];basis:Array<{kind:string;references:Array<Record<string,unknown>>}>;
 presentation_units:Array<{key:string;aspects:string[];text:string;period?:string;amount_cop?:number}>;
 governance:Record<string,unknown>;sources:unknown[];domain_metadata:Record<string,unknown>;
}
export interface KnowledgeAdoption {schema_version:'ccd-knowledge-adoption-1'|'ccd-knowledge-adoption-2';version:'bch-ccd-knowledge-1'|'bch-ccd-knowledge-2';source_registry_sha256:string;source_review_sha256:string;domain_decision_sha256:string;sources:Array<{path:string;sha256:string;origin?:'bundle'|'institutional'}>;claims:KnowledgeClaim[];artifacts:Array<{claim_id:string;document_key:string;title:string;path:string;sha256:string}>}
export async function prepareKnowledgeCorpus(options:{corpusRoot:string;institutionalRoot:string;trustedAdoptionSha256:string}){
 invariant(/^[a-f0-9]{64}$/u.test(options.trustedAdoptionSha256));
 const local=await SafeReader.create(options.corpusRoot),external=await SafeReader.create(options.institutionalRoot),bytes=await local.read('adoption.json');
 invariant(sha256(bytes)===options.trustedAdoptionSha256);
 const raw=parseStrictJson(bytes),schemaReader=await SafeReader.create(fileURLToPath(new URL('../../../../data/ccd/schemas/',import.meta.url)));
 const v2=(raw as {schema_version?:string})?.schema_version==='ccd-knowledge-adoption-2';
 const schemaBytes=await schemaReader.read(v2?'knowledge-adoption-v2.schema.json':'knowledge-adoption.schema.json');
 const schema=JSON.parse(schemaBytes.toString('utf8')) as object;const validate=new Ajv2020({strict:true,allErrors:false}).compile<KnowledgeAdoption>(schema);invariant(validate(raw));const adoption=raw;
 const total=adoption.claims.length,keys=new Set(adoption.claims.map(c=>c.document_key)),ids=new Set(adoption.claims.map(c=>c.claim_id));
 invariant(total>0&&keys.size===total&&ids.size===total&&adoption.artifacts.length===total&&(v2||total===87));
 const sourcePaths=new Set<string>();
 for(const source of adoption.sources){invariant(!sourcePaths.has(source.path));sourcePaths.add(source.path);invariant(sha256(await (v2&&source.origin==='bundle'?local:external).read(source.path))===source.sha256);}
 if(v2){
  for(const [file,hash] of [['source-registry.json',adoption.source_registry_sha256],['source-review.jsonl',adoption.source_review_sha256],['domain-decisions.json',adoption.domain_decision_sha256]] as const)invariant(sha256(await local.read(file))===hash);
  for(const c of adoption.claims)for(const b of c.basis)if(b.kind==='DOCUMENT_SOURCE')for(const r of b.references)invariant(adoption.sources.some(s=>s.path===String(r.source).replaceAll('\\','/')&&s.sha256===r.sha256));
 }
 const documents:DocumentRecord[]=[],derivatives:DocumentDerivatives[]=[],files: Array<{path:string;kind:'document_artifact';sha256:string}>=[],items:ManifestItem[]=[];
 for(const a of adoption.artifacts){
  const c=adoption.claims.find(c=>c.claim_id===a.claim_id&&c.document_key===a.document_key);invariant(c&&a.title===c.title&&keys.has(a.document_key));keys.delete(a.document_key);
  invariant(a.path===`documents/artifacts/${a.document_key}.md`&&c.basis.some(b=>b.kind!=='PENDING_CLARIFICATION'));
  const contentBytes=await local.read(a.path);invariant(sha256(contentBytes)===a.sha256);
  const content=new TextDecoder('utf-8',{fatal:true}).decode(contentBytes);
  invariant(content.startsWith('# '+a.title+'\n\n')&&!/DOMAIN_CONFIRMATION|DOCUMENT_SOURCE|PENDING_CLARIFICATION|responsable del proyecto|\bpiloto\b|C:[\\/]|BASES:/iu.test(content));
  if(v2)for(const unit of c.presentation_units){
   if(!/[{}]/u.test(unit.text)){invariant(content.includes(unit.text));continue;}
   // One reviewed presentation exception; braces never bypass source coverage.
   invariant(unit.text.includes('{validated_pillar}')
    &&!/[{}]/u.test(unit.text.replace('{validated_pillar}',''))
    &&unit.aspects.includes('two_pending_named'));
   invariant(c.presentation_units.some(general=>general.aspects.includes('two_pending')
    &&!/[{}]/u.test(general.text)&&content.includes(general.text)));
  }
  documents.push({document_key:a.document_key,title:a.title,retrieval_mode:'chunked',mime_type:'text/markdown',version_label:adoption.version,artifact_path:a.path});
  derivatives.push({document_key:a.document_key,retrieval_mode:'chunked',source_sha256:a.sha256,content_sha256:a.sha256,chunks:[{ordinal:0,locator:`claim:${c.claim_id}:part:1`,content,content_sha256:a.sha256,page_start:null,page_end:null}]});
  files.push({path:a.path,kind:'document_artifact',sha256:a.sha256});items.push({kind:'document',key:a.document_key,path:a.path,locator:'document',sha256:a.sha256,retrieval_mode:'chunked'});
 }
 invariant(Number(keys.size)===0&&documents.length===total);
 invariant(sha256(await local.read('adoption.json'))===options.trustedAdoptionSha256);
 const manifest={dataset_key:'banuchat-ccd-local',manifest_version:adoption.version,schema_version:v2?'ccd-1.4.0':'ccd-1.3.0',synthetic:false,corpus_kind:'ccd_local',timezone:'America/Bogota',files,items,
  ccd_knowledge:{schema_version:v2?'ccd-knowledge-2':'ccd-knowledge-1',source_registry_sha256:adoption.source_registry_sha256,source_review_sha256:adoption.source_review_sha256,domain_decision_sha256:adoption.domain_decision_sha256,sources:adoption.sources,claims:adoption.claims},
  ccd_provenance:{adoption_sha256:options.trustedAdoptionSha256,schema_sha256:sha256(schemaBytes),institutional_endorsement:false,independent_human_acceptance:false}};
 return {adoption,manifest,documents,derivatives,schema_sha256:sha256(schemaBytes)};
}
/** Normal writer/run/item/document/vector contracts; validates staging without activation. */
export async function stageKnowledgeCandidate(pool:Pool,client:EmbeddingClient,options:{corpusRoot:string;institutionalRoot:string;runtimeRoot:string;trustedAdoptionSha256:string;expectedCurrentReleaseId:string}){
 const identity=(await pool.query(`SELECT current_database() AS name,d.current_release_id FROM banuchat.datasets d JOIN banuchat_aux.product_config p ON p.singleton AND p.version=1 WHERE d.id=1 AND d.name='banuchat-ccd-local'`)).rows[0];
 invariant(identity?.name==='banuchat_unified'&&identity.current_release_id===options.expectedCurrentReleaseId);
 const prepared=await prepareKnowledgeCorpus(options),code=await captureCcdCode(options.runtimeRoot);
 const v2=prepared.adoption.schema_version==='ccd-knowledge-adoption-2',total=prepared.documents.length;
 const recipe:StorageRecipe=v2?{kind:'ccd_knowledge_v2',items:total}:'ccd_knowledge_v1';
 const pipeline={pipeline_version:v2?'ccd-knowledge-v2':'ccd-knowledge-v1',chunking:'one_scoped_reference',schema_sha256:prepared.schema_sha256,source_revision_kind:'local_snapshot_sha256',source_snapshot_sha256:options.trustedAdoptionSha256,...code};
 return withWriterLease(pool,async lease=>{
  const config=await client.inspect(),embeddingId=await resolveEmbeddingConfig(lease,config);
  const setup=await lease.transaction(async()=>{
   const state=(await lease.query<{current_release_id:string}>('SELECT current_release_id FROM banuchat.datasets WHERE id=1 FOR UPDATE')).rows[0];invariant(state?.current_release_id===options.expectedCurrentReleaseId);
   const values=[code.code_base_git_revision,JSON.stringify(prepared.manifest),JSON.stringify(pipeline),embeddingId];
   const previous=(await lease.query<{id:string;status:string}>(`SELECT id,status FROM banuchat.dataset_releases WHERE git_revision=$1 AND manifest_sha256=banuchat.jsonb_sha256($2::jsonb) AND pipeline_sha256=banuchat.jsonb_sha256($3::jsonb) AND embedding_config_id=$4`,values)).rows[0];
   if(previous){await lease.query('SELECT banuchat.assert_release_complete($1)',[previous.id]);return {release:previous.id,run:null};}
   const r=(await lease.query<{id:string}>(`INSERT INTO banuchat.dataset_releases(dataset_id,git_revision,manifest,pipeline_config,embedding_config_id,dataset_schema_version,status) VALUES(1,$1,$2::jsonb,$3::jsonb,$4,$5,'staging') RETURNING id`,[...values,prepared.manifest.schema_version])).rows[0];invariant(r);
   const run=await openRun(lease,r.id,v2?'ccd-knowledge-candidate-v2':'ccd-knowledge-candidate-v1',prepared.manifest.items,'manual',recipe);return {release:r.id,run};
  });
  if(!setup.run)return {outcome:'already_validated_candidate',release_id:setup.release,embeddings_generated:0};
  return withAttemptFailure(lease,setup.release,setup.run,async()=>{
   await stageDocuments(lease,setup.release,setup.run!,prepared.documents,prepared.derivatives,prepared.manifest.items,false,recipe);
   const count=await generateEmbeddings(lease,setup.release,setup.run!,{embeddingConfigId:embeddingId,derivatives:prepared.derivatives,validated:{manifest:prepared.manifest}},client,config,2,recipe);invariant(count===total);assertSameRuntime(config,await client.inspect());
   const again=await prepareKnowledgeCorpus(options);invariant(JSON.stringify(again.manifest)===JSON.stringify(prepared.manifest)&&JSON.stringify(await captureCcdCode(options.runtimeRoot))===JSON.stringify(code));
   await finalizeCandidate(lease,setup.release,setup.run!,recipe,{expectedRelease:options.expectedCurrentReleaseId});
   return {outcome:'validated_staging_candidate',release_id:setup.release,run_id:setup.run,documents:total,chunks:total,embeddings_generated:count,current_activated:false,code_provenance:code};
  });
 });
}
