export type ProfileProgressErrorReason =
  | "invalid_argument"
  | "profile_not_found"
  | "invalid_database_result";

export class ProfileProgressError extends Error {
  readonly code = "PROFILE_PROGRESS_REJECTED";
  readonly reason: ProfileProgressErrorReason;

  constructor(reason: ProfileProgressErrorReason) {
    super("Profile progress request was rejected.");
    this.name = "ProfileProgressError";
    this.reason = reason;
  }

  toJSON(): {
    error_code: "PROFILE_PROGRESS_REJECTED";
    reason: ProfileProgressErrorReason;
  } {
    return {
      error_code: this.code,
      reason: this.reason,
    };
  }
}
