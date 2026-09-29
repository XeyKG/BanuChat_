import { readFile, stat } from 'node:fs/promises';
import { decodeUtf8, parseStrictJson } from '../preflight/json.js';
import { ApprovalRegistryError } from './errors.js';
import { parseApprovalRegistry } from './registry.js';
import type { ApprovalRegistryV1 } from './registry.js';

export const APPROVAL_REGISTRY_MAX_BYTES = 1024 * 1024;

export async function loadApprovalRegistry(filePath: string): Promise<ApprovalRegistryV1> {
  if (typeof filePath !== 'string' || filePath.length === 0 || filePath.trim().length === 0) {
    throw new ApprovalRegistryError('invalid_value');
  }

  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    throw new ApprovalRegistryError('registry_unavailable');
  }
  if (size > APPROVAL_REGISTRY_MAX_BYTES) {
    throw new ApprovalRegistryError('registry_too_large');
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    throw new ApprovalRegistryError('registry_unavailable');
  }
  if (bytes.byteLength > APPROVAL_REGISTRY_MAX_BYTES) {
    throw new ApprovalRegistryError('registry_too_large');
  }

  try {
    decodeUtf8(bytes);
  } catch {
    throw new ApprovalRegistryError('invalid_encoding');
  }

  let value: unknown;
  try {
    value = parseStrictJson(bytes);
  } catch {
    throw new ApprovalRegistryError('invalid_json');
  }
  return parseApprovalRegistry(value);
}

