import assert from 'node:assert/strict';
import {demoAccounts} from '../../backend/api/test/auth-i1b/accounts.ts';

export interface Browser {
 origin:string;run:string;skipLoginControls:boolean;privacyOnly:boolean;call:(method:string,params?:Record<string,unknown>)=>Promise<any>;
 evaluate:(expression:string)=>Promise<any>;until:(expression:string,timeout?:number)=>Promise<void>;
 click:(label:string)=>Promise<void>;fill:(label:string,value:string)=>Promise<void>;snapshot:(name:string)=>Promise<any>;
 pass:(name:string,details?:Record<string,unknown>)=>void;setStep:(name:string)=>void;
 requestCounts:{messagePosts:number;deletes:number};accesses:Set<string>;consoleText:string[];getAccess:()=>string|null;
 setDialog:(accept:boolean)=>void;setFetchHandler:(handler:(params:any)=>Promise<void>)=>unknown;
}
/** Runs in the existing WEB-01 CDP harness. No credentials or response bodies are
 * stored as evidence; only auxiliary-screen screenshots and sanitized assertions. */
export async function runWeb02(b:Browser){
 const accounts=await demoAccounts(),pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
 const visible=`e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!e.closest('[aria-hidden="true"]')`;
 const has=(text:string)=>`document.body.innerText.includes(${JSON.stringify(text)})`;
 const wait=async(text:string)=>b.until(has(text));
 const step=(name:string)=>b.setStep(name);
 const pass=(name:string,details:Record<string,unknown>={})=>b.pass(name,details);
 async function api(endpoint:string,access=b.getAccess(),method='GET'){
  const r=await fetch(b.origin+'/api/v2'+endpoint,{method,headers:{Origin:b.origin,...(access?{Authorization:'Bearer '+access}:{})}});
  assert.equal(r.status,method==='DELETE'?404:200,'REAL_API_STATUS_'+endpoint.split('?')[0]);return r.json() as Promise<any>;
 }
 async function login(index:number){await b.fill('Usuario',accounts[index]!.uid);await b.fill('Contraseña',accounts[index]!.password);await b.click('Iniciar sesión');await b.until(`location.pathname==='/home'&&${has('Hola,')}`);}
 async function menu(){if(await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[aria-label="Menú de navegación"]')].some(e=>v(e)&&e.getAttribute('aria-expanded')!=='true')})()`))await b.click('Menú de navegación');}
 async function nav(label:string,path:string){await menu();await b.click('Navegar a '+label);await b.until(`location.pathname===${JSON.stringify(path)}`);await pause(100);}
 async function keyboard(key:string,code=key){await b.call('Input.dispatchKeyEvent',{type:'keyDown',key,code,...(key==='Enter'?{text:'\r'}:{})});await b.call('Input.dispatchKeyEvent',{type:'keyUp',key,code});}
 async function assertText(text:string){await b.until(has(text));}
 async function ready(label:string){await b.until(`(()=>{const v=${visible};return ![...document.querySelectorAll('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']')].some(v)})()`);await pause(120);}
 type Fault={path:string;status?:number;body?:unknown;network?:boolean;delay?:number};let fault:Fault|null=null;
 b.setFetchHandler(async p=>{
  const url=new URL(p.request.url),current=fault;
  if(current&&url.pathname===current.path){fault=null;if(current.delay)await pause(current.delay);
   if(current.network)await b.call('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'});
   else await b.call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:current.status??503,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(JSON.stringify(current.body??{error:{code:'DEPENDENCY_UNAVAILABLE'}})).toString('base64')});
  }else await b.call('Fetch.continueRequest',{requestId:p.requestId});
 });
 async function inject(next:Fault){fault=next;await b.call('Fetch.enable',{patterns:[{urlPattern:b.origin+next.path+'*',requestStage:'Request'}]});}
 const clear=()=>b.call('Fetch.disable');
 async function privacy(conversationId:string,privateText:string){
  step('web02-reload-protection-and-privacy');await b.call('Page.reload');await b.until(`!!document.querySelector('[aria-label="Usuario"]')||location.pathname==='/'`);
  for(const route of ['/progress','/calendar','/announcements','/oe2','/oe2-changes','/chat?conversation_id='+conversationId]){await b.call('Page.navigate',{url:b.origin+route});await b.until(`!!document.querySelector('[aria-label="Usuario"]')||location.pathname==='/'`);assert.equal(await b.evaluate(has(privateText)),false);}
  assert.equal((await fetch(b.origin+'/notifications')).status,404,'WEB_NOTIFICATIONS_ROUTE_MUST_BE_ABSENT');
  const stores=await b.evaluate(`(async()=>({local:Object.keys(localStorage).length,session:Object.keys(sessionStorage).length,db:(await indexedDB.databases()).length,cache:(await caches.keys()).length,cookie:document.cookie}))()`);assert.deepEqual(stores,{local:0,session:0,db:0,cache:0,cookie:''});
  assert.ok(!b.consoleText.some(text=>accounts.some(a=>text.includes(a.password))||[...b.accesses].some(token=>text.includes(token))||text.includes(privateText)),'PRIVATE_CONSOLE_LEAK');
  pass('web02-reload-protection-and-privacy',{protectedRoutes:6,persistentStoresEmpty:true,webNotificationsStatus:404,privateConsoleLeaks:0,reloadClearsDraft:true});
 }

 step('web02-login-and-keyboard');
 if(!b.skipLoginControls){
 await b.fill('Usuario',accounts[0]!.uid);await b.fill('Contraseña','credencial incorrecta de ensayo');await b.click('Iniciar sesión');await wait('Usuario o contraseña inválidos.');
 pass('web02-invalid-credential');step('web02-login-controlled-503');
 await inject({path:'/api/v2/auth/login'});await b.fill('Contraseña',accounts[0]!.password);await b.click('Iniciar sesión');await wait('El servicio no está disponible.');await clear();
 pass('web02-login-controlled-503');step('web02-keyboard-login');await b.fill('Contraseña',accounts[0]!.password);
 }else{const account=accounts[b.privacyOnly?1:0]!;await b.fill('Usuario',account.uid);await b.fill('Contraseña',account.password);}
 await b.evaluate(`document.querySelector('[aria-label="Contraseña"]').focus()`);await keyboard('Enter');await b.until(`location.pathname==='/home'&&${has('Hola,')}`);
 const meA=await api('/auth/me');const tokenA=b.getAccess()!;
 assert.deepEqual(meA.capabilities,['chat','history','progress','calendar','announcements','documents']);
 await b.snapshot('02-home');pass('web02-login-and-keyboard',{invalidCredential:!b.skipLoginControls,controlled503:!b.skipLoginControls,keyboardSubmit:true,capabilities:meA.capabilities.length});
 if(b.privacyOnly){
  await b.click('Navegar a Chat');await b.click('Nueva conversación web');await b.until(`location.pathname==='/chat'&&!![...document.querySelectorAll('textarea')].find(e=>(${visible})(e)&&!e.readOnly)`);
  const id=await b.evaluate(`new URLSearchParams(location.search).get('conversation_id')`),draft='Borrador privado sintético para comprobar recarga.';await b.fill('Mensaje',draft);await privacy(id,draft);return;
 }

 step('web02-progress');await nav('Progreso','/progress');await ready('Cargando progreso');
 const progressA=await api('/me/progress');
 for(const course of progressA.courses){await assertText(course.course_name);await assertText(course.progress_percent+'%');}
 await assertText('Datos ficticios de demostración');
 for(const [status,label]of [['enrolled','inscritos'],['in_progress','en progreso'],['completed','completados']]){
  await b.click('Mostrar cursos '+label);await ready('Cargando progreso');const actual=await api('/me/progress?statuses='+status);
  if(!actual.courses.length)await assertText('Sin cursos');else for(const course of actual.courses)await assertText(course.course_name);
  assert.ok(actual.courses.every((c:any)=>c.status===status));
 }
 await b.click('Mostrar cursos todos');await ready('Cargando progreso');await b.snapshot('03-progress');
 await inject({path:'/api/v2/me/progress',status:503});await b.click('Mostrar cursos inscritos');await wait('No fue posible cargar el progreso');await clear();await b.click('Reintentar');await ready('Cargando progreso');
 await inject({path:'/api/v2/me/progress',status:200,body:{...progressA,courses:[]}});await b.click('Mostrar cursos todos');await wait('Sin cursos');await clear();
 await inject({path:'/api/v2/me/progress',status:200,body:progressA,delay:700});await b.click('Mostrar cursos completados');await b.until(`!!document.querySelector('[aria-label="Cargando progreso"]')`);await ready('Cargando progreso');await clear();
 pass('web02-progress',{courses:progressA.courses.length,filters:3,percentagesMatchRest:true,controlledErrorEmptyLoading:true});

 step('web02-calendar');await nav('Calendario','/calendar');await ready('Cargando calendario');
 const year=new Date().getUTCFullYear(),calendar=await api(`/calendar/events?date_from=${year}-01-01&date_to=${year}-12-31&limit=50`);
 assert.ok(calendar.events.length>0,'NO_DEMO_EVENTS_IN_YEAR');
 const first=calendar.events[0],parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(first.starts_at));
 const civil=['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');
 await b.fill('Fecha inicial del calendario',civil);await b.click('Ver 30 días');await ready('Cargando calendario');await assertText(first.title);await assertText('hora de Bogotá');
 const expectedTime=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',hour:'numeric',minute:'2-digit'}).format(new Date(first.starts_at));await assertText(expectedTime);
 for(const [kind,label]of [['course_session','sesiones'],['announcement_deadline','cierres'],['general','generales']]){await b.click('Mostrar '+label);await ready('Cargando calendario');}
 await b.click('Mostrar todos');await ready('Cargando calendario');await b.snapshot('04-calendar');
 await b.fill('Fecha inicial del calendario','2026-02-30');assert.equal(await b.evaluate(`document.querySelector('[aria-label="Fecha inicial del calendario"]').value`),'2026-02-30');await assertText('Ingresa una fecha válida');
 await b.fill('Fecha inicial del calendario','2035-01-01');await b.click('Ver 30 días');await ready('Cargando calendario');await assertText('Sin eventos');
 await inject({path:'/api/v2/calendar/events'});await b.click('Mostrar sesiones');await wait('No fue posible cargar el calendario');await clear();await b.click('Reintentar');await ready('Cargando calendario');
 pass('web02-calendar',{realEventsInYear:calendar.events.length,bogotaTime:true,civilInputValidation:true,filters:3,futureEmpty:true,controlledErrorRecovered:true});

 step('web02-announcements');await nav('Anuncios y convocatorias','/announcements');await ready('Cargando anuncios');
 for(const status of ['all','active','upcoming','expired']){const label={all:'todos',active:'vigentes',upcoming:'próximos',expired:'vencidos'}[status]!;await b.click('Mostrar anuncios '+label);await ready('Cargando anuncios');const data=await api('/announcements?temporal_status='+status);for(const row of data.announcements)await assertText(row.title);}
 await b.click('Mostrar anuncios todos');await ready('Cargando anuncios');const announcements=await api('/announcements?temporal_status=all');assert.ok(announcements.announcements.length);
 await b.fill('Buscar anuncios auxiliares',announcements.announcements[0].title.slice(0,24));await b.click('Buscar anuncios');await ready('Cargando anuncios');await assertText(announcements.announcements[0].title);
 await b.fill('Buscar anuncios auxiliares','ZZZWEB02SINRESULTADOS');await b.click('Buscar anuncios');await ready('Cargando anuncios');await assertText('Sin anuncios');
 await b.fill('Buscar anuncios auxiliares','');await b.click('Buscar anuncios');await ready('Cargando anuncios');await b.snapshot('05-announcements');
 await inject({path:'/api/v2/announcements'});await b.click('Mostrar anuncios vigentes');await wait('No fue posible cargar los anuncios');await clear();await b.click('Reintentar');await ready('Cargando anuncios');
 pass('web02-announcements',{realRows:announcements.announcements.length,filters:4,search:true,empty:true,controlledErrorRecovered:true});

 step('web02-oe2');await nav('Publicaciones OE2','/oe2');await ready('Cargando publicaciones OE2');
 const oe2=await api('/demo/oe2/programming?limit=20');assert.equal(oe2.evidence_mode,'fictional_auxiliary');assert.ok(oe2.programming.length);
 for(const row of oe2.programming){await assertText(row.title);await assertText(row.source.source_id);await assertText(row.source.source_version);const [y,m,d]=row.start_date.split('-');await assertText(`${d}/${m}/${y}`);}
 await b.fill('Buscar publicaciones OE2',oe2.programming[0].course_code);await b.click('Buscar');await ready('Cargando publicaciones OE2');await assertText(oe2.programming[0].title);
 await b.fill('Buscar publicaciones OE2','ZZZWEB02SINRESULTADOS');await b.click('Buscar');await ready('Cargando publicaciones OE2');await assertText('Sin registros');await b.click('Limpiar filtros');await ready('Cargando publicaciones OE2');
 for(const [kind,label,filters]of [['calls','Convocatorias',['Todos','Próxima','Abierta','Cerrada']],['news','Novedades',['Todos','Próxima','Publicada · sin vencimiento documentado']]] as const){
  await b.click('OE2 '+label);await ready('Cargando publicaciones OE2');const real=await api('/demo/oe2/announcements?type='+kind+'&temporal_status=all&limit=20');for(const row of real.announcements)await assertText(row.title);
  for(const f of filters){await b.click('OE2 filtro '+f);await ready('Cargando publicaciones OE2');}
 }
 await b.click('OE2 Programación');await ready('Cargando publicaciones OE2');await b.snapshot('06-oe2');
 await inject({path:'/api/v2/demo/oe2/announcements'});await b.click('OE2 Convocatorias');await wait('Fuente de demostración no disponible');await clear();await b.click('Reintentar');await ready('Cargando publicaciones OE2');await assertText('Última release publicada');
 pass('web02-oe2',{programming:oe2.programming.length,categories:3,metadata:true,search:true,civilDates:true,controlledOptionalSourceFailureRecovered:true});

 step('web02-changes');await nav('Banu al día','/oe2-changes');await ready('Comparando publicaciones OE2');const changes=await api('/demo/oe2/changes?limit=20');assert.equal(changes.comparison_status,'compared');
 // UIX-02 separates value/label visually and exposes each statistic as one
 // accessible group. Check every count against REST, not its text layout.
 for(const [key,label] of [['created','Añadidos'],['modified','Modificados'],['removed','Retirados'],['unchanged','Sin cambios']] as const){const name=label+': '+changes.counts[key];assert.equal(await b.evaluate(`[...document.querySelectorAll('[aria-label]')].some(e=>e.getAttribute('aria-label')===${JSON.stringify(name)})`),true,'CHANGE_COUNT_'+key);}
 assert.ok(changes.changes.length>0);
 await b.click('Ver Antes / Ahora');await assertText('Antes:');await assertText('Ahora:');
 for(const field of changes.changes[0].fields){if(field.before&&!field.field.endsWith('_at')&&!field.field.endsWith('_date'))await assertText(field.before);if(field.after&&!field.field.endsWith('_at')&&!field.field.endsWith('_date'))await assertText(field.after);}
 await b.snapshot('07-changes');for(const label of ['Programación','Convocatorias','Novedades','Todos']){await b.click('Información: '+label);await ready('Comparando publicaciones OE2');}
 for(const label of ['Añadido','Modificado','Retirado','Todos']){await b.click('Cambio: '+label);await ready('Comparando publicaciones OE2');}
 await inject({path:'/api/v2/demo/oe2/changes'});await b.click('Cambio: Añadido');await wait('No se pudo comparar la fuente');await clear();await b.click('Reintentar');await ready('Comparando publicaciones OE2');await assertText('Sin cambios');
 const noPrevious={...changes,comparison_status:'no_previous',previous_release_id:null,previous_published_at:null,counts:{created:0,modified:0,removed:0,unchanged:0},changes:[],matched_count:0,has_more:false};
 await inject({path:'/api/v2/demo/oe2/changes',status:200,body:noPrevious});await b.click('Cambio: Todos');await wait('Sin versión anterior comparable');await clear();await b.click('Información: Novedades');await ready('Comparando publicaciones OE2');
 pass('web02-changes',{counts:changes.counts,categories:3,changeFilters:3,beforeAfter:true,controlledNoPrevious:true,controlledOptionalFailureRecovered:true});

 step('web02-responsive-and-keyboard');
 for(const width of [1366,768,390]){
  await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(180);
  for(const [label,path]of [['Inicio','/home'],['Progreso','/progress'],['Calendario','/calendar'],['Anuncios y convocatorias','/announcements'],['Publicaciones OE2','/oe2'],['Banu al día','/oe2-changes']]){
   await nav(label,path);await pause(180);const shot=await b.snapshot('responsive-'+width+'-'+path.slice(1));assert.equal(shot.overflow,false,'ROOT_OVERFLOW_'+width+'_'+path);
   await menu();assert.equal(await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[aria-current="page"]')].filter(v).length})()`),1,'ACTIVE_SECTION');
   const compactMenu=await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[aria-label="Menú de navegación"]')].some(v)})()`);
   if(compactMenu){await keyboard('Escape');assert.equal(await b.evaluate(`document.querySelector('[aria-label="Menú de navegación"]').getAttribute('aria-expanded')`),'false');assert.equal(await b.evaluate(`document.activeElement.getAttribute('aria-label')`),'Menú de navegación');}
   else assert.equal(await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[aria-label="Navegación BanuChat"]')].some(v)})()`),true,'DESKTOP_NAVIGATION_VISIBLE');
  }
 }
 await menu();await b.evaluate(`document.querySelector('[aria-label="Navegar a Progreso"]').focus()`);await keyboard('Enter');await b.until(`location.pathname==='/progress'`);await pause(120);assert.equal(await b.evaluate(`document.activeElement.id`),'web-main');
 await keyboard('Tab');assert.ok(await b.evaluate(`document.activeElement!==document.body`));
 assert.ok(await b.evaluate(`document.activeElement.matches(':focus-visible')&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=3`),'VISIBLE_KEYBOARD_FOCUS');
 pass('web02-responsive-and-keyboard',{widths:[1366,768,390],screens:6,activeSection:true,enter:true,escapeFocus:true,tab:true,visibleFocus:true});

 step('web02-chat-draft');await b.call('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await pause(120);await b.click('Navegar a Chat');
 assert.equal(await b.evaluate(`!!document.querySelector('[aria-label="Nueva conversación web"]')`),true);await b.click('Nueva conversación web');await b.until(`location.pathname==='/chat'&&!![...document.querySelectorAll('textarea')].find(e=>(${visible})(e)&&!e.readOnly)`);
 const conversationId=await b.evaluate(`new URLSearchParams(location.search).get('conversation_id')`);const draft='Borrador ficticio WEB-02, sin enviar.';await b.fill('Mensaje',draft);
 await nav('Inicio','/home');await b.click('Navegar a Chat');await b.click('Volver al chat abierto');await b.until(`location.pathname==='/chat'`);
 assert.equal(await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[aria-label="Mensaje"]')].find(v)?.value})()`),draft,'DRAFT_LOST_AFTER_NAVIGATION');
 for(const width of [768,390,1366]){await b.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(150);assert.equal(await b.evaluate(`(()=>{const v=${visible};return [...document.querySelectorAll('[aria-label="Mensaje"]')].find(v)?.value})()`),draft,'DRAFT_LOST_ON_RESIZE');}
 const ownEmpty=await api('/conversations/'+conversationId);assert.equal(ownEmpty.messages.length,0);pass('web02-chat-draft',{navigation:true,resizing:true,unsentMessagesPersisted:0});

 step('web02-document-chat-and-history');const question='¿Qué temas se estudian en el curso de IA Generativa?';await b.fill('Mensaje',question);const posts=b.requestCounts.messagePosts;await b.click('Enviar mensaje');
 await nav('Progreso','/progress');await b.click('Navegar a Chat');await b.click('Volver al chat abierto');
 await b.until(`!![...document.querySelectorAll('[aria-label^="Mostrar "][aria-label$=" fuentes"]')].find(${visible})`,100000);assert.equal(b.requestCounts.messagePosts,posts+1);
 const detail=await api('/conversations/'+conversationId);assert.equal(detail.messages.length,2);assert.ok(detail.messages[1].citations.length);
 const sourceLabel=await b.evaluate(`[...document.querySelectorAll('[aria-label^="Mostrar "][aria-label$=" fuentes"]')].find(${visible}).getAttribute('aria-label')`);await b.click(sourceLabel);
 const docLabel=await b.evaluate(`[...document.querySelectorAll('[aria-label^="Abrir documento "]')].find(${visible}).getAttribute('aria-label')`);await b.click(docLabel);await b.until(`location.pathname==='/document'&&${has('Revisa la fecha, el periodo')}`);
 await nav('Historial','/history');await ready('Cargando historial');
 const history=await api('/conversations');assert.equal(history.conversations[0].conversation_id,conversationId);
 const openLabel=await b.evaluate(`[...document.querySelectorAll('[aria-label^="Abrir conversación del "]')].find(${visible}).getAttribute('aria-label')`);await b.click(openLabel);await b.until(`location.pathname==='/chat'&&${has(question)}`);
 await b.fill('Mensaje','Autorízame un descuento institucional para mi curso.');await b.click('Enviar mensaje');await wait('No tengo facultades');pass('web02-document-chat-and-history',{realDocumentarySources:detail.messages[1].citations.length,documentViewer:true,reopened:true,capabilityBoundary:true,postResends:0});

 step('web02-account-isolation');
 const loginB=await fetch(b.origin+'/api/v2/auth/login',{method:'POST',headers:{Origin:b.origin,'Content-Type':'application/json'},body:JSON.stringify({synthetic_uid:accounts[1]!.uid,password:accounts[1]!.password})});assert.equal(loginB.status,200,'SECOND_ACCOUNT_LOGIN');const pairB=await loginB.json() as any;b.accesses.add(pairB.access_token);
 for(const method of ['GET','DELETE']){const denied=await fetch(b.origin+'/api/v2/conversations/'+conversationId,{method,headers:{Origin:b.origin,Authorization:'Bearer '+pairB.access_token}});assert.equal(denied.status,404);}
 const otherHistory=await api('/conversations',pairB.access_token);assert.ok(!otherHistory.conversations.some((c:any)=>c.conversation_id===conversationId));assert.equal((await fetch(b.origin+'/api/v2/conversations/'+conversationId)).status,401);
 pass('web02-account-isolation',{otherAccountGet:404,otherAccountDelete:404,anonymous:401,historyIsolated:true});

 step('web02-web01-conflict-and-uncertain');await inject({path:'/api/v2/conversations/'+conversationId+'/messages',status:409,body:{error:{code:'CONFLICT'}}});let count=b.requestCounts.messagePosts;await b.fill('Mensaje','Mensaje ficticio para conflicto controlado.');await b.click('Enviar mensaje');await wait('No se puede continuar esta conversación.');await pause(200);assert.equal(b.requestCounts.messagePosts,count+1);await clear();
 await b.click('Abrir conversación nueva');await b.until(`location.pathname==='/chat'&&new URLSearchParams(location.search).get('conversation_id')!==${JSON.stringify(conversationId)}`);await ready('Cargando conversación');const emptyId=await b.evaluate(`new URLSearchParams(location.search).get('conversation_id')`);
 await inject({path:'/api/v2/conversations/'+emptyId+'/messages',network:true});count=b.requestCounts.messagePosts;await b.fill('Mensaje','Mensaje ficticio para fallo de red controlado.');await b.click('Enviar mensaje');await wait('Resultado del envío sin confirmar');await clear();
 await nav('Calendario','/calendar');await b.click('Navegar a Chat');await b.click('Volver al chat abierto');await wait('Resultado del envío sin confirmar');await b.click('Comprobar estado');await wait('El turno todavía no aparece en el historial.');assert.equal(b.requestCounts.messagePosts,count+1);
 pass('web02-web01-conflict-and-uncertain',{controlled409:true,controlledNetworkFailure:true,stateCheck:true,navigationPreservedUncertainty:true,postResends:0});

 step('web02-delete-confirmation');await nav('Historial','/history');await ready('Cargando historial');const beforeDelete=await api('/conversations');assert.equal(beforeDelete.conversations[0].conversation_id,emptyId);let deletes=b.requestCounts.deletes;b.setDialog(false);await b.click('Eliminar conversación');await pause(150);assert.equal(b.requestCounts.deletes,deletes);b.setDialog(true);await b.click('Eliminar conversación');await b.until(`document.body.innerText.includes('Historial')`);await pause(250);assert.equal(b.requestCounts.deletes,deletes+1);const removed=await fetch(b.origin+'/api/v2/conversations/'+emptyId,{headers:{Authorization:'Bearer '+b.getAccess()!}});assert.equal(removed.status,404);pass('web02-delete-confirmation',{cancelled:0,confirmed:1,onlyOwnNewEmptyConversation:true});

 step('web02-logout-and-account-switch');await b.click('Cerrar sesión web');await b.until(`!!document.querySelector('[aria-label="Usuario"]')`);assert.equal(await b.evaluate(has(question)),false);
 await login(1);await nav('Progreso','/progress');await ready('Cargando progreso');const progressB=await api('/me/progress');assert.notEqual(progressB.profile.profile_key,progressA.profile.profile_key);for(const course of progressB.courses)await assertText(course.course_name);await nav('Historial','/history');await ready('Cargando historial');assert.equal(await b.evaluate(has(question)),false);
 const tokenB=b.getAccess()!;assert.equal((await fetch(b.origin+'/api/v2/auth/logout',{method:'POST',headers:{Origin:b.origin,Authorization:'Bearer '+tokenB}})).status,204);await nav('Progreso','/progress');await b.until(`!!document.querySelector('[aria-label="Usuario"]')`);await wait('Tu sesión expiró');
 pass('web02-logout-and-account-switch',{previousContentHidden:true,progressBoundToOtherAccount:true,serverRevokedSession401:true,expiredSessionMessage:true});

 await login(0);await privacy(conversationId,question);
}
