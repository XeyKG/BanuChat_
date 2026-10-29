import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FileOe2StateStore, runOe2FixtureFlow } from './flow.js';
import { createOe2HttpServer } from './server.js';
import type { Oe2Category } from './types.js';

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

export async function startOe2FixtureService(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const fixtureRoot = env.BANUCHAT_OE2_FIXTURE_ROOT;
  const stateRoot = env.BANUCHAT_OE2_STATE_ROOT;
  const serviceToken = env.BANUCHAT_OE2_SERVICE_TOKEN;
  if (!fixtureRoot || !stateRoot || !serviceToken) throw new Error('Invalid OE2 runtime configuration');
  const service = createOe2FixtureService(fixtureRoot,stateRoot);
  const server = createOe2HttpServer(service, serviceToken);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(3011, '127.0.0.1', resolve);
  });
  console.log('BanuChat OE2 fixture service listening on http://127.0.0.1:3011');
}

const entryPoint = process.argv[1];
if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  void startOe2FixtureService().catch(() => {
    console.error('BanuChat OE2 fixture service failed to start'); process.exitCode = 1;
  });
}
