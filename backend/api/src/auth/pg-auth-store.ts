import type { Pool } from "pg";
import type { SqlQueryClient } from "../data/sql-client.js";
import { PgTransactionRunner } from "../data/transaction.js";
import { AuthError } from "./primitives.js";
import {knowledgeMode,type KnowledgeMode} from './knowledge-mode.js';

export interface AccountRow { id:string; synthetic_uid:string; status:string; auth_version:string; password_hash:string|null; }
export interface SessionRow {
  id:string;principal_id:string;deployment_id:string;auth_version:string;
  created_at:Date;access_expires_at:Date;last_seen_at:Date;absolute_expires_at:Date;revoked_at:Date|null;
}
export interface RefreshRow { id:string;session_id:string;expires_at:Date;consumed_at:Date|null; }
export interface TokenPair {access_token:string;refresh_token:string;token_type:"Bearer";expires_in:number;session_expires_at:string;}
export type AuthEvent="account_provisioned"|"login_succeeded"|"login_denied"|"refresh_succeeded"|"refresh_reuse_detected"|"logout_succeeded"|"access_denied"|"rate_limited"|"reset_requested"|"reset_delivery_failed"|"password_set"|"password_reset";

/** SQL for auth only; never mutates corpus, history or the frozen v1 services. */
export class PgAuthStore {
  readonly transactions:PgTransactionRunner;
  constructor(readonly pool:Pool) { this.transactions=new PgTransactionRunner(pool); }
  async assertRuntime(expectedDatabase:string,mode:KnowledgeMode='synthetic',unified=false):Promise<void> {
    knowledgeMode(mode);
    const result=await this.pool.query(`SELECT current_database() AS database, r.rolsuper, r.rolcreatedb,
      r.rolcreaterole,r.rolreplication,r.rolbypassrls,
      has_database_privilege(current_database(),'CREATE') OR has_database_privilege(current_database(),'TEMP') AS db_write,
      has_schema_privilege('banuchat_auth','CREATE') OR has_schema_privilege('banuchat','CREATE') AS ddl,
      EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS memberships,
      EXISTS(SELECT 1 FROM pg_database d WHERE d.datallowconn AND d.datname<>current_database()
        AND has_database_privilege(d.oid,'CONNECT')) AS other_database,
      EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_auth'::regnamespace)
        AND c.relowner=r.oid) AS owns_objects,
      EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='banuchat'::regnamespace AND c.relkind='r'
        AND c.relname NOT IN ('conversations','messages','message_citations')
        AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE')
          OR has_any_column_privilege(c.oid,'INSERT,UPDATE'))) AS corpus_write,
      has_any_column_privilege('banuchat.conversations','UPDATE') AS conversation_update,
      EXISTS(SELECT 1 FROM banuchat.datasets d JOIN banuchat.dataset_releases v
        ON v.dataset_id=d.id AND v.id=d.current_release_id WHERE d.id=1 AND d.name='banuchat-synthetic'
        AND v.status='ready' AND v.manifest->'synthetic'='true'::jsonb) AS synthetic
      FROM pg_roles r WHERE r.rolname=current_user`);
    const r=result.rows[0] as Record<string,unknown>|undefined;
    if(!r || !expectedDatabase || r.database!==expectedDatabase ||
      (mode==='synthetic' && (expectedDatabase.toLowerCase().includes("ccd") || !r.synthetic)) ||
      (mode==='ccd_local' && expectedDatabase!==(unified?'banuchat_unified':'banuchat_ccd_auth_i1b_test')) ||
      ["rolsuper","rolcreatedb","rolcreaterole","rolreplication","rolbypassrls","db_write","ddl","memberships","other_database","owns_objects","corpus_write","conversation_update"].some(k=>r[k]!==false)) throw new AuthError("DEPENDENCY_UNAVAILABLE");
    if(mode==='ccd_local'){
      if(unified){const marker=await this.pool.query('SELECT version FROM banuchat_aux.product_config WHERE singleton');if(marker.rows[0]?.version!==1)throw new AuthError('DEPENDENCY_UNAVAILABLE');}
      const guard=await this.pool.query(`SELECT EXISTS(SELECT 1 FROM banuchat_auth.runtime_scope s
        JOIN banuchat.datasets d ON d.id=1 AND d.name='banuchat-ccd-local'
        JOIN banuchat.dataset_releases v ON v.id=d.current_release_id AND v.dataset_id=d.id
        JOIN banuchat.ccd_demo_contexts c ON c.dataset_release_id=v.id AND c.profile_key='ccd-local-demo'
        WHERE s.singleton AND s.database_name=current_database() AND s.evidence_mode='ccd_local'
          AND s.dataset_name='banuchat-ccd-local' AND v.status='ready' AND v.manifest->'synthetic'='false'::jsonb
          AND v.manifest->>'schema_version' IN ('ccd-1.0.0','ccd-1.1.0','ccd-1.2.0','ccd-1.3.0','ccd-1.4.0'))
        AND NOT EXISTS(SELECT 1 FROM banuchat.synthetic_profiles)
        AND (SELECT count(*) FROM banuchat.datasets)=1
        AND NOT EXISTS(SELECT 1 FROM banuchat.dataset_releases WHERE dataset_id<>1 OR (manifest->'synthetic'='false'::jsonb) IS NOT TRUE) AS valid`);
      if(guard.rows[0]?.valid!==true)throw new AuthError('DEPENDENCY_UNAVAILABLE');
    }
  }
  async accountByUid(uid:string):Promise<AccountRow|undefined> {
    const r=await this.pool.query<AccountRow>(`SELECT a.id,a.synthetic_uid,a.status,a.auth_version::text,p.password_hash
      FROM banuchat_auth.accounts a LEFT JOIN banuchat_auth.password_credentials p ON p.principal_id=a.id WHERE a.synthetic_uid=$1`,[uid]);
    return r.rows[0];
  }
  async lockAccount(c:SqlQueryClient,id:string):Promise<AccountRow|undefined> {
    const r=await c.query<AccountRow>(`SELECT a.id,a.synthetic_uid,a.status,a.auth_version::text,p.password_hash
      FROM banuchat_auth.accounts a LEFT JOIN banuchat_auth.password_credentials p ON p.principal_id=a.id
      WHERE a.id=$1 FOR UPDATE OF a`,[id]); return r.rows[0];
  }
  async accessOwner(c:SqlQueryClient,digest:string):Promise<{id:string;principal_id:string}|undefined> {
    return (await c.query<{id:string;principal_id:string}>("SELECT id,principal_id FROM banuchat_auth.sessions WHERE access_token_digest=$1",[digest])).rows[0];
  }
  async refreshOwner(c:SqlQueryClient,digest:string):Promise<{session_id:string;principal_id:string}|undefined> {
    return (await c.query<{session_id:string;principal_id:string}>(`SELECT t.session_id,s.principal_id FROM banuchat_auth.refresh_tokens t
      JOIN banuchat_auth.sessions s ON s.id=t.session_id WHERE t.token_digest=$1`,[digest])).rows[0];
  }
  async lockSession(c:SqlQueryClient,id:string):Promise<SessionRow|undefined> {
    return (await c.query<SessionRow>("SELECT id,principal_id,deployment_id,auth_version::text,created_at,access_expires_at,last_seen_at,absolute_expires_at,revoked_at FROM banuchat_auth.sessions WHERE id=$1 FOR UPDATE",[id])).rows[0];
  }
  async accessStillMatches(c:SqlQueryClient,id:string,digest:string):Promise<boolean> {
    return (await c.query("SELECT id FROM banuchat_auth.sessions WHERE id=$1 AND access_token_digest=$2",[id,digest])).rows.length===1;
  }
  async lockRefresh(c:SqlQueryClient,digest:string):Promise<RefreshRow|undefined> {
    return (await c.query<RefreshRow>("SELECT id,session_id,expires_at,consumed_at FROM banuchat_auth.refresh_tokens WHERE token_digest=$1 FOR UPDATE",[digest])).rows[0];
  }
  async touch(c:SqlQueryClient,id:string,now:Date):Promise<void> { await c.query("UPDATE banuchat_auth.sessions SET last_seen_at=$2 WHERE id=$1",[id,now]); }
  async revoke(c:SqlQueryClient,id:string,now:Date):Promise<void> { await c.query("UPDATE banuchat_auth.sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE id=$1",[id,now]); }
  async audit(c:SqlQueryClient,event:AuthEvent,outcome:"success"|"denied",requestId:string,principal:string|null=null,session:string|null=null):Promise<void> {
    await c.query("INSERT INTO banuchat_auth.security_events(request_id,principal_id,session_id,event_type,outcome) VALUES($1,$2,$3,$4,$5)",[requestId,principal,session,event,outcome]);
  }
  async createSession(c:SqlQueryClient,input:{id:string;principal:string;deployment:string;version:string;accessDigest:string;refreshDigest:string;now:Date;expires:Date;absolute:Date}):Promise<void> {
    const x=input;
    await c.query(`INSERT INTO banuchat_auth.sessions(id,principal_id,deployment_id,auth_version,access_token_digest,
      created_at,access_issued_at,access_expires_at,last_seen_at,absolute_expires_at) VALUES($1,$2,$3,$4,$5,$6,$6,$7,$6,$8)`,
      [x.id,x.principal,x.deployment,x.version,x.accessDigest,x.now,x.expires,x.absolute]);
    await c.query("INSERT INTO banuchat_auth.refresh_tokens(session_id,token_digest,created_at,expires_at) VALUES($1,$2,$3,$4)",[x.id,x.refreshDigest,x.now,x.absolute]);
  }
  async rotate(c:SqlQueryClient,oldId:string,session:SessionRow,accessDigest:string,refreshDigest:string,now:Date,expires:Date):Promise<void> {
    const inserted=await c.query<{id:string}>("INSERT INTO banuchat_auth.refresh_tokens(session_id,token_digest,created_at,expires_at) VALUES($1,$2,$3,$4) RETURNING id",[session.id,refreshDigest,now,session.absolute_expires_at]);
    const id=inserted.rows[0]?.id; if(!id)throw new AuthError("INTERNAL_ERROR");
    await c.query("UPDATE banuchat_auth.refresh_tokens SET consumed_at=$2,replaced_by=$3 WHERE id=$1",[oldId,now,id]);
    await c.query("UPDATE banuchat_auth.sessions SET access_token_digest=$2,access_issued_at=$3,access_expires_at=$4,last_seen_at=$3 WHERE id=$1",[session.id,accessDigest,now,expires]);
  }
}
