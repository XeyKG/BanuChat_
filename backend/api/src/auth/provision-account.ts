import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { PgTransactionRunner } from "../data/transaction.js";
import { AuthError, exactObject, safeError, uid } from "./primitives.js";
import { syntheticName } from "./recovery-crypto.js";

/** Trusted local/admin composition only. No HTTP route or credential establishment. */
export class SyntheticAccountProvisioner {
  private readonly transactions:PgTransactionRunner;
  constructor(private readonly pool:Pool,private readonly expectedDatabase:string) {this.transactions=new PgTransactionRunner(pool);}
  async provision(input:unknown,requestId:string):Promise<{principal_id:string;synthetic_uid:string;status:"pending_password"}> {
    try {
      const withName=input!==null && typeof input==="object" && Object.hasOwn(input,"synthetic_display_name");
      const body=exactObject(input,withName?["synthetic_uid","recovery_email","profile_key","synthetic_display_name"]:["synthetic_uid","recovery_email","profile_key"]);const selectedUid=uid(body.synthetic_uid);
      const name=syntheticName(withName?body.synthetic_display_name:"Cuenta ficticia "+selectedUid.slice(-4));
      const mail=body.recovery_email;const profile=body.profile_key;
      if(typeof mail!=="string" || !mail.endsWith("@banuchat.test") || !/^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?@banuchat[.]test$/u.test(mail) || mail.includes("..") ||
        typeof profile!=="string" || profile.length>128 || !/^[a-z0-9][a-z0-9_-]{0,127}$/u.test(profile) || !/^[0-9a-fA-F-]{36}$/u.test(requestId))throw new AuthError("INVALID_ARGUMENT");
      const check=await this.pool.query(`SELECT current_database() AS db,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
        has_database_privilege(current_database(),'CREATE,TEMP') AS db_write,
        has_schema_privilege('banuchat_auth','CREATE') OR has_schema_privilege('banuchat','CREATE') AS ddl,
        EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS memberships,
        has_table_privilege('banuchat_auth.password_credentials','SELECT,INSERT,UPDATE,DELETE') AS credential_access
        FROM pg_roles r WHERE r.rolname=current_user`);
      const role=check.rows[0] as Record<string,unknown>|undefined;
      if(!role || role.db!==this.expectedDatabase || this.expectedDatabase.toLowerCase().includes("ccd") ||
        ["rolsuper","rolcreatedb","rolcreaterole","rolreplication","rolbypassrls","credential_access","db_write","ddl","memberships"].some(k=>role[k]!==false))throw new AuthError("DEPENDENCY_UNAVAILABLE");
      return await this.transactions.run(async c=>{
        const version=await c.query<{id:string}>(`SELECT r.id FROM banuchat.datasets d JOIN banuchat.dataset_releases r
          ON r.dataset_id=d.id AND r.id=d.current_release_id JOIN banuchat.synthetic_profiles p ON p.dataset_release_id=r.id AND p.profile_key=$1
          WHERE d.id=1 AND d.name='banuchat-synthetic' AND r.status='ready' AND r.manifest->'synthetic'='true'::jsonb`,[profile]);
        const release=version.rows[0]?.id;if(!release)throw new AuthError("INVALID_ARGUMENT");
        const principal=randomUUID();
        await c.query("INSERT INTO banuchat_auth.accounts(id,synthetic_uid,recovery_email,synthetic_display_name) VALUES($1,$2,$3,$4)",[principal,selectedUid,mail,name]);
        await c.query("INSERT INTO banuchat_auth.profile_bindings(principal_id,dataset_id,profile_key) VALUES($1,1,$2)",[principal,profile]);
        await c.query("INSERT INTO banuchat_auth.profile_binding_versions(principal_id,dataset_id,dataset_release_id,profile_key) VALUES($1,1,$2,$3)",[principal,release,profile]);
        await c.query("INSERT INTO banuchat_auth.corpus_grants(principal_id,dataset_id) VALUES($1,1)",[principal]);
        await c.query("INSERT INTO banuchat_auth.security_events(request_id,principal_id,event_type,outcome) VALUES($1,$2,'account_provisioned','success')",[requestId,principal]);
        return {principal_id:principal,synthetic_uid:selectedUid,status:"pending_password"};
      });
    } catch(error) {
      if(error!==null && typeof error==="object" && "code" in error && error.code==="23505")throw new AuthError("INVALID_ARGUMENT");
      throw safeError(error);
    }
  }
}
