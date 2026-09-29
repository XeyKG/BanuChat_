import { InternalRequestError } from './errors.js';

export interface ExecuteRequest {
  approval_ref: string;
  source_git_revision: string;
  pipeline_version: string;
  workflow_ref: string;
}

export interface RetryRequest extends ExecuteRequest {
  release_id: string;
}

export interface RecoverRequest {
  release_id: string;
  run_id: string;
  workflow_ref: string;
}

export type StatusRequest =
  | { run_id: string; workflow_ref?: string }
  | { release_id: string; workflow_ref?: string }
  | {
      approval_ref: string;
      source_git_revision: string;
      pipeline_version: string;
      workflow_ref?: string;
    };

export type InternalIngestionRequest =
  | { operation: 'execute'; request: ExecuteRequest }
  | { operation: 'retry'; request: RetryRequest }
  | { operation: 'recover'; request: RecoverRequest }
  | { operation: 'status'; request: StatusRequest };

type JsonObject = Record<string, unknown>;

const FULL_GIT_REVISION = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function objectRequest(value: unknown): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InternalRequestError('invalid_shape');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new InternalRequestError('invalid_shape');
  }
  return value as JsonObject;
}

function validateFields(value: JsonObject, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(value).some((field) => !allowed.has(field))) {
    throw new InternalRequestError('extra_field');
  }
  if (required.some((field) => !Object.hasOwn(value, field))) {
    throw new InternalRequestError('missing_field');
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim().length > 0;
}

function requireString(value: unknown): asserts value is string {
  if (!nonEmptyString(value)) throw new InternalRequestError('invalid_value');
}

function requireGitRevision(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !FULL_GIT_REVISION.test(value)) {
    throw new InternalRequestError('invalid_value');
  }
}

function requireUuid(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new InternalRequestError('invalid_value');
  }
}

export function parseExecuteRequest(value: unknown): ExecuteRequest {
  const request = objectRequest(value);
  validateFields(request, ['approval_ref', 'source_git_revision', 'pipeline_version', 'workflow_ref']);
  requireString(request.approval_ref);
  requireGitRevision(request.source_git_revision);
  requireString(request.pipeline_version);
  requireString(request.workflow_ref);
  return request as unknown as ExecuteRequest;
}

export function parseRetryRequest(value: unknown): RetryRequest {
  const request = objectRequest(value);
  validateFields(request, [
    'approval_ref', 'release_id', 'source_git_revision', 'pipeline_version', 'workflow_ref',
  ]);
  requireString(request.approval_ref);
  requireUuid(request.release_id);
  requireGitRevision(request.source_git_revision);
  requireString(request.pipeline_version);
  requireString(request.workflow_ref);
  return request as unknown as RetryRequest;
}

export function parseRecoverRequest(value: unknown): RecoverRequest {
  const request = objectRequest(value);
  validateFields(request, ['release_id', 'run_id', 'workflow_ref']);
  requireUuid(request.release_id);
  requireUuid(request.run_id);
  requireString(request.workflow_ref);
  return request as unknown as RecoverRequest;
}

export function parseStatusRequest(value: unknown): StatusRequest {
  const request = objectRequest(value);
  const hasRun = Object.hasOwn(request, 'run_id');
  const hasRelease = Object.hasOwn(request, 'release_id');
  const identityFields = ['approval_ref', 'source_git_revision', 'pipeline_version'] as const;
  const identityCount = identityFields.filter((field) => Object.hasOwn(request, field)).length;
  const selectorCount = Number(hasRun) + Number(hasRelease) + Number(identityCount > 0);

  if (selectorCount === 0) throw new InternalRequestError('missing_field');
  if (selectorCount !== 1 || (identityCount > 0 && identityCount !== identityFields.length)) {
    throw new InternalRequestError('ambiguous_selector');
  }

  if (hasRun) {
    validateFields(request, ['run_id'], ['workflow_ref']);
    requireUuid(request.run_id);
  } else if (hasRelease) {
    validateFields(request, ['release_id'], ['workflow_ref']);
    requireUuid(request.release_id);
  } else {
    validateFields(request, identityFields, ['workflow_ref']);
    requireString(request.approval_ref);
    requireGitRevision(request.source_git_revision);
    requireString(request.pipeline_version);
  }
  if (Object.hasOwn(request, 'workflow_ref')) requireString(request.workflow_ref);
  return request as StatusRequest;
}

