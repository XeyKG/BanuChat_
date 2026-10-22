/** Evaluation bookkeeping only: persistence completion is supplied by the HTTP runner. */
export interface EvaluationTurn {
  turn: number; question: string; depends_on: number[]; attempted: boolean;
  state: 'planned'|'completed'|'failed'|'not_evaluable'; reason?: string;
}
export interface EvaluationCheck { name: string; passed: boolean|null; status:'passed'|'failed'|'not_evaluable'; reason?:string }
export function scenarioTurns(questions:readonly string[],dependencies:Record<number,number[]>={}):EvaluationTurn[]{
  return questions.map((question,index)=>{
    const turn=index+1;const depends_on=dependencies[turn]??(index===0?[]:[index]);
    if(depends_on.some(d=>!Number.isInteger(d)||d<1||d>=turn))throw Error('Invalid evaluation dependency');
    return {turn,question,depends_on,attempted:false,state:'planned'};
  });
}
export function dependenciesSatisfied(turn:EvaluationTurn,turns:readonly EvaluationTurn[]):boolean {
  return turn.depends_on.every(d=>turns[d-1]?.state==='completed');
}
export function scenarioMetrics(turns:readonly EvaluationTurn[]){
  const completed=turns.filter(t=>t.state==='completed').length;
  return {planned:turns.length,attempted:turns.filter(t=>t.attempted).length,completed,
    failed:turns.filter(t=>t.state==='failed').length,not_evaluable:turns.filter(t=>t.state==='not_evaluable').length,
    remaining:turns.filter(t=>t.state==='planned').length,script_complete:completed===turns.length};
}
export function evaluationCheck(name:string,verify?:()=>void,reason='required response or antecedent unavailable'):EvaluationCheck {
  if(!verify)return {name,passed:null,status:'not_evaluable',reason};
  try{verify();return {name,passed:true,status:'passed'};}catch{return {name,passed:false,status:'failed'};}
}
export function checkMetrics(checks:readonly EvaluationCheck[]){return {planned:checks.length,
  passed:checks.filter(c=>c.status==='passed').length,failed:checks.filter(c=>c.status==='failed').length,
  not_evaluable:checks.filter(c=>c.status==='not_evaluable').length};}
