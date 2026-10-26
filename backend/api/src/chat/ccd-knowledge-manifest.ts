import type {CcdKnowledgeEvidenceMetadata} from './ccd-knowledge.js';
export const CCD_KNOWLEDGE_SCHEMA='ccd-1.3.0';
const kinds=['DOCUMENT_SOURCE','DOMAIN_CONFIRMATION','INFERENCE','PENDING_CLARIFICATION'] as const;
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const strings=(x:unknown):x is string[]=>Array.isArray(x)&&x.every(v=>typeof v==='string'&&v.trim());
function invariant(x:unknown):asserts x{if(!x)throw new Error('CCD reference manifest rejected.');}
/** Only the server-verified release manifest supplies knowledge scope and provenance. */
export function ccdKnowledgeMetadata(manifest:unknown):ReadonlyMap<string,CcdKnowledgeEvidenceMetadata>{
 invariant(object(manifest)&&manifest.schema_version===CCD_KNOWLEDGE_SCHEMA&&manifest.synthetic===false&&object(manifest.ccd_knowledge));
 const k=manifest.ccd_knowledge;invariant(k.schema_version==='ccd-knowledge-1'&&Array.isArray(k.claims)&&k.claims.length===87&&Array.isArray(manifest.items)&&manifest.items.length===87);
 const map=new Map<string,CcdKnowledgeEvidenceMetadata>(),ids=new Set<string>();
 for(const c of k.claims){
  invariant(object(c)&&typeof c.document_key==='string'&&typeof c.claim_id==='string'&&!ids.has(c.claim_id)&&!map.has(c.document_key)&&c.reference_status==='adopted');
  invariant(strings(c.topics)&&c.topics.length>0&&(c.course===null||typeof c.course==='string')&&typeof c.period==='string'&&c.period.trim()&&Array.isArray(c.basis)&&c.basis.length>0);
  invariant(c.basis.every(b=>object(b)&&kinds.includes(b.kind as typeof kinds[number])&&Array.isArray(b.references)&&b.references.length>0));
  invariant(c.basis.some(b=>b.kind!=='PENDING_CLARIFICATION'));
  invariant(Array.isArray(c.presentation_units)&&c.presentation_units.length>0&&c.presentation_units.every(u=>object(u)&&typeof u.key==='string'&&strings(u.aspects)&&typeof u.text==='string'&&u.text.trim()));
  invariant(manifest.items.some(i=>object(i)&&i.kind==='document'&&i.key===c.document_key));
  map.set(c.document_key,{claim_id:c.claim_id,topics:c.topics,course:c.course,period:c.period,basis_kinds:[...new Set(c.basis.map(b=>b.kind))],reference_status:'adopted',presentation_units:c.presentation_units} as CcdKnowledgeEvidenceMetadata);ids.add(c.claim_id);
 }
 return map;
}
