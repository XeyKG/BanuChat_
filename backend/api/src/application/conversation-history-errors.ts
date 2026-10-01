export type ConversationHistoryErrorReason =
  | "invalid_argument"
  | "invalid_database_result";

export class ConversationHistoryError extends Error {
  readonly reason: ConversationHistoryErrorReason;

  constructor(reason: ConversationHistoryErrorReason) {
    super(reason);
    this.name = "ConversationHistoryError";
    this.reason = reason;
  }

  toJSON(): { name: string; reason: ConversationHistoryErrorReason } {
    return {
      name: this.name,
      reason: this.reason,
    };
  }
}
