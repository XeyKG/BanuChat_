import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseStrictJson} from '../../../rag/src/preflight/json.js';
import {validateOe2Publication,type Oe2Publication,type Oe2PublicationHistory,type Oe2PublicationReader} from '../application/oe2-demo.js';
import {compareOe2History} from '../application/oe2-changes.js';
import {AuthError} from '../auth/primitives.js';
/** Immutable approved export; never starts Docker or accepts a path from HTTP. */
export function publishedOe2Reader(filename:string|undefined,expectedHash:string|undefined):Oe2PublicationReader|undefined {
 if(filename===undefined&&expectedHash===undefined)return undefined;
 if(!filename||!expectedHash||!/^[a-f0-9]{64}$/u.test(expectedHash))throw new AuthError('DEPENDENCY_UNAVAILABLE');
 async function load(){try{
  const bytes=await readFile(filename!);if(bytes.length>2*1024*1024||createHash('sha256').update(bytes).digest('hex')!==expectedHash)throw Error();
  const raw:unknown=parseStrictJson(bytes);if(raw===null||typeof raw!=='object'||Array.isArray(raw))throw Error();
  const bundle=raw as {schema_version:string;synthetic:boolean;current:Oe2Publication;history:Oe2PublicationHistory};
  if(bundle.schema_version!=='banuchat-approved-oe2-1'||bundle.synthetic!==true)throw Error();
  validateOe2Publication(bundle.current);compareOe2History(bundle.history);
  if(bundle.current.release_id!==bundle.history.current_release_id||!isDeepStrictEqual(bundle.current,bundle.history.publications.find(p=>p.release_id===bundle.history.current_release_id)))throw Error();
  return bundle;
 }catch{throw new AuthError('DEPENDENCY_UNAVAILABLE');}}
 return {read:async()=>(await load()).current,readHistory:async()=>(await load()).history};
}
