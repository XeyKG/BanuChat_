/** Opt-in increment 5: additive publication preflight and real HTTP/CCD/Ollama evaluation.
 * Never deletes or retries messages. Modes baseline/preflight/http write private evidence only. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadEnvFile} from 'node:process';
import {spawn,type ChildProcess} from 'node:child_process';
import {connectCcdLocal} from '../../backend/rag/src/ccd/local-runtime.js';
import {prepareCcdCorpus} from '../../backend/rag/src/ccd/prepare.js';
import {assertCcdChatDatabase} from '../../backend/api/src/ccd-runtime.js';
import {createRuntimeApiServer} from '../../backend/api/src/main.js';
import {generateDocumentRagAnswer} from '../../backend/api/src/chat/document-rag.js';
import {hasUnbackedGuidanceClaim} from '../../backend/api/src/chat/document-evidence.js';
import {GeneratorClientError,loadGeneratorRuntimeConfig} from '../../backend/api/src/generation/generator-client.js';
import {OllamaGeneratorClient} from '../../backend/api/src/generation/ollama-generator-client.js';
import {OllamaQueryEmbeddingClient} from '../../backend/api/src/retrieval/ollama-query-embedding-client.js';
import {tracedGeneratorFetch,type ProviderEvent} from './ccd-generation-trace.mjs';
import {scenarioTurns,dependenciesSatisfied,scenarioMetrics,evaluationCheck,checkMetrics,type EvaluationCheck} from './conversation-evaluation.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.join(root,'data/ccd/evidence/increment-5');await mkdir(out,{recursive:true});
const hash=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
const mode=process.argv[2];assert.ok(['baseline','preflight','http'].includes(mode??''));
const scope=process.argv[3];assert.ok(scope===undefined||(mode==='http'&&['contact','ambiguity'].includes(scope)));
const {pool,identity}=await connectCcdLocal();
const checks:EvaluationCheck[]=[];
const turns:Record<string,unknown>[]=[];
const report:Record<string,unknown>={started_at:new Date().toISOString(),mode,identity,checks,turns};
let server:Awaited<ReturnType<typeof createRuntimeApiServer>>|undefined;
let synthetic:ChildProcess|undefined;
const check=(name:string,verify:()=>void)=>{checks.push(evaluationCheck(name,verify));};
const notEvaluable=(name:string,reason:string)=>{checks.push(evaluationCheck(name,undefined,reason));};
const capture=async()=>({
 releases:(await pool.query('SELECT id,status,manifest,pipeline_config,manifest_sha256,pipeline_sha256,embedding_config_id,dataset_schema_version FROM banuchat.dataset_releases ORDER BY id')).rows,
 current:(await pool.query('SELECT current_release_id FROM banuchat.datasets WHERE id=1')).rows[0].current_release_id as string,
 chunks:(await pool.query('SELECT id,document_version_id,dataset_release_id,content_sha256,banuchat.text_sha256(embedding::text) AS vector_sha256 FROM banuchat.document_chunks ORDER BY id')).rows,
 history:(await pool.query(`SELECT c.id,c.dataset_release_id,
 (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.ordinal) FROM banuchat.messages m WHERE m.conversation_id=c.id) AS messages,
 (SELECT jsonb_agg(to_jsonb(mc) ORDER BY m.ordinal,mc.citation_index) FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id WHERE m.conversation_id=c.id) AS citations
 FROM banuchat.conversations c ORDER BY c.id`)).rows,
});
async function request(route:string,method='GET',body?:unknown,base='http://127.0.0.1:3001/api/v1') {
 const response=await fetch(base+route,{method,signal:AbortSignal.timeout(180000),...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 return {status:response.status,body:await response.json() as any};
}
async function observedRequest(route:string,method='GET',body?:unknown){
 try{return await request(route,method,body);}catch{return {status:null,body:{error:{code:'EVALUATION_TRANSPORT_UNCERTAIN'}},uncertain:true};}
}
try {
 if(mode==='baseline') {
  const before=await capture();assert.equal(before.releases.length,2);
  assert.equal(before.current,'fb8538af-3280-4a1b-889c-a27564381996');
  await writeFile(path.join(out,'baseline.json'),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
  report.baseline={release:before.current,conversations:before.history.length,chunks:before.chunks.length};
 } else {
  const before=JSON.parse(await readFile(path.join(out,'baseline.json'),'utf8')) as Awaited<ReturnType<typeof capture>>;
  const prepared=await prepareCcdCorpus({corpusRoot:path.join(root,'data/ccd/local/guidance-v3'),institutionalRoot:process.env.CCD_INSTITUTIONAL_ROOT!});
  assert.equal(prepared.documents.length,12);
  const current=await capture();
  check('all historical releases remain immutable',()=>assert.deepEqual(current.releases.filter(r=>before.releases.some(b=>b.id===r.id)),before.releases));
  check('all historical embeddings and chunks remain immutable',()=>assert.deepEqual(current.chunks.filter(c=>before.chunks.some(b=>b.id===c.id)),before.chunks));
  check('all previous conversations/messages/citations remain immutable',()=>assert.deepEqual(current.history.filter(c=>before.history.some(b=>b.id===c.id)),before.history));
  const old=before.releases.find(r=>r.id===before.current)!;
  for(const item of old.manifest.items) check(`preserved artifact ${item.key}`,()=>assert.equal(prepared.manifest.items.find(i=>i.key===item.key)?.sha256,item.sha256));
  if(mode==='preflight') {
   const conn=await pool.connect();await conn.query('BEGIN');
   try{
    const validate=async(name:string,manifest:unknown,valid:boolean)=>{
     await conn.query('SAVEPOINT case_check');let accepted=true;
     try{await conn.query('SELECT banuchat.validate_manifest($1::jsonb)',[JSON.stringify(manifest)]);}catch{accepted=false;}
     await conn.query('ROLLBACK TO SAVEPOINT case_check');check(name,()=>assert.equal(accepted,valid));
    };
    await validate('new twelve-unit manifest',prepared.manifest,true);
    for(const previous of before.releases) await validate(`historical validator ${previous.dataset_schema_version}`,previous.manifest,true);
    await validate('frozen synthetic manifest',JSON.parse(await readFile(path.join(root,'data/synthetic/manifest.json'),'utf8')),true);
    for(const [name,mutate] of [
     ['missing U03',(m:any)=>{m.ccd_provenance.corpus.units=m.ccd_provenance.corpus.units.filter((u:any)=>u.group!=='U03');}],
     ['missing primary transition source',(m:any)=>{m.ccd_provenance.corpus.units.find((u:any)=>u.group==='U04').references.shift();}],
     ['wrong U03 period',(m:any)=>{m.ccd_provenance.corpus.units.find((u:any)=>u.group==='U03').period='202710';}],
     ['false institutional approval',(m:any)=>{m.ccd_provenance.corpus.validation.institutional_approval=true;}],
     ['missing package digest',(m:any)=>{delete m.ccd_provenance.corpus.validation.review_package_sha256;}],
     ['restricted original',(m:any)=>{m.ccd_provenance.corpus.sources.at(-1).id='DOC-112';}],
     ['wrong scenario',(m:any)=>{m.ccd_provenance.corpus.units.find((u:any)=>u.group==='U04').scenario_refs=['R07'];}],
     ['missing limits',(m:any)=>{m.ccd_provenance.corpus.units.find((u:any)=>u.group==='U03').limits=[];}],
    ] as const){const changed=structuredClone(prepared.manifest);mutate(changed);await validate(name,changed,false);}
   }finally{await conn.query('ROLLBACK');conn.release();}
  } else {
   assert.notEqual(current.current,before.current);await assertCcdChatDatabase(pool);
   report.previous_release_id=before.current;report.release_id=current.current;
   const runtime=loadGeneratorRuntimeConfig();report.generator=runtime.generator;
   const embedder=new OllamaQueryEmbeddingClient(runtime.base_url);
   let trace:Record<string,unknown>={};
   report.test_conditions={operator_idle_confirmed:process.env.BANUCHAT_EVAL_IDLE_CONFIRMED==='1',resource_evidence:process.env.BANUCHAT_EVAL_RESOURCE_FILE?path.basename(process.env.BANUCHAT_EVAL_RESOURCE_FILE):null};
   server=await createRuntimeApiServer(pool,input=>generateDocumentRagAnswer({sql:pool,evidence_mode:'ccd_local',query_embedding_client:{async embedQuery(text,config){trace.embedding_calls=Number(trace.embedding_calls??0)+1;return embedder.embedQuery(text,config);}},generator_config:runtime.generator,
    generator_client:{async generate(input,config){
     trace.generator_calls=Number(trace.generator_calls??0)+1;trace.selected_locators=[...input.user_prompt.matchAll(/Localizador: (.+)/gu)].map(m=>m[1]);
     trace.prompt_utf8_bytes=Buffer.byteLength(input.system_prompt+input.user_prompt);
     const events:ProviderEvent[]=[];trace.provider_events=events;const generator=new OllamaGeneratorClient(runtime.base_url,30000,tracedGeneratorFetch(events));
     try{const result=await generator.generate(input,config);trace.generated=result.content;return result;}
     catch(error){trace.generator_failure=error instanceof GeneratorClientError?error.reason:'unclassified';throw error;}
    }}},input),undefined,
    {demo_mode:'ccd_local',document_artifact:{root:path.join(root,'data/ccd/local/m01-m12'),version_roots:{'bch03-m01-m12-local-1':path.join(root,'data/ccd/local/m01-m12'),'bch03-ccd-local-2':path.join(root,'data/ccd/local/expanded-v2'),'bch03-ccd-local-3':path.join(root,'data/ccd/local/guidance-v3')}}});
   await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(3001,'127.0.0.1',resolve);});
   const cases=[
    {id:'T01',coverage:'requires_unadmitted_R01_R04',q:['¿Cómo pido la prueba?','Soy de primer ingreso virtual en 202660','¿Dónde y cuándo la presento?']},
    {id:'T02',coverage:'U03_useful_then_conditional_repetition',q:['No aprobé la prueba nueva','La de un pilar de 202660','¿Puedo repetir gratis?']},
    {id:'T03',coverage:'U04_conditional_procedure_not_admitted',q:['Me quedaron pruebas de Informática pendientes','Ingresé en 202410 y nunca hice las nuevas','¿Puedo pedir la primera gratis ahora?']},
    {id:'T04',coverage:'unadmitted_exception_and_cohort',q:['Ingresé en 202510 y quiero la oportunidad de antiguos','¿Entonces me la tienen que dar?']},
    {id:'T05',coverage:'U04_useful_no_AND_OR',q:['Ya había aprobado Word','No PowerPoint','¿Tengo pilar 2 y no pago nada?']},
    {id:'T06',coverage:'U04_no_personal_equivalence',q:['Tengo Excel aprobado del plan anterior','¿Eso quiere decir que aprobé IA Generativa?','¿Y qué me falta?']},
    {id:'T07',coverage:'unadmitted_late_admission_and_absence',q:['No asistí a la prueba','Me admitieron después de la primera fecha','¿Es otro intento gratis?']},
    {id:'T08',coverage:'U03_distinction_not_course_recovery_rule',q:['No aprobé la prueba de 202660','Corrijo: fue un curso, no una prueba','¿Tengo que presentar las nuevas?']},
    {id:'T09',coverage:'U04_program_specific_rule_pending',q:['Soy de UNAB Tec y tengo una materia de Informática aprobada','¿Me aplica el mismo plan que a profesional presencial?']},
    {id:'T10a',coverage:'clarification_without_context',q:['¿Y puedo repetirla gratis?']},
    {id:'T10b',coverage:'separate_conversation_no_antecedent',q:['¿Cuánto dura?']},
    {id:'T11',coverage:'U04_two_reported_cases_not_universal_policy',q:['Contacté al CCD, solicité y presenté las nuevas pruebas por primera vez sin costo. Otro estudiante en situación semejante también realizó la solicitud.','¿Puedo decirles a todos que tienen ese derecho?','¿Y si luego la repruebo?']},
    {id:'T12',coverage:'description_contact_admitted_threshold_results_not_admitted',q:['La hice virtual en 202660 y no aparece la nota de la prueba','¿Es inmediata?','Obtuve exactamente 70 puntos en un pilar: ¿es menos de lo exigido?','Ahora quiero el contacto del CCD']},
    {id:'REG',coverage:'existing_ten_units_regression',q:['¿Cuáles son los cursos de Competencias Digitales?','Háblame del de IA Generativa','¿Y qué temas tiene?','Corrijo: me refiero a Marca Personal, ¿qué temas aborda?','Cambiando de tema, ¿cuánto duran las pruebas diagnósticas de 202660?','Ahora quiero el contacto del CCD']},
    {id:'AMB',coverage:'catalog_is_not_an_individual_course',q:['¿Cuáles son los cursos de Competencias Digitales?','¿Y qué temas tiene?']},
    {id:'AMB_FRESH',coverage:'themes_without_any_antecedent',q:['¿Y qué temas tiene?']},
   ];
   const selectedCases=scope==='contact'?cases.filter(c=>['T12','REG'].includes(c.id)):scope==='ambiguity'?cases.filter(c=>['AMB','AMB_FRESH'].includes(c.id)):cases;
   const created:string[]=[];report.cases=selectedCases;report.scope=scope??'all';
   const scenarios:any[]=[];report.scenarios=scenarios;
   for(const scenario of selectedCases){
    const creation=await request('/conversations','POST',{profile_key:'ccd-local-demo'});assert.equal(creation.status,201);
    const id=creation.body.conversation_id as string;created.push(id);
    // Explicit contact/duration changes do not depend on a failed previous theme.
    const overrides:Record<number,number[]>=scenario.id==='REG'?{4:[1],5:[],6:[]}:scenario.id==='T12'?{4:[]}:{};
    const states=scenarioTurns(scenario.q,overrides);const scenarioReport:any={id:scenario.id,conversation_id:id,turns:states};scenarios.push(scenarioReport);
    const expectedMessages:any[]=[];let historyReliable=true;
    for(const [index,question] of scenario.q.entries()){
     const state=states[index]!;trace={embedding_calls:0,generator_calls:0};const started=performance.now();
     let result:any={status:null,body:{}};let persisted=false;
     if(!historyReliable||!dependenciesSatisfied(state,states)){
      state.state='not_evaluable';state.reason=historyReliable?'required antecedent did not complete':'history unavailable or uncertain POST';
     }else{
      const prior=await observedRequest(`/conversations/${id}`);
      if(prior.status!==200){historyReliable=false;state.state='not_evaluable';state.reason='could not establish persisted antecedent';}
      else{
       state.attempted=true;result=await observedRequest(`/conversations/${id}/messages`,'POST',{content:question});
       // A GET observes the outcome; the POST is never retried, including uncertain outcomes.
       const actual=await observedRequest(`/conversations/${id}`);
       const pair=[result.body?.user_message,result.body?.assistant_message];
       if(result.status===201&&pair.every(Boolean)&&actual.status===200){
        try{assert.equal(actual.body.messages.length,prior.body.messages.length+2);
         for(const message of pair)assert.deepEqual(actual.body.messages.find((m:any)=>m.message_id===message.message_id),message);
         persisted=true;expectedMessages.push(...pair);
        }catch{persisted=false;}
       }
       state.state=persisted?'completed':'failed';if(!persisted)state.reason=result.status===201?'response persistence not verified':`HTTP ${result.status??'uncertain'}`;
       historyReliable=actual.status===200&&!('uncertain' in result);
      }
     }
     turns.push({scenario:scenario.id,turn:index+1,conversation_id:id,question,depends_on:state.depends_on,evaluation_state:state.state,coverage:scenario.coverage,elapsed_ms:performance.now()-started,...trace,result});
     if(state.attempted)check(`${scenario.id}/${index+1} HTTP 201`,()=>assert.equal(result.status,201));
     else notEvaluable(`${scenario.id}/${index+1} HTTP 201`,state.reason!);
     if(result.status===201)check(`${scenario.id}/${index+1} response persisted`,()=>assert.equal(persisted,true));
     else notEvaluable(`${scenario.id}/${index+1} response persisted`,state.reason!);
     const answer=result.body.assistant_message;
     const contentCheck=(name:string,verify:()=>void)=>{if(answer)check(name,verify);else notEvaluable(name,state.reason??'no assistant response');};
      contentCheck(`${scenario.id}/${index+1} no positive unsupported guidance`,()=>assert.equal(hasUnbackedGuidanceClaim(answer.content),false));
      contentCheck(`${scenario.id}/${index+1} protocol private`,()=>assert.doesNotMatch(answer.content,/FUENTES:/));
      if(scenario.id==='T02') contentCheck(`${scenario.id}/${index+1} useful U03, not empty abstention`,()=>{assert.equal(answer.insufficient_evidence,false);assert.ok(answer.citations.some((c:any)=>c.locator==='unit:U03'));});
      if(['T03','T05','T06','T09'].includes(scenario.id)) contentCheck(`${scenario.id}/${index+1} useful U04 limits, not empty abstention`,()=>{assert.equal(answer.insufficient_evidence,false);assert.ok(answer.citations.some((c:any)=>c.locator==='unit:U04'));});
      if(scenario.id.startsWith('T10')) contentCheck(`${scenario.id} clarification isolated`,()=>{assert.equal(answer.insufficient_evidence,true);assert.match(answer.content,/refieres|contexto/);assert.equal(answer.citations.length,0);});
      if(scenario.id==='T07') contentCheck(`T07/${index+1} pertinent content, citations and caveats`,()=>{
       assert.deepEqual(answer.citations,[]);
       assert.doesNotMatch(answer.content,/Inform[aá]tica|transici[oó]n|reconocimientos?|homolog|pilar|202660|202560|202610|hist[oó]ric|vigencia|matr[ií]cula/iu);
       assert.equal(hasUnbackedGuidanceClaim(answer.content),false);
       assert.doesNotMatch(answer.content,/\b(?:la ausencia|no asistir|no presentarse) (?:equivale|cuenta|se considera|significa).*reprob/iu);
      });
      if(scenario.id==='T08'&&index===2) contentCheck('T08 course recovery does not grant a new-test exemption',()=>{assert.doesNotMatch(answer.content,/no (?:se requiere|es necesario|debes|tienes que|necesitas).*present/iu);assert.match(answer.content,/confirm|verific|comprobar/iu);});
      if((scenario.id==='T12'&&index===3)||(scenario.id==='REG'&&index===5)) contentCheck(`${scenario.id} contact really answered with pertinent caveat`,()=>{assert.equal(answer.insufficient_evidence,false);assert.deepEqual(answer.citations.map((c:any)=>c.locator),['unit:M12']);assert.match(answer.content,/vigencia actual no está ratificada/);});
      if((scenario.id==='AMB'&&index===1)||scenario.id==='AMB_FRESH')contentCheck(`${scenario.id} clarification without embedding or generation`,()=>{
       assert.equal(answer.insufficient_evidence,true);assert.deepEqual(answer.citations,[]);
       assert.match(answer.content,scenario.id==='AMB'?/¿De cuál curso quieres conocer los temas\?/u:/contexto|cuál curso/u);
       assert.equal(trace.embedding_calls,0);assert.equal(trace.generator_calls,0);
      });
     console.log(JSON.stringify({case:scenario.id,turn:index+1,state:state.state,status:result.status,insufficient:answer?.insufficient_evidence,citations:answer?.citations.map((c:any)=>c.locator)}));
    }
    scenarioReport.metrics=scenarioMetrics(states);
    const detail=await observedRequest(`/conversations/${id}`);check(`${scenario.id} persisted history equals completed responses`,()=>{
     assert.equal(detail.status,200);assert.deepEqual(detail.body.messages,expectedMessages);
    });
    check(`${scenario.id} required script complete`,()=>assert.equal(scenarioReport.metrics.script_complete,true));
    scenarioReport.checks=checkMetrics(checks.filter(c=>c.name.startsWith(scenario.id+' ' )||c.name.startsWith(scenario.id+'/')));
    scenarioReport.integral_pass=scenarioReport.metrics.script_complete&&scenarioReport.checks.failed===0&&scenarioReport.checks.not_evaluable===0;
   }
   for(const chat of before.history){const r=await request(`/conversations/${chat.id}`);check(`historical GET ${chat.id}`,()=>assert.equal(r.status,200));}
   if(before.history[0]){const r=await request(`/conversations/${before.history[0].id}/messages`,'POST',{content:'¿Qué indicaban los lineamientos?'});check('old release message returns 409',()=>assert.equal(r.status,409));}
   const citations=(await pool.query(`SELECT mc.*,v.source_sha256=mc.source_sha256 AS hash_matches,c.locator=mc.source_locator AS locator_matches,c.dataset_release_id=mc.dataset_release_id AS release_matches
    FROM banuchat.message_citations mc JOIN banuchat.messages m ON m.id=mc.message_id JOIN banuchat.document_versions v ON v.id=mc.document_version_id JOIN banuchat.document_chunks c ON c.id=mc.chunk_id
    WHERE m.conversation_id=ANY($1::uuid[]) ORDER BY m.conversation_id,m.ordinal,mc.citation_index`,[created])).rows;
   report.citations=citations;
   check('all citations persist actual hash/locator/release',()=>assert.ok(citations.every(c=>c.hash_matches&&c.locator_matches&&c.release_matches)));
   const artifacts=(await pool.query('SELECT id,source_sha256 FROM banuchat.document_versions WHERE processing_status=\'ready\' ORDER BY id')).rows;
   for(const artifact of artifacts){const r=await fetch(`http://127.0.0.1:3001/api/v1/documents/${artifact.id}/artifact`);check(`artifact ${artifact.id}`,()=>assert.equal(r.status,200));const bytes=new Uint8Array(await r.arrayBuffer());check(`artifact hash ${artifact.id}`,()=>assert.equal(hash(bytes),artifact.source_sha256));}
   const after=await capture();check('previous histories preserved after HTTP',()=>assert.deepEqual(after.history.filter(c=>current.history.some(b=>b.id===c.id)),current.history));
   check('all current and historical releases unchanged after HTTP',()=>assert.deepEqual(after.releases,current.releases));
   check('all current and historical chunks and vectors unchanged after HTTP',()=>assert.deepEqual(after.chunks,current.chunks));
   report.preserved_conversations=current.history.length;
   report.turn_metrics=scenarios.reduce((acc:any,s:any)=>{for(const k of ['planned','attempted','completed','failed','not_evaluable'])acc[k]+=s.metrics[k];return acc;},{planned:0,attempted:0,completed:0,failed:0,not_evaluable:0});
   report.counts=(await pool.query(`SELECT r.id,r.status,d.current_release_id=r.id AS current,(SELECT count(*)::int FROM banuchat.document_versions v WHERE v.dataset_release_id=r.id) AS documents,
    (SELECT count(*)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id) AS chunks,(SELECT count(embedding)::int FROM banuchat.document_chunks c WHERE c.dataset_release_id=r.id) AS embeddings FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id ORDER BY r.id`)).rows;
   loadEnvFile(path.join(root,'.env'));
   synthetic=spawn(process.execPath,['dist/main.js'],{cwd:path.join(root,'backend/api'),windowsHide:true,env:{...process.env,BANUCHAT_DEMO_MODE:'synthetic',BANUCHAT_API_HOST:'127.0.0.1',BANUCHAT_API_PORT:'3302'},stdio:['ignore','pipe','pipe']});
   await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Synthetic startup timeout')),15000);synthetic!.once('error',reject);synthetic!.stdout!.on('data',(b:Buffer)=>{if(b.toString().includes('(synthetic) listening')){clearTimeout(timer);resolve();}});});
   const profiles=await request('/profiles','GET',undefined,'http://127.0.0.1:3302/api/v1');assert.equal(profiles.status,200);const key=profiles.body.profiles[0].profile_key;
   for(const route of [`/profiles/${key}/progress`,`/conversations?profile_key=${key}`]){const r=await request(route,'GET',undefined,'http://127.0.0.1:3302/api/v1');check(`synthetic read ${route}`,()=>assert.equal(r.status,200));}
   report.synthetic_read_only=true;
  }
 }
 report.check_metrics=checkMetrics(checks);report.passed=checks.every(c=>c.status==='passed');if(!report.passed)process.exitCode=1;
}catch(error){report.passed=false;report.error=error instanceof Error?error.message:'Check failed';process.exitCode=1;console.error('CCD_GUIDANCE_CHECK_FAILED; private evidence saved');}
finally{
 if(server?.listening)await new Promise<void>(resolve=>server!.close(()=>resolve()));
 if(synthetic&&synthetic.exitCode===null){const done=new Promise<void>(resolve=>synthetic!.once('exit',()=>resolve()));synthetic.kill('SIGTERM');await done;}
 await pool.end();report.finished_at=new Date().toISOString();report.check_metrics=checkMetrics(checks);const name=`${mode}-${Date.now()}.json`;await writeFile(path.join(out,name),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:report.passed,evidence:name,check_metrics:report.check_metrics,turn_metrics:report.turn_metrics}));
}
