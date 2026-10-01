export class DatabaseDependencyError extends Error {
  readonly error_code = "DATABASE_DEPENDENCY_UNAVAILABLE" as const;

  constructor() {
    super("database_dependency_unavailable");
    this.name = "DatabaseDependencyError";
  }

  toJSON(): { error_code: "DATABASE_DEPENDENCY_UNAVAILABLE" } {
    return { error_code: this.error_code };
  }
}
