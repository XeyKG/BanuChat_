export type DocumentQueryRetrievalErrorReason =
  | "invalid_argument"
  | "release_not_available"
  | "embedding_config_invalid"
  | "embedding_runtime_mismatch"
  | "embedding_unavailable"
  | "invalid_embedding_response"
  | "invalid_database_result";

export class DocumentQueryRetrievalError extends Error {
  readonly error_code = "DOCUMENT_QUERY_RETRIEVAL_REJECTED" as const;

  constructor(readonly reason: DocumentQueryRetrievalErrorReason) {
    super("Document query retrieval request rejected.");
    this.name = "DocumentQueryRetrievalError";
  }

  toJSON(): {
    error_code: "DOCUMENT_QUERY_RETRIEVAL_REJECTED";
    reason: DocumentQueryRetrievalErrorReason;
  } {
    return { error_code: this.error_code, reason: this.reason };
  }
}
