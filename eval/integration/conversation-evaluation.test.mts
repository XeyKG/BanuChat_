import assert from 'node:assert/strict';
import test from 'node:test';
import {scenarioTurns,dependenciesSatisfied,scenarioMetrics,evaluationCheck,checkMetrics} from './conversation-evaluation.mjs';
test('failed POST blocks only dependent turns; an independent topic remains evaluable',()=>{
 const turns=scenarioTurns(['catalog','IA','themes','contact'],{4:[]});
 Object.assign(turns[0]!,{state:'completed',attempted:true});Object.assign(turns[1]!,{state:'failed',attempted:true});
 assert.equal(dependenciesSatisfied(turns[2]!,turns),false);Object.assign(turns[2]!,{state:'not_evaluable',reason:'IA failed'});
 assert.equal(dependenciesSatisfied(turns[3]!,turns),true);Object.assign(turns[3]!,{state:'completed',attempted:true});
 assert.deepEqual(scenarioMetrics(turns),{planned:4,attempted:3,completed:2,failed:1,not_evaluable:1,remaining:0,script_complete:false});
});
test('HTTP success alone is not persistence completion',()=>{
 const turns=scenarioTurns(['IA','themes']);Object.assign(turns[0]!,{attempted:true,state:'failed',reason:'persistence not verified'});
 assert.equal(dependenciesSatisfied(turns[1]!,turns),false);assert.equal(scenarioMetrics(turns).script_complete,false);
});
test('a complete persisted script remains distinct from content checks',()=>{
 const turns=scenarioTurns(['IA','themes']);for(const t of turns)Object.assign(t,{attempted:true,state:'completed'});
 assert.equal(scenarioMetrics(turns).script_complete,true);
 assert.equal(evaluationCheck('wrong citation',()=>assert.fail()).status,'failed');
});
test('planned check denominator does not shrink when a response is missing',()=>{
 const complete=[evaluationCheck('HTTP',()=>{}),evaluationCheck('content',()=>{}),evaluationCheck('persistence',()=>{})];
 const failed=[evaluationCheck('HTTP',()=>assert.fail()),evaluationCheck('content'),evaluationCheck('persistence')];
 assert.deepEqual(checkMetrics(complete),{planned:3,passed:3,failed:0,not_evaluable:0});
 assert.deepEqual(checkMetrics(failed),{planned:3,passed:0,failed:1,not_evaluable:2});
 assert.equal(failed[1]?.passed,null);
});
test('invalid dependencies are rejected rather than silently skipping a case',()=>{
 assert.throws(()=>scenarioTurns(['a','b'],{2:[2]}));
});
