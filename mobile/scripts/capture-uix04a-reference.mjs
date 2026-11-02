// Render only the approved, offline UIX-04 HTML; never app/API evidence.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const secondary=process.argv.includes('--uix04b');
const root=path.resolve(secondary?'.expo/uix04b':'.expo/uix04a'),out=path.join(root,'reference-render'),profile=path.join(root,'reference-edge-'+randomUUID());
const reference=path.resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--'))??'.expo/uix04a/reference/BanuChat_mockup_refinado_UIX04.html');
const sourceSha256=createHash('sha256').update(await readFile(reference)).digest('hex');
assert.equal(sourceSha256,'7c0a0ebdce8dba32431feba7e2417a3d0cce247d2ec089f3af6a60d53c785927','APPROVED_UIX04_REFERENCE_HASH_MISMATCH');
await mkdir(out,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));let socket,seq=0;const pending=new Map(),errors=[],shots=[];
async function call(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('CDP_TIMEOUT '+method)),20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});}
try{
let port;for(let i=0;i<80;i++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(100);}}
const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});socket.onmessage=e=>{const d=JSON.parse(String(e.data));if(d.id){const p=pending.get(d.id);if(p){clearTimeout(p.timer);pending.delete(d.id);d.error?p.reject(Error(d.error.message)):p.resolve(d.result);}}else if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);};
await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setBlockedURLs',{urls:['http://*','https://*']});await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const url=pathToFileURL(reference).href;
for(const page of secondary?['history','progress','calendar','news','oe2','changes','notifications','document']:['login','home','chat'])for(const width of [1440,820,390,360]){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:url+'#'+page});await pause(700);const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=page+'-'+width+'.png';await writeFile(path.join(out,file),Buffer.from(result.data,'base64'));shots.push(file);}
if(errors.length)throw Error(errors.join('; '));console.log('REFERENCE_RENDERED '+shots.length+' offline screenshots');
}finally{await writeFile(path.join(out,'report.json'),JSON.stringify({scope:'Approved HTML reference only, offline; never app/API evidence',reference:path.basename(reference),sourceSha256,shots,errors},null,2));if(socket?.readyState===WebSocket.OPEN){try{await call('Browser.close');}catch{}socket.close();}if(browser.exitCode===null)browser.kill();}
