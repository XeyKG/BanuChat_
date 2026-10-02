export type DocumentArtifactErrorReason =
  | "invalid_argument"
  | "not_found"
  | "invalid_database_result"
  | "filesystem_error";

export class DocumentArtifactError extends Error {
  constructor(readonly reason: DocumentArtifactErrorReason) {
    super("Document artifact request rejected.");
    this.name = "DocumentArtifactError";
  }
}
