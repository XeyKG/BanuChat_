export type Oe2Category = 'academic_offer' | 'calls' | 'news';

export interface Oe2SourceContract {
  source_id: string;
  category: Oe2Category;
  url: string;
  apparent_owner: string;
  content_type: string;
  format: 'html' | 'fixture_json';
  extraction_method: string;
  access_restrictions: string;
  publication_date: 'available' | 'absent' | 'mixed';
  observed_frequency: string;
  authorization_status: 'fixture_only' | 'pending_verification';
  fixture_path?: string;
}

export interface Oe2Record {
  category: Oe2Category;
  source_id: string;
  source_record_id: string;
  title: string;
  published_at: string;
  source_version: string;
  fields: Readonly<Record<string, string>>;
  content_sha256: string;
}

export interface Oe2Snapshot {
  schema_version: 'oe2-snapshot-1';
  category: Oe2Category;
  source_id: string;
  source_sha256: string;
  available_at: string;
  records: readonly Oe2Record[];
}

export interface Oe2ChangeCounts {
  created: number;
  modified: number;
  deleted: number;
  unchanged: number;
}

export interface Oe2RunResult {
  outcome: 'updated' | 'unchanged';
  category: Oe2Category;
  source_id: string;
  source_sha256: string;
  available_at: string;
  record_count: number;
  changes: Oe2ChangeCounts;
  publication_lag_verifiable: false;
  publication_lag_reason: 'fixture_source';
  published_to_ccd: false;
}

export interface Oe2ExecutionRecord {
  schema_version: 'oe2-execution-1';
  run_id: string;
  category: Oe2Category;
  source_id: string;
  started_at: string;
  finished_at: string;
  outcome: 'succeeded' | 'failed';
  error_code?: import('./errors.js').Oe2ErrorCode;
  operation_id?: string;
  duration_ms?: number;
  result?: Oe2RunResult;
}

export interface Oe2StateStore {
  load(category: Oe2Category): Promise<Oe2Snapshot | undefined>;
  save(snapshot: Oe2Snapshot): Promise<void>;
  recordRun?(record: Oe2ExecutionRecord): Promise<void>;
  withLease?<T>(category: Oe2Category, operation: () => Promise<T>): Promise<T>;
}
