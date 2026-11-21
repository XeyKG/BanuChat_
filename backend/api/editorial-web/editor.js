const byId = id => document.getElementById(id);
const base = '/api/v2/editorial';
const stateLabels = { draft: 'Borrador', active: 'Vigente', scheduled: 'Programada', expired: 'Vencida', archived: 'Archivada' };
const login = byId('login');
const editor = byId('editor');
let items = [];
let current;
let kind = 'news';
let previewUrl;
let dirty = false;
const mayLeaveEditor = () => !dirty || window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?');
const isoParts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
const displayDate = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' });
const civil = value => value ? isoParts.format(new Date(value)).replace(' ', 'T') : '';
const outgoing = value => value ? new Date(value + '-05:00').toISOString() : null;
function visualState(item) {
 if (item.state !== 'published') return item.state;
 if (item.starts_at && Date.parse(item.starts_at) > Date.now()) return 'scheduled';
 const end=item.ends_at??(item.kind==='event'?item.starts_at:null);
 if (end && Date.parse(end) < Date.now()) return 'expired';
 return 'active';
}

async function request(path, data) {
 const result = await fetch(base + path, data === undefined ? {} : {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
 });
 if (result.status === 204) return;
 const reply = await result.json();
 if (!result.ok) throw Object.assign(new Error(reply.message || 'No se pudo completar la operación.'), { status: result.status });
 return reply;
}
function busy(form, value) {
 form.querySelectorAll('button').forEach(button => { button.disabled = value; });
 form.setAttribute('aria-busy', String(value));
}
function showPreview(url) {
 if (previewUrl) URL.revokeObjectURL(previewUrl);
 previewUrl = url?.startsWith('blob:') ? url : undefined;
 const img = byId('image-preview');
 img.hidden = !url;
 if (url) img.src = url;
 else img.removeAttribute('src');
}
function openEditor(item) {
 const isEvent = kind === 'event';
 current = item ?? { id: crypto.randomUUID(), revision: 0, title: '', body: '', state: 'draft', kind };
 dirty = false;
 byId('editor-title').textContent = item ? (isEvent ? 'Editar evento' : 'Editar noticia') : (isEvent ? 'Nuevo evento' : 'Nueva noticia');
 byId('state').textContent = stateLabels[visualState(current)];
 byId('title').value = current.title;
 byId('message').value = current.body;
 byId('starts').value = civil(current.starts_at ?? current.published_at);
 byId('ends').value = civil(current.ends_at);
 byId('starts').required = isEvent;
 byId('dates-title').textContent = isEvent ? 'Fecha del evento' : 'Vigencia de la noticia';
 byId('starts-label').textContent = isEvent ? 'Inicio del evento' : 'Visible desde';
 byId('ends-label').textContent = isEvent ? 'Fin del evento' : 'Visible hasta';
 byId('cover').value = '';
 byId('remove-image').checked = false;
 byId('image-remove-label').hidden = !current.image_name;
 showPreview();
 if (item?.image_name) void request('/images/' + item.id).then(image => {
  if (current === item && !byId('cover').files.length && !byId('remove-image').checked) showPreview('data:' + image.mime + ';base64,' + image.data);
 }).catch(() => { if (current === item) byId('editor-error').textContent = 'No fue posible cargar la imagen actual.'; });
 byId('attachment').value = '';
 byId('remove').checked = false;
 byId('editor-error').textContent = '';
 byId('archive').hidden = !item || current.state === 'archived';
 byId('draft').hidden = current.state === 'published';
 byId('publish').textContent = current.state === 'published' ? 'Actualizar publicación' : (isEvent ? 'Publicar evento' : 'Publicar noticia');
 byId('current-file').hidden = !current.file_name;
 if (current.file_name) {
  byId('file-link').href = base + '/attachments/' + current.id;
  byId('file-link').textContent = 'Descargar ' + current.file_name;
 }
 renderList();
}
function renderList() {
 const list = byId('list');
 list.replaceChildren();
 const filter=byId('state-filter').value;
 const visible=items.filter(item=>item.kind===kind&&(filter==='all'||visualState(item)===filter));
 if (!visible.length) {
  const empty = document.createElement('p');
  empty.textContent = 'No hay publicaciones con este filtro.';
  list.append(empty);
 }
 for (const item of visible) {
  const button = document.createElement('button');
  const title = document.createElement('span');
  const status = document.createElement('small');
  button.type = 'button';
  button.className = 'news-item';
  button.setAttribute('aria-current', String(current?.id === item.id));
  title.textContent = item.title;
  status.textContent = stateLabels[visualState(item)] + (item.from_release ? ' · Publicación existente' : '');
  button.append(title, status);
  const start=item.starts_at??item.published_at;
  if(start){
   const dates=document.createElement('small');
   dates.textContent=displayDate.format(new Date(start))+(item.ends_at?' — '+displayDate.format(new Date(item.ends_at)):'');
   button.append(dates);
  }
  button.addEventListener('click', () => {
   if (current.id===item.id || !mayLeaveEditor()) return;
   openEditor(item);
   byId('editor-title').focus();
  });
  list.append(button);
 }
}
async function loadWorkspace() {
 const result = await request('/news');
 items = result.news;
 byId('access').hidden = true;
 byId('workspace').hidden = false;
 byId('logout').hidden = false;
 openEditor();
}
function showLogin() {
 byId('access').hidden = false;
 byId('workspace').hidden = true;
 byId('logout').hidden = true;
 items = [];
 current = undefined;
 dirty = false;
 editor.reset();
 byId('feedback').textContent = '';
}
login.addEventListener('submit', async event => {
 event.preventDefault();
 busy(login, true);
 byId('login-error').textContent = '';
 try {
  await request('/login', { username: byId('username').value, password: byId('password').value });
  await loadWorkspace();
 } catch (error) {
  byId('login-error').textContent = error.message;
 } finally {
  byId('password').value = '';
  busy(login, false);
 }
});
byId('logout').addEventListener('click', async () => {
 if(!mayLeaveEditor()) return;
 try { await request('/logout', {}); showLogin(); }
 catch (error) { byId('feedback').textContent = error.message; }
});
byId('new').addEventListener('click', () => { if(mayLeaveEditor()){openEditor(); byId('title').focus();} });
function selectKind(nextKind) {
 if(kind===nextKind||!mayLeaveEditor())return;
 kind = nextKind;
 const isEvent=kind==='event';
 byId('news-tab').setAttribute('aria-pressed',String(!isEvent));
 byId('event-tab').setAttribute('aria-pressed',String(isEvent));
 byId('list-title').textContent=isEvent?'Eventos':'Noticias';
 byId('new').textContent=isEvent?'Nuevo evento':'Nueva noticia';
 byId('state-filter').value='all';
 byId('state-filter').querySelector('[value=expired]').textContent=isEvent?'Finalizados':'Vencidas';
 byId('feedback').textContent='';
 openEditor();
}
byId('news-tab').addEventListener('click',()=>selectKind('news'));
byId('event-tab').addEventListener('click',()=>selectKind('event'));
byId('state-filter').addEventListener('change',renderList);
byId('cover').addEventListener('change',()=>{
 const file=byId('cover').files[0];
 if(file&&/^image\/(png|jpeg|webp)$/.test(file.type)&&file.size<=1024*1024)showPreview(URL.createObjectURL(file));
 else showPreview();
});
byId('remove-image').addEventListener('change',()=>{if(byId('remove-image').checked){byId('cover').value='';showPreview();}});

