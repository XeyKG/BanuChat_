export type ProfilesErrorReason = "invalid_database_result";

export class ProfilesError extends Error {
  readonly reason: ProfilesErrorReason;

  constructor(reason: ProfilesErrorReason) {
    super(reason);
    this.name = "ProfilesError";
    this.reason = reason;
  }

  toJSON(): { name: string; reason: ProfilesErrorReason } {
    return {
      name: this.name,
      reason: this.reason,
    };
  }
}
