import { pathToFileURL } from 'node:url';

import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

import { loadApprovalRegistry } from './approval/loader.js';
import { createInternalIngestionHttpServer } from './internal-http/server.js';
import { parseInternalIngestionEnvironment } from './internal-http/runtime-config.js';
import { createInternalIngestionService } from './internal-http/service.js';
import { OllamaClient } from './ollama/client.js';
import type { EmbeddingClient } from './ollama/types.js';
import { prepareRuntimeContext } from './runtime/provenance.js';

const HOST = '127.0.0.1';
const PORT = 3010;

type HttpServer = ReturnType<typeof createInternalIngestionHttpServer>;

export interface InternalIngestionProcess {
  shutdown(): Promise<void>;
}

export interface InternalIngestionMainDependencies {
  parseEnvironment: typeof parseInternalIngestionEnvironment;
  loadRegistry: typeof loadApprovalRegistry;
  prepareRuntime: typeof prepareRuntimeContext;
  createPool(config: PoolConfig): Pool;
  createEmbeddingClient(baseUrl: string): EmbeddingClient;
  createService: typeof createInternalIngestionService;
  createHttpServer: typeof createInternalIngestionHttpServer;
}

export interface InternalIngestionMainRuntime {
  env: NodeJS.ProcessEnv;
  onSignal(signal: 'SIGINT' | 'SIGTERM', listener: () => void): void;
  log(message: string): void;
  error(message: string): void;
  fail(): void;
}

const DEFAULT_DEPENDENCIES: InternalIngestionMainDependencies = {
  parseEnvironment: parseInternalIngestionEnvironment,
  loadRegistry: loadApprovalRegistry,
  prepareRuntime: prepareRuntimeContext,
  createPool: (config) => new Pool(config),
  createEmbeddingClient: (baseUrl) => new OllamaClient(baseUrl),
  createService: createInternalIngestionService,
  createHttpServer: createInternalIngestionHttpServer,
};

const DEFAULT_RUNTIME: InternalIngestionMainRuntime = {
  env: process.env,
  onSignal: (signal, listener) => process.once(signal, listener),
  log: (message) => console.log(message),
  error: (message) => console.error(message),
  fail: () => { process.exitCode = 1; },
};

async function closeHttpServer(server: HttpServer): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error));
  });
}

async function listen(server: HttpServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error): void => reject(error);
    server.once('error', handleError);
    server.listen(PORT, HOST, () => {
      server.off('error', handleError);
      resolve();
    });
  });
}

async function closeResources(server: HttpServer | undefined, pool: Pool | undefined): Promise<boolean> {
  const results = await Promise.allSettled([
    server === undefined ? Promise.resolve() : closeHttpServer(server),
    pool === undefined ? Promise.resolve() : pool.end(),
  ]);
  return results.every((result) => result.status === 'fulfilled');
}

export async function startInternalIngestionService(
  dependencies: InternalIngestionMainDependencies = DEFAULT_DEPENDENCIES,
  runtime: InternalIngestionMainRuntime = DEFAULT_RUNTIME,
): Promise<InternalIngestionProcess | undefined> {
  let pool: Pool | undefined;
  let server: HttpServer | undefined;

  try {
    const config = dependencies.parseEnvironment(runtime.env);
    const registry = await dependencies.loadRegistry(config.approvalRegistryPath);
    const provenance = await dependencies.prepareRuntime({
      runtimeCheckoutRoot: config.runtimeCheckoutRoot,
    });

    pool = dependencies.createPool({
      connectionString: config.databaseUrl,
      max: 3,
      connectionTimeoutMillis: 5000,
    });
    await pool.query<{ ok: number }>('SELECT 1 AS ok');

    const embeddingClient = dependencies.createEmbeddingClient(config.ollamaBaseUrl);
    const service = dependencies.createService({
      registry,
      runtime: provenance,
      sourceCheckoutRoot: config.sourceCheckoutRoot,
      workflowRef: config.workflowRef,
      pool,
      embeddingClient,
    });
    server = dependencies.createHttpServer({
      service,
      serviceToken: config.serviceToken,
    });
    await listen(server);

    let shutdownPromise: Promise<void> | undefined;
    const shutdown = (): Promise<void> => {
      shutdownPromise ??= (async () => {
        if (!await closeResources(server, pool)) {
          runtime.fail();
          runtime.error('BanuChat ingestion service failed to shut down cleanly');
        }
      })();
      return shutdownPromise;
    };

    runtime.onSignal('SIGINT', () => void shutdown());
    runtime.onSignal('SIGTERM', () => void shutdown());
    runtime.log(`BanuChat ingestion service listening on http://${HOST}:${PORT}`);
    return { shutdown };
  } catch {
    await closeResources(server, pool);
    runtime.fail();
    runtime.error('BanuChat ingestion service failed to start');
    return undefined;
  }
}

const entryPoint = process.argv[1];
if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  void startInternalIngestionService();
}
