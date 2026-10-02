import { randomUUID } from "node:crypto";

import { CreateConversationError } from "../application/conversations-errors.js";
import { ConversationDetailError } from "../application/conversation-detail-errors.js";
import { ConversationHistoryError } from "../application/conversation-history-errors.js";
import { CurrentReleaseError } from "../application/current-release-errors.js";
import { DeleteConversationError } from "../application/delete-conversation-errors.js";
import { DocumentArtifactError } from "../application/document-artifact-errors.js";
import { SendMessageError } from "../application/messages-errors.js";
import { ProfilesError } from "../application/profiles-errors.js";
import { CalendarEventsError } from "../application/calendar-events-errors.js";
import { ProfileProgressError } from "../application/profile-progress-errors.js";
import { AnnouncementsError } from "../application/announcements-errors.js";
import { DatabaseDependencyError } from "../data/database-errors.js";
import { ConversationActivityConflictError } from "./conversation-activity.js";

export type HttpErrorCode =
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface HttpErrorDescription {
  status: 400 | 404 | 409 | 500 | 503;
  code: HttpErrorCode;
  message: string;
}

export class InvalidHttpRequestError extends Error {
  constructor() {
    super("invalid_http_request");
    this.name = "InvalidHttpRequestError";
  }
}

const INVALID_ARGUMENT: HttpErrorDescription = {
  status: 400,
  code: "INVALID_ARGUMENT",
  message: "La solicitud no cumple el contrato esperado.",
};

const NOT_FOUND: HttpErrorDescription = {
  status: 404,
  code: "NOT_FOUND",
  message: "El recurso solicitado no está disponible.",
};

const CONFLICT: HttpErrorDescription = {
  status: 409,
  code: "CONFLICT",
  message: "El contexto cambió durante la operación.",
};

const DEPENDENCY_UNAVAILABLE: HttpErrorDescription = {
  status: 503,
  code: "DEPENDENCY_UNAVAILABLE",
  message: "Una dependencia temporalmente no está disponible.",
};

const INTERNAL_ERROR: HttpErrorDescription = {
  status: 500,
  code: "INTERNAL_ERROR",
  message: "Ocurrió un error interno.",
};

export function describeHttpError(error: unknown): HttpErrorDescription {
  if (error instanceof DocumentArtifactError) {
    switch (error.reason) {
      case "invalid_argument": return INVALID_ARGUMENT;
      case "not_found": return NOT_FOUND;
      case "invalid_database_result":
      case "filesystem_error": return INTERNAL_ERROR;
    }
  }
  if (error instanceof InvalidHttpRequestError) {
    return INVALID_ARGUMENT;
  }

  if (error instanceof ConversationActivityConflictError) {
    return CONFLICT;
  }

  if (error instanceof DatabaseDependencyError) {
    return DEPENDENCY_UNAVAILABLE;
  }

  if (error instanceof CurrentReleaseError) {
    return error.reason === "no_current_release" ? NOT_FOUND : INTERNAL_ERROR;
  }

  if (error instanceof ProfilesError) {
    return INTERNAL_ERROR;
  }

  if (error instanceof CalendarEventsError || error instanceof AnnouncementsError) {
    return error.reason === "invalid_argument" ? INVALID_ARGUMENT : INTERNAL_ERROR;
  }

  if (error instanceof ProfileProgressError) {
    switch (error.reason) {
      case "invalid_argument": return INVALID_ARGUMENT;
      case "profile_not_found": return NOT_FOUND;
      case "invalid_database_result": return INTERNAL_ERROR;
    }
  }

  if (error instanceof CreateConversationError) {
    switch (error.reason) {
      case "invalid_argument":
        return INVALID_ARGUMENT;
      case "profile_not_found":
        return NOT_FOUND;
      case "current_release_changed":
        return CONFLICT;
      case "invalid_database_result":
        return INTERNAL_ERROR;
    }
  }

  if (error instanceof ConversationHistoryError) {
    return error.reason === "invalid_argument"
      ? INVALID_ARGUMENT
      : INTERNAL_ERROR;
  }

  if (error instanceof ConversationDetailError) {
    switch (error.reason) {
      case "invalid_argument":
        return INVALID_ARGUMENT;
      case "conversation_not_found":
        return NOT_FOUND;
      case "invalid_database_result":
        return INTERNAL_ERROR;
    }
  }

  if (error instanceof DeleteConversationError) {
    return error.reason === "invalid_argument"
      ? INVALID_ARGUMENT
      : INTERNAL_ERROR;
  }

  if (error instanceof SendMessageError) {
    switch (error.reason) {
      case "invalid_argument":
        return INVALID_ARGUMENT;
      case "conversation_not_found":
        return NOT_FOUND;
      case "current_release_changed":
      case "conversation_conflict":
        return CONFLICT;
      case "rag_dependency_unavailable":
        return DEPENDENCY_UNAVAILABLE;
      case "invalid_database_result":
        return INTERNAL_ERROR;
    }
  }

  return INTERNAL_ERROR;
}

export function createErrorBody(description: HttpErrorDescription): {
  error: {
    code: HttpErrorCode;
    message: string;
    request_id: string;
  };
} {
  return {
    error: {
      code: description.code,
      message: description.message,
      request_id: randomUUID(),
    },
  };
}

export function notFoundDescription(): HttpErrorDescription {
  return NOT_FOUND;
}
