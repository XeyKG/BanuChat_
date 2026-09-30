export type InternalRuntimeConfigReason =
  | 'missing_value'
  | 'invalid_value'
  | 'invalid_path'
  | 'paths_not_separated'
  | 'invalid_database_url'
  | 'invalid_ollama_url';

export class InternalRuntimeConfigError extends Error {
  readonly code = 'CONFIG_REJECTED' as const;

  constructor(readonly reason: InternalRuntimeConfigReason) {
    super('Internal ingestion runtime configuration was rejected.');
    this.name = 'InternalRuntimeConfigError';
  }

  toJSON(): { error_code: 'CONFIG_REJECTED'; reason: InternalRuntimeConfigReason } {
    return {
      error_code: this.code,
      reason: this.reason,
    };
  }
}
