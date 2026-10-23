import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
export const root=new URL('../../../../',import.meta.url),local=new URL('infra/local/auth-i1b/',root),privateEvidence=new URL('data/ccd/evidence/auth-i1b/',root);
export interface Environment {name:string;database:string;port:number;network:string;volume:string;containerId:string;deployment:string;admin:string;adminPassword:string;runtime:string;runtimePassword:string;provisioner:string;provisionPassword:string;rateKey:string;mode:'synthetic'|'ccd_local';}
export async function environment(kind:'ccd'|'uid'='ccd'):Promise<Environment>{
 const e=JSON.parse(await readFile(new URL(kind+'-deployment.json',local),'utf8')) as Environment;
 assert.equal(e.database,kind==='ccd'?'banuchat_ccd_auth_i1b_test':'banuchat_auth_i1b_uid_test');assert.equal(e.port,kind==='ccd'?55443:55444);
 const actual=JSON.parse(execFileSync('docker',['inspect',e.containerId],{encoding:'utf8',stdio:['pipe','pipe','pipe']}))[0];
 assert.equal(actual.Name,'/'+e.name);assert.equal(actual.Config.Labels['banuchat.task'],'BCH05-CCD-AUTH-I1B');assert.equal(actual.Mounts[0].Name,e.volume);
 assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostPort,String(e.port));return e;
}
export const pool=(e:Environment,role:'admin'|'runtime'|'provisioner'='admin')=>new Pool({host:'127.0.0.1',port:e.port,database:e.database,user:role==='admin'?e.admin:role==='runtime'?e.runtime:e.provisioner,password:role==='admin'?e.adminPassword:role==='runtime'?e.runtimePassword:e.provisionPassword,connectionTimeoutMillis:5000,statement_timeout:15000});
export const corpusTables=['datasets','dataset_releases','embedding_configs','documents','document_versions','document_chunks','synthetic_profiles','profile_courses','courses','calendar_events','announcements','ingestion_runs','ingestion_items'];
export async function fingerprint(db:Pick<Pool,'query'>,ccd=false,history=false){
 const h=createHash('sha256');for(const table of history?['conversations','messages','message_citations']:[...corpusTables,...(ccd?['ccd_demo_contexts']:[])]){const r=await db.query(`SELECT to_jsonb(t)::text AS row FROM banuchat.${table} t ORDER BY to_jsonb(t)::text`);h.update(table+JSON.stringify(r.rows));}return h.digest('hex');
}
export const storage={root:fileURLToPath(new URL('data/ccd/local/m01-m12/',root)),version_roots:{'bch03-m01-m12-local-1':fileURLToPath(new URL('data/ccd/local/m01-m12/',root)),'bch03-ccd-local-2':fileURLToPath(new URL('data/ccd/local/expanded-v2/',root)),'bch03-ccd-local-3':fileURLToPath(new URL('data/ccd/local/guidance-v3/',root))}};
export async function evidence(name:string,result:unknown,privateOnly=false){assert.match(name,/^[a-z0-9-]+$/u);const dir=privateOnly?privateEvidence:new URL('eval/auth/results/',root);await mkdir(dir,{recursive:true});const path=new URL(privateOnly?name+'.json':'bch05-ccd-auth-i1b-'+name+'.json',dir);await writeFile(path,JSON.stringify(result,null,2)+'\n');}
