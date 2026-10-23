import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {Pool} from 'pg';
export const local=new URL('../../../../infra/local/auth-i1a/',import.meta.url);
export interface Environment {
 name:string;database:string;port:number;network:string;volume:string;containerId:string;deployment:string;
 admin:string;adminPassword:string;runtime:string;runtimePassword:string;provisioner:string;provisionPassword:string;rateKey:string;
}
export async function environment():Promise<Environment>{
 const e=JSON.parse(await readFile(new URL('deployment.json',local),'utf8')) as Environment;
 assert.equal(e.name,'banuchat-auth-i1a-test');assert.equal(e.database,'banuchat_auth_i1a_test');assert.equal(e.port,55442);
 assert.equal(e.runtime,'auth_i1a_runtime');assert.equal(e.admin,'auth_i1a_admin');
 const actual=JSON.parse(execFileSync('docker',['inspect',e.containerId],{encoding:'utf8',stdio:['pipe','pipe','pipe']}))[0];
 assert.equal(actual.Name,'/'+e.name);assert.equal(actual.Config.Labels['banuchat.task'],'BCH05-CCD-AUTH-I1A');
 assert.equal(actual.Mounts[0].Name,e.volume);assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');
 assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostPort,String(e.port));return e;
}
export const pool=(e:Environment,role:'admin'|'runtime'|'provisioner'='admin')=>new Pool({host:'127.0.0.1',port:e.port,database:e.database,
 user:role==='admin'?e.admin:role==='runtime'?e.runtime:e.provisioner,
 password:role==='admin'?e.adminPassword:role==='runtime'?e.runtimePassword:e.provisionPassword,
 connectionTimeoutMillis:5000,statement_timeout:15000});
export const corpusTables=['datasets','dataset_releases','embedding_configs','documents','document_versions','document_chunks','synthetic_profiles','profile_courses','courses','calendar_events','announcements','ingestion_runs','ingestion_items'];
export async function fingerprint(db:Pick<Pool,'query'>,tables=corpusTables){
 const h=createHash('sha256');for(const table of tables){assert.match(table,/^[a-z_]+$/u);const r=await db.query(`SELECT to_jsonb(t)::text AS row FROM banuchat.${table} t ORDER BY to_jsonb(t)::text`);h.update(table+JSON.stringify(r.rows));}return h.digest('hex');
}
export async function evidence(name:string,result:unknown){
 assert.match(name,/^[a-z0-9-]+$/u);await writeFile(new URL(`../../../../eval/auth/results/bch05-ccd-auth-i1a-${name}.json`,import.meta.url),JSON.stringify(result,null,2)+'\n');
}
