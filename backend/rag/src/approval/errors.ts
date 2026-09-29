export type ApprovalRegistryReason =
  | 'invalid_shape'
  | 'missing_field'
  | 'extra_field'
  | 'invalid_value'
  | 'duplicate_approval_ref'
  | 'approval_not_found'
  | 'revision_mismatch'
  | 'registry_unavailable'
  | 'registry_too_large'
  | 'invalid_encoding'
  | 'invalid_json'
  | 'dataset_mismatch'
  | 'manifest_mismatch';

export class ApprovalRegistryError extends Error {
  readonly code = 'APPROVAL_REJECTED' as const;

  constructor(readonly reason: ApprovalRegistryReason) {
    super(`APPROVAL_REJECTED: ${reason}`);
    this.name = 'ApprovalRegistryError';
  }

  toJSON(): { error_code: 'APPROVAL_REJECTED'; reason: ApprovalRegistryReason } {
    return { error_code: this.code, reason: this.reason };
  }
}
