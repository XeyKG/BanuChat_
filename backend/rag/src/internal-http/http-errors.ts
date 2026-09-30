import { ApprovalRegistryError } from '../approval/errors.js';
import { DatabaseError } from '../db/errors.js';
import { PreflightError } from '../errors.js';
import { OllamaError } from '../ollama/errors.js';
import { RuntimeProvenanceError } from '../runtime/errors.js';
import { InternalControlError } from './control-errors.js';
import { InternalRequestError } from './errors.js';
import { IngestionStatusError } from './status-errors.js';

export interface InternalHttpErrorBody {
  error_code: string;
  retryable: boolean;
  reason?: string;
}

export interface InternalHttpErrorResponse {
  status: number;
  body: InternalHttpErrorBody;
}

export class InternalHttpTransportError extends Error {
  constructor(readonly status: number, readonly errorCode: string) {
    super(errorCode);
    this.name = 'InternalHttpTransportError';
  }
}

const APPROVAL_CONFLICTS = new Set([
  'approval_not_found', 'revision_mismatch', 'dataset_mismatch', 'manifest_mismatch',
]);

export function mapInternalHttpError(error: unknown): InternalHttpErrorResponse {
  if (error instanceof InternalHttpTransportError) {
    return { status: error.status, body: { error_code: error.errorCode, retryable: false } };
  }
  if (error instanceof InternalRequestError) {
    return { status: 400, body: { error_code: error.code, retryable: false, reason: error.reason } };
  }
  if (error instanceof InternalControlError) {
    return { status: 409, body: { error_code: error.code, retryable: false, reason: error.reason } };
  }
  if (error instanceof IngestionStatusError) {
    return { status: 409, body: { error_code: error.code, retryable: false, reason: error.reason } };
  }
  if (error instanceof ApprovalRegistryError) {
    if (error.reason === 'registry_unavailable') {
      return { status: 503, body: { error_code: error.code, retryable: true, reason: error.reason } };
    }
    return { status: APPROVAL_CONFLICTS.has(error.reason) ? 409 : 500,
      body: { error_code: error.code, retryable: false, reason: error.reason } };
  }
  if (error instanceof RuntimeProvenanceError) {
    return { status: 500, body: { error_code: error.code, retryable: false, reason: error.reason } };
  }
  if (error instanceof PreflightError) {
    if (error.code === 'SOURCE_REJECTED' || error.code === 'VALIDATION_FAILED') {
      return { status: 409, body: { error_code: error.code, retryable: false, reason: error.category } };
    }
    return { status: 500, body: { error_code: 'INTERNAL_ERROR', retryable: false } };
  }
  if (error instanceof DatabaseError) {
    if (error.code === 'DATABASE_UNAVAILABLE') {
      return { status: 503, body: { error_code: error.code, retryable: true } };
    }
    return { status: 409, body: { error_code: error.code, retryable: false } };
  }
  if (error instanceof OllamaError) {
    if (error.code === 'OLLAMA_UNAVAILABLE') {
      return { status: 503,
        body: { error_code: error.code, retryable: true, reason: error.reason } };
    }
    return { status: 409,
      body: { error_code: error.code, retryable: false, reason: error.reason } };
  }
  return { status: 500, body: { error_code: 'INTERNAL_ERROR', retryable: false } };
}

