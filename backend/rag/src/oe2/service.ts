import path from 'node:path';
import {FileOe2StateStore,runOe2FixtureFlow} from './flow.js';
import type {Oe2Category} from './types.js';

/** Reusable composition without CLI entrypoint side effects. */
export function createOe2FixtureService(fixtureRoot:string,stateRoot:string) {
  const fixtures=path.resolve(fixtureRoot),state=path.resolve(stateRoot);
  const contains=(a:string,b:string)=>{const relative=path.relative(a,b);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};
  if(contains(fixtures,state)||contains(state,fixtures))throw new Error('OE2 roots must be disjoint');
  const store=new FileOe2StateStore(state);
  return {
    run:(category:Oe2Category,sourceId:string,operationId?:string)=>runOe2FixtureFlow({category,sourceId,fixtureRoot:fixtures,store,...(operationId?{operationId}:{})}),
    status:(category:Oe2Category)=>store.status(category),
  };
}
