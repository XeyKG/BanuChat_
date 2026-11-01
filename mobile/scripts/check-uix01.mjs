// UI-only browser evidence. Every API call is intercepted in this disposable tab.
// Never reads credentials, connects to backend, or changes demo data.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {secondaryReview} from './uix02-review.mjs';

const stage = process.argv[2];
assert.ok(['before', 'after'].includes(stage), 'Use before or after');
const secondary=process.argv.includes('--secondary');
const root = path.resolve(secondary?'.expo/uix02':'.expo/uix01'), run = path.join(root, stage);
await mkdir(run, {recursive:true});
const profile = path.join(root, 'edge-' + randomUUID());
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-extensions',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir='+profile, 'about:blank',
], {windowsHide:true,stdio:'ignore'});
const pause = ms => new Promise(r=>setTimeout(r,ms));
const origin='http://127.0.0.1:8085', id='11111111-1111-4111-8111-111111111111', docId='22222222-2222-4222-8222-222222222222';
const timestamp='2026-11-01T14:00:00Z', expires='2035-01-01T00:00:00Z';
const me={principal_id:id,session_id:id,synthetic_uid:'U08000001',session_expires_at:expires,release_id:id,evidence_mode:'ccd_local',profile:{profile_key:'uix-fixture',alias:'Perfil de prueba UIX'},capabilities:['chat','history','progress','calendar','announcements','documents']};
const tokenPair={access_token:'A'.repeat(43),refresh_token:'B'.repeat(42)+'A',token_type:'Bearer',expires_in:900,session_expires_at:expires};
const citation={index:0,source_kind:'document',label:'Documento: Guía sintética de estudio · UIX',locator:'section:1: Orientación de ejemplo',release_id:id,document_version_id:docId,artifact_url:`/api/v2/documents/${docId}/artifact`};
const normalMessages=[{message_id:id,role:'user',content:'¿Cómo puedo organizar mi semana de estudio? Ejemplo sintético UIX.',created_at:timestamp},{message_id:docId,role:'assistant',content:'Ejemplo visual · contenido 100 % sintético.\n\nOrganiza las tareas en bloques de estudio y reserva un momento para revisar tus avances. Puedes consultar las fuentes de esta respuesta para ampliar la información.\n\nEste texto solo permite evaluar la interfaz; no describe una regla institucional.',created_at:timestamp,insufficient_evidence:false,citations:[citation]}];
const review=secondary?secondaryReview({id,docId,me,timestamp,pause}):null;
let mode='normal', loginFault=0, messageFault=0, sequence=0, socket, postCount=0, escapedApi=0;
const pending=new Map(), shots=[], checks=[], errors=[];
async function call(method,params={}){const key=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(key);reject(Error('CDP_TIMEOUT '+method));},30000);pending.set(key,{resolve,reject,timer});socket.send(JSON.stringify({id:key,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error('BROWSER_EXPRESSION '+r.exceptionDetails.text);return r.result.value;}
const visible=`e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!e.closest('[aria-hidden="true"]')`;
async function until(expression){const end=Date.now()+20000;while(Date.now()<end){if(await evaluate(expression))return;await pause(100);}throw Error('UI_TIMEOUT '+expression);}
async function click(label){assert.ok(await evaluate(`(()=>{const v=${visible};const e=[...document.querySelectorAll('[aria-label]')].find(e=>v(e)&&e.getAttribute('aria-label')===${JSON.stringify(label)})??[...document.querySelectorAll('[role="button"]')].find(e=>v(e)&&e.innerText.trim()===${JSON.stringify(label)});if(!e)return false;e.click();return true;})()`),'BUTTON '+label);await pause(150);}
async function fill(label,value){assert.ok(await evaluate(`(()=>{const e=[...document.querySelectorAll('input,textarea')].find(e=>(${visible})(e)&&e.getAttribute('aria-label')===${JSON.stringify(label)});if(!e)return false;const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`));await pause(100);}
async function key(key){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});}
async function menu(){if(await evaluate(`(()=>{const e=document.querySelector('[aria-label="Menú de navegación"]');return e&&e.getAttribute('aria-expanded')!=='true'})()`))await click('Menú de navegación');}
async function nav(label){await menu();await click('Navegar a '+label);await pause(650);}
async function size(width){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(200);}
async function capture(name,width){await size(width);await pause(800);const metrics=await evaluate(`(()=>{const v=${visible},controls=[...document.querySelectorAll('[role="button"],[role="radio"],input,textarea')].filter(v);return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,smallControls:controls.filter(e=>e.getBoundingClientRect().height<43).map(e=>e.getAttribute('aria-label')||e.textContent),horizontalScroll:[...document.querySelectorAll('[data-testid="chat-assistant"],[data-testid="chat-user"]')].filter(v).some(e=>e.scrollWidth>e.clientWidth+1)}})()`);assert.equal(metrics.overflow,false,name+' root overflow');assert.equal(metrics.horizontalScroll,false,name+' message overflow');assert.deepEqual(metrics.smallControls,[],name+' small controls');if(stage==='after'&&name==='login'&&width===1366){assert.ok(await evaluate(`(()=>{const frame=document.querySelector('[data-testid="login-layout"]').getBoundingClientRect(),story=document.querySelector('[data-testid="login-story"]').getBoundingClientRect();return Math.abs(story.height-frame.height)<3;})()`),'LOGIN_PANEL_HEIGHT');}const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=name+'-'+width+'.png';await writeFile(path.join(run,file),Buffer.from(shot.data,'base64'));shots.push({name,file,...metrics});}
async function fixtures(p){const {requestId,request}=p,u=new URL(request.url);let code=200,body;
  const override=await review?.fixture(request);
  if(override){await call('Fetch.fulfillRequest',{requestId,responseCode:override.code,responseHeaders:[{name:'Content-Type',value:override.contentType??'application/json'}],body:Buffer.from(override.contentType?override.body:JSON.stringify(override.body)).toString('base64')});return;}
  if(u.pathname.endsWith('/auth/login')){code=loginFault||200;loginFault=0;body=code===200?tokenPair:{error:{code:'INVALID_CREDENTIALS'}};}
  else if(u.pathname.endsWith('/auth/me'))body=me;
  else if(u.pathname.endsWith('/auth/logout'))code=204;
  else if(u.pathname==='/api/v2/conversations'&&request.method==='POST'){code=201;body={conversation_id:id,profile_key:me.profile.profile_key,profile_alias:me.profile.alias,created_at:timestamp};}
  else if(u.pathname.endsWith('/messages')){postCount++;await pause(2500);code=messageFault||503;messageFault=0;body={error:{code:code===409?'CONFLICT':'DEPENDENCY_UNAVAILABLE'}};}
  else if(u.pathname==='/api/v2/conversations')body={conversations:[{conversation_id:id,profile_key:me.profile.profile_key,started_at:timestamp,last_message_at:timestamp,message_count:2}]};
  else if(u.pathname==='/api/v2/conversations/'+id)body={conversation_id:id,started_at:timestamp,profile:me.profile,messages:mode==='empty'?[]:mode==='long'?normalMessages.map(m=>({...m,content:m.content+'\n\n'+('palabralargasinseparadores'.repeat(18)),...(m.role==='assistant'?{insufficient_evidence:true}:{})})):normalMessages};
  else if(u.pathname.endsWith('/artifact')){await call('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/markdown; charset=utf-8'}],body:Buffer.from('# Documento sintético UIX\n\nTexto de prueba seleccionable. No contiene documentos CCD.').toString('base64')});return;}
  else if(u.pathname.endsWith('/me/progress'))body={release_id:id,profile:me.profile,courses:[{course_key:'uix-study',course_name:'Curso sintético para revisión UIX',status:'in_progress',progress_percent:37,started_at:timestamp,completed_at:null}]};
  else if(u.pathname.endsWith('/calendar/events'))body={release_id:id,events:[]};
  else if(u.pathname==='/api/v2/announcements')body={release_id:id,reference_time:timestamp,announcements:[]};
  else {code=503;body={error:{code:'DEPENDENCY_UNAVAILABLE'}};}
  await call('Fetch.fulfillRequest',{requestId,responseCode:code,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],...(code===204?{}:{body:Buffer.from(JSON.stringify(body)).toString('base64')})});
}
try{
 let port;for(let n=0;n<80;n++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(100);}}
 assert.ok(port,'EDGE_NOT_STARTED');const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=e=>{const d=JSON.parse(String(e.data));if(d.id){const p=pending.get(d.id);if(p){clearTimeout(p.timer);pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}}else if(d.method==='Fetch.requestPaused')void fixtures(d.params).catch(e=>errors.push(String(e)));else if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);else if(d.method==='Network.responseReceived'&&d.params.response.url.includes('/api/')&&!d.params.response.fromServiceWorker&&d.params.response.remoteIPAddress)escapedApi++;};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Fetch.enable',{patterns:[{urlPattern:origin+'/api/*',requestStage:'Request'}]});
 await size(1366);await call('Page.navigate',{url:origin+'/login'});await until(`!!document.querySelector('[aria-label="Usuario"]')`);
 for(const w of [1366,768,390])await capture('login',w);
 await fill('Usuario',me.synthetic_uid);await fill('Contraseña','Solo UIX sintético');loginFault=401;await click('Iniciar sesión');await until(`document.body.innerText.includes('Usuario o contraseña inválidos.')`);await capture('login-error',390);checks.push('login rejected credentials');
 await fill('Contraseña','Solo UIX sintético');await click('Iniciar sesión');await until(`location.pathname==='/home'`);
 if(review){await review.run({nav,capture,size,click,until,evaluate,key,call,menu,checks,stage});}else{
 for(const w of [1366,768,390])await capture('home',w);
 await click('Abrir chat con Banu');await until(`document.body.innerText.includes('Ejemplo visual ·')`);
 for(const w of [1366,768,390]){await capture('chat',w);await click('Mostrar 1 fuentes');await capture('sources',w);await click('Ocultar 1 fuentes');}
 await click('Mostrar 1 fuentes');await click('Abrir documento Guía sintética de estudio · UIX');await until(`document.body.innerText.includes('Texto de prueba seleccionable')`);await capture('document',390);checks.push('open synthetic source viewer');
 await nav('Inicio');await menu();await click('Navegar a Chat');await click('Volver al chat abierto');await until(`!!document.querySelector('[aria-label="Mensaje"]')`);
 await fill('Mensaje','Borrador UIX conservado');await nav('Inicio');await size(1366);await click('Navegar a Chat');await click('Volver al chat abierto');await until(`document.querySelector('[aria-label="Mensaje"]')?.value==='Borrador UIX conservado'`);checks.push('draft survives navigation and resize');
 for(const [label,name] of [['Historial','history'],['Progreso','progress'],['Calendario','calendar-empty'],['Anuncios y convocatorias','announcements-empty'],['Publicaciones OE2','oe2-error'],['Banu al día','changes-error']]){await nav(label);for(const w of [1366,768,390])await capture(name,w);await size(1366);}
 mode='long';await nav('Inicio');await click('Navegar a Chat');await click('Volver al chat abierto');await until(`document.body.innerText.includes('palabralargasinseparadores')`);for(const w of [1366,768,390])await capture('long-abstention',w);
 mode='empty';await nav('Inicio');await menu();await click('Navegar a Chat');await click('Volver al chat abierto');await until(`document.body.innerText.includes('Bienvenida de Banu')`);for(const w of [1366,768,390])await capture('chat-empty',w);
 const suggestion=await evaluate(`[...document.querySelectorAll('[aria-label^="Sugerencia:"]')].find(${visible}).getAttribute('aria-label')`);await click(suggestion);assert.ok(await evaluate(`document.querySelector('[aria-label="Mensaje"]').value.length>0`));checks.push('suggestion populates draft without sending');
 await click('Enviar mensaje');await until(`document.body.innerText.includes('Banu está pensando')`);await capture('generating',390);await until(`document.body.innerText.includes('No fue posible obtener una respuesta')`);for(const w of [1366,768,390])await capture('chat-error',w);assert.equal(postCount,1);checks.push('single intercepted POST; error retains draft');
 await size(390);await menu();await capture('menu',390);await key('Escape');assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Menú de navegación');checks.push('Escape closes compact menu and restores focus');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await nav('Inicio');await capture('reduced-motion',390);
 if(stage==='after'){assert.equal(await evaluate(`document.getAnimations().filter(a=>a.playState==='running').length`),0);checks.push('reduced motion has no running animation');}
 await evaluate(`document.querySelector('[aria-label="Menú de navegación"]').focus()`);await key('Tab');assert.ok(await evaluate(`getComputedStyle(document.activeElement).outlineWidth==='3px'`));checks.push('Tab focus visible');
 await menu();await click('Cerrar sesión web');await until(`!!document.querySelector('[aria-label="Usuario"]')`);await call('Page.navigate',{url:origin+'/history'});await until(`location.pathname==='/'||!!document.querySelector('[aria-label="Usuario"]')`);checks.push('signed-out protected route blocked');
 }
 assert.equal(escapedApi,0);assert.deepEqual(errors,[]);checks.push('all API traffic intercepted; no backend requests; no runtime exceptions');
 console.log('UIX_'+stage.toUpperCase()+'_PASSED '+shots.length+' screenshots');
}catch(e){console.log('UIX_FAILED '+e.message);process.exitCode=1;errors.push(e.message);}
finally{await writeFile(path.join(run,'report.json'),JSON.stringify({stage,scope:'UI with 100% synthetic browser-intercepted API; no backend validation',shots,checks,errors,postCount,escapedApi},null,2));if(socket?.readyState===WebSocket.OPEN){try{await call('Browser.close');}catch{}socket.close();}if(browser.exitCode===null)browser.kill();console.log('EVIDENCE '+run);}
