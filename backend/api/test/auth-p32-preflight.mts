import {lstat,readFile} from 'node:fs/promises';
import {assessRecoveryConfiguration} from '../src/auth/recovery-preflight.js';

// Only fixed reason codes reach stdout; never serialize input, paths or errors.
try{
 const target=new URL('../../../infra/local/auth-p32/config.json',import.meta.url);
 const info=await lstat(target);if(!info.isFile()||info.isSymbolicLink()||info.size>16384)throw new Error();
 const result=assessRecoveryConfiguration(JSON.parse(await readFile(target,'utf8')));
 console.log(JSON.stringify(result));process.exitCode=result.status==='BLOCKED'?2:3;
}catch{console.log(JSON.stringify({status:'BLOCKED',blockers:['PRIVATE_CONFIGURATION_UNAVAILABLE'],external_test:'NOT_STARTED'}));process.exitCode=2;}
