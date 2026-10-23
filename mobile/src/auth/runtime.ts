import {getApiBaseUrl} from '../config/api';
import {isCcdLocal} from '../config/demo-mode';
import {AuthSession} from './auth-session';
let session:AuthSession|null=null;
export function installAuthSession(value:AuthSession){session=value;}
export function getAuthSession(){if(!session)throw new Error('AUTHENTICATION_REQUIRED');return session;}
export const resourceFetch:typeof fetch=(input,options)=>{
 if(isCcdLocal())return globalThis.fetch(input,options);
 const url=String(input);if(!url.startsWith(getApiBaseUrl()+'/'))throw new Error('AUTHENTICATION_REQUIRED');
 return getAuthSession().resource(url,options);
};
