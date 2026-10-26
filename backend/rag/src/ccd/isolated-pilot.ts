import {createHash,randomUUID} from 'node:crypto';
import type {EmbeddingClient,EmbeddingConfig} from '../ollama/types.js';
import {vectorLiteral} from '../ollama/client.js';

export const PILOT_DATABASE='banuchat_p0_operational';
export interface PilotPresentationUnit {key:string;aspects:string[];text:string;period?:string;amount_cop?:number}
export interface PilotSql {query<T=Record<string,unknown>>(text:string,values?:readonly unknown[]):Promise<{rows:T[]}>}
export interface PilotClaim {
  claim_id:string; title:string; statement:string; period:string; population:string;
  topics:string[]; course?:string|null;
  basis:Array<{kind:'DOCUMENT_SOURCE'|'DOMAIN_CONFIRMATION'|'INFERENCE'|'PENDING_CLARIFICATION';references:unknown[]}>;
  review_status:string; evidence_visible_allowed:boolean; isolated_evaluation_allowed:boolean;
  conditions:string[]; exceptions:string[]; details?:string[];
  presentation_units?:PilotPresentationUnit[];
}
export interface PreparedPilotDocument {key:string;claim_id:string;title:string;path:string;content:string;sha256:string;metadata:{claim_id:string;topics:string[];course:string|null;basis_kinds:PilotClaim['basis'][number]['kind'][];period:string;isolated_evaluation_allowed:true;presentation_units?:PilotPresentationUnit[]}}
export interface PreparedPilot {schema_version:'ccd-isolated-pilot-1';label:string;manifest_sha256:string;documents:PreparedPilotDocument[];provenance:Record<string,PilotClaim['basis']>}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function invariant(ok:unknown):asserts ok{if(!ok)throw new Error('Isolated CCD pilot rejected.');}
/** Pure preparation: no source I/O, embeddings, database or publication. */
export function prepareIsolatedPilot(label:string,claims:readonly PilotClaim[],options:{allowed_organizational_emails?:readonly string[]}={}):PreparedPilot{
  invariant(/^[a-z0-9][a-z0-9-]{0,63}$/u.test(label) && claims.length>0);
  const allowedContacts=new Set((options.allowed_organizational_emails??[]).map(s=>s.toLowerCase()));
  invariant([...allowedContacts].every(s=>/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/u.test(s)));
  const documents:PreparedPilotDocument[]=[];const ids=new Set<string>();
  for(const c of claims){
    invariant(/^[A-Za-z0-9-]+$/u.test(c.claim_id) && !ids.has(c.claim_id));ids.add(c.claim_id);
    invariant(c.review_status==='ADMITTED_ISOLATED_PROJECT_PILOT' && c.evidence_visible_allowed===false && c.isolated_evaluation_allowed===true);
    invariant(c.title.trim() && c.statement.trim() && c.period.trim() && c.population.trim() && c.topics.length && c.basis.length);
    invariant(c.basis.every(b=>['DOCUMENT_SOURCE','DOMAIN_CONFIRMATION','INFERENCE','PENDING_CLARIFICATION'].includes(b.kind) && b.references.length>0));
    const header=`# ${c.title}\n\n${c.statement}\n\nPERIODO: ${c.period}\nPOBLACION: ${c.population}\nCONDICIONES: ${[...c.conditions,...c.exceptions].join(' ')}\nBASES: ${c.basis.map(b=>b.kind).join(', ')}\n`;
    const groups:string[][]=[[]];
    for(const detail of c.details??[]){invariant(typeof detail==='string' && detail.length<6000);let g=groups.at(-1)!;if(g.join('\n').length+detail.length>2200 && g.length){g=[];groups.push(g);}g.push(detail);}
    for(const [i,group] of groups.entries()){
      const key=`${c.claim_id.toLowerCase()}-${i+1}`;const content=header+(group.length?`\nDETALLE DOCUMENTAL:\n${group.join('\n')}\n`:'');
      invariant(!/\b\d{3}[ -]\d{3}[ -]\d{4}\b/u.test(content));
      invariant([...content.matchAll(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu)].every(m=>allowedContacts.has(m[0].toLowerCase())));
      if(c.presentation_units){
        invariant(c.presentation_units.length>0 && new Set(c.presentation_units.map(u=>u.key)).size===c.presentation_units.length);
        for(const u of c.presentation_units){
          invariant(/^[a-z0-9-]+$/u.test(u.key)&&u.aspects.length>0&&u.aspects.every(a=>/^[a-z_]+$/u.test(a))&&u.text.trim());
          invariant(u.period===undefined||(typeof u.period==='string'&&u.period.trim().length>0));
          invariant(u.amount_cop===undefined||(Number.isSafeInteger(u.amount_cop)&&u.amount_cop>=0));
          invariant(!/DOCUMENT_SOURCE|DOMAIN_CONFIRMATION|INFERENCE|PENDING_CLARIFICATION|\b(?:OP|KC|MD)-[\w-]+|\b[a-f\d]{64}\b|\b\d{4}(?:10|60)\b|referencia documental|confirmaci[oó]n del responsable|\bpiloto\b/iu.test(u.text));
          invariant(!/\b\d{3}[ -]\d{3}[ -]\d{4}\b/u.test(u.text));
          invariant([...u.text.matchAll(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu)].every(m=>allowedContacts.has(m[0].toLowerCase())));
        }
      }
      documents.push({key,claim_id:c.claim_id,title:c.title,path:`documents/pilot/${key}.md`,content,sha256:hash(content),metadata:{claim_id:c.claim_id,topics:[...c.topics],course:c.course??null,basis_kinds:[...new Set(c.basis.map(b=>b.kind))],period:c.period,isolated_evaluation_allowed:true,...(c.presentation_units?{presentation_units:c.presentation_units.map(u=>({...u,aspects:[...u.aspects]}))}:{})}});
    }
  }
  const payload={schema_version:'ccd-isolated-pilot-1' as const,label,documents,provenance:Object.fromEntries(claims.map(c=>[c.claim_id,c.basis]))};
  return {...payload,manifest_sha256:hash(JSON.stringify(payload))};
}

