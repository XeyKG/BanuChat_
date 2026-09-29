import { ApprovalRegistryError } from './errors.js';

export interface ApprovalRecord {
  approval_ref: string;
  source_git_revision: string;
  dataset_key: string;
  manifest_sha256: string;
  evidence_ref: string;
  available_at: string;
}

export interface ApprovalRegistryV1 {
  schema_version: '1';
  approvals: ApprovalRecord[];
}

type JsonObject = Record<string, unknown>;

const FULL_GIT_REVISION = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;
const RECORD_FIELDS = [
  'approval_ref',
  'source_git_revision',
  'dataset_key',
  'manifest_sha256',
  'evidence_ref',
  'available_at',
] as const;

function objectValue(value: unknown): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApprovalRegistryError('invalid_shape');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new ApprovalRegistryError('invalid_shape');
  }
  return value as JsonObject;
}

function exactFields(value: JsonObject, required: readonly string[]): void {
  const allowed = new Set(required);
  if (Object.keys(value).some((field) => !allowed.has(field))) {
    throw new ApprovalRegistryError('extra_field');
  }
  if (required.some((field) => !Object.hasOwn(value, field))) {
    throw new ApprovalRegistryError('missing_field');
  }
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim().length > 0;
}

function requireNonBlank(value: unknown): asserts value is string {
  if (!nonBlank(value)) throw new ApprovalRegistryError('invalid_value');
}

function leapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = RFC3339.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  const monthDays = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maximumDay = monthDays[month - 1];
  return year > 0 && maximumDay !== undefined && day >= 1 && day <= maximumDay
    && hour <= 23 && minute <= 59 && second <= 59
    && offsetHour <= 23 && offsetMinute <= 59;
}

function parseRecord(value: unknown): ApprovalRecord {
  const record = objectValue(value);
  exactFields(record, RECORD_FIELDS);
  requireNonBlank(record.approval_ref);
  if (typeof record.source_git_revision !== 'string'
    || !FULL_GIT_REVISION.test(record.source_git_revision)) {
    throw new ApprovalRegistryError('invalid_value');
  }
  requireNonBlank(record.dataset_key);
  if (typeof record.manifest_sha256 !== 'string' || !SHA256.test(record.manifest_sha256)) {
    throw new ApprovalRegistryError('invalid_value');
  }
  requireNonBlank(record.evidence_ref);
  if (!validTimestamp(record.available_at)) throw new ApprovalRegistryError('invalid_value');
  return record as unknown as ApprovalRecord;
}

export function parseApprovalRegistry(value: unknown): ApprovalRegistryV1 {
  const root = objectValue(value);
  exactFields(root, ['schema_version', 'approvals']);
  if (root.schema_version !== '1') throw new ApprovalRegistryError('invalid_value');
  if (!Array.isArray(root.approvals)) throw new ApprovalRegistryError('invalid_shape');
  if (root.approvals.length === 0) throw new ApprovalRegistryError('invalid_value');

  const approvals = root.approvals.map(parseRecord);
  const references = new Set<string>();
  for (const approval of approvals) {
    if (references.has(approval.approval_ref)) {
      throw new ApprovalRegistryError('duplicate_approval_ref');
    }
    references.add(approval.approval_ref);
  }
  return { schema_version: '1', approvals };
}

export function resolveApproval(
  registry: ApprovalRegistryV1,
  approvalRef: string,
): ApprovalRecord {
  requireNonBlank(approvalRef);
  const approval = registry.approvals.find((candidate) => candidate.approval_ref === approvalRef);
  if (approval === undefined) throw new ApprovalRegistryError('approval_not_found');
  return approval;
}

export function assertApprovalMatchesRequest(
  approval: ApprovalRecord,
  sourceGitRevision: string,
): void {
  if (approval.source_git_revision !== sourceGitRevision) {
    throw new ApprovalRegistryError('revision_mismatch');
  }
}

