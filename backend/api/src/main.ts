import { pathToFileURL, fileURLToPath } from "node:url";

import { Pool } from "pg";

import type { DocumentRagResponder } from "./application/messages.js";
import { generateDocumentRagAnswer } from "./chat/document-rag.js";
import { PgSqlClient } from "./data/pg-client.js";
import type { SqlQueryClient } from "./data/sql-client.js";
import { loadGeneratorRuntimeConfig } from "./generation/generator-client.js";
import { OllamaGeneratorClient } from "./generation/ollama-generator-client.js";
import { createApiServer, type ApiServerDependencies } from "./http/api-server.js";
import { assertCcdChatDatabase } from "./ccd-runtime.js";
import { OllamaQueryEmbeddingClient } from "./retrieval/ollama-query-embedding-client.js";
import { loadDefaultIntentRouter } from "./routing/intent-router.js";
import type { IntentRouter } from "./routing/intent-router-types.js";
import { loadRuntimeConfig } from "./runtime-config.js";

export async function createRuntimeApiServer(
  sql: SqlQueryClient,
  documentRag: DocumentRagResponder,
  loadRouter: () => Promise<IntentRouter> = loadDefaultIntentRouter,
  options: Pick<ApiServerDependencies, "demo_mode" | "document_artifact"> = {},
): Promise<ReturnType<typeof createApiServer>> {
  const router = await loadRouter();
  if (router.catalog_valid !== true) {
    throw new Error("intent_router_catalog_invalid");
  }
  return createApiServer({ sql, router, document_rag: documentRag, ...options });
}

async function closeHttpServer(
  server: ReturnType<typeof createApiServer>,
): Promise<void> {
  if (!server.listening) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

export async function startApi(): Promise<void> {
  let pool: Pool | undefined;
  let server: ReturnType<typeof createApiServer> | undefined;

  try {
    const config = loadRuntimeConfig();
    const generatorRuntime = loadGeneratorRuntimeConfig();
    pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
    });

    const sql = new PgSqlClient(pool);
    await sql.query<{ ok: number }>("SELECT 1 AS ok");
    if (config.demo_mode === "ccd_local") await assertCcdChatDatabase(sql);

    const queryEmbeddingClient = new OllamaQueryEmbeddingClient(
      generatorRuntime.base_url,
    );
    const generatorClient = new OllamaGeneratorClient(generatorRuntime.base_url);
    const documentRag: DocumentRagResponder = (input) =>
      generateDocumentRagAnswer(
        {
          sql,
          query_embedding_client: queryEmbeddingClient,
          generator_client: generatorClient,
          generator_config: generatorRuntime.generator,
          evidence_mode: config.demo_mode,
        },
        input,
      );

    server = await createRuntimeApiServer(sql, documentRag, loadDefaultIntentRouter, {
      demo_mode: config.demo_mode,
      ...(config.demo_mode === "ccd_local" ? { document_artifact: {
        root: fileURLToPath(new URL("../../../data/ccd/local/m01-m12/", import.meta.url)),
        version_roots: {
          "bch03-m01-m12-local-1": fileURLToPath(new URL("../../../data/ccd/local/m01-m12/", import.meta.url)),
          "bch03-ccd-local-2": fileURLToPath(new URL("../../../data/ccd/local/expanded-v2/", import.meta.url)),
          "bch03-ccd-local-3": fileURLToPath(new URL("../../../data/ccd/local/guidance-v3/", import.meta.url)),
        },
      } } : {}),
    });
    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error): void => reject(error);
      server?.once("error", handleError);
      server?.listen(config.api.port, config.api.host, () => {
        server?.off("error", handleError);
        resolve();
      });
    });

    let shuttingDown = false;
    const shutdown = async (): Promise<void> => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;

      try {
        if (server !== undefined) {
          await closeHttpServer(server);
        }
        await pool?.end();
      } catch {
        process.exitCode = 1;
        console.error("BanuChat API failed to shut down cleanly");
      }
    };

    process.once("SIGINT", () => void shutdown());
    process.once("SIGTERM", () => void shutdown());
    console.log(
      `BanuChat API (${config.demo_mode}) listening on http://${config.api.host}:${config.api.port}`,
    );
  } catch {
    if (server !== undefined) {
      await closeHttpServer(server).catch(() => undefined);
    }
    await pool?.end().catch(() => undefined);
    process.exitCode = 1;
    console.error("BanuChat API failed to start");
  }
}

const entryPoint = process.argv[1];
if (
  entryPoint !== undefined &&
  import.meta.url === pathToFileURL(entryPoint).href
) {
  void startApi();
}
