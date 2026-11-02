// Focused UIX-04C evidence: synthetic browser API only, never backend data.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {secondaryReview} from './uix02-review.mjs';

export function interactionReview(context){
 const {id,docId,me,timestamp,pause}=context;
 const auxiliary=secondaryReview(context);
 const visible=`e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!e.closest('[aria-hidden="true"]')`;
 const bootstrap=`(()=>{const p=MediaQueryList.prototype,add=p.addEventListener,remove=p.removeEventListener,sets=new WeakMap();let active=0,adds=0,removes=0;window.__uixMotion={snapshot:()=>({active,adds,removes})};p.addEventListener=function(type,fn,...rest){if(type==='change'&&this.media.includes('prefers-reduced-motion')){let set=sets.get(this);if(!set){set=new Set();sets.set(this,set)}if(!set.has(fn)){set.add(fn);active++;adds++}}return add.call(this,type,fn,...rest)};p.removeEventListener=function(type,fn,...rest){if(type==='change'&&this.media.includes('prefers-reduced-motion')&&sets.get(this)?.delete(fn)){active--;removes++}return remove.call(this,type,fn,...rest)}})()`;
 async function fixture(request){
  const u=new URL(request.url);
  if(process.argv.includes('--scroll-stress')&&u.pathname==='/api/v2/conversations/'+id){
   const citation={index:0,source_kind:'document',label:'Documento: Guía sintética de estudio · UIX',locator:'section:1: Ejemplo sintético',release_id:id,document_version_id:docId,artifact_url:`/api/v2/documents/${docId}/artifact`};
   const ids=[id,docId,'33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
   return {code:200,body:{conversation_id:id,started_at:timestamp,profile:me.profile,messages:ids.map((message_id,n)=>({message_id,role:n%2===0?'user':'assistant',content:n%2===0?'Pregunta de prueba sintética '+n:('Respuesta sintética de revisión de scroll, sin validez institucional. ').repeat(14),created_at:timestamp,...(n%2?{insufficient_evidence:false,citations:n===1?[citation]:[]}: {})}))}};
  }
  if(u.pathname==='/api/v2/conversations'&&request.method==='POST'){
   await pause(2400);return {code:201,body:{conversation_id:id,profile_key:me.profile.profile_key,profile_alias:me.profile.alias,created_at:timestamp}};
  }
  return auxiliary.fixture(request);
 }
 async function run(b){
  const {stage,call,evaluate,until,nav,click,fill,size,capture,menu,checks}=b;
  const findings=[],metrics={};
  const live=selector=>`[...document.querySelectorAll(${JSON.stringify(selector)})].find(${visible})`;
  const check=(name,actual,expected)=>{const passed=actual===expected;findings.push({name,actual,expected,passed});if(stage==='after')assert.ok(passed,name+' '+JSON.stringify(actual));};
  async function key(key,code=key,modifiers=0){const v={Tab:9,Enter:13,Escape:27,Space:32,ArrowRight:39,ArrowLeft:37,Home:36,End:35}[code];await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,windowsVirtualKeyCode:v,...(code==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers,windowsVirtualKeyCode:v});await pause(120);}
  async function focus(label){await pause(150);assert.ok(await evaluate(`(()=>{const e=${live('[aria-label="'+label+'"]')}??[...document.querySelectorAll('[role="button"]')].find(e=>(${visible})(e)&&e.innerText.trim()===${JSON.stringify(label)});if(!e)return false;e.focus();return document.activeElement===e})()`),'FOCUS '+label);}
  async function motion(){return evaluate('window.__uixMotion.snapshot()');}
  if(process.argv.includes('--scroll-stress')){
   await size(390);await click('Abrir chat con Banu');await until(`!!${live('[aria-label="Mostrar 1 fuentes"]')}`);await pause(500);
   await evaluate(`${live('[aria-label="Mostrar 1 fuentes"]')}.scrollIntoView({block:'center'})`);await pause(300);await capture('source-before-expand',390);
   const position=await evaluate(`${live('[aria-label="Mostrar 1 fuentes"]')}.getBoundingClientRect().top`);await click('Mostrar 1 fuentes');await pause(450);
   const next=await evaluate(`${live('[aria-label="Ocultar 1 fuentes"]')}.getBoundingClientRect().top`);await capture('source-expanded',390);
   const stable=Math.abs(next-position)<8;if(stage==='after')assert.ok(stable,'SOURCE_EXPANSION_MOVED_READING_POSITION');
   await writeFile(path.resolve('.expo/uix04c/scroll-stress',stage,'scroll-report.json'),JSON.stringify({scope:'Four synthetic messages; opening sources in an older response',beforeTop:position,afterTop:next,delta:next-position,stable},null,2));checks.push('older response source expansion reading-position measurement');return;
  }
  if(process.argv.includes('--text-stress')){
   const measurements=[];
   for(const [route,name] of [['Inicio','home'],['Publicaciones OE2','oe2'],['Banu al día','changes']]){
    await nav(route);await size(360);await pause(650);
    const measure=await evaluate(`(()=>{const entries=[...document.querySelectorAll('#web-main *')].filter(e=>(${visible})(e)&&([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||e.matches('input,textarea'))).map(e=>({e,style:e.getAttribute('style'),size:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));window.__restoreText=()=>entries.forEach(({e,style})=>{if(style===null)e.removeAttribute('style');else e.setAttribute('style',style)});for(const {e,size,line} of entries){e.style.setProperty('font-size',size*1.5+'px','important');if(Number.isFinite(line))e.style.setProperty('line-height',line*1.5+'px','important')}return{elements:entries.length,scope:'CSS font/line-height stress at 150%, 360 CSS px; not an OS or screen-reader claim'}})()`);
    await capture(name+'-css-text-150',360);if(name==='home'){const gap=await evaluate(`(()=>{const c=${live('[data-testid="home-hero-cta"]')}.getBoundingClientRect(),a=${live('[data-testid="home-hero-icon"]')}.getBoundingClientRect();return a.left-c.right})()`);assert.ok(gap>=0,'ENLARGED_TEXT_CTA_OVERLAPS_BANU');measure.ctaToAvatarGap=gap;}measurements.push({name,...measure});await evaluate('window.__restoreText()');
   }
   await writeFile(path.resolve('.expo/uix04c/text-stress',stage,'text-report.json'),JSON.stringify({measurements},null,2));checks.push('actual CSS text and line-height enlarged 150% in three narrow views');return;
  }
  metrics.homeListeners=await motion();
  await size(390);await focus('Más en navegación inferior');await key(' ','Space');await capture('menu-keyboard',390);await key('Escape');
  check('Escape restores the actual bottom-menu trigger',await evaluate('document.activeElement.getAttribute("aria-label")'),'Más en navegación inferior');
  check('Bottom navigation identifies the current page',await evaluate(`${live('[aria-label="Inicio en navegación inferior"]')}.getAttribute('aria-current')`),'page');
  for(const label of ['Progreso','Calendario','Anuncios y convocatorias','Publicaciones OE2','Banu al día']){
   await nav(label);await until(`![...document.querySelectorAll('[role="progressbar"]')].filter(${visible}).length||!document.body.innerText.includes('Cargando')`);await pause(500);
   const groups=await evaluate(`[...document.querySelectorAll('[role="radiogroup"]')].filter(${visible}).map(e=>({name:e.getAttribute('aria-label'),radios:[...e.querySelectorAll('[role="radio"]')].map(r=>({label:r.getAttribute('aria-label'),checked:r.getAttribute('aria-checked'),tabIndex:r.tabIndex}))}))`);
   check(label+' named radio groups',groups.every(g=>!!g.name),true);
   const first=groups[0].radios.find(r=>r.checked==='true')??groups[0].radios[0];await focus(first.label);await key('ArrowRight');
   check(label+' ArrowRight moves selection',await evaluate(`${live('[aria-label="'+first.label+'"]')}?.getAttribute('aria-checked')`),'false');
   await key('ArrowLeft');await key('End');await key('Home');await key('Tab');await key('Tab','Tab',8);
   check(label+' one radio tab stop per group',await evaluate(`[...document.querySelectorAll('[role="radiogroup"]')].filter(${visible}).every(g=>[...g.querySelectorAll('[role="radio"]')].filter(r=>r.tabIndex===0).length===1)`),true);
   if(label==='Progreso')await capture('progress-keyboard',390);
   if(label==='Banu al día')await capture('changes-keyboard',360);
  }
  await nav('Inicio');await size(390);await focus('Abrir chat con Banu');await key(' ','Space');await until(`document.body.innerText.includes('Preparando tu conversación')`);
  check('Hero exposes busy to web accessibility',await evaluate(`${live('[aria-label="Abrir chat con Banu"]')}.getAttribute('aria-busy')`),'true');
  await until(`!!${live('[aria-label="Mensaje"]')}`);await pause(500);
  await click('Mostrar 1 fuentes');await capture('chat-sources',390);
  check('Sources expose expanded state',await evaluate(`${live('[aria-label="Ocultar 1 fuentes"]')}.getAttribute('aria-expanded')`),'true');
  await click('Abrir documento Guía sintética de estudio · UIX');await until(`document.body.innerText.includes('Documento sintético UIX-02')`);await capture('document-focus',820);await focus('Volver');await key('Enter');await pause(500);
  metrics.documentKeyboard=await evaluate(`({path:location.pathname,focused:document.activeElement?.outerHTML.slice(0,900)})`);console.log('DOCUMENT_KEYBOARD',JSON.stringify(metrics.documentKeyboard));
  check('Document return responds to Enter',metrics.documentKeyboard.path,'/chat');
  if(stage==='before'&&metrics.documentKeyboard.path==='/document')await click('Volver');
  await until(`location.pathname==='/chat'`);
  check('Chat avoids a live region on the whole transcript',await evaluate(`!!document.querySelector('[data-testid="chat-column"][aria-live]')`),false);
  // Measure native media listeners and editor responsiveness, not production FPS.
  metrics.chatListeners=await motion();await call('Performance.enable');
  const before=(await call('Performance.getMetrics')).metrics;
  const latencies=[];
  for(let n=0;n<12;n++){
   latencies.push(await evaluate(`new Promise(resolve=>{const e=${live('[aria-label="Mensaje"]')},t=performance.now();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify('Borrador sintético UIX-04C ')}+${n});e.dispatchEvent(new Event('input',{bubbles:true}));requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-t)))})`));
  }
  const after=(await call('Performance.getMetrics')).metrics;
  metrics.editor={scope:'Headless Edge, exported web bundle; 12 input events plus two rAF each. Not release/native FPS.',samplesMs:latencies,medianMs:[...latencies].sort((a,b)=>a-b)[6],taskDurationSeconds:after.find(m=>m.name==='TaskDuration').value-before.find(m=>m.name==='TaskDuration').value};
  await capture('chat-draft',390);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await pause(400);
  check('Dynamic reduced motion stops web animations',await evaluate(`document.getAnimations().filter(a=>a.playState==='running').length`),0);await capture('chat-reduced-motion',390);
  await click('Enviar mensaje');await until(`document.body.innerText.includes('Banu está pensando')`);
  check('Send exposes busy state',await evaluate(`${live('[aria-label="Enviar mensaje"]')}.getAttribute('aria-busy')`),'true');await capture('chat-loading-reduced',390);await until(`document.body.innerText.includes('No fue posible obtener una respuesta')`);await capture('chat-error',360);
  check('Error keeps the draft',await evaluate(`${live('[aria-label="Mensaje"]')}.value.startsWith('Borrador sintético UIX-04C')`),true);
  await nav('Inicio');for(const width of [1440,820,360])await capture('home',width);
  try{
   await call('Emulation.setEmulatedOSTextScale',{scale:1.5});metrics.textScale='CDP OS text scale 1.5';await capture('home-text-150',360);await nav('Publicaciones OE2');await capture('oe2-text-150',360);await call('Emulation.setEmulatedOSTextScale',{scale:1});
  }catch(error){metrics.textScale='Unavailable: '+error.message;}
  metrics.beforeLogoutListeners=await motion();await menu();await click('Cerrar sesión web');await until(`!!${live('[aria-label="Usuario"]')}`);await pause(800);metrics.loginListenersAfterPrivateUnmount=await motion();
  check('Private screens release reduced-motion listeners',metrics.loginListenersAfterPrivateUnmount.active<=3,true);
  await focus('Usuario');await key('Tab');check('Login Tab reaches password',await evaluate('document.activeElement.getAttribute("aria-label")'),'Contraseña');await key('Tab','Tab',8);check('Login Shift+Tab returns to user',await evaluate('document.activeElement.getAttribute("aria-label")'),'Usuario');
  const file=path.resolve('.expo/uix04c',stage,'interaction-report.json');await writeFile(file,JSON.stringify({stage,scope:'Intercepted synthetic API, focused keyboard/a11y/motion/performance review',findings,metrics},null,2));
  checks.push('UIX-04C focused keyboard, accessibility, dynamic motion, listener lifecycle and text scale review');
  console.log('UIX04C_INTERACTIONS '+JSON.stringify({findings,metrics}));
 }
 return {bootstrap,fixture,run};
}
