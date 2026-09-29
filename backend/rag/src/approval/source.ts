import path from 'node:path';
import { sha256 } from '../crypto/sha256.js';
import { buildDocumentDerivatives } from '../documents/markdown.js';
import { validateSyntheticContent } from '../preflight/content.js';
import { SYNTHETIC_V1_PROFILE } from '../preflight/profile.js';
import { verifySourceCheckout } from '../source/git-source-verifier.js';
import type { DocumentDerivatives, ValidatedContent } from '../types.js';
import { ApprovalRegistryError } from './errors.js';
import { assertApprovalMatchesRequest, resolveApproval } from './registry.js';
import type { ApprovalRecord, ApprovalRegistryV1 } from './registry.js';

export interface ApprovedSourceSnapshot {
  approval: ApprovalRecord;
  source_git_revision: string;
  manifest_sha256: string;
  validated: ValidatedContent;
  derivatives: readonly DocumentDerivatives[];
}

export interface PrepareApprovedSourceOptions {
  registry: ApprovalRegistryV1;
  approvalRef: string;
  sourceGitRevision: string;
  sourceCheckoutRoot: string;
}

const REQUIRED_SOURCE_PATHS = ['data/synthetic/.gitattributes'] as const;

export async function prepareApprovedSource(
  options: PrepareApprovedSourceOptions,
): Promise<ApprovedSourceSnapshot> {
  const approval = resolveApproval(options.registry, options.approvalRef);
  assertApprovalMatchesRequest(approval, options.sourceGitRevision);

  const verification = {
    sourceCheckoutRoot: options.sourceCheckoutRoot,
    expectedSourceRevision: options.sourceGitRevision,
    requiredRelativePaths: REQUIRED_SOURCE_PATHS,
  };
  await verifySourceCheckout(verification);

  const validated = await validateSyntheticContent({
    syntheticRoot: path.join(options.sourceCheckoutRoot, 'data', 'synthetic'),
    profile: SYNTHETIC_V1_PROFILE,
  });
  if (validated.manifest.dataset_key !== approval.dataset_key) {
    throw new ApprovalRegistryError('dataset_mismatch');
  }

  const manifestBytes = validated.bytes.get('manifest.json')!;
  const manifestSha256 = sha256(manifestBytes);
  if (manifestSha256 !== approval.manifest_sha256) {
    throw new ApprovalRegistryError('manifest_mismatch');
  }

  const derivatives = buildDocumentDerivatives(validated);
  await verifySourceCheckout(verification);

  return {
    approval,
    source_git_revision: options.sourceGitRevision,
    manifest_sha256: manifestSha256,
    validated,
    derivatives,
  };
}