/** New private read model, not a migration of the frozen product schema. No current pointer. */
export const ISOLATED_PILOT_SCHEMA_SQL=`
DO $$ BEGIN IF current_database()<>'banuchat_p0_operational' THEN RAISE EXCEPTION 'Isolated target rejected'; END IF; END $$;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA banuchat;
CREATE TABLE banuchat.isolated_pilot_marker(scope text PRIMARY KEY CHECK(scope='NO_PUBLICATION'));
INSERT INTO banuchat.isolated_pilot_marker VALUES('NO_PUBLICATION');
CREATE TABLE banuchat.embedding_configs(id uuid PRIMARY KEY,provider text,model text,model_revision text,dimension integer CHECK(dimension=1024),distance_metric text CHECK(distance_metric='cosine'),parameters jsonb NOT NULL);
CREATE TABLE banuchat.dataset_releases(id uuid PRIMARY KEY,label text UNIQUE,status text CHECK(status IN ('staging','ready')),embedding_config_id uuid REFERENCES banuchat.embedding_configs(id),manifest_sha256 text,manifest jsonb NOT NULL);
CREATE TABLE banuchat.documents(id uuid PRIMARY KEY,dataset_id smallint NOT NULL DEFAULT 1,document_key text NOT NULL UNIQUE,retrieval_mode text NOT NULL CHECK(retrieval_mode='chunked'));
CREATE TABLE banuchat.document_versions(id uuid PRIMARY KEY,document_id uuid REFERENCES banuchat.documents(id),dataset_id smallint NOT NULL DEFAULT 1,dataset_release_id uuid REFERENCES banuchat.dataset_releases(id),title text NOT NULL,source_path text NOT NULL,source_locator text NOT NULL,source_sha256 text NOT NULL,processing_status text NOT NULL CHECK(processing_status='ready'),metadata jsonb NOT NULL,UNIQUE(id,dataset_release_id));
CREATE TABLE banuchat.document_chunks(id uuid PRIMARY KEY,document_version_id uuid,dataset_release_id uuid,ordinal integer NOT NULL,content text NOT NULL,locator text NOT NULL,page_start integer,page_end integer,embedding vector(1024) NOT NULL,FOREIGN KEY(document_version_id,dataset_release_id) REFERENCES banuchat.document_versions(id,dataset_release_id));
REVOKE ALL ON SCHEMA banuchat FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA banuchat FROM PUBLIC;
`;
export async function assertIsolatedPilotWriter(db:PilotSql):Promise<void>{
  const r=await db.query<{name:string;role:string;marker:boolean;no_current:boolean}>(`SELECT current_database() AS name,current_user AS role,EXISTS(SELECT 1 FROM banuchat.isolated_pilot_marker WHERE scope='NO_PUBLICATION') AS marker,to_regclass('banuchat.datasets') IS NULL AS no_current`);
  invariant(r.rows.length===1 && r.rows[0]?.name===PILOT_DATABASE && r.rows[0].role==='banuchat_pilot_writer' && r.rows[0].marker===true && r.rows[0].no_current===true);
}
/** Stages a readable candidate in the private DB only. Never calls a product finalizer. */
export async function stageIsolatedPilot(db:PilotSql,client:EmbeddingClient,prepared:PreparedPilot,config:EmbeddingConfig):Promise<{release_id:string;embeddings:number}>{
  await assertIsolatedPilotWriter(db);
  const {manifest_sha256,...payload}=prepared;
  invariant(manifest_sha256===hash(JSON.stringify(payload)));
  invariant(prepared.schema_version==='ccd-isolated-pilot-1' && prepared.documents.length>0 && prepared.documents.every(d=>hash(d.content)===d.sha256 && d.metadata.isolated_evaluation_allowed===true));
  const vectors:number[][]=[];
  for(let i=0;i<prepared.documents.length;i+=8)vectors.push(...await client.embed(prepared.documents.slice(i,i+8).map(d=>d.content),config));
  invariant(vectors.length===prepared.documents.length);
  await assertIsolatedPilotWriter(db);
  const release=randomUUID(),embedding=randomUUID();
  await db.query('BEGIN');
  try{
    await db.query('INSERT INTO banuchat.embedding_configs VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[embedding,config.provider,config.model,config.model_revision,config.dimension,config.distance_metric,JSON.stringify(config.parameters)]);
    await db.query('INSERT INTO banuchat.dataset_releases VALUES($1,$2,\'staging\',$3,$4,$5::jsonb)',[release,prepared.label,embedding,prepared.manifest_sha256,JSON.stringify(prepared)]);
    for(const [i,d] of prepared.documents.entries()){
      const doc=randomUUID(),version=randomUUID();
      await db.query('INSERT INTO banuchat.documents VALUES($1,1,$2,\'chunked\')',[doc,prepared.label+'-'+d.key]);
      await db.query(`INSERT INTO banuchat.document_versions VALUES($1,$2,1,$3,$4,$5,$6,$7,'ready',$8::jsonb)`,[version,doc,release,d.title,d.path,`claim:${d.claim_id}`,d.sha256,JSON.stringify(d.metadata)]);
      await db.query('INSERT INTO banuchat.document_chunks VALUES($1,$2,$3,0,$4,$5,NULL,NULL,$6::vector)',[randomUUID(),version,release,d.content,`claim:${d.claim_id}:part:${d.key.split('-').at(-1)}`,vectorLiteral(vectors[i]!)]);
    }
    await db.query("UPDATE banuchat.dataset_releases SET status='ready' WHERE id=$1",[release]);
    await db.query('COMMIT');
  }catch{await db.query('ROLLBACK');throw new Error('Isolated CCD staging failed.');}
  return {release_id:release,embeddings:vectors.length};
}
