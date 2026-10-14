export type CourseCatalogErrorReason =
  | "invalid_argument"
  | "invalid_database_result";

export class CourseCatalogError extends Error {
  readonly error_code = "COURSE_CATALOG_REJECTED";
  readonly reason: CourseCatalogErrorReason;

  constructor(reason: CourseCatalogErrorReason) {
    super("Course catalog request rejected.");
    this.name = "CourseCatalogError";
    this.reason = reason;
  }

  toJSON(): {
    error_code: "COURSE_CATALOG_REJECTED";
    reason: CourseCatalogErrorReason;
  } {
    return { error_code: this.error_code, reason: this.reason };
  }
}
