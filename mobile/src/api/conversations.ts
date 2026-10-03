import { getApiBaseUrl } from '@/config/api';

export interface CreatedConversation {
  conversation_id: string;
  profile_key: string;
  profile_alias: string;
  created_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
