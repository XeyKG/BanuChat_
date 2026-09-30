import path from 'node:path';

import { InternalRuntimeConfigError,
  type InternalRuntimeConfigReason } from './runtime-config-errors.js';
import { isValidInternalServiceToken } from './service-token.js';

export interface InternalIngestionRuntimeConfig {
  approvalRegistryPath: string;
  runtimeCheckoutRoot: string;
  sourceCheckoutRoot: string;
  workflowRef: string;
  databaseUrl: string;
  ollamaBaseUrl: string;
  serviceToken: string;
}

const ENVIRONMENT_KEYS = {
  approvalRegistryPath: 'BANUCHAT_INGESTION_APPROVAL_REGISTRY_PATH',
  runtimeCheckoutRoot: 'BANUCHAT_INGESTION_RUNTIME_CHECKOUT_ROOT',
  sourceCheckoutRoot: 'BANUCHAT_INGESTION_SOURCE_CHECKOUT_ROOT',
  workflowRef: 'BANUCHAT_INGESTION_WORKFLOW_REF',
  databaseUrl: 'BANUCHAT_INGESTION_DATABASE_URL',
  ollamaBaseUrl: 'BANUCHAT_INGESTION_OLLAMA_BASE_URL',
  serviceToken: 'BANUCHAT_INGESTION_SERVICE_TOKEN',
} as const;

function reject(reason: InternalRuntimeConfigReason): never {
  throw new InternalRuntimeConfigError(reason);
}

function requiredValue(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined) {
    return reject('missing_value');
  }
  if (value.length === 0 || value.trim().length === 0) {
    return reject('invalid_value');
  }
  return value;
}

function requireAbsolutePath(value: string): void {
  if (!path.isAbsolute(value)) {
    reject('invalid_path');
  }
}

function parseUrl(value: string, reason: InternalRuntimeConfigReason): URL {
  try {
    return new URL(value);
  } catch {
    return reject(reason);
  }
}

export function parseInternalIngestionEnvironment(
  env: NodeJS.ProcessEnv,
): InternalIngestionRuntimeConfig {
  const approvalRegistryPath = requiredValue(env, ENVIRONMENT_KEYS.approvalRegistryPath);
  const runtimeCheckoutRoot = requiredValue(env, ENVIRONMENT_KEYS.runtimeCheckoutRoot);
  const sourceCheckoutRoot = requiredValue(env, ENVIRONMENT_KEYS.sourceCheckoutRoot);
  const workflowRef = requiredValue(env, ENVIRONMENT_KEYS.workflowRef);
  const databaseUrl = requiredValue(env, ENVIRONMENT_KEYS.databaseUrl);
  const ollamaBaseUrl = requiredValue(env, ENVIRONMENT_KEYS.ollamaBaseUrl);
  const serviceToken = requiredValue(env, ENVIRONMENT_KEYS.serviceToken);

  requireAbsolutePath(approvalRegistryPath);
  requireAbsolutePath(runtimeCheckoutRoot);
  requireAbsolutePath(sourceCheckoutRoot);

  if (runtimeCheckoutRoot === sourceCheckoutRoot) {
    reject('paths_not_separated');
  }

  const parsedDatabaseUrl = parseUrl(databaseUrl, 'invalid_database_url');
  if ((parsedDatabaseUrl.protocol !== 'postgresql:' && parsedDatabaseUrl.protocol !== 'postgres:')
    || parsedDatabaseUrl.hostname.length === 0) {
    reject('invalid_database_url');
  }

  const parsedOllamaUrl = parseUrl(ollamaBaseUrl, 'invalid_ollama_url');
  if (parsedOllamaUrl.protocol !== 'http:' || parsedOllamaUrl.hostname.length === 0) {
    reject('invalid_ollama_url');
  }

  if (!isValidInternalServiceToken(serviceToken)) {
    reject('invalid_value');
  }

  return {
    approvalRegistryPath,
    runtimeCheckoutRoot,
    sourceCheckoutRoot,
    workflowRef,
    databaseUrl,
    ollamaBaseUrl,
    serviceToken,
  };
}
