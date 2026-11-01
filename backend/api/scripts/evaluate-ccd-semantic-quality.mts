/** Explicit, bounded before/after sample against the existing release. No DML,
 * HTTP listener, model changes, corpus publication, benchmark or retry. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Pool} from 'pg';
import {PgSqlClient} from '../src/data/pg-client.js';
import {OllamaQueryEmbeddingClient} from '../src/retrieval/ollama-query-embedding-client.js';
import {OllamaGeneratorClient} from '../src/generation/ollama-generator-client.js';
import {loadGeneratorRuntimeConfig} from '../src/generation/generator-client.js';
import {retrieveAuthenticatedDocumentChunks} from '../src/application/authenticated-document-retrieval.js';
import {retrieveCcdKnowledgeChunks} from '../src/application/ccd-knowledge-retrieval.js';
import {ccdKnowledgeMetadata} from '../src/chat/ccd-knowledge-manifest.js';
import {generateCcdKnowledgeAnswer,type CcdKnowledgeDependencies} from '../src/chat/ccd-knowledge.js';

const args=process.argv.slice(2);assert.equal(args[0],'--run-once');
assert.ok(args.slice(1).every(arg=>arg==='--candidate-only'||/^--only=[a-z,-]+$/u.test(arg)));
const only=args.find(arg=>arg.startsWith('--only='))?.slice(7).split(',');
const candidateOnly=args.includes('--candidate-only');
const root=fileURLToPath(new URL('../../../',import.meta.url));
const run=path.join(process.env.LOCALAPPDATA!,'BanuChat','rag-semantic-quality-01',randomUUID());
await mkdir(run,{recursive:true});
const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];
execFileSync('icacls',[run,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)(F)`],{stdio:'ignore'});
const config=JSON.parse(await readFile(path.join(root,'infra/local/unified/application.json'),'utf8'));
assert.equal(config.database,'banuchat_unified');assert.equal(config.database_port,55463);
const pool=new Pool({host:'127.0.0.1',port:config.database_port,database:config.database,user:config.runtime_user,password:config.runtime_password,connectionTimeoutMillis:5000,statement_timeout:15000,options:'-c default_transaction_read_only=on'});
const report:{started_at:string;scope:string;head?:string;release?:string;manifest_before?:string;manifest_after?:string;read_only?:boolean;candidate_files?:Record<string,string>;cases:any[];state?:string}={started_at:new Date().toISOString(),scope:'Direct CCD policy composition with real scoped PostgreSQL retrieval and Ollama. Baseline is HEAD policy, candidate is working tree. No authenticated HTTP or live-service reload is claimed.',cases:[]};
// Diagnostic and new phrasings live only in the evaluator, never in production routing.
const cases:Array<{id:string;query:string;required:RegExp[];forbidden?:RegExp[];insufficient?:boolean}>=[
 {id:'catalog',query:'¿Cuáles son los cursos de Competencias Digitales?',required:[/Marca Personal Digital/u],forbidden:[/Productividad y Marca Personal Digital/u]},
 {id:'route-and-base',query:'¿Cuáles son los tres pilares en los que se organiza la Ruta de Formación en Competencias Digitales y qué curso es obligatorio para todos los estudiantes de pregrado?',required:[/Competencias Digitales Básicas/u,/Interacción Digital/u,/no necesitas cursarlo/u]},
 {id:'course-count-and-credits',query:'¿Cuántos cursos debo aprobar en total para completar la ruta y cuántos créditos aporta al plan?',required:[/tres cursos en total/u,/operativo/u,/no asigna créditos/u]},
 {id:'two-pillars',query:'Lista las asignaturas del segundo pilar y del tercer pilar.',required:[/Habilidades en Analítica Digital/u,/IA Generativa/u,/Cuidado y Bienestar Digital/u],forbidden:[/Productividad y Marca Personal Digital/u]},
 {id:'purpose-and-duration',query:'¿Cuánto tiempo toma la prueba diagnóstica? Además, ¿para qué sirve?',required:[/competencias digitales/u,/dos horas/u,/2026-2/u]},
 {id:'platform-subject',query:'¿Qué plataformas se utilizan para presentar la prueba diagnóstica en modalidad presencial y en modalidad virtual?',required:[/Moodle/u,/Canvas/u,/2026-2/u],forbidden:[/modalidades generales posibles/u]},
 {id:'platform-monitoring-gap',query:'¿En qué LMS se presenta el diagnóstico y qué plataforma supervisa la prueba?',required:[/Moodle/u,/Canvas/u,/No tengo evidencia suficiente/u],insufficient:true},
 {id:'fee-and-intensity',query:'¿Qué intensidad tiene el curso y cuál es su precio en 2026?',required:[/362\.550/u,/32 horas/u,/64 independientes/u,/96 totales/u]},
 {id:'enrollment-procedure',query:'¿Cómo tramito la adición y cancelación de una asignatura y genero el cupón de pago?',required:[/Cosmos/u,/NRC/u,/Cupón de pago/u],forbidden:[/Para el primer pilar/u]},
 {id:'internal-reference',query:'¿Qué discrepancia existe en el documento «Transición.docx»?',required:[/No puedo identificar archivos internos/u],insufficient:true},
 {id:'private-records',query:'Consulta en Banner mi promedio acumulado y el profesor asignado para mi grupo.',required:[/No tengo acceso a expedientes personales/u,/Banner/u,/asignación individual/u],insufficient:true},
 {id:'economic-authority',query:'Autorízame una exención de pago o aplica un descuento institucional para mi curso pendiente.',required:[/No tengo facultades/u,/instancias administrativas/u],forbidden:[/362\.550/u],insufficient:true},
 {id:'legal-evidence-limit',query:'Dime el nombre de la ley colombiana y el número de decreto exacto en el syllabus de Marco Legal Digital.',required:[/derechos de autor/u,/evidencia disponible no identifica/u,/no cite normas/u],insufficient:true},
 {id:'inclusive-threshold-control',query:'¿Con exactamente 70 % valido un pilar?',required:[/70 %/u],insufficient:false},
];
try{
 assert.equal((await pool.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');report.read_only=true;
 report.head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 report.candidate_files={};for(const relative of ['backend/api/src/chat/ccd-knowledge.ts','backend/api/src/chat/ccd-query-intent.ts','backend/api/src/chat/ccd-semantic-plan.ts','backend/api/src/auth/unified-product.ts'])report.candidate_files[relative]=createHash('sha256').update(await readFile(path.join(root,relative))).digest('hex');
 const release=await pool.query("SELECT r.id,r.manifest FROM banuchat.datasets d JOIN banuchat.dataset_releases r ON r.id=d.current_release_id WHERE d.name='banuchat-ccd-local' AND r.status='ready'");assert.equal(release.rows.length,1);
 const row=release.rows[0];report.release=row.id;assert.equal(row.manifest.schema_version,'ccd-1.4.0');
 const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');report.manifest_before=digest(row.manifest);
 const runtime=loadGeneratorRuntimeConfig({BANUCHAT_OLLAMA_BASE_URL:config.ollama_base_url,BANUCHAT_GENERATOR_MODEL:config.generator_model,BANUCHAT_GENERATOR_MODEL_REVISION:config.generator_model_revision,BANUCHAT_GENERATOR_RUNTIME_VERSION:config.generator_runtime_version});
 const deps:CcdKnowledgeDependencies={sql:new PgSqlClient(pool),query_embedding_client:new OllamaQueryEmbeddingClient(runtime.base_url),generator_client:new OllamaGeneratorClient(runtime.base_url),generator_config:runtime.generator,retrieve_chunks:retrieveAuthenticatedDocumentChunks,retrieve_scoped_chunks:retrieveCcdKnowledgeChunks,knowledge:{release_id:row.id,metadata:ccdKnowledgeMetadata(row.manifest)}};
 // Snapshot the two modified baseline modules from Git. Resolve their other
 // imports to unchanged repository files; no baseline source is evaluated as text.
 const baselineDir=path.join(root,'tmp','semantic-baseline-'+randomUUID());await mkdir(baselineDir,{recursive:true});
 for(const name of ['ccd-query-intent','ccd-knowledge']){
  const relative='backend/api/src/chat/'+name+'.ts',original=execFileSync('git',['show','HEAD:'+relative],{cwd:root,encoding:'utf8'});
  const source=original.replace(/from '([^']+)'/gu,(all,specifier:string)=>{
   if(!specifier.startsWith('.'))return all;
   const file=specifier==='./ccd-query-intent.js'||specifier==='./ccd-knowledge.js'?path.join(baselineDir,path.basename(specifier).replace(/\.js$/u,'.ts')):path.resolve(root,path.dirname(relative),specifier.replace(/\.js$/u,'.ts'));
   return `from '${pathToFileURL(file).href}'`;
  });await writeFile(path.join(baselineDir,name+'.ts'),source);
 }
 const baseline=await import(pathToFileURL(path.join(baselineDir,'ccd-knowledge.ts')).href) as {generateCcdKnowledgeAnswer:typeof generateCcdKnowledgeAnswer};
 for(const c of cases.filter(c=>!only||only.includes(c.id))){
  const observation:any={id:c.id,query:c.query};
  for(const [variant,ask]of [['before',baseline.generateCcdKnowledgeAnswer],['after',generateCcdKnowledgeAnswer]] as const){
   if(candidateOnly&&variant==='before')continue;
   const started=performance.now();
   try{const answer=await ask(deps,{release_id:row.id,query:c.query});const failures=[...c.required.filter(p=>!p.test(answer.content)).map(p=>'missing:'+p.source),...(c.forbidden??[]).filter(p=>p.test(answer.content)).map(p=>'forbidden:'+p.source),...(c.insufficient!==undefined&&c.insufficient!==answer.insufficient_evidence?['evidence_flag']:[])];observation[variant]={result:failures.length?'FAIL':'PASS',duration_ms:Math.round(performance.now()-started),failures,answer};}
   catch(error){observation[variant]={result:'ERROR',duration_ms:Math.round(performance.now()-started),reason:error instanceof Error?error.name:'UnknownError'};}
  }
  report.cases.push(observation);await writeFile(path.join(run,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({case:c.id,before:observation.before?.result,after:observation.after.result}));
 }
 const after=await pool.query('SELECT manifest FROM banuchat.dataset_releases WHERE id=$1',[row.id]);report.manifest_after=digest(after.rows[0].manifest);assert.equal(report.manifest_after,report.manifest_before);
 report.state=report.cases.every(c=>c.after.result==='PASS')?'DIRECT_SAMPLE_PASSED':'DIRECT_SAMPLE_PARTIAL';
 if(report.state!=='DIRECT_SAMPLE_PASSED')process.exitCode=1;
}catch{report.state='FAILED';process.exitCode=1;}
finally{await pool.end();await writeFile(path.join(run,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({state:report.state,before_pass:report.cases.filter(c=>c.before?.result==='PASS').length,after_pass:report.cases.filter(c=>c.after.result==='PASS').length,total:report.cases.length,private_report:run}));}
