import type { DemoMode } from "./application/demo-mode.js";
const LOOPBACK_HOST = "127.0.0.1" as const;
const LAN_BIND_HOST = "0.0.0.0" as const;

type ApiHost = typeof LOOPBACK_HOST | typeof LAN_BIND_HOST;

export interface RuntimeConfig {
  demo_mode: DemoMode;
  postgres: {
    host: typeof LOOPBACK_HOST;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  api: {
    host: ApiHost;
    port: number;
  };
}

function readApiHost(environment: NodeJS.ProcessEnv): ApiHost {
  const value = environment.BANUCHAT_API_HOST;
  if (value === undefined) {
    return LOOPBACK_HOST;
  }
  if (value === LOOPBACK_HOST || value === LAN_BIND_HOST) {
    return value;
  }
  throw new Error("BANUCHAT_API_HOST");
}

function requireValue(
  environment: NodeJS.ProcessEnv,
  name: "POSTGRES_DB" | "POSTGRES_USER" | "POSTGRES_PASSWORD" | "CCD_POSTGRES_USER" | "CCD_POSTGRES_PASSWORD",
): string {
  const value = environment[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(name);
  }
  return value;
}

function readPort(
  environment: NodeJS.ProcessEnv,
  name: "POSTGRES_PORT" | "BANUCHAT_API_PORT" | "CCD_POSTGRES_PORT",
  defaultValue: number,
): number {
  const value = environment[name];
  if (value === undefined) {
    return defaultValue;
  }
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(name);
  }

  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(name);
  }
  return port;
}

export function loadRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const mode = environment.BANUCHAT_DEMO_MODE ?? "synthetic";
  if (mode !== "synthetic" && mode !== "ccd_local") throw new Error("BANUCHAT_DEMO_MODE");
  if (mode === "ccd_local") {
    if (readApiHost(environment) !== LOOPBACK_HOST) throw new Error("CCD_LOOPBACK_REQUIRED");
    const port = readPort(environment, "CCD_POSTGRES_PORT", 55433);
    if (port === 5432) throw new Error("CCD_ISOLATED_PORT_REQUIRED");
    return { demo_mode: mode, postgres: { host: LOOPBACK_HOST, port, database: "banuchat_ccd_dev",
      user: requireValue(environment, "CCD_POSTGRES_USER"), password: requireValue(environment, "CCD_POSTGRES_PASSWORD") },
      api: { host: LOOPBACK_HOST, port: readPort(environment, "BANUCHAT_API_PORT", 3001) } };
  }
  if (environment.POSTGRES_DB === "banuchat_ccd_dev") throw new Error("CCD_EXPLICIT_MODE_REQUIRED");
  return {
    demo_mode: mode,
    postgres: {
      host: LOOPBACK_HOST,
      port: readPort(environment, "POSTGRES_PORT", 5432),
      database: requireValue(environment, "POSTGRES_DB"),
      user: requireValue(environment, "POSTGRES_USER"),
      password: requireValue(environment, "POSTGRES_PASSWORD"),
    },
    api: {
      host: readApiHost(environment),
      port: readPort(environment, "BANUCHAT_API_PORT", 3000),
    },
  };
}
