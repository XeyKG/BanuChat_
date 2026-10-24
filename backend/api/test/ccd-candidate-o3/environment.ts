import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {root,type Environment} from '../auth-i1b/environment.js';

const identity={
 name:'banuchat-dev-postgres-ccd-auth-1',
 project:'banuchat-dev',
 service:'postgres-ccd-auth',
 port:55453,
 volume:'banuchat-dev-ccd-auth-data',
 network:'banuchat-dev-ccd-auth',
} as const;

export async function candidateEnvironment():Promise<Environment>{
 const source=JSON.parse(await readFile(new URL('infra/local/auth-i1b/ccd-deployment.json',root),'utf8')) as Environment;
 assert.equal(source.database,'banuchat_ccd_auth_i1b_test');
 const actual=JSON.parse(execFileSync('docker',['inspect',identity.name],{encoding:'utf8',stdio:['pipe','pipe','pipe']}))[0];
 assert.equal(actual.Name,'/'+identity.name);assert.equal(actual.State.Running,true);assert.equal(actual.State.Health?.Status,'healthy');
 assert.equal(actual.Config.Labels['com.docker.compose.project'],identity.project);
 assert.equal(actual.Config.Labels['com.docker.compose.service'],identity.service);
 assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostIp,'127.0.0.1');
 assert.equal(actual.NetworkSettings.Ports['5432/tcp'][0].HostPort,String(identity.port));
 assert.ok(actual.Mounts.some((m:{Name?:string;Destination?:string})=>m.Name===identity.volume&&m.Destination==='/var/lib/postgresql/data'));
 assert.ok(Object.hasOwn(actual.NetworkSettings.Networks,identity.network));
 return {...source,name:identity.name,containerId:actual.Id,port:identity.port,volume:identity.volume,network:identity.network};
}

export const candidatePool=(e:Environment,role:'admin'|'runtime'='admin',readOnly=false)=>new Pool({
 host:'127.0.0.1',port:e.port,database:e.database,
 user:role==='admin'?e.admin:e.runtime,password:role==='admin'?e.adminPassword:e.runtimePassword,
 ...(readOnly?{options:'-c default_transaction_read_only=on'}:{}),connectionTimeoutMillis:5000,statement_timeout:15000,
});
