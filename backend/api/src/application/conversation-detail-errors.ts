export type ConversationDetailErrorReason =
  | "invalid_argument"
  | "conversation_not_found"
  | "invalid_database_result";

export class ConversationDetailError extends Error {
  readonly reason: ConversationDetailErrorReason;

  constructor(reason: ConversationDetailErrorReason) {
    super(reason);
    this.name = "ConversationDetailError";
    this.reason = reason;
  }

  toJSON(): { name: string; reason: ConversationDetailErrorReason } {
    return { name: this.name, reason: this.reason };
  }
}
