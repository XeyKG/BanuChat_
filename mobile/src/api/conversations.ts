import { getApiBaseUrl } from '@/config/api';
import {resourceFetch as fetch} from '@/auth/runtime';
import { isCcdLocal } from '@/config/demo-mode';
import { assertConversationAllowed, operatorConversationIds, rememberConversation } from '@/session/operator-conversations';
import { isCitation, type Citation } from '@/api/messages';

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
    !isNonemptyString(value.conversation_id) ||
    !isNonemptyString(value.profile_key) ||
    !isNonemptyString(value.profile_alias) ||
    !isNonemptyString(value.created_at)
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
  if (!isRecord(value)) {
    throw new Error('CONVERSATION_INVALID_RESPONSE');
  }

  if (
    value.role === 'user' &&
    isNonemptyString(value.message_id) &&
    isNonemptyString(value.content) &&
    isNonemptyString(value.created_at)
  ) {
    return {
      message_id: value.message_id,
      role: 'user',
      content: value.content,
      created_at: value.created_at,
    };
  }

  if (
    value.role === 'assistant' &&
    isNonemptyString(value.message_id) &&
    isNonemptyString(value.content) &&
    isNonemptyString(value.created_at) &&
    typeof value.insufficient_evidence === 'boolean' &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation)
  ) {
    return {
      message_id: value.message_id,
      role: 'assistant',
      content: value.content,
      created_at: value.created_at,
      insufficient_evidence: value.insufficient_evidence,
      citations: value.citations,
    };
  }

  throw new Error('CONVERSATION_INVALID_RESPONSE');
}

function parseConversationDetail(value: unknown): ConversationDetail {
  if (
    !isRecord(value) ||
    !isNonemptyString(value.conversation_id) ||
    !isNonemptyString(value.started_at) ||
    !isRecord(value.profile) ||
    !isNonemptyString(value.profile.profile_key) ||
    !isNonemptyString(value.profile.alias) ||
    !Array.isArray(value.messages)
  ) {
    throw new Error('CONVERSATION_INVALID_RESPONSE');
  }

  return {
    conversation_id: value.conversation_id,
    started_at: value.started_at,
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
      body: JSON.stringify(isCcdLocal()?{ profile_key: profileKey }:{}),
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

  const result = parseCreatedConversation(payload);
  if (result.profile_key !== profileKey) throw new Error('CREATE_CONVERSATION_INVALID_RESPONSE');
  rememberConversation(result.conversation_id);
  return result;
}

export async function listConversations(profileKey: string): Promise<ConversationSummary[]> {
  if (isCcdLocal()) {
    const details = await Promise.all(operatorConversationIds().map(getConversation));
    return details.map(detail => ({
      conversation_id: detail.conversation_id, profile_key: detail.profile.profile_key,
      started_at: detail.started_at, message_count: detail.messages.length,
      last_message_at: detail.messages.at(-1)?.created_at ?? null,
    })).reverse();
  }
  const query = new URLSearchParams({ limit: '50' });
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
  assertConversationAllowed(conversationId);
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

  const result = parseConversationDetail(payload);
  if (result.conversation_id !== conversationId) throw new Error('CONVERSATION_INVALID_RESPONSE');
  return result;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  if (isCcdLocal()) throw new Error('CCD_HISTORY_DELETION_DISABLED');
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
