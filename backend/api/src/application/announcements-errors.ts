export type AnnouncementsErrorReason =
  | "invalid_argument"
  | "invalid_database_result";

export class AnnouncementsError extends Error {
  readonly error_code = "ANNOUNCEMENTS_REJECTED";
  readonly reason: AnnouncementsErrorReason;

  constructor(reason: AnnouncementsErrorReason) {
    super("Announcements request rejected.");
    this.name = "AnnouncementsError";
    this.reason = reason;
  }

  toJSON(): {
    error_code: "ANNOUNCEMENTS_REJECTED";
    reason: AnnouncementsErrorReason;
  } {
    return {
      error_code: this.error_code,
      reason: this.reason,
    };
  }
}
