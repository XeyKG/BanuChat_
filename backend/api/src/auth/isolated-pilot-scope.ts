import type {Pool} from 'pg';
import {AuthError} from './primitives.js';

export interface IsolatedPilotScope {release_id:string;manifest_sha256:string}
/** Experimental composition only. No publication pointer or product database is accepted. */
export async function assertIsolatedPilotAuthScope(pool:Pool,database:string,deployment:string,scope:IsolatedPilotScope):Promise<void>{
 if(database!=='banuchat_p0_operational'||!/^[a-f0-9-]{36}$/u.test(scope.release_id)||!/^[a-f0-9]{64}$/u.test(scope.manifest_sha256))throw new AuthError('DEPENDENCY_UNAVAILABLE');
 const r=(await pool.query(`SELECT current_database() AS database,current_user AS role,
  EXISTS(SELECT 1 FROM banuchat.isolated_pilot_marker WHERE scope='NO_PUBLICATION') AS marker,
  to_regclass('banuchat.datasets') IS NULL AS no_current,
  to_regprocedure('banuchat.publish_release(uuid)') IS NULL AS no_publisher,
  EXISTS(SELECT 1 FROM banuchat_auth.pilot_scope s JOIN banuchat.dataset_releases r ON r.id=s.release_id
    WHERE s.singleton AND s.deployment_id=$1 AND s.release_id=$2 AND s.manifest_sha256=$3
      AND r.status='ready' AND r.manifest_sha256=s.manifest_sha256) AS pinned,
  pr.rolsuper OR pr.rolcreatedb OR pr.rolcreaterole OR pr.rolreplication OR pr.rolbypassrls
   OR has_database_privilege(current_database(),'CREATE') OR has_database_privilege(current_database(),'TEMP')
   OR has_schema_privilege('banuchat','CREATE') OR has_schema_privilege('banuchat_auth','CREATE')
   OR has_schema_privilege('banuchat_pilot_http','CREATE')
   OR has_schema_privilege('public','CREATE')
   OR EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=pr.oid)
   OR EXISTS(SELECT 1 FROM pg_database d WHERE d.datallowconn AND d.datname<>current_database() AND has_database_privilege(d.oid,'CONNECT'))
   OR EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace IN ('banuchat'::regnamespace,'banuchat_auth'::regnamespace,'banuchat_pilot_http'::regnamespace) AND c.relowner=pr.oid)
   OR EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='banuchat'::regnamespace AND c.relkind='r' AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(c.oid,'INSERT,UPDATE')))
   OR has_table_privilege('banuchat_auth.pilot_scope','INSERT,UPDATE,DELETE,TRUNCATE')
   OR has_table_privilege('banuchat_auth.pilot_grants','INSERT,UPDATE,DELETE,TRUNCATE') AS unsafe
 FROM pg_roles pr WHERE pr.rolname=current_user`,[deployment,scope.release_id,scope.manifest_sha256])).rows[0] as Record<string,unknown>|undefined;
 if(!r||r.database!==database||r.role!=='banuchat_pilot_http_runtime'||r.marker!==true||r.no_current!==true||r.no_publisher!==true||r.pinned!==true||r.unsafe!==false)throw new AuthError('DEPENDENCY_UNAVAILABLE');
}
