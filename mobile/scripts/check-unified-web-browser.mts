import {spawn, execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {demoAccounts} from '../../backend/api/test/auth-i1b/accounts.ts';
import {runWeb02} from './unified-web02-journey.mts';

const origin='http://127.0.0.1:8085';
const web02=process.argv.includes('--web02');
const run=path.join(process.env.LOCALAPPDATA!,'BanuChat',web02?'web-02':'web-01',randomUUID());
await mkdir(run,{recursive:true});
const sid=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8'}).match(/S-1-[0-9-]+/u)![0];
execFileSync('icacls',[run,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)(F)`],{stdio:'ignore'});
const profile=path.join(run,'edge-profile');
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions',
  '--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank',
],{windowsHide:true,stdio:'ignore'});
const report:{started_at:string;steps:Array<Record<string,unknown>>;state?:string;failed_step?:string;error?:string}={started_at:new Date().toISOString(),steps:[]};
let socket:WebSocket|undefined, sequence=0,currentStep='launch';
const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const events=new Map<string,Array<(params:any)=>void>>();
const accesses=new Set<string>();
let browserAccess:string|null=null;
const requestCounts={messagePosts:0,deletes:0};
let interceptLogin=false, interceptMessage:'conflict'|'network'|null=null, acceptDialog=false;
const consoleText:string[]=[];
async function call(method:string,params:Record<string,unknown>={}) {
  const id=++sequence;
  return await new Promise<any>((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP_TIMEOUT_'+method));},30000);
    pending.set(id,{resolve,reject,timer});socket!.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression:string) {
  const value=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
  if(value.exceptionDetails)throw new Error('BROWSER_EXPRESSION_FAILED');return value.result.value;
}
async function until(expression:string,timeout=30000) {
  const end=Date.now()+timeout;
  while(Date.now()<end){if(await evaluate(expression))return;await pause(250);}throw new Error('UI_CONDITION_TIMEOUT');
}
async function click(label:string) {
  const found=await evaluate(`(()=>{const visible=e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!e.closest('[aria-hidden="true"]');const e=[...document.querySelectorAll('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']')].find(visible)??[...document.querySelectorAll('[role="button"],button')].find(e=>visible(e)&&e.innerText.trim()===${JSON.stringify(label)});if(!e||e.getAttribute('aria-disabled')==='true')return false;e.click();return true;})()`);
  if(!found)throw new Error('BUTTON_NOT_FOUND');
}
async function fill(label:string,value:string) {
  const found=await evaluate(`(()=>{const e=[...document.querySelectorAll('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']')].find(e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!e.closest('[aria-hidden="true"]'));if(!e)return false;const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  if(!found)throw new Error('INPUT_NOT_FOUND');await pause(150);
}
async function snapshot(name:string) {
  if(web02)await pause(450);
  const dom=await evaluate(`({url:location.href,text:document.body.innerText,labels:[...document.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')),width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,localStorageKeys:Object.keys(localStorage),sessionStorageKeys:Object.keys(sessionStorage)})`);
  const safeAuxiliary=['/home','/progress','/calendar','/announcements','/oe2','/oe2-changes'].includes(new URL(dom.url).pathname);
  const saved=web02?{route:new URL(dom.url).pathname,width:dom.width,overflow:dom.overflow,localStorageKeys:dom.localStorageKeys,sessionStorageKeys:dom.sessionStorageKeys,...(safeAuxiliary?{labels:dom.labels}:{})}:dom;
  await writeFile(path.join(run,name+'.json'),JSON.stringify(saved,null,2));
  if(!web02||safeAuxiliary){const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(path.join(run,name+'.png'),Buffer.from(shot.data,'base64'));}
  return dom;
}
function pass(name:string,details:Record<string,unknown>={}) {report.steps.push({name,result:'PASS',at:new Date().toISOString(),...details});console.log('PASS '+name);}
try {
  let debugPort='';
  for(let i=0;i<80;i++){try{debugPort=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(250);}}
  if(!debugPort)throw new Error('EDGE_DEBUG_LISTENER_UNAVAILABLE');
  const targets=await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json() as any[];
  const target=targets.find(t=>t.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve,reject)=>{socket!.onopen=()=>resolve();socket!.onerror=()=>reject(new Error('EDGE_CONNECTION_FAILED'));});
  socket.onmessage=event=>{const data=JSON.parse(String(event.data));if(data.id){const item=pending.get(data.id);if(item){clearTimeout(item.timer);pending.delete(data.id);if(data.error)item.reject(new Error('CDP_REQUEST_FAILED'));else item.resolve(data.result);}}else for(const handler of events.get(data.method)??[])handler(data.params);};
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  events.set('Network.requestWillBeSent',[p=>{
    const authorization=p.request.headers.Authorization??p.request.headers.authorization;
    if(typeof authorization==='string'&&authorization.startsWith('Bearer ')){browserAccess=authorization.slice(7);accesses.add(browserAccess);}
    if(p.request.method==='POST'&&/\/messages$/.test(p.request.url))requestCounts.messagePosts++;
    if(p.request.method==='DELETE')requestCounts.deletes++;
  }]);
  events.set('Runtime.consoleAPICalled',[p=>consoleText.push(p.args.map((a:any)=>typeof a.value==='string'?a.value:'').join(' '))]);
  events.set('Page.javascriptDialogOpening',[async p=>{await call('Page.handleJavaScriptDialog',{accept:p.type==='confirm'&&acceptDialog});}]);
  events.set('Fetch.requestPaused',[async p=>{
    if(interceptLogin&&p.request.url===origin+'/api/v2/auth/login'){
      interceptLogin=false;await call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from('{"error":{"code":"DEPENDENCY_UNAVAILABLE"}}').toString('base64')});
    }else if(interceptMessage&&/\/messages$/.test(p.request.url)){
      const fault=interceptMessage;interceptMessage=null;
      if(fault==='network')await call('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'});
      else await call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:409,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"error":{"code":"CONFLICT"}}').toString('base64')});
    }else await call('Fetch.continueRequest',{requestId:p.requestId});
  }]);
  await call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  currentStep='initial-load';await call('Page.navigate',{url:origin+'/login'});
  await until(`!!document.querySelector('[aria-label="Usuario"]')`);
  const first=await snapshot('01-login');pass(currentStep,{width:first.width,overflow:first.overflow});
  if(process.argv.includes('--inspect')) { report.state='INSPECTED'; }
  else if(web02){
    await runWeb02({origin,run,call,evaluate,until,click,fill,snapshot,pass,requestCounts,accesses,consoleText,skipLoginControls:process.argv.includes('--skip-login-controls'),privacyOnly:process.argv.includes('--privacy-only'),
      getAccess:()=>browserAccess,setStep:name=>{currentStep=name;},setDialog:accept=>{acceptDialog=accept;},
      setFetchHandler:handler=>events.set('Fetch.requestPaused',[handler])});
    report.state=process.argv.includes('--privacy-only')?'WEB_02_PRIVACY_CHECKS_PASSED':'BANUCHAT_WEB_02_BROWSER_VALIDATED';
  }
  else {
    const accounts=await demoAccounts();
    currentStep='login-invalid';await fill('Usuario',accounts[0].uid);await fill('Contraseña','incorrecta exclusivamente de prueba');await click('Iniciar sesión');
    await until(`document.body.innerText.includes('Usuario o contraseña inválidos.')`);pass(currentStep);
    currentStep='login-service-unavailable-controlled';await call('Fetch.enable',{patterns:[{urlPattern:origin+'/api/v2/auth/login',requestStage:'Request'}]});interceptLogin=true;
    await fill('Contraseña',accounts[0].password);await click('Iniciar sesión');await until(`document.body.innerText.includes('El servicio no está disponible.')`);await call('Fetch.disable');pass(currentStep,{controlledBrowserFault:true});
    currentStep='login-real';await fill('Contraseña',accounts[0].password);await click('Iniciar sesión');
    await until(`location.pathname==='/home'&&document.body.innerText.includes('Hola,')`);
    const home=await snapshot('02-home');pass(currentStep,{overflow:home.overflow,storageEmpty:home.localStorageKeys.length===0&&home.sessionStorageKeys.length===0});
    currentStep='create-conversation';await click('Abrir chat con Banu');await until(`location.pathname==='/chat'&&!!document.querySelector('textarea:not([readonly])')`);
    const conversationId=await evaluate(`new URLSearchParams(location.search).get('conversation_id')`);
    await writeFile(path.join(run,'own-conversation.json'),JSON.stringify({conversation_id:conversationId}));pass(currentStep);
    let emptyId=conversationId;
    if(!process.argv.includes('--closure-only')) {
    currentStep='document-question';await fill('Mensaje','¿Qué temas se estudian en el curso de Inteligencia Artificial Generativa?');await click('Enviar mensaje');
    await until(`!!document.querySelector('[aria-label^="Mostrar "][aria-label$=" fuentes"]')||document.body.innerText.includes('Evidencia insuficiente')||document.body.innerText.includes('No fue posible obtener')`,100000);
    if(!await evaluate(`!!document.querySelector('[aria-label^="Mostrar "][aria-label$=" fuentes"]')`))throw new Error('NO_DOCUMENTARY_SOURCES_IN_RESPONSE');
    const chat=await snapshot('03-chat');pass(currentStep,{sourcesVisible:true,overflow:chat.overflow});
    const sourcesLabel=await evaluate(`document.querySelector('[aria-label^="Mostrar "][aria-label$=" fuentes"]').getAttribute('aria-label')`);await click(sourcesLabel);
    await until(`!!document.querySelector('[aria-label^="Abrir documento "]')`);
    const sourceLabel=await evaluate(`document.querySelector('[aria-label^="Abrir documento "]').getAttribute('aria-label')`);
    currentStep='open-document';await click(sourceLabel);await until(`location.pathname==='/document'&&document.body.innerText.includes('Revisa la fecha, el periodo')`);
    await snapshot('04-document');pass(currentStep);
    currentStep='cross-account-authorization';
    const loginB=await fetch(origin+'/api/v2/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({synthetic_uid:accounts[1].uid,password:accounts[1].password})});
    if(loginB.status!==200)throw new Error('SECOND_ACCOUNT_LOGIN_FAILED');const pairB=await loginB.json() as any;accesses.add(pairB.access_token);
    for(const method of ['GET','DELETE']){const denied=await fetch(origin+'/api/v2/conversations/'+conversationId,{method,headers:{Origin:origin,Authorization:'Bearer '+pairB.access_token}});if(denied.status!==404)throw new Error('CROSS_ACCOUNT_RESOURCE_NOT_HIDDEN');}
    const ownList=await fetch(origin+'/api/v2/conversations',{headers:{Authorization:'Bearer '+pairB.access_token}});const ownData=await ownList.json() as any;if(ownData.conversations.some((c:any)=>c.conversation_id===conversationId))throw new Error('CROSS_ACCOUNT_HISTORY_LEAK');
    const anonymous=await fetch(origin+'/api/v2/conversations/'+conversationId);if(anonymous.status!==401)throw new Error('ANONYMOUS_RESOURCE_NOT_BLOCKED');pass(currentStep,{otherOwnerGet:404,otherOwnerDelete:404,anonymous:401});
    currentStep='history';await click('Navegar a Historial');await until(`location.pathname==='/history'&&!!document.querySelector('[aria-label^="Abrir conversación del "]')`);
    await snapshot('05-history');const openLabel=await evaluate(`document.querySelector('[aria-label^="Abrir conversación del "]').getAttribute('aria-label')`);await click(openLabel);
    await until(`location.pathname==='/chat'&&document.body.innerText.includes('¿Qué temas se estudian')`);pass(currentStep,{reopened:true});
    currentStep='responsive';for(const width of [1366,768,390]){
      await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(450);
      const state=await snapshot('06-chat-'+width);if(state.overflow)throw new Error('HORIZONTAL_OVERFLOW');
    }pass(currentStep,{widths:[1366,768,390]});
    currentStep='abstention';await fill('Mensaje','¿Cuál es el horario de atención confirmado del CCD para el domingo de 2030?');await click('Enviar mensaje');
    await until(`document.body.innerText.includes('Evidencia insuficiente')`,100000);await snapshot('06-abstention');pass(currentStep);
    currentStep='conflict-controlled';await call('Fetch.enable',{patterns:[{urlPattern:origin+'/api/v2/conversations/*/messages',requestStage:'Request'}]});
    let count=requestCounts.messagePosts;interceptMessage='conflict';await fill('Mensaje','Consulta ficticia para comprobar un conflicto controlado.');await click('Enviar mensaje');
    await until(`document.body.innerText.includes('No se puede continuar esta conversación.')`);await pause(1000);
    if(requestCounts.messagePosts!==count+1)throw new Error('POST_RETRIED');pass(currentStep,{controlledBrowserFault:true,postCount:1});
    currentStep='uncertain-controlled';await click('Abrir conversación nueva');
    await until(`!document.body.innerText.includes('No se puede continuar esta conversación.')&&!![...document.querySelectorAll('textarea')].find(e=>e.checkVisibility({checkVisibilityCSS:true})&&!e.readOnly)`);
    emptyId=await evaluate(`new URLSearchParams(location.search).get('conversation_id')`);
    count=requestCounts.messagePosts;interceptMessage='network';await fill('Mensaje','Consulta ficticia para comprobar un envío sin confirmar.');await click('Enviar mensaje');
    await until(`document.body.innerText.includes('Resultado del envío sin confirmar')`);await click('Comprobar estado');
    await until(`document.body.innerText.includes('El turno todavía no aparece en el historial.')`);await pause(1000);
    if(requestCounts.messagePosts!==count+1)throw new Error('UNCERTAIN_POST_RETRIED');await call('Fetch.disable');await snapshot('06-uncertain');pass(currentStep,{controlledBrowserFault:true,postCount:1,stateChecked:true});
    }
    currentStep='delete-confirmation';await click('Navegar a Historial');await until(`location.pathname==='/history'&&!!document.querySelector('[aria-label="Eliminar conversación"]')`);
    const access=browserAccess!;
    const list=await (await fetch(origin+'/api/v2/conversations',{headers:{Authorization:'Bearer '+access}})).json() as any;
    if(list.conversations[0]?.conversation_id!==emptyId)throw new Error('DELETE_TARGET_NOT_OWN_NEW_TEST_CONVERSATION');
    const beforeDelete=requestCounts.deletes;acceptDialog=false;await click('Eliminar conversación');await pause(400);
    if(requestCounts.deletes!==beforeDelete)throw new Error('DELETE_WITHOUT_CONFIRMATION');
    acceptDialog=true;await click('Eliminar conversación');await pause(600);
    if(requestCounts.deletes!==beforeDelete+1)throw new Error('CONFIRMED_DELETE_MISSING');
    const deleted=await fetch(origin+'/api/v2/conversations/'+emptyId,{headers:{Authorization:'Bearer '+access}});if(deleted.status!==404)throw new Error('DELETE_NOT_EFFECTIVE');pass(currentStep,{cancelledDeleteRequests:0,confirmedDeleteRequests:1});
    currentStep='logout';await click('Cerrar sesión web');await until(`!!document.querySelector('[aria-label="Usuario"]')`);pass(currentStep);
    currentStep='protected-after-logout';await call('Page.navigate',{url:origin+'/chat?conversation_id='+conversationId});
    await until(`!!document.querySelector('[aria-label="Usuario"]')||location.pathname==='/'`);const blocked=await snapshot('07-blocked');
    if(blocked.text.includes('¿Qué temas se estudian'))throw new Error('SIGNED_OUT_CONTENT_LEAK');pass(currentStep);
    currentStep='reload-loses-session';await call('Page.navigate',{url:origin+'/login'});await until(`!!document.querySelector('[aria-label="Usuario"]')`);
    await fill('Usuario',accounts[1].uid);await fill('Contraseña',accounts[1].password);await click('Iniciar sesión');await until(`location.pathname==='/home'`);
    await call('Page.reload');await until(`!!document.querySelector('[aria-label="Usuario"]')||location.pathname==='/'`);
    const reload=await snapshot('08-reload');if(reload.localStorageKeys.length||reload.sessionStorageKeys.length)throw new Error('UNEXPECTED_BROWSER_PERSISTENCE');
    const stores=await evaluate(`(async()=>({indexedDB:(await indexedDB.databases()).length,cacheStorage:(await caches.keys()).length,cookie:document.cookie}))()`);
    if(stores.indexedDB||stores.cacheStorage||stores.cookie)throw new Error('UNEXPECTED_BROWSER_PERSISTENCE');pass(currentStep,{persistentStoresEmpty:true});
    currentStep='private-console';if(consoleText.some(text=>accounts.some(a=>text.includes(a.password))||[...accesses].some(access=>text.includes(access))||text.includes('¿Qué temas se estudian')))throw new Error('PRIVATE_CONSOLE_LEAK');pass(currentStep,{privatePayloadsObserved:0});
    report.state=process.argv.includes('--closure-only')?'CLOSURE_BROWSER_PASSED':'BROWSER_PASSED';
  }
} catch(error) {report.state='FAILED';report.failed_step=currentStep;report.error=error instanceof Error?error.message:'UNKNOWN';console.log('FAILED '+currentStep+' '+report.error);try{await snapshot('failure');}catch{}process.exitCode=1;}
finally {
  let revoked=0,alreadyInactive=0,unconfirmed=0;
  for(const access of accesses){try{
    const me=await fetch(origin+'/api/v2/auth/me',{headers:{Authorization:'Bearer '+access}});
    if(me.status===200){const ended=await fetch(origin+'/api/v2/auth/logout',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+access}});if(ended.status===204)revoked++;else unconfirmed++;}
    else if(me.status===401)alreadyInactive++;else unconfirmed++;
  }catch{unconfirmed++;/* Never retry an uncertain revocation. */}}
  if(web02){report.steps.push({name:'session-cleanup',result:unconfirmed?'FAIL':'PASS',revoked,alreadyInactive,unconfirmed});if(unconfirmed){report.state='BANUCHAT_WEB_02_PARTIAL';process.exitCode=1;}}
  if(socket?.readyState===WebSocket.OPEN){try{await call('Browser.close');}catch{}socket.close();}
  if(browser.exitCode===null)browser.kill();
  if(web02){
    await Promise.race([new Promise<void>(resolve=>{if(browser.exitCode!==null)resolve();else browser.once('exit',()=>resolve());}),pause(3000)]);
    // Delete only this run's newly created disposable profile, never a user profile.
    const relative=path.relative(path.resolve(run),path.resolve(profile));let removed=false;
    if(relative==='edge-profile'){try{await rm(profile,{recursive:true,force:true});removed=true;}catch{/* Report cleanup uncertainty without deleting other paths. */}}
    report.steps.push({name:'disposable-profile-cleanup',result:removed?'PASS':'FAIL'});
    if(!removed){report.state='BANUCHAT_WEB_02_PARTIAL';process.exitCode=1;}
  }
  await writeFile(path.join(run,'report.json'),JSON.stringify(report,null,2));
  console.log('PRIVATE_REPORT '+run);
}
