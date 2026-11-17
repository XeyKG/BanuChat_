import { getApiBaseUrl } from '@/config/api';
import {resourceFetch as fetch} from '@/auth/runtime';
import {isCcdLocal} from '@/config/demo-mode';
import { assertConversationAllowed } from '@/session/operator-conversations';

export const MESSAGE_TIMEOUT_MS = 90_000;
const HTTPS_MESSAGE_TIMEOUT_MS = 175_000;

export type CitationSourceKind =
  | 'document'
  | 'course'
  | 'profile'
  | 'profile_course'
  | 'calendar_event'
  | 'announcement';

export interface Citation {
  index: number;
  source_kind: CitationSourceKind;
  label: string;
  locator: string;
  release_id: string;
  document_version_id: string | null;
  artifact_url: string | null;
}

export interface SentUserMessage {
  message_id: string;
  role: 'user';
  content: string;
  created_at: string;
}

export interface SentAssistantMessage {
  message_id: string;
  role: 'assistant';
  content: string;
  created_at: string;
  insufficient_evidence: boolean;
  citations: Citation[];
}

export interface SendMessageResponse {
  conversation_id: string;
  user_message: SentUserMessage;
  assistant_message: SentAssistantMessage;
}

export type MessageRequestErrorKind = 'http' | 'conflict' | 'timeout' | 'network' | 'invalid_response';

export class MessageRequestError extends Error {
  constructor(readonly kind: MessageRequestErrorKind) {
    super('MESSAGE_REQUEST_FAILED');
    this.name = 'MessageRequestError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCitationSourceKind(value: unknown): value is CitationSourceKind {
  return (
    value === 'document' ||
    value === 'course' ||
    value === 'profile' ||
    value === 'profile_course' ||
    value === 'calendar_event' ||
    value === 'announcement'
  );
}

export function isCitation(value: unknown): value is Citation {
  if (
    !(
      isRecord(value) &&
      typeof value.index === 'number' &&
      Number.isInteger(value.index) &&
      value.index >= 0 &&
      isCitationSourceKind(value.source_kind) &&
      isNonemptyString(value.label) &&
      isNonemptyString(value.locator) &&
      isNonemptyString(value.release_id) &&
      isNullableString(value.document_version_id) &&
      isNullableString(value.artifact_url)
    )
  ) {
    return false;
  }

  if (value.source_kind === 'document') {
    return (
      typeof value.document_version_id === 'string' &&
      UUID_PATTERN.test(value.document_version_id) &&
      (value.artifact_url === null ||
        value.artifact_url === `/api/${isCcdLocal()?'v1':'v2'}/documents/${value.document_version_id}/artifact`)
    );
  }

  return value.document_version_id === null && value.artifact_url === null;
}

function parseCitation(value: unknown): Citation {
  if (!isCitation(value)) {
    throw new MessageRequestError('invalid_response');
  }

  return {
    index: value.index,
    source_kind: value.source_kind,
    label: value.label,
    locator: value.locator,
    release_id: value.release_id,
    document_version_id: value.document_version_id,
    artifact_url: value.artifact_url,
  };
}

function parseUserMessage(value: unknown): SentUserMessage {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.message_id) ||
    value.role !== 'user' ||
    !isNonemptyString(value.content) ||
    !isNonemptyString(value.created_at)
  ) {
    throw new MessageRequestError('invalid_response');
  }

  return {
    message_id: value.message_id,
    role: 'user',
    content: value.content,
    created_at: value.created_at,
  };
}

function parseAssistantMessage(value: unknown): SentAssistantMessage {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.message_id) ||
    value.role !== 'assistant' ||
    !isNonemptyString(value.content) ||
    !isNonemptyString(value.created_at) ||
    typeof value.insufficient_evidence !== 'boolean' ||
    !Array.isArray(value.citations)
  ) {
    throw new MessageRequestError('invalid_response');
  }

  return {
    message_id: value.message_id,
    role: 'assistant',
    content: value.content,
    created_at: value.created_at,
    insufficient_evidence: value.insufficient_evidence,
    citations: value.citations.map(parseCitation),
  };
}

function parseSendMessageResponse(value: unknown): SendMessageResponse {
  if (!isRecord(value) || !isNonemptyString(value.conversation_id)) {
    throw new MessageRequestError('invalid_response');
  }

  return {
    conversation_id: value.conversation_id,
    user_message: parseUserMessage(value.user_message),
    assistant_message: parseAssistantMessage(value.assistant_message),
  };
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<SendMessageResponse> {
  assertConversationAllowed(conversationId);
  let baseUrl: string;
  try {
    baseUrl = getApiBaseUrl();
  } catch {
    throw new MessageRequestError('network');
  }
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, baseUrl.startsWith('https://') ? HTTPS_MESSAGE_TIMEOUT_MS : MESSAGE_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        },
      );
    } catch {
      throw new MessageRequestError(didTimeout ? 'timeout' : 'network');
    }

    if (response.status === 409) {
      throw new MessageRequestError('conflict');
    }
    // A dependency error may follow a COMMIT whose acknowledgement was lost.
    // Preserve reconciliation until the persisted history confirms the outcome.
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new MessageRequestError('network');
    }
    if (response.status !== 201) {
      throw new MessageRequestError('http');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new MessageRequestError('invalid_response');
    }

    return parseSendMessageResponse(payload);
  } finally {
    clearTimeout(timeout);
  }
}
