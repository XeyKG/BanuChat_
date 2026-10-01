export type SendMessageErrorReason =
  | "invalid_argument"
  | "conversation_not_found"
  | "current_release_changed"
  | "conversation_conflict"
  | "rag_dependency_unavailable"
  | "invalid_database_result";

export class SendMessageError extends Error {
  readonly reason: SendMessageErrorReason;

  constructor(reason: SendMessageErrorReason) {
    super(reason);
    this.name = "SendMessageError";
    this.reason = reason;
  }

  toJSON(): { name: string; reason: SendMessageErrorReason } {
    return { name: this.name, reason: this.reason };
  }
}
