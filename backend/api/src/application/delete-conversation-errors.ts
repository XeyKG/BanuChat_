export type DeleteConversationErrorReason =
  | "invalid_argument"
  | "invalid_database_result";

export class DeleteConversationError extends Error {
  readonly reason: DeleteConversationErrorReason;

  constructor(reason: DeleteConversationErrorReason) {
    super(reason);
    this.name = "DeleteConversationError";
    this.reason = reason;
  }

  toJSON(): { name: string; reason: DeleteConversationErrorReason } {
    return { name: this.name, reason: this.reason };
  }
}
