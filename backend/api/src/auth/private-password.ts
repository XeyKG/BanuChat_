import {stdin,stderr} from 'node:process';
import {StringDecoder} from 'node:string_decoder';
import {AuthError} from './primitives.js';

/** TTY only; no echo, command arguments, files or environment fallback. */
export async function privatePassword(prompt:string):Promise<string>{
 if(!stdin.isTTY||!stderr.isTTY||!stdin.setRawMode)throw new AuthError('DEPENDENCY_UNAVAILABLE');
 stderr.write(prompt);let value='';const decoder=new StringDecoder('utf8');
 return new Promise<string>((resolve,reject)=>{
  const wasRaw=stdin.isRaw;
  const finish=(error?:AuthError)=>{
   stdin.off('data',data);stdin.off('end',end);stdin.off('error',end);stdin.setRawMode(wasRaw);stdin.pause();stderr.write('\n');
   if(error){value='';reject(error);}else{const result=value;value='';resolve(result);}
  };
  const end=()=>finish(new AuthError('INVALID_ARGUMENT'));
  const data=(chunk:Buffer|string)=>{
   const text=typeof chunk==='string'?chunk:decoder.write(chunk);if(Buffer.isBuffer(chunk))chunk.fill(0);
   for(const char of text){
    if(char==='\u0003'||char==='\u0004'){finish(new AuthError('INVALID_ARGUMENT'));return;}
    if(char==='\r'||char==='\n'){finish();return;}
    if(char==='\u007f'||char==='\b'){value=[...value].slice(0,-1).join('');continue;}
    if(char<' '||char==='\u001b'){finish(new AuthError('INVALID_ARGUMENT'));return;}
    value+=char;if([...value].length>128){finish(new AuthError('INVALID_ARGUMENT'));return;}
   }
  };
  stdin.setRawMode(true);stdin.on('data',data);stdin.once('end',end);stdin.once('error',end);stdin.resume();
 });
}
