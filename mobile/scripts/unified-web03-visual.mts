import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {demoAccounts} from '../../backend/api/test/auth-i1b/accounts.ts';
import type {Browser} from './unified-web02-journey.mts';

/** Real app rendering. Chat/history use explicitly synthetic CDP responses;
 * no existing conversation or restricted document is captured or modified. */
export async function runWeb03(b:Browser,stage:'before'|'after'){
 const accounts=await demoAccounts(),pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
 const visible=`e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!e.closest('[aria-hidden="true"]')`;
 const has=(value:string)=>`document.body.innerText.includes(${JSON.stringify(value)})`;
 const key=async(value:string)=>{await b.call('Input.dispatchKeyEvent',{type:'keyDown',key:value,code:value});await b.call('Input.dispatchKeyEvent',{type:'keyUp',key:value,code:value});};
 async function menu(){if(await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[aria-label="Menú de navegación"]')].some(e=>v(e)&&e.getAttribute('aria-expanded')!=='true')})()`))await b.click('Menú de navegación');}
 async function nav(label:string,route:string){await menu();await b.click('Navegar a '+label);await b.until(`location.pathname===${JSON.stringify(route)}`);await pause(600);}
 await b.fill('Usuario',accounts[0]!.uid);await b.fill('Contraseña',accounts[0]!.password);await b.click('Iniciar sesión');await b.until(`location.pathname==='/home'&&${has('Hola,')}`);
 const response=await fetch(b.origin+'/api/v2/auth/me',{headers:{Authorization:'Bearer '+b.getAccess()!}});assert.equal(response.status,200);const me=await response.json() as any;
 const timestamp='2026-11-01T14:00:00Z',fakeId='33333333-3333-4333-8333-333333333333';let ownId='',mode:'normal'|'empty'|'long'='normal';
 const fixtureMessages=()=>mode==='empty'?[]:[
  {message_id:'11111111-1111-4111-8111-111111111111',role:'user',content:mode==='long'?'Contenido sintético para revisar texto largo: '+('una-palabra-larga-'.repeat(12)):'¿Cómo puedo organizar mi semana de estudio? Ejemplo visual sintético.',created_at:timestamp},
  {message_id:'22222222-2222-4222-8222-222222222222',role:'assistant',content:'Ejemplo visual · contenido 100 % sintético.\n\nPuedes distribuir las tareas en bloques de estudio, reservar descansos y revisar tus avances al final de la semana. Este texto solo permite evaluar la lectura, los espacios y la presentación de las fuentes; no describe una regla institucional.',created_at:timestamp,insufficient_evidence:mode==='long',citations:[{index:0,source_kind:'document',label:'Material sintético para revisión visual',locator:'section:1: Ejemplo de lectura',release_id:me.release_id,document_version_id:fakeId,artifact_url:null}]},
 ];
 let controlledPost=false,controlledError=false;
 b.setFetchHandler(async p=>{
  const url=new URL(p.request.url);
  if(p.request.method==='GET'&&/^\/api\/v2\/conversations\/[a-f0-9-]{36}$/u.test(url.pathname)){
   ownId=url.pathname.split('/').at(-1)!;
   await b.call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({conversation_id:ownId,started_at:timestamp,profile:me.profile,messages:fixtureMessages()})).toString('base64')});
  }else if(p.request.method==='GET'&&url.pathname==='/api/v2/conversations'){
   await b.call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({conversations:[0,1,2,3].map((i)=>({conversation_id:i===0?ownId:`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`,profile_key:me.profile.profile_key,started_at:`2026-11-0${i+1}T14:00:00Z`,last_message_at:timestamp,message_count:i===3?0:2+i}))})).toString('base64')});
  }else if(controlledPost&&p.request.method==='POST'&&url.pathname.endsWith('/messages')){
   controlledPost=false;await pause(6500);controlledError=true;
   await b.call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"error":{"code":"DEPENDENCY_UNAVAILABLE"}}').toString('base64')});
  }else await b.call('Fetch.continueRequest',{requestId:p.requestId});
 });
 await b.call('Fetch.enable',{patterns:[{urlPattern:b.origin+'/api/v2/conversations*',requestStage:'Request'}]});
 await b.click('Navegar a Chat');await b.click('Nueva conversación web');await b.until(`location.pathname==='/chat'&&${has('Ejemplo visual ·')}`);await b.evaluate(`window.__banuVisualFixture='/chat'`);
 const real=await fetch(b.origin+'/api/v2/conversations/'+ownId,{headers:{Authorization:'Bearer '+b.getAccess()!}});assert.equal(real.status,200);assert.equal(((await real.json()) as any).messages.length,0);
 const measurements:any[]=[];
 async function capture(name:string,width:number){
  b.setStep(stage+'-'+name+'-'+width);const shot=await b.snapshot(stage+'-'+name+'-'+width);assert.equal(shot.overflow,false,'ROOT_OVERFLOW_'+name+'_'+width);
  const metrics=await b.evaluate(`(()=>{const v=${visible},main=document.getElementById('web-main'),text=[...main.querySelectorAll('div,span')].filter(e=>v(e)&&e.children.length===0&&e.textContent.trim()),fonts=[...new Set(text.map(e=>getComputedStyle(e).fontFamily))],controls=[...document.querySelectorAll('[role="button"],[role="radio"],input,textarea')].filter(v),small=controls.filter(e=>e.getBoundingClientRect().height<43).length;return {fonts,visibleControls:controls.length,smallControls:small,mainWidth:main.getBoundingClientRect().width,rootOverflow:document.documentElement.scrollWidth>innerWidth,composer:document.querySelector('[aria-label="Mensaje"]')?{fontSize:getComputedStyle(document.querySelector('[aria-label="Mensaje"]')).fontSize,lineHeight:getComputedStyle(document.querySelector('[aria-label="Mensaje"]')).lineHeight}:null}})()`);
  measurements.push({screen:name,width,...metrics});
  await writeFile(path.join(b.run,'visual-measurements.json'),JSON.stringify({stage,syntheticChatHistory:true,screenshots:measurements.length,measurements},null,2));
  if(stage==='after'){
   assert.equal(metrics.smallControls,0,'SMALL_CONTROL_'+name);
   assert.equal(metrics.fonts.length,1,'INCONSISTENT_FONTS_'+name);
   if(name==='progress'&&width===1366){
    const widths=await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[data-testid="course-list"] > div')].filter(v).map(e=>e.getBoundingClientRect().width)})()`);
    assert.ok(widths.length>0&&widths.every((w:number)=>w>=440&&w<=480),'COURSE_GRID_WIDTH');
   }
  }
 }
 const routes=[['Inicio','/home','home'],['Progreso','/progress','progress'],['Calendario','/calendar','calendar'],['Anuncios y convocatorias','/announcements','announcements'],['Publicaciones OE2','/oe2','oe2'],['Banu al día','/oe2-changes','changes'],['Historial','/history','history']] as const;
 for(const width of [1366,768,390]){
  await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  for(const [label,route,name]of routes){await nav(label,route);if(name==='history')await b.evaluate(`window.__banuVisualFixture='/history'`);await capture(name,width);}
  await menu();await b.click('Navegar a Chat');await b.click('Volver al chat abierto');await b.until(has('Ejemplo visual ·'));await b.evaluate(`window.__banuVisualFixture='/chat'`);
  await capture('chat',width);const sourceLabel=await b.evaluate(`[...document.querySelectorAll('[aria-label^="Mostrar "][aria-label$=" fuentes"]')].find(${visible})?.getAttribute('aria-label')`);if(sourceLabel)await b.click(sourceLabel);await capture('chat-sources',width);
  if(width<1024){await menu();await capture('compact-menu',width);await key('Escape');assert.equal(await b.evaluate(`document.activeElement.getAttribute('aria-label')`),'Menú de navegación');}
 }
 mode='long';await nav('Inicio','/home');await menu();await b.click('Navegar a Chat');await b.click('Volver al chat abierto');await b.until(has('una-palabra-larga-'));await b.evaluate(`window.__banuVisualFixture='/chat'`);
 for(const width of [1366,768,390]){await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await capture('chat-long-abstention',width);}
 mode='empty';await nav('Inicio','/home');await menu();await b.click('Navegar a Chat');await b.click('Volver al chat abierto');await b.until(has('Bienvenida de Banu'));await b.evaluate(`window.__banuVisualFixture='/chat'`);
 for(const width of [1366,768,390]){await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await capture('chat-empty',width);}
 const posts=b.requestCounts.messagePosts;controlledPost=true;await b.fill('Mensaje','Mensaje sintético para revisar generación y error, bloqueado por el evaluador.');await b.click('Enviar mensaje');await b.until(has('Banu está pensando'));
 for(const width of [1366,768,390]){await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await capture('chat-generating',width);}
 await b.until(has('No fue posible obtener una respuesta'));assert.equal(controlledError,true);
 for(const width of [1366,768,390]){await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await capture('chat-error',width);}
 assert.equal(b.requestCounts.messagePosts,posts+1);await b.call('Fetch.disable');
 const final=await fetch(b.origin+'/api/v2/conversations/'+ownId,{headers:{Authorization:'Bearer '+b.getAccess()!}});assert.equal(((await final.json()) as any).messages.length,0);
 const removed=await fetch(b.origin+'/api/v2/conversations/'+ownId,{method:'DELETE',headers:{Origin:b.origin,Authorization:'Bearer '+b.getAccess()!}});assert.equal(removed.status,204);
 assert.ok(!b.consoleText.some(text=>accounts.some(account=>text.includes(account.password))||[...b.accesses].some(token=>text.includes(token))));
 await writeFile(path.join(b.run,'visual-measurements.json'),JSON.stringify({stage,syntheticChatHistory:true,screenshots:measurements.length,measurements},null,2));
 b.pass('web03-'+stage,{screenshots:measurements.length,widths:[1366,768,390],auxiliaryData:'REST real',chatHistory:'synthetic browser fixtures',backendMessagesWritten:0,controlledPostCount:1,ownEmptyConversationDeleted:true});
}
