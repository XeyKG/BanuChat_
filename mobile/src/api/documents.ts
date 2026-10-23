import { getApiBaseUrl } from '@/config/api';
import {resourceFetch as fetch} from '@/auth/runtime';

export const DOCUMENT_TIMEOUT_MS = 15_000;
export const MAX_DOCUMENT_CHARACTERS = 1_000_000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DocumentRequestErrorKind =
  | 'invalid_id'
  | 'not_found'
  | 'http'
  | 'timeout'
  | 'network'
  | 'empty'
  | 'too_large';

export class DocumentRequestError extends Error {
  constructor(readonly kind: DocumentRequestErrorKind) {
    super('DOCUMENT_REQUEST_FAILED');
    this.name = 'DocumentRequestError';
  }
}

export function isDocumentVersionId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export async function getDocumentArtifact(documentVersionId: string): Promise<string> {
  if (!isDocumentVersionId(documentVersionId)) {
    throw new DocumentRequestError('invalid_id');
  }

  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, DOCUMENT_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(
        `${getApiBaseUrl()}/documents/${encodeURIComponent(documentVersionId)}/artifact`,
        { method: 'GET', signal: controller.signal },
      );
    } catch {
      throw new DocumentRequestError(didTimeout ? 'timeout' : 'network');
    }

    if (response.status === 404) {
      throw new DocumentRequestError('not_found');
    }
    if (response.status !== 200) {
      throw new DocumentRequestError('http');
    }

    const declaredLength = response.headers.get('content-length');
    if (
      declaredLength !== null &&
      Number.isFinite(Number(declaredLength)) &&
      Number(declaredLength) > MAX_DOCUMENT_CHARACTERS
    ) {
      throw new DocumentRequestError('too_large');
    }

    let content: string;
    try {
      content = await response.text();
    } catch {
      throw new DocumentRequestError(didTimeout ? 'timeout' : 'network');
    }
    if (content.trim().length === 0) {
      throw new DocumentRequestError('empty');
    }
    if (Array.from(content).length > MAX_DOCUMENT_CHARACTERS) {
      throw new DocumentRequestError('too_large');
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}
