/** Recorded human review after reading all 43 outputs; no LLM judge or automatic semantic PASS. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {root,privateEvidence,evidence} from '../../backend/api/test/auth-i1b/environment.js';
const file=process.argv[2];assert.match(file??'',/^full-[0-9]+\.json$/u);
const bytes=await readFile(new URL(file!,privateEvidence)),run=JSON.parse(bytes.toString());
const oldBytes=await readFile(new URL('data/ccd/evidence/increment-5/http-1792693227245.json',root)),old=JSON.parse(oldBytes.toString());
assert.equal(run.operational_pass,true);assert.equal(run.turns.length,43);assert.deepEqual(run.generator,old.generator);
const rows=[
 ['T01','B','C','Regresión de utilidad: los tres turnos se abstienen genéricamente; 5.3/2 describía el alcance de TEST_ORIENTATION. No inventa procedimiento, pero esa orientación parcial ya no se observa.'],
 ['T02','B','B','U03 pertinente y consecuencia histórica; no demuestra repetición gratuita. La respuesta 3 inicia con No, no se acredita: conservar el texto para revisión académica, sin convertir falta de respaldo en imposibilidad universal.'],
 ['T03','B','B','U04 exige verificar plan/códigos/registro; no concede primera prueba gratuita actual. Procedimiento pendiente.'],
 ['T04','B','B','No concede beneficio por cohorte 202510; reconocimiento/eligibilidad requieren verificación.'],
 ['T05','B','B','Word/PowerPoint no resuelven automáticamente pilar 2, AND/OR o pago; orientación parcial.'],
 ['T06','B','B','Excel no demuestra aprobación de IA ni expediente personal; requiere comprobación del programa/CCD.'],
 ['T07','B','B','Abstención pertinente sin citas U03/U04 ni equiparar inasistencia a reprobación. No orienta un procedimiento de admisión tardía.'],
 ['T08','B','B','Reconoce corrección de prueba a curso y no concede exención; recuperación de curso pendiente.'],
 ['T09','B','B','No equipara UNAB Tec y profesional presencial; diferencias por modalidad/cohorte requieren adaptación.'],
 ['T10a','A','A','Aclaración aislada antes de embedding/generación, sin antecedentes ajenos ni atribución documental.'],
 ['T10b','A','A','Aclaración aislada antes de embedding/generación, sin antecedentes ajenos ni atribución documental.'],
 ['T11','C','C','Pendiente académico: primeros dos turnos genéricos, sin explicar los casos ni distinguir hipótesis de procedimiento y derecho universal; U03 pertinente en el tercero no resuelve el escenario.'],
 ['T12','B','B','Contacto histórico M12 con vigencia no ratificada; publicación de notas, inmediatez y umbral 70 sin respaldo suficiente.'],
 ['REG','A','A','Catálogo y syllabus IA; continuidad y corrección a Marca Personal; duración histórica y contacto pertinentes con límites de vigencia. No acredita oferta actual.'],
 ['AMB','A','A','Catálogo seguido de referencia singular pide cuál curso antes de recuperación/generación, sin citas.'],
 ['AMB_FRESH','A','A','Referencia sin antecedente solicita contexto; sin SQL documental, embedding o generación.'],
].map(([scenario,baseline_class,current_class,review])=>({scenario,baseline_class,current_class,review}));
const comparison=run.turns.map((t:any,i:number)=>{
 const prior=old.turns[i];assert.equal(t.scenario,prior.scenario);assert.equal(t.turn,prior.turn);assert.equal(t.question,prior.question);
 const a=t.result.body.assistant_message,b=prior.result.body.assistant_message;
 return{scenario:t.scenario,turn:t.turn,question:t.question,baseline_answer:b,current_answer:a,
  text_equal:a.content===b.content,citation_locators_equal:JSON.stringify(a.citations.map((c:any)=>c.locator))===JSON.stringify(b.citations.map((c:any)=>c.locator)),
  selection_equal:t.generator_calls>0?JSON.stringify(t.selected_locators)===JSON.stringify(prior.selected_locators):null,insufficiency_equal:a.insufficient_evidence===b.insufficient_evidence};
});
const summary={checkpoint:'BCH-05/CCD-AUTH-I1B',at:new Date().toISOString(),reviewer:'Codex, qualitative inspection; not institutional academic approval',
 current_report:file,current_sha256:createHash('sha256').update(bytes).digest('hex'),baseline_sha256:createHash('sha256').update(oldBytes).digest('hex'),
 same_generator_recipe_and_digest:true,same_questions:43,text_equal:comparison.filter((t:any)=>t.text_equal).length,
 citation_locators_equal:comparison.filter((t:any)=>t.citation_locators_equal).length,selection_equal:comparison.filter((t:any)=>t.selection_equal).length,
 selection_comparable:comparison.filter((t:any)=>t.selection_equal!==null).length,selection_note:'Current selection is observed at generator input only; the 12 turns without generation are not comparable with the historic selector instrumentation.',
 insufficiency_equal:comparison.filter((t:any)=>t.insufficiency_equal).length,
 calls:run.turns.reduce((n:any,t:any)=>({embedding:n.embedding+t.embedding_calls,retrieval:n.retrieval+t.retrieval_calls,generation:n.generation+t.generator_calls}),{embedding:0,retrieval:0,generation:0}),
 http_503:run.turns.filter((t:any)=>t.result.status===503).length,classes:rows,
 regression:'T01/2 lost useful bounded orientation and its citation; cause not established. No prompt/model/corpus/parameter adjustment or rerun to hide it.',
 controls_comparison:{baseline:old.check_metrics,current:run.check_metrics,note:'Different accounting: 216 focused per-turn/history controls plus SQL/auth/artifact assertions; not equivalent to the historic 329 controls.'},
 academic_pending:['T11'],android:'not executed by agent'};
await evidence('semantic-comparison',{...summary,comparison},true);await evidence('comparison',summary);
console.log(JSON.stringify({text_equal:summary.text_equal,selection_equal:summary.selection_equal,citation_locators_equal:summary.citation_locators_equal,calls:summary.calls,regression:'T01/2',academic_pending:summary.academic_pending}));
