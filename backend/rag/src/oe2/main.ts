import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FileOe2StateStore, runOe2FixtureFlow } from './flow.js';
import { createOe2HttpServer } from './server.js';
import type { Oe2Category } from './types.js';

const FIXTURE_SOURCE_IDS: Record<Oe2Category, string> = {
  academic_offer: 'fixture-academic-offer-v1', calls: 'fixture-calls-v1', news: 'fixture-news-v1',
};

export async function startOe2FixtureService(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const fixtureRoot = env.BANUCHAT_OE2_FIXTURE_ROOT;
  const stateRoot = env.BANUCHAT_OE2_STATE_ROOT;
  const serviceToken = env.BANUCHAT_OE2_SERVICE_TOKEN;
  if (!fixtureRoot || !stateRoot || !serviceToken) throw new Error('Invalid OE2 runtime configuration');
  const store = new FileOe2StateStore(path.resolve(stateRoot));
  const service = {
    run: (category: Oe2Category, sourceId: string) => runOe2FixtureFlow({
      category, sourceId, fixtureRoot: path.resolve(fixtureRoot), store,
    }),
    status: async (category: Oe2Category) => (await store.load(category)) ?? {
      outcome: 'not_started', category, source_id: FIXTURE_SOURCE_IDS[category], published_to_ccd: false,
    },
  };
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
