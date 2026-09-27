import { fileURLToPath } from 'node:url';
import { validateSyntheticContent, SYNTHETIC_V1_PROFILE, buildDocumentDerivatives, safeError } from './index.js';

try {
  const syntheticRoot = fileURLToPath(new URL('../../../data/synthetic/', import.meta.url));
  const validated = await validateSyntheticContent({ syntheticRoot, profile: SYNTHETIC_V1_PROFILE });
  const derivatives = buildDocumentDerivatives(validated);
  console.log(JSON.stringify({ ...validated.summary,
    chunks: derivatives.reduce((sum, doc) => sum + doc.chunks.length, 0) }, null, 2));
} catch (error) {
  console.error(JSON.stringify(safeError(error)));
  process.exitCode = 1;
}
