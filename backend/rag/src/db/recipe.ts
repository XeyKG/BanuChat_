import { invariant } from './errors.js';

export type StorageRecipe = 'synthetic_v1' | 'ccd_local';
export function storageCounts(recipe: StorageRecipe) {
  invariant(recipe === 'synthetic_v1' || recipe === 'ccd_local');
  return recipe === 'ccd_local' ? { items: 2, documents: 2, chunks: 2, perDocument: 1 }
    : { items: 76, documents: 12, chunks: 60, perDocument: 6 };
}
