import { invariant } from './errors.js';

export type StorageRecipe = 'synthetic_v1' | 'ccd_local' | 'ccd_expanded_v1' | 'ccd_guidance_v1' | 'ccd_knowledge_v1' | {kind:'ccd_knowledge_v2';items:number};
export function storageCounts(recipe: StorageRecipe) {
  if(typeof recipe==='object'){
    invariant(recipe.kind==='ccd_knowledge_v2'&&Number.isSafeInteger(recipe.items)&&recipe.items>0);
    return {items:recipe.items,documents:recipe.items,chunks:recipe.items,perDocument:1};
  }
  invariant(recipe === 'synthetic_v1' || recipe === 'ccd_local' || recipe === 'ccd_expanded_v1' || recipe === 'ccd_guidance_v1' || recipe === 'ccd_knowledge_v1');
  if (recipe === 'ccd_knowledge_v1') return { items: 87, documents: 87, chunks: 87, perDocument: 1 };
  if (recipe === 'ccd_guidance_v1') return { items: 12, documents: 12, chunks: 12, perDocument: 1 };
  if (recipe === 'ccd_expanded_v1') return { items: 10, documents: 10, chunks: 10, perDocument: 1 };
  return recipe === 'ccd_local' ? { items: 2, documents: 2, chunks: 2, perDocument: 1 }
    : { items: 76, documents: 12, chunks: 60, perDocument: 6 };
}
