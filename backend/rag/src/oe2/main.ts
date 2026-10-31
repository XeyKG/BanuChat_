import { pathToFileURL } from 'node:url';
import { createOe2HttpServer } from './server.js';
import {createOe2FixtureService} from './service.js';
export {createOe2FixtureService} from './service.js';

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
