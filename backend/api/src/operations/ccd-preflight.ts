/** Pure, allowlisted observations. Never return provider bodies, paths, serials or errors. */
export type CheckStatus='PASS'|'FAIL'|'NOT_EVALUABLE'|'NOT_EXECUTED';
export interface Check {check:string;status:CheckStatus;reason:string;}
export const check=(name:string,ok:boolean,reason:string):Check=>({check:name,status:ok?'PASS':'FAIL',reason});
const record=(v:unknown):Record<string,unknown>|undefined=>typeof v==='object'&&v!==null&&!Array.isArray(v)?v as Record<string,unknown>:undefined;
const list=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
export function assessProbeFailure(name:string,error:unknown):Check {
 const e=record(error),code=e?.code??record(e?.cause)?.code;
 if(code==='ERR_ASSERTION')return check(name,false,'IDENTITY_OR_CONFIGURATION_GUARD_REJECTED');
 if(code==='ENOENT'&&['dependencies','expo_sdk','mobile_launcher'].includes(name))return check(name,false,'REQUIRED_LOCAL_COMPONENT_MISSING');
 if(code==='ECONNREFUSED')return check(name,false,'LOCAL_SERVICE_NOT_ACCEPTING_CONNECTIONS');
 return{check:name,status:'NOT_EVALUABLE',reason:'ACCESS_TOOL_OR_DEPENDENCY_UNAVAILABLE'};
}
export function assessApi(status:number,body:unknown):Check {
 const error=record(record(body)?.error);
 return check('api_v2_anonymous',status===401&&error?.code==='UNAUTHENTICATED'&&typeof error.request_id==='string'&&/^[0-9a-f-]{36}$/iu.test(error.request_id),'EXPECTED_V2_AUTHENTICATION_REQUIRED');
}
export function assessExpo(declared:unknown,installed:unknown):Check {
 return check('expo_sdk',typeof declared==='string'&&/^~?57\.\d+\.\d+$/u.test(declared)&&typeof installed==='string'&&/^57\.\d+\.\d+$/u.test(installed),'EXPO_57_REQUIRED');
}
export interface ContainerIdentity {id:string;network:string;volume:string;}
export function assessContainer(value:unknown,expected:ContainerIdentity):Check {
 const c=record(value),config=record(c?.Config),labels=record(config?.Labels),settings=record(c?.NetworkSettings);
 if(c?.Id===expected.id&&c.Name==='/banuchat-ccd-auth-i1b-test'&&record(c.State)?.Running===false){
  return check('postgres_container',false,'EXPECTED_LAB_CONTAINER_STOPPED');
 }
 const ports=record(settings?.Ports),bindings=list(ports?.['5432/tcp']),binding=record(bindings[0]);
 const mounts=list(c?.Mounts),mount=record(mounts[0]),networks=record(settings?.Networks);
 return check('postgres_container',c?.Id===expected.id&&c?.Name==='/banuchat-ccd-auth-i1b-test'&&record(c.State)?.Running===true&&labels?.['banuchat.task']==='BCH05-CCD-AUTH-I1B'&&bindings.length===1&&binding?.HostIp==='127.0.0.1'&&binding.HostPort==='55443'&&mounts.length===1&&mount?.Type==='volume'&&mount.Name===expected.volume&&!!networks&&Object.keys(networks).length===1&&Object.hasOwn(networks,expected.network),'EXACT_I1B_LOOPBACK_VOLUME_NETWORK_REQUIRED');
}
export function assessPublicMobile(values:Record<string,string|undefined>):Check {
 const keys=['EXPO_PUBLIC_DEMO_MODE','EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_AUTH_LOCAL_CHANNEL'];
 if(keys.every(k=>values[k]===undefined))return{check:'mobile_shell_configuration',status:'NOT_EVALUABLE',reason:'VARIABLES_NOT_PRESENT_IN_THIS_PROCESS'};
 return check('mobile_shell_configuration',values[keys[0]!]==='ccd_authenticated'&&values[keys[1]!]==='http://127.0.0.1:3003/api/v2'&&values[keys[2]!]==='adb_reverse','CCD_AUTHENTICATED_LOOPBACK_ADB_REQUIRED');
}
export function assessModel(tags:unknown,show:unknown,expected:{model:string;digest:string;capability:string;dimension?:number},name:string):Check {
 const tag=list(record(tags)?.models).map(record).find(m=>m?.name===expected.model||m?.model===expected.model);
 const s=record(show),info=record(s?.model_info),architecture=info?.['general.architecture'];
 const normalize=(v:unknown)=>typeof v==='string'?v.replace(/^sha256:/u,'').toLowerCase():undefined;
 const dimension=expected.dimension===undefined||(typeof architecture==='string'&&info?.[architecture+'.embedding_length']===expected.dimension);
 return check(name,normalize(tag?.digest)===normalize(expected.digest)&&/^[0-9a-f]{64}$/u.test(normalize(expected.digest)??'')&&list(s?.capabilities).includes(expected.capability)&&dimension,'PINNED_MODEL_DIGEST_CAPABILITY_DIMENSION_REQUIRED');
}
/** Serial is used only by the caller for adb -s, never included in a report. */
export function authorizedSerials(text:string):string[] {
 return text.split(/\r?\n/u).map(line=>/^([^\s]+)\s+device\s*$/u.exec(line)?.[1]).filter((s):s is string=>s!==undefined);
}
export function assessAdbReverse(text:string,index:number):Check {
 const routes=text.split(/\r?\n/u).map(line=>line.trim().split(/\s+/u).slice(-2).join(' '));
 const api=routes.includes('tcp:3003 tcp:3003'),metro=routes.includes('tcp:8084 tcp:8084');
 return check('adb_device_'+index,api&&metro,api&&metro?'BOTH_REVERSE_ROUTES_PRESENT':!api&&!metro?'MISSING_BOTH_REVERSE_ROUTES':!api?'MISSING_API_REVERSE':'MISSING_METRO_REVERSE');
}
export function assessListener(addresses:unknown):Check {
 const a=list(addresses);
 return check('api_loopback_binding',a.length>0&&a.every(ip=>ip==='127.0.0.1'||ip==='::1'),'NO_WILDCARD_OR_LAN_BINDING');
}
