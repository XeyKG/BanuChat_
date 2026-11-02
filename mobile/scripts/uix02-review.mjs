// Synthetic secondary-screen fixtures and review, used by the existing CDP harness.
import assert from 'node:assert/strict';

export function secondaryReview({id,docId,me,timestamp,pause,widths=[1366,768,390],uix04b=false}) {
  let state='content';
  const origin={source_id:'uix02-synthetic-source',record_id:'UIX-02',source_version:'fixture-v2',source_published_at:timestamp,observed_at:'2026-11-02T10:00:00Z'};
  const source={source_id:origin.source_id,record_id:origin.record_id,source_version:origin.source_version,published_at:timestamp,record_sha256:'a'.repeat(64),snapshot_sha256:'b'.repeat(64)};
  const envelope={release_id:id,published_at:timestamp,reference_time:timestamp,evidence_mode:'fictional_auxiliary'};
  async function fixture(request) {
    const u=new URL(request.url),p=u.pathname;
    if(p.includes('/auth/')||p.endsWith('/messages')||request.method==='POST')return null;
    const auxiliary=['/conversations','/me/progress','/calendar/events','/announcements','/demo/oe2/'];
    if(!auxiliary.some(s=>p.includes(s))&&!p.endsWith('/artifact'))return null;
    if(p==='/api/v2/conversations/'+id)return null;
    if(state==='loading')await pause(5000);
    if(state==='error')return {code:503,body:{error:{code:'DEPENDENCY_UNAVAILABLE'}}};
    const empty=state==='empty';let body;
    if(p==='/api/v2/conversations')body={conversations:empty?[]:[0,1,2].map((n)=>({conversation_id:n===0?id:`33333333-3333-4333-8333-${String(n).padStart(12,'0')}`,profile_key:me.profile.profile_key,started_at:`2026-11-0${n+1}T14:00:00Z`,last_message_at:n===2?null:timestamp,message_count:n===2?0:2+n}))};
    else if(p.endsWith('/me/progress'))body={release_id:id,profile:me.profile,courses:empty?[]:['in_progress','completed','enrolled'].map((status,n)=>({course_key:'uix02-'+n,course_name:['Herramientas digitales para el aprendizaje · ejemplo sintético UIX-02','Análisis de información de demostración','Curso sintético sin iniciar'][n],status,progress_percent:[37,100,0][n],started_at:n===2?null:timestamp,completed_at:n===1?'2026-11-02T14:00:00Z':null})).filter(c=>!u.searchParams.has('statuses')||u.searchParams.getAll('statuses').includes(c.status))};
    else if(p.endsWith('/calendar/events'))body={release_id:id,events:empty?[]:['course_session','announcement_deadline','general'].map((type,n)=>({event_key:'uix02-'+n,title:['Sesión sintética de estudio: herramientas y criterios para organizar información','Cierre de convocatoria de demostración','Encuentro general de ejemplo'][n],description:'Contenido sintético UIX-02 para revisar títulos largos, horario de Bogotá y agrupación por fecha. No es programación institucional.',event_type:type,starts_at:`2026-11-0${n<2?'2':'3'}T${n===0?'14':'16'}:00:00Z`,ends_at:null,course_key:n===0?'uix02-course':null,announcement_key:n===1?'uix02-announcement':null}))};
    else if(p==='/api/v2/announcements')body={release_id:id,reference_time:timestamp,announcements:empty?[]:[0,1,2].map(n=>({announcement_key:'uix02-'+n,title:['Convocatoria sintética para explorar herramientas de investigación y aprendizaje','Novedad sintética con descripción ampliada','Actividad de ejemplo UIX-02'][n],description:'Esta descripción es 100 % sintética. Permite revisar jerarquía, fechas y lectura prolongada en escritorio y en pantallas pequeñas. No acredita una oferta vigente.',valid_from:timestamp,valid_until:n===1?null:'2026-11-20T22:00:00Z',temporal_status:u.searchParams.get('temporal_status')==='all'?'active':u.searchParams.get('temporal_status')||'active'}))};
    else if(p.endsWith('/demo/oe2/changes')) {
      const changes=['created','modified','removed'].map((type,n)=>({id:'oe2-academic_offer-'+String(n+1).repeat(40),category:'academic_offer',change_type:type,title:['Programación añadida · ejemplo sintético','Fecha modificada · ejemplo sintético','Registro retirado · ejemplo sintético'][n],current_available:type!=='removed',previous_source:type==='created'?null:origin,current_source:type==='removed'?null:{...origin,source_version:'fixture-v3'},fields:[{field:'end_date',before:type==='created'?null:'2026-11-28',after:type==='removed'?null:'2026-12-05'}]}));
      body={evidence_mode:'fictional_auxiliary',comparison_status:state==='no_previous'?'no_previous':'compared',current_release_id:id,previous_release_id:state==='no_previous'?null:docId,current_published_at:'2026-11-02T14:00:00.000002Z',previous_published_at:state==='no_previous'?null:'2026-11-01T14:00:00.000001Z',counts:state==='no_previous'?{created:0,modified:0,removed:0,unchanged:0}:{created:1,modified:1,removed:1,unchanged:5},matched_count:empty||state==='no_previous'?0:changes.filter(c=>!u.searchParams.has('change_type')||c.change_type===u.searchParams.get('change_type')).length,has_more:false,changes:empty||state==='no_previous'?[]:changes.filter(c=>!u.searchParams.has('change_type')||c.change_type===u.searchParams.get('change_type'))};
    } else if(p.endsWith('/demo/oe2/programming'))body={...envelope,programming:empty?[]:[0,1].map(n=>({id:'uix02-programming-'+n,title:'Programación ficticia UIX-02 · herramientas digitales y aprendizaje',course_code:'UIX-02',period:'DEMO-2026',mode:'virtual',start_date:'2026-11-03',end_date:'2026-11-28',temporal_status:'upcoming',source:{...source,record_id:'UIX-'+n}}))};
    else if(p.endsWith('/demo/oe2/announcements'))body={...envelope,announcements:empty?[]:[{id:'uix02-news',type:u.searchParams.get('type')==='calls'?'calls':'news',title:'Publicación de demostración UIX-02',description:'Información sintética con procedencia y versión conservadas.',valid_from:timestamp,valid_until:u.searchParams.get('type')==='calls'?'2026-11-28T14:00:00Z':null,temporal_status:u.searchParams.get('type')==='calls'?'active':'published',source}]};
    else if(p.endsWith('/artifact'))return {code:200,contentType:'text/markdown; charset=utf-8',body:'# Documento sintético UIX-02\n\nTexto de revisión seleccionable.\n\n'+('Este material permite comprobar lectura, scroll y selección; no representa documentación CCD.\n\n'.repeat(8))+'identificadorsinespacios'.repeat(15)};
    else return null;
    return {code:200,body};
  }
  async function run(b) {
    const {nav,capture,size,click,fill,until,evaluate,key,call,menu,checks}=b;
    if(uix04b){for(const w of widths)await capture('home',w);await size(820);await capture('tablet-navigation',820);}
    const routes=[['Historial','history'],['Progreso','progress'],['Calendario','calendar'],['Anuncios y convocatorias','announcements'],['Publicaciones OE2','oe2'],['Banu al día','changes']];
    for(const [label,name] of routes){state='content';await size(1366);await nav(label);await until(`!document.body.innerText.includes('Cargando')&&!document.body.innerText.includes('Comparando publicaciones...')`);for(const w of widths)await capture(name,w);}
    await size(1366);await nav('Banu al día');await click('Ver Antes / Ahora');for(const w of widths){await size(w);await evaluate(`document.querySelector('[data-testid="change-field"]').scrollIntoView({block:'center'})`);await capture('before-after',w);}
    if(b.stage==='after'){for(const w of widths){await size(w);await evaluate(`[...document.querySelectorAll('[data-testid="source-meta"]')].find(e=>e.textContent.startsWith('Publicación actual en BanuChat:')).scrollIntoView({block:'center'})`);await capture('changes-provenance',w);}checks.push('current/previous publication IDs and dates retained at comparison footer');}
    for(const stateName of ['empty','error','loading']){state=stateName;for(const [label,name] of routes){await nav('Inicio');await size(1366);await nav(label);if(stateName==='loading')await until(`document.body.innerText.includes('Cargando')||document.body.innerText.includes('Comparando publicaciones...')`);for(const w of stateName==='loading'?[390]:widths)await capture(name+'-'+stateName,w);}}
    state='no_previous';await nav('Inicio');await nav('Banu al día');await until(`document.body.innerText.includes('Sin versión anterior comparable')`);await capture('no-previous',390);
    state='content';await size(1366);await nav('Inicio');await click('Abrir chat con Banu');await until(`document.body.innerText.includes('Ejemplo visual ·')`);await click('Mostrar 1 fuentes');await click('Abrir documento Guía sintética de estudio · UIX');await until(`document.body.innerText.includes('Documento sintético UIX-02')`);for(const w of widths)await capture('document',w);
    if(uix04b&&b.stage==='after'){
      await click('Volver');await until(`location.pathname==='/chat'`);checks.push('document Back returns to the same synthetic chat');
      state='error';await click('Abrir documento Guía sintética de estudio · UIX');await until(`document.body.innerText.includes('No fue posible abrir el documento')`);for(const w of widths)await capture('document-error',w);
      state='content';await click('Reintentar');await until(`document.body.innerText.includes('Documento sintético UIX-02')`);checks.push('document error recovers by explicit retry without changing the source version');
      await click('Volver');await until(`location.pathname==='/chat'`);state='loading';await click('Abrir documento Guía sintética de estudio · UIX');await until(`document.body.innerText.includes('Cargando documento...')`);await capture('document-loading',390);state='content';await until(`document.body.innerText.includes('Documento sintético UIX-02')`);
    }
    await size(390);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await nav('Progreso');await capture('reduced-progress',390);assert.equal(await evaluate(`document.getAnimations().filter(a=>a.playState==='running').length`),0);checks.push('reduced motion: zero running animations');
    await menu();await key('Escape');assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Menú de navegación');await key('Tab');assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineWidth`),'3px');checks.push('Escape restores menu focus; Tab has visible 3px outline');
    checks.push('fresh secondary content/loading/empty/error; all API intercepted; no backend writes');
    if(uix04b&&b.stage==='after'){
      // Expo Router retains inactive screens in the DOM. Assertions must target
      // the visible route, rather than counting controls from older screens.
      const visible=`e=>e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})&&!e.closest('[aria-hidden="true"]')`;
      const live=selector=>`[...document.querySelectorAll(${JSON.stringify(selector)})].find(${visible})`;
      state='error';await nav('Inicio');await nav('Progreso');await until(`document.body.innerText.includes('No fue posible cargar el progreso')`);
      state='content';await click('Reintentar');await until(`!!document.querySelector('[role="progressbar"]')`);
      await click('Mostrar cursos completados');await until(`${live('[aria-label="Mostrar cursos completados"]')}?.getAttribute('aria-checked')==='true'&&[...document.querySelectorAll('[role="progressbar"]')].filter(${visible}).length===1`);
      assert.equal(await evaluate(`${live('[role="progressbar"]')}.getAttribute('aria-valuenow')`),'100');checks.push('manual error recovery and completed filter preserve progress semantics');
      await nav('Calendario');await fill('Fecha inicial del calendario','2026-02-30');
      assert.equal(await evaluate(`${live('[aria-label="Ver 30 días"]')}.getAttribute('aria-disabled')`),'true');await capture('calendar-invalid-date',360);
      await fill('Fecha inicial del calendario','2026-11-01');await click('Ver 30 días');await until(`document.body.innerText.includes('2026-11-01 al 2026-11-30')`);await click('Hoy');checks.push('civil date validation; inclusive 30-day range; Today remains usable');
      await nav('Anuncios y convocatorias');await fill('Buscar anuncios auxiliares','a');assert.equal(await evaluate(`${live('[aria-label="Buscar anuncios"]')}.getAttribute('aria-disabled')`),'true');await fill('Buscar anuncios auxiliares','ejemplo');await click('Buscar anuncios');await click('Mostrar anuncios próximos');await until(`${live('[aria-label="Mostrar anuncios próximos"]')}?.getAttribute('aria-checked')==='true'`);checks.push('announcement search minimum and temporal filter retained');
      await nav('Publicaciones OE2');await click('OE2 Convocatorias');await click('OE2 filtro Abierta');await fill('Buscar publicaciones OE2','a');assert.equal(await evaluate(`${live('[aria-label="Buscar"]')}.getAttribute('aria-disabled')`),'true');await fill('Buscar publicaciones OE2','demostración');await click('Buscar');await until(`document.body.innerText.includes('Publicación de demostración UIX-02')`);await capture('oe2-calls-filter',390);
      await click('OE2 Novedades');await until(`document.body.innerText.includes('Publicación de demostración UIX-02')`);await capture('oe2-news-filter',390);checks.push('OE2 categories/status/search retain publication version and origin; fixtures are explicitly fictional');
      await nav('Banu al día');await click('Cambio: Retirado');await until(`document.body.innerText.includes('Registro retirado')`);
      assert.equal(await evaluate(`[...document.querySelectorAll('[aria-label="Ver publicación actual"]')].filter(e=>e.checkVisibility({checkVisibilityCSS:true})&&!e.closest('[aria-hidden="true"]')).length`),0);await capture('changes-removed-filter',390);checks.push('removed publication has no current-link action');
      await size(820);await nav('Inicio');
      const logout=await evaluate(`(()=>{const e=document.querySelector('[aria-label="Cerrar sesión web"]'),r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight}})()`);
      assert.ok(logout.top>=0&&logout.bottom<=logout.viewport&&logout.height>=44,'TABLET_LOGOUT_VISIBLE');await capture('tablet-logout',820);checks.push('tablet logout fully visible without scrolling at 820x900');
    }
  }
  return {fixture,run};
}
