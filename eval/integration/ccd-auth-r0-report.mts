/** Regenerates the private response matrix and public technical summary, no services. */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const baselinePath='data/ccd/evidence/increment-5/http-1792693227245.json';
const currentPath='data/ccd/evidence/auth-r0/comparison.json';
const baselineBytes=await readFile(new URL(baselinePath,root)),currentBytes=await readFile(new URL(currentPath,root));
const baseline=JSON.parse(baselineBytes.toString()),current=JSON.parse(currentBytes.toString());
const rubrics:Record<string,{grade:string;criterion:string}>={
 REG:{grade:'A',criterion:'Catálogo de siete syllabus; IA/DOC-101 y temas, corrección a DOC-103, duración histórica/TEST_ORIENTATION y contacto/M12; límites de vigencia pertinentes. No acredita oferta actual.'},
 AMB:{grade:'A',criterion:'Catálogo no identifica un curso: segundo turno debe pedir cuál, sin citas, embedding ni generación.'},
 AMB_FRESH:{grade:'A',criterion:'Sin antecedente debe pedir contexto, sin citas, embedding ni generación.'},
 T02:{grade:'B',criterion:'Consecuencia histórica U03 para 202660, sin conceder repetición gratuita actual; procedimiento vigente sigue pendiente.'},
 T07:{grade:'B',criterion:'Insuficiencia pertinente: sin citas U03/U04 ajenas, sin equiparar ausencia y reprobación ni autorizar intento gratis; falta procedimiento admitido.'},
 T11:{grade:'C / parcialmente no demostrado',criterion:'No basta abstenerse: explicar relatos como hipótesis y distinguir procedimiento de derecho universal. Primeros dos turnos genéricos no lo cumplen; U03 pertinente en el tercero no resuelve el escenario.'},
};
const rows=current.turns.map((turn:any)=>{
 const prior=baseline.turns.find((b:any)=>b.scenario===turn.scenario&&b.turn===turn.turn);
 if(!prior||!rubrics[turn.scenario])throw Error('UNKNOWN_CASE');
 return {scenario:turn.scenario,turn:turn.turn,question:turn.question,criterion:rubrics[turn.scenario]!.criterion,
  v1:{corpus:'CCD seleccionado local',release:baseline.release_id,http:prior.result.status,
   route:prior.generator_calls>0?'Document RAG + generación':prior.embedding_calls>0?'Document RAG + catálogo por metadatos':'aclaración sin retrieval',
   route_evidence:'reconstruida con contadores/traza de BCH-03; decisión inicial del router no registrada',answer:prior.result.body.assistant_message,
   evidence:'HTTP real histórico BCH-03/5.3; releído en R0, no repetido',semantic:rubrics[turn.scenario]!.grade},
  v2:{corpus:'sintético',release:current.current_release,http:turn.result?.status??null,
   route:turn.route?`${turn.route} → ${turn.rag_calls?'Document RAG':'fast path'}`:'no ejecutada; escenario detenido tras fallo SQL',
   answer:turn.result?.body.assistant_message??null,error:turn.result?.body.error?.code??null,
   evidence:turn.result?'HTTP real nuevo, copia desechable del runtime v2':'no evaluable; no reenviado',
   semantic:turn.state==='completed'?'aclaración segura demostrada; no demuestra recuperación CCD':'NE: sin respuesta evaluable',state:turn.state,
   embedding_calls:turn.embedding_calls??null,generator_calls:turn.generator_calls??null}};
});
const escape=(value:unknown)=>String(value??'—').replaceAll('|','\\|').replaceAll('\n','<br>');
let md='# BCH-05/CCD-AUTH-R0 — matriz privada de respuestas\n\n';
md+='No versionar: incluye respuestas de material CCD local seleccionado. A/B/C son revisión semántica heredada de BCH-03/5.3; NE no es PASS ni C. El criterio pertenece al escenario completo. No se atribuye prueba Mobile ni CCD autenticada.\n\n';
md+='| Caso / pregunta | Corpus / release | Ruta y evidencia | HTTP | Respuesta y citas | Resultado y criterio |\n| --- | --- | --- | --- | --- | --- |\n';
for(const row of rows)for(const mode of ['v1','v2'] as const){const value=row[mode];md+=`| ${row.scenario}/${row.turn} ${mode}: ${escape(row.question)} | ${escape(value.corpus)} / ${value.release} | ${escape(value.route)}; ${escape(value.evidence)} | ${value.http??'NE'} | ${escape(value.answer?.content??('error' in value?value.error:null)??'Sin respuesta')}; citas: ${escape(JSON.stringify(value.answer?.citations??[]))} | ${escape(value.semantic)}. ${escape(row.criterion)} |\n`;}
await writeFile(new URL('data/ccd/evidence/auth-r0/matrix.md',root),md);
await writeFile(new URL('data/ccd/evidence/auth-r0/matrix.json',root),JSON.stringify(rows,null,2)+'\n');
const summary={checkpoint:'BCH-05/CCD-AUTH-R0',baseline:{path:baselinePath,sha256:createHash('sha256').update(baselineBytes).digest('hex'),release:baseline.release_id,technical_controls:baseline.check_metrics,turn_metrics:baseline.turn_metrics},
 current:{path:currentPath,sha256:createHash('sha256').update(currentBytes).digest('hex'),release:current.current_release,
  planned:rows.length,attempted:rows.filter((r:any)=>r.v2.http!==null).length,completed:rows.filter((r:any)=>r.v2.state==='completed').length,
  failed:rows.filter((r:any)=>r.v2.state==='failed').length,not_evaluable:rows.filter((r:any)=>r.v2.state==='not_evaluable').length,
  embedding_calls:rows.reduce((n:number,r:any)=>n+(r.v2.embedding_calls??0),0),generator_calls:rows.reduce((n:number,r:any)=>n+(r.v2.generator_calls??0),0),
  ownership:current.ownership,integrity:current.integrity},
 cases:rows.map((r:any)=>({case:r.scenario+'/'+r.turn,v1_http:r.v1.http,v1_semantic_scenario:r.v1.semantic,v2_http:r.v2.http,v2_route:r.v2.route,v2_state:r.v2.state,v2_semantic:r.v2.semantic})),
 limitations:['New v2 semantic battery did not complete: 42501 confirmed separately; no RAG answer quality measured for failed/skipped turns.','Historical CCD evidence is not a new runtime replay.','No integration, migration, ingestion, contract or permission changes.','First preparation failed before HTTP because generator environment was absent; manual continuation pinned the historical recipe.','Initial diagnostic exit code was zero despite incomplete cases; final evaluator now returns nonzero, and the battery was not rerun.','Initial diagnostic conservatively stopped all later turns in a failed scenario, including independent REG/5 and REG/6. They remain unexecuted, not actual failed-dependent turns. Future evaluator now uses the explicit BCH-03 dependencies; no battery rerun.']};
await writeFile(new URL('eval/integration/results/bch05-ccd-auth-r0-comparison.json',root),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({planned:summary.current.planned,attempted:summary.current.attempted,completed:summary.current.completed,failed:summary.current.failed,not_evaluable:summary.current.not_evaluable,generator_calls:summary.current.generator_calls}));
