import {createInterface} from 'node:readline/promises';
import {stdin,stderr} from 'node:process';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {SyntheticAccountProvisioner} from './auth/provision-account.js';
import {LocalPasswordAdministrator} from './auth/local-password-administrator.js';
import {privatePassword} from './auth/private-password.js';
import {AuthError,uid,safeError,newPassword} from './auth/primitives.js';

// Technical credentials are injected privately by the operator. Never load a demo/CCD .env implicitly.
const pools:Pool[]=[];let first='',confirmation='';
try{
 if(!stdin.isTTY||!stderr.isTTY)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 if(process.argv.slice(2).some(v=>!['--existing','--replace-active'].includes(v)))throw new AuthError('INVALID_ARGUMENT');
 if(process.argv.includes('--replace-active')&&!process.argv.includes('--existing'))throw new AuthError('INVALID_ARGUMENT');
 const required=(name:string)=>{const v=process.env[name];if(!v)throw new AuthError('DEPENDENCY_UNAVAILABLE');return v;};
 const database=required('BANUCHAT_ADMIN_DATABASE'),deployment=required('BANUCHAT_ADMIN_DEPLOYMENT'),port=Number(required('BANUCHAT_ADMIN_PORT'));
 if(!Number.isInteger(port)||port<1024||port>65535||[5432,55433].includes(port)||!/^[a-z0-9_]+$/u.test(database)||/ccd/iu.test(database))throw new AuthError('INVALID_ARGUMENT');
 const runtime=new Pool({host:'127.0.0.1',port,database,user:required('BANUCHAT_ADMIN_RUNTIME_USER'),password:required('BANUCHAT_ADMIN_RUNTIME_PASSWORD'),connectionTimeoutMillis:5000,statement_timeout:10000});pools.push(runtime);
 runtime.on('error',()=>{stderr.write('Dependencia administrativa no disponible.\n');process.exitCode=1;});
 const administrator=await LocalPasswordAdministrator.create({pool:runtime,database,deployment});
 const terminal=createInterface({input:stdin,output:stderr});let selectedUid='',name='',profile='';
 try{selectedUid=uid(await terminal.question('UID sintético autorizado: '));if(!process.argv.includes('--existing')){name=await terminal.question('Nombre ficticio: ');profile=await terminal.question('Perfil sintético autorizado: ');}}finally{terminal.close();}
 first=await privatePassword('Contraseña propia nueva (sin eco): ');confirmation=await privatePassword('Confirmar contraseña (sin eco): ');
 if(first!==confirmation)throw new AuthError('INVALID_ARGUMENT');confirmation='';
 newPassword(first);
 if(!process.argv.includes('--existing')){
  const provision=new Pool({host:'127.0.0.1',port,database,user:required('BANUCHAT_ADMIN_PROVISION_USER'),password:required('BANUCHAT_ADMIN_PROVISION_PASSWORD'),connectionTimeoutMillis:5000});pools.push(provision);
  provision.on('error',()=>{stderr.write('Dependencia administrativa no disponible.\n');process.exitCode=1;});
  await new SyntheticAccountProvisioner(provision,database).provision({synthetic_uid:selectedUid,synthetic_display_name:name,profile_key:profile,recovery_email:'demo-'+selectedUid.slice(-4)+'@banuchat.test'},randomUUID());
 }
 await administrator.establish(selectedUid,first,process.argv.includes('--replace-active'));
 stderr.write('Cuenta sintética habilitada. Iniciar sesión normalmente en BanuChat.\n');
}catch(error){stderr.write(safeError(error).message+'\n');process.exitCode=1;}
finally{first='';confirmation='';await Promise.all(pools.map(p=>p.end()));}
