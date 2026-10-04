import { getApiBaseUrl } from '@/config/api';
import type { Citation } from '@/api/messages';

export interface CreatedConversation {
  conversation_id: string;
  profile_key: string;
  profile_alias: string;
  created_at: string;
}

export interface ConversationSummary {
  conversation_id: string;
  profile_key: string;
  started_at: string;
  last_message_at: string | null;
  message_count: number;
}

export interface ConversationProfile {
  profile_key: string;
  alias: string;
}

export type HistoryUserMessage = {
  message_id: string;
  role: 'user';
  content: string;
  created_at: string;
};

export type HistoryAssistantMessage = {
  message_id: string;
  role: 'assistant';
  content: string;
  created_at: string;
  insufficient_evidence: boolean;
  citations: Citation[];
};

export type HistoryMessage = HistoryUserMessage | HistoryAssistantMessage;

export interface ConversationDetail {
  conversation_id: string;
  started_at: string;
  profile: ConversationProfile;
  messages: HistoryMessage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseCreatedConversation(value: unknown): CreatedConversation {
  if (
    !isRecord(value) ||
    typeof value.conversation_id !== 'string' ||
    value.conversation_id.length === 0 ||
    typeof value.profile_key !== 'string' ||
    typeof value.profile_alias !== 'string' ||
    value.profile_alias.trim().length === 0 ||
    typeof value.created_at !== 'string'
  ) {
    throw new Error('CREATE_CONVERSATION_INVALID_RESPONSE');
  }

  return {
    conversation_id: value.conversation_id,
    profile_key: value.profile_key,
    profile_alias: value.profile_alias,
    created_at: value.created_at,
  };
}

function parseConversationSummary(value: unknown): ConversationSummary {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.conversation_id) ||
    !isNonemptyString(value.profile_key) ||
    !isNonemptyString(value.started_at) ||
    !(value.last_message_at === null || typeof value.last_message_at === 'string') ||
    !Number.isInteger(value.message_count) ||
    (value.message_count as number) < 0
  ) {
    throw new Error('CONVERSATIONS_INVALID_RESPONSE');
  }

  return {
    conversation_id: value.conversation_id,
    profile_key: value.profile_key,
    started_at: value.started_at,
    last_message_at: value.last_message_at,
    message_count: value.message_count as number,
  };
}

function parseHistoryMessage(value: unknown): HistoryMessage {
  if (!isRecord(value) || !isNonemptyString(value.message_id) || !isNonemptyString(value.content)) {
    throw new Error('CONVERSATION_INVALID_RESPONSE');
  }

  if (value.role === 'user') {
    return {
      message_id: value.message_id,
      role: 'user',
      content: value.content,
      created_at: typeof value.created_at === 'string' ? value.created_at : '',
    };
  }

  if (value.role === 'assistant') {
    const citations: Citation[] = Array.isArray(value.citations)
      ? (value.citations as Citation[])
      : [];
    return {
      message_id: value.message_id,
      role: 'assistant',
      content: value.content,
      created_at: typeof value.created_at === 'string' ? value.created_at : '',
      insufficient_evidence: value.insufficient_evidence === true,
      citations,
    };
  }

  throw new Error('CONVERSATION_INVALID_RESPONSE');
}

function parseConversationDetail(value: unknown): ConversationDetail {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.conversation_id) ||
    !isRecord(value.profile) ||
    !isNonemptyString(value.profile.profile_key) ||
    !isNonemptyString(value.profile.alias) ||
    !Array.isArray(value.messages)
  ) {
    throw new Error('CONVERSATION_INVALID_RESPONSE');
  }

  return {
    conversation_id: value.conversation_id,
    started_at: typeof value.started_at === 'string' ? value.started_at : '',
    profile: { profile_key: value.profile.profile_key, alias: value.profile.alias },
    messages: value.messages.map(parseHistoryMessage),
  };
}

export async function createConversation(profileKey: string): Promise<CreatedConversation> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_key: profileKey }),
    });
  } catch {
    throw new Error('CREATE_CONVERSATION_REQUEST_FAILED');
  }

  if (response.status !== 201) {
    throw new Error('CREATE_CONVERSATION_REQUEST_FAILED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('CREATE_CONVERSATION_INVALID_RESPONSE');
  }

  return parseCreatedConversation(payload);
}

export async function listConversations(profileKey: string): Promise<ConversationSummary[]> {
  const query = new URLSearchParams({ profile_key: profileKey, limit: '50' });
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/conversations?${query.toString()}`, {
      method: 'GET',
    });
  } catch {
    throw new Error('CONVERSATIONS_REQUEST_FAILED');
  }

  if (response.status !== 200) {
    throw new Error('CONVERSATIONS_REQUEST_FAILED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('CONVERSATIONS_INVALID_RESPONSE');
  }

  if (!isRecord(payload) || !Array.isArray(payload.conversations)) {
    throw new Error('CONVERSATIONS_INVALID_RESPONSE');
  }

  return payload.conversations.map(parseConversationSummary);
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/conversations/${encodeURIComponent(conversationId)}`,
      { method: 'GET' },
    );
  } catch {
    throw new Error('CONVERSATION_REQUEST_FAILED');
  }

  if (response.status !== 200) {
    throw new Error('CONVERSATION_REQUEST_FAILED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('CONVERSATION_INVALID_RESPONSE');
  }

  return parseConversationDetail(payload);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/conversations/${encodeURIComponent(conversationId)}`,
      { method: 'DELETE' },
    );
  } catch {
    throw new Error('CONVERSATION_DELETE_FAILED');
  }

  if (response.status !== 204) {
    throw new Error('CONVERSATION_DELETE_FAILED');
  }
}
