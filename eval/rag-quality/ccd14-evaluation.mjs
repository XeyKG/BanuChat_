import assert from 'node:assert/strict';
import {calculateCaseMetrics} from './oe1-metrics.mjs';

export function retrievalMetrics(relevant,ranking){
  const gold=new Set(relevant);assert.ok(gold.size>0);assert.equal(gold.size,relevant.length);
  const top=ranking.slice(0,5);assert.equal(new Set(top).size,top.length);
  if(top.length===5)return {...calculateCaseMetrics([...gold],top),recall_ceiling_at_5:Math.min(5,gold.size)/gold.size};
  const first=top.findIndex(id=>gold.has(id)),hits=top.filter(id=>gold.has(id)).length;
  return {first_relevant_rank:first<0?null:first+1,reciprocal_rank_at_5:first<0?0:1/(first+1),relevant_retrieved_count:hits,precision_at_5:hits/5,recall_at_5:hits/gold.size,hit_at_5:hits?1:0,recall_ceiling_at_5:Math.min(5,gold.size)/gold.size};
}

export function validateBenchmark(b){
 assert.equal(b.schema_version,'oe1-ccd14-evaluable-v2');assert.equal(b.status,'frozen_technical_delegation');assert.equal(b.dataset_schema_version,'ccd-1.4.0');
 assert.ok(b.cases.length>0);assert.equal(new Set(b.original_ids).size,45);assert.equal(b.original_ids.length,45);
 const ids=b.cases.map(c=>c.id),excluded=b.exclusions.map(c=>c.id);assert.equal(new Set([...ids,...excluded]).size,45);assert.deepEqual([...ids,...excluded].sort(),[...b.original_ids].sort());
 for(const id of ['OE1-CCD-14-C-010','OE1-CCD-14-C-044'])assert.ok(excluded.includes(id));
 for(const c of b.cases){assert.ok(c.question&&c.reference_answer&&c.relevant_contexts.length);assert.ok(!('approval' in c));assert.equal(c.review_origin,'codex_technical_delegation');assert.equal(new Set(c.relevant_contexts.map(g=>g.chunk_id)).size,c.relevant_contexts.length);}
 assert.ok(Number.isFinite(Date.parse(b.frozen_at_utc)));return true;
}

/** Passive SQL observer. Calls the original SQL client and never substitutes a result. */
export function observeSql(sql,normalize){
 const state={retrievals:[],generator_calls:[],embedding_calls:[]};
 const observed={async query(text,values){const result=await sql.query(text,values);if(text.startsWith('SELECT * FROM banuchat_auth.retrieve_'))state.retrievals.push({function:text.includes('retrieve_ccd_knowledge_chunks')?'retrieve_ccd_knowledge_chunks':'retrieve_document_chunks',requested_top_k:values[2],scope_keys:values[3]??null,rows:result.rows.map(row=>normalize(row,values[0]))});return result;}};
 return {sql:observed,state,reset(){state.retrievals=[];state.generator_calls=[];state.embedding_calls=[];}};
}

export function captureEvidence(answer,state,metadata){
 const rows=[...new Map(state.retrievals.flatMap(r=>r.rows).map(r=>[metadata.get(r.document_key)?.claim_id,r])).values()];
 const byClaim=new Map(rows.map(r=>[metadata.get(r.document_key)?.claim_id,r]));
 const resolveIds=ids=>(ids??[]).map(id=>{assert.ok(byClaim.has(id),'Unobserved evidence');return byClaim.get(id);});
 const selected=resolveIds(answer.selected_claim_ids),supporting=resolveIds(answer.supporting_claim_ids);
 const factual=state.generator_calls.filter(c=>c.input.user_prompt.startsWith('EVIDENCIA:\n'));
 const generatorContexts=[];
 for(const call of factual){const prompt=call.input.user_prompt,blocks=prompt.split('\n\nCONTEXTO DEL USUARIO')[0].slice('EVIDENCIA:\n'.length);const matches=[...blocks.matchAll(/^\[(\d+)\] (.*)\nHECHOS DISPONIBLES:\n([\s\S]*?)(?=^\[\d+\] |$(?![\s\S]))/gm)];
  assert.ok(matches.length>0,'No generator evidence blocks observed');
  for(const m of matches){const text=m[3].trimEnd(),row=rows.find(r=>r.title===m[2]&&text===(r.content.split('\n\n')[1]+(r.content.split('\nDETALLE DOCUMENTAL:\n')[1]?'\nDETALLE DOCUMENTAL:\n'+r.content.split('\nDETALLE DOCUMENTAL:\n')[1]:'' )).trimEnd());assert.ok(row,'Generator evidence does not match observed row');generatorContexts.push({chunk_id:row.chunk_id,claim_id:metadata.get(row.document_key).claim_id,text});}
 }
 const extracted=[];
 if(answer.pilot_strategy==='scoped_extract')for(const row of supporting){const claim=metadata.get(row.document_key),units=(answer.presentation_units??[]).filter(u=>u.claim_id===claim.claim_id);if(units.length){for(const u of units){const presentation=claim.presentation_units?.find(p=>p.key===u.key);assert.ok(presentation);extracted.push({chunk_id:row.chunk_id,claim_id:claim.claim_id,text:presentation.text,kind:'observed_presentation_unit'});}}else extracted.push({chunk_id:row.chunk_id,claim_id:claim.claim_id,text:row.content.split('\n\n')[1],kind:'observed_statement_extract'});}
 const used=answer.pilot_strategy==='grounded_synthesis'?generatorContexts:extracted;
 return {selected,supporting,generator_contexts:generatorContexts,used_contexts:used,capture_verified:answer.insufficient_evidence?true:used.length>0,interpretation:'Used contexts are the exact prompt excerpts for synthesis or traced presentation/statement extracts. Supporting IDs are source-protocol attribution, not proof of causal attention or semantic entailment.'};
}

