export type DocumentRetrievalErrorReason =
  | "invalid_argument"
  | "release_not_available"
  | "invalid_database_result";

export class DocumentRetrievalError extends Error {
  readonly error_code = "DOCUMENT_RETRIEVAL_REJECTED" as const;

  constructor(readonly reason: DocumentRetrievalErrorReason) {
    super("Document retrieval request rejected.");
    this.name = "DocumentRetrievalError";
  }

  toJSON(): {
    error_code: "DOCUMENT_RETRIEVAL_REJECTED";
    reason: DocumentRetrievalErrorReason;
  } {
    return {
      error_code: this.error_code,
      reason: this.reason,
    };
  }
}
