import { pathToFileURL } from "node:url";

import { Pool } from "pg";

import { PgSqlClient } from "./data/pg-client.js";
import { createApiServer } from "./http/api-server.js";
import { loadRuntimeConfig } from "./runtime-config.js";

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
    pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
    });

    const sql = new PgSqlClient(pool);
    await sql.query<{ ok: number }>("SELECT 1 AS ok");

    server = createApiServer({ sql });
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
      `BanuChat API listening on http://${config.api.host}:${config.api.port}`,
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
