const LOOPBACK_HOST = "127.0.0.1" as const;
const LAN_BIND_HOST = "0.0.0.0" as const;

type ApiHost = typeof LOOPBACK_HOST | typeof LAN_BIND_HOST;

export interface RuntimeConfig {
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
  name: "POSTGRES_DB" | "POSTGRES_USER" | "POSTGRES_PASSWORD",
): string {
  const value = environment[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(name);
  }
  return value;
}

function readPort(
  environment: NodeJS.ProcessEnv,
  name: "POSTGRES_PORT" | "BANUCHAT_API_PORT",
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
  return {
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
