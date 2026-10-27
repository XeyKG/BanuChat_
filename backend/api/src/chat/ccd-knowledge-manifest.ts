import type {CcdKnowledgeEvidenceMetadata} from './ccd-knowledge.js';
export const CCD_KNOWLEDGE_SCHEMA='ccd-1.3.0';
export const isCcdKnowledgeSchema=(value:unknown):boolean=>value===CCD_KNOWLEDGE_SCHEMA||value==='ccd-1.4.0';
const kinds=['DOCUMENT_SOURCE','DOMAIN_CONFIRMATION','INFERENCE','PENDING_CLARIFICATION'] as const;
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const strings=(x:unknown):x is string[]=>Array.isArray(x)&&x.every(v=>typeof v==='string'&&v.trim());
function invariant(x:unknown):asserts x{if(!x)throw new Error('CCD reference manifest rejected.');}
/** Only the server-verified release manifest supplies knowledge scope and provenance. */
export function ccdKnowledgeMetadata(manifest:unknown):ReadonlyMap<string,CcdKnowledgeEvidenceMetadata>{
 invariant(object(manifest)&&isCcdKnowledgeSchema(manifest.schema_version)&&manifest.synthetic===false&&object(manifest.ccd_knowledge));
 const v2=manifest.schema_version==='ccd-1.4.0',k=manifest.ccd_knowledge;
 invariant(k.schema_version===(v2?'ccd-knowledge-2':'ccd-knowledge-1')&&Array.isArray(k.claims)&&k.claims.length>0&&(v2||k.claims.length===87)&&Array.isArray(manifest.items)&&manifest.items.length===k.claims.length);
 if(v2){invariant(Array.isArray(manifest.files)&&manifest.files.length===k.claims.length);invariant(new Set(manifest.items.map(i=>object(i)?i.key:undefined)).size===k.claims.length);}
 const map=new Map<string,CcdKnowledgeEvidenceMetadata>(),ids=new Set<string>();
 for(const c of k.claims){
  invariant(object(c)&&typeof c.document_key==='string'&&typeof c.claim_id==='string'&&!ids.has(c.claim_id)&&!map.has(c.document_key)&&c.reference_status==='adopted');
  invariant(strings(c.topics)&&c.topics.length>0&&(c.course===null||typeof c.course==='string')&&typeof c.period==='string'&&c.period.trim()&&Array.isArray(c.basis)&&c.basis.length>0);
  invariant(c.basis.every(b=>object(b)&&kinds.includes(b.kind as typeof kinds[number])&&Array.isArray(b.references)&&b.references.length>0));
  invariant(c.basis.some(b=>b.kind!=='PENDING_CLARIFICATION'));
  invariant(Array.isArray(c.presentation_units)&&c.presentation_units.length>0&&c.presentation_units.every(u=>object(u)&&typeof u.key==='string'&&strings(u.aspects)&&typeof u.text==='string'&&u.text.trim()));
  invariant(manifest.items.some(i=>object(i)&&i.kind==='document'&&i.key===c.document_key));
  if(v2){
   invariant(typeof c.population==='string'&&c.population.trim()&&strings(c.conditions)&&strings(c.exceptions)&&object(c.domain_metadata));
   const d=c.domain_metadata;invariant(typeof d.entity_type==='string'&&typeof d.current==='boolean'&&typeof d.temporal_class==='string'&&typeof d.source_access_class==='string');
   const item=manifest.items.find(i=>object(i)&&i.key===c.document_key);invariant(object(item)&&item.path===`documents/artifacts/${c.document_key}.md`&&typeof item.sha256==='string'&&/^[a-f0-9]{64}$/u.test(item.sha256));
   invariant((manifest.files as unknown[]).filter(f=>object(f)&&f.path===item.path&&f.sha256===item.sha256&&f.kind==='document_artifact').length===1);
   for(const b of c.basis)for(const r of (b as {references:unknown[]}).references)invariant(object(r)&&((typeof r.source==='string'&&typeof r.locator==='string'&&typeof r.sha256==='string'&&/^[a-f0-9]{64}$/u.test(r.sha256))||((b as {kind:string}).kind==='INFERENCE'&&typeof r.operation==='string'&&typeof r.scope==='string')));
  }
  const domain:Record<string,unknown>={};
  if(v2)for(const key of ['entity_type','pillar','current','temporal_class','source_access_class','alias_status','offer_scope','applicable_population','scheme','service_type','derived_from_claim_ids'])if(object(c.domain_metadata)&&key in c.domain_metadata)domain[key]=c.domain_metadata[key];
  map.set(c.document_key,{claim_id:c.claim_id,topics:c.topics,course:c.course,period:c.period,basis_kinds:[...new Set(c.basis.map(b=>b.kind))],reference_status:'adopted',presentation_units:c.presentation_units,...(v2?{knowledge_version:2,population:c.population,conditions:c.conditions,exceptions:c.exceptions,domain_metadata:domain}:{})} as CcdKnowledgeEvidenceMetadata);ids.add(c.claim_id);
 }
 return map;
}