async function fileForSave(input, remove, pattern, maxBytes, message) {
 const file = byId(input).files[0];
 if (!file) return byId(remove).checked ? null : undefined;
 if (!file.size || file.size > maxBytes || !pattern.test(file.name)) throw new Error(message);
 const data = await new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  reader.readAsDataURL(file);
 });
 return { name: file.name, data };
}
async function save(state) {
 if (!editor.reportValidity()) return;
 const item = current;
 busy(editor, true);
 byId('new').disabled = true;
 byId('news-tab').disabled = true;
 byId('event-tab').disabled = true;
 byId('list').inert = true;
 byId('editor-error').textContent = '';
 byId('feedback').textContent = 'Guardando…';
 try {
  const startsAt=outgoing(byId('starts').value), endsAt=outgoing(byId('ends').value);
  if(endsAt&&(!startsAt||endsAt<startsAt))throw new Error('Escribe una fecha de inicio y una fecha final igual o posterior.');
  const saved = await request('/news', { id: item.id, revision: item.revision, state, kind: item.kind,
   title: byId('title').value, body: byId('message').value, starts_at:startsAt,ends_at:endsAt,
   attachment: await fileForSave('attachment','remove',/\.(pdf|md)$/i,2*1024*1024,'Elige un PDF o Markdown de hasta 2 MB.'),
   image: await fileForSave('cover','remove-image',/\.(png|jpe?g|webp)$/i,1024*1024,'Elige una imagen PNG, JPG o WebP de hasta 1 MB.') });
  items = [saved, ...items.filter(entry => entry.id !== saved.id)];
  openEditor(saved);
  byId('feedback').textContent = state === 'published' ? (kind==='event'?'Evento guardado en el calendario.':visualState(saved)==='scheduled'?'Noticia programada.':visualState(saved)==='expired'?'Noticia guardada en el archivo de Banu al Día.':'Noticia visible en Banu al Día.') : state === 'archived' ? 'Publicación retirada.' : 'Borrador guardado.';
 } catch (error) {
  byId('feedback').textContent = '';
  if (error.status === 401) { showLogin(); byId('login-error').textContent = error.message; }
  else byId('editor-error').textContent = error.message;
 } finally {
  busy(editor, false);
  byId('new').disabled = false;
  byId('news-tab').disabled = false;
  byId('event-tab').disabled = false;
  byId('list').inert = false;
 }
}
editor.addEventListener('submit', event => { event.preventDefault(); void save('published'); });
editor.addEventListener('input',()=>{dirty=true;});
byId('draft').addEventListener('click', () => void save('draft'));
byId('archive').addEventListener('click', () => void save('archived'));
void request('/session').then(loadWorkspace).catch(error => {
 if (error.status !== 401) byId('login-error').textContent = error.message;
});
