export type DocumentLookupErrorReason =
  | "invalid_argument"
  | "invalid_database_result";

export class DocumentLookupError extends Error {
  readonly error_code = "DOCUMENT_LOOKUP_REJECTED";
  readonly reason: DocumentLookupErrorReason;

  constructor(reason: DocumentLookupErrorReason) {
    super("Document lookup request rejected.");
    this.name = "DocumentLookupError";
    this.reason = reason;
  }

  toJSON(): {
    error_code: "DOCUMENT_LOOKUP_REJECTED";
    reason: DocumentLookupErrorReason;
  } {
    return { error_code: this.error_code, reason: this.reason };
  }
}
