import { invariant } from './errors.js';

export type StorageRecipe = 'synthetic_v1' | 'ccd_local' | 'ccd_expanded_v1';
export function storageCounts(recipe: StorageRecipe) {
  invariant(recipe === 'synthetic_v1' || recipe === 'ccd_local' || recipe === 'ccd_expanded_v1');
  if (recipe === 'ccd_expanded_v1') return { items: 10, documents: 10, chunks: 10, perDocument: 1 };
  return recipe === 'ccd_local' ? { items: 2, documents: 2, chunks: 2, perDocument: 1 }
    : { items: 76, documents: 12, chunks: 60, perDocument: 6 };
}