export function coverage(c,answer,capture){
 const relevant=new Set(c.relevant_contexts.map(g=>g.chunk_id)),selected=new Set(capture.selected.map(g=>g.chunk_id)),support=new Set(capture.supporting.map(g=>g.chunk_id));
 const assertions=c.assertion_annotations??[],mapped=assertions.filter(a=>a.material_support_claim_ids.length>0),used=new Set(answer.supporting_claim_ids??[]);
 return {selected_gold_coverage:[...relevant].filter(id=>selected.has(id)).length/relevant.size,attributed_gold_coverage:[...relevant].filter(id=>support.has(id)).length/relevant.size,assertions_total:assertions.length,assertions_mapped:mapped.length,assertions_with_material_support_present:mapped.filter(a=>a.material_support_claim_ids.some(id=>used.has(id))).length,assertion_coverage_kind:'Partial material support presence according to pre-frozen technical annotations; not complete-answer correctness or entailment.'};
}

export function aggregate(cases){
 assert.ok(cases.length);const n=cases.length,mean=f=>cases.reduce((s,c)=>s+(c.metrics?.[f]??0),0)/n;
 const successful=cases.filter(c=>c.status==='completed'),verified=cases.filter(c=>c.capture?.capture_verified),withAnswer=cases.filter(c=>c.answer&&!c.answer.insufficient_evidence),assertions=cases.reduce((s,c)=>s+(c.coverage?.assertions_total??0),0),mapped=cases.reduce((s,c)=>s+(c.coverage?.assertions_mapped??0),0),supported=cases.reduce((s,c)=>s+(c.coverage?.assertions_with_material_support_present??0),0);
 return {denominators:{planned:n,attempted:n,completed:successful.length,abstention:cases.filter(c=>c.status==='abstention').length,error:cases.filter(c=>c.status==='error').length,timeout:cases.filter(c=>c.status==='timeout').length,ranking_observed:cases.filter(c=>c.ranking_observed).length},retrieval_all_planned:{hit_at_5:mean('hit_at_5'),mrr_at_5:mean('reciprocal_rank_at_5'),precision_at_5:mean('precision_at_5'),recall_at_5:mean('recall_at_5'),failure_policy:'No observed retrieval contributes zero; observed rankings are scored even if answer generation fails.'},capture:{verified:verified.length,percent_all:100*verified.length/n,answered:withAnswer.length,verified_answered:withAnswer.filter(c=>c.capture?.capture_verified).length},evidence:{mean_selected_gold_coverage:cases.reduce((s,c)=>s+(c.coverage?.selected_gold_coverage??0),0)/n,mean_attributed_gold_coverage:cases.reduce((s,c)=>s+(c.coverage?.attributed_gold_coverage??0),0)/n,assertions_total:assertions,assertions_mapped:mapped,assertions_with_material_support_present:supported,material_support_presence_rate_mapped:mapped?supported/mapped:null},strategies:Object.fromEntries([...new Set(cases.map(c=>c.answer?.pilot_strategy??'none'))].map(k=>[k,cases.filter(c=>(c.answer?.pilot_strategy??'none')===k).length]))};
}
