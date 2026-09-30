export type CurrentReleaseErrorReason =
  | "no_current_release"
  | "invalid_database_result";

export class CurrentReleaseError extends Error {
  readonly error_code = "CURRENT_RELEASE_REJECTED" as const;

  constructor(readonly reason: CurrentReleaseErrorReason) {
    super(reason);
    this.name = "CurrentReleaseError";
  }

  toJSON(): {
    error_code: "CURRENT_RELEASE_REJECTED";
    reason: CurrentReleaseErrorReason;
  } {
    return {
      error_code: this.error_code,
      reason: this.reason,
    };
  }
}
