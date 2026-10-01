export type CreateConversationErrorReason =
  | "invalid_argument"
  | "profile_not_found"
  | "current_release_changed"
  | "invalid_database_result";

export class CreateConversationError extends Error {
  readonly reason: CreateConversationErrorReason;

  constructor(reason: CreateConversationErrorReason) {
    super(reason);
    this.name = "CreateConversationError";
    this.reason = reason;
  }

  toJSON(): { name: string; reason: CreateConversationErrorReason } {
    return {
      name: this.name,
      reason: this.reason,
    };
  }
}
