const byId = id => document.getElementById(id);
const base = '/api/v2/editorial';
const stateLabels = { draft: 'Borrador', active: 'Vigente', scheduled: 'Programada', expired: 'Vencida', archived: 'Archivada' };
const login = byId('login');
const editor = byId('editor');
const metrics = [...document.querySelectorAll('[data-filter]')];
const statusFilter = byId('state-filter');
let items = [];
let current;
let kind = 'news';
const categoryLabels = {news:'Noticia o novedad',calls:'Convocatoria',programming:'Programación de cursos'};
let previewUrl;
let savedImageUrl;
let dirty = false;
let saving = false;
const mayLeaveEditor = () => !dirty || window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?');
const normalize = text => text.normalize('NFD').replace(/\p{Mark}/gu,'').toLocaleLowerCase('es-CO');
const setDirty = value => {
 dirty = value;
 byId('changes').hidden = !value;
};
const isoParts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
const displayDate = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' });
const civil = value => value ? isoParts.format(new Date(value)).replace(' ', 'T') : '';
const outgoing = value => value ? new Date(value + '-05:00').toISOString() : null;
function visualState(item, now = Date.now()) {
 if (item.state !== 'published') return item.state;
 if (item.starts_at && Date.parse(item.starts_at) > now) return 'scheduled';
 const end=item.ends_at??(item.kind==='event'?item.starts_at:null);
 if (end && Date.parse(end) < now) return 'expired';
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
 form.querySelectorAll('button, input, select, textarea').forEach(control => { control.disabled = value; });
 form.setAttribute('aria-busy', String(value));
}
function setWorkspaceBusy(value) {
 saving = value;
 busy(editor,value);
 for (const control of ['new','news-tab','event-tab','reload','logout']) byId(control).disabled = value;
 byId('list').inert = value;
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
 setDirty(false);
 savedImageUrl = undefined;
 byId('editor-title').textContent = item ? (isEvent ? 'Editar evento' : 'Editar noticia') : (isEvent ? 'Nuevo evento' : 'Nueva noticia');
 byId('state').textContent = stateLabels[visualState(current)];
 byId('state').dataset.state = visualState(current);
 byId('title').value = current.title;
 byId('publication-category-field').hidden = isEvent;
 byId('publication-category').value = current.publication_category ?? 'news';
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
  if (current !== item) return;
  savedImageUrl = 'data:' + image.mime + ';base64,' + image.data;
  if (!byId('cover').files.length && !byId('remove-image').checked) showPreview(savedImageUrl);
 }).catch(() => { if (current === item) byId('editor-error').textContent = 'No fue posible cargar la imagen actual.'; });
 byId('attachment').value = '';
 byId('remove').checked = false;
 byId('editor-error').textContent = '';
 byId('archive').hidden = !item || current.state === 'archived';
 byId('draft').hidden = current.state === 'published';
 updatePublishLabel();
 byId('current-file').hidden = !current.file_name;
 if (current.file_name) {
  byId('file-link').href = base + '/attachments/' + current.id;
  byId('file-link').textContent = 'Descargar ' + current.file_name;
 }
 renderList();
}
function updatePublishLabel() {
 const scheduled = outgoing(byId('starts').value);
 byId('publish').textContent = current?.state === 'published' ? 'Actualizar publicación'
  : scheduled && Date.parse(scheduled) > Date.now()
   ? (kind === 'event' ? 'Programar evento' : 'Programar noticia')
   : (kind === 'event' ? 'Publicar evento' : 'Publicar noticia');
}
function renderList() {
 const list = byId('list');
 list.replaceChildren();
 const filter = statusFilter.value;
 const query = normalize(byId('search').value.trim());
 const now = Date.now();
 const entries = items.filter(item => item.kind === kind).map(item => ({item,state:visualState(item,now)}));
 const counts = {active:0,scheduled:0,expired:0,draft:0,archived:0};
 for (const {state} of entries) counts[state]++;
 for (const metric of metrics) {
  const state = metric.dataset.filter;
  metric.querySelector('strong').textContent = String(counts[state]);
  metric.setAttribute('aria-pressed', String(state === filter));
 }
 const visible = entries.filter(({item,state}) => (filter === 'all' || filter === state) &&
  (!query || normalize(item.title + ' ' + item.body).includes(query)));
 byId('list-count').textContent = `${visible.length} de ${entries.length} publicaciones`;
 if (!visible.length) {
  const empty = document.createElement('p');
  empty.className = 'empty-list';
  empty.textContent = query || filter !== 'all' ? 'Ninguna publicación coincide con la búsqueda y el estado.' : 'Aún no hay publicaciones en esta sección.';
  list.append(empty);
 }
 for (const {item,state} of visible) {
  const button = document.createElement('button');
  const title = document.createElement('span');
  const status = document.createElement('small');
  button.type = 'button';
  button.className = 'news-item';
  if (current?.id === item.id) button.setAttribute('aria-current', 'true');
  title.textContent = item.title;
  status.className = 'pill';
  status.dataset.state = state;
  status.textContent = stateLabels[state];
  button.append(title, status);
  if (item.kind === 'news') {
   const category = document.createElement('small');
   category.textContent = categoryLabels[item.publication_category] ?? categoryLabels.news;
   button.append(category);
  }
  const start=item.starts_at??item.published_at;
  if(start){
   const dates=document.createElement('small');
   dates.textContent=displayDate.format(new Date(start))+(item.ends_at?' — '+displayDate.format(new Date(item.ends_at)):'');
   button.append(dates);
  }
  button.addEventListener('click', () => {
   if (saving || current?.id === item.id || !mayLeaveEditor()) return;
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
 byId('workspace-title').focus();
}
function showLogin() {
 byId('access').hidden = false;
 byId('workspace').hidden = true;
 byId('logout').hidden = true;
 items = [];
 current = undefined;
 setDirty(false);
 savedImageUrl = undefined;
 showPreview();
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
 if(saving || !mayLeaveEditor()) return;
 try { await request('/logout', {}); showLogin(); }
 catch (error) { byId('feedback').textContent = error.message; }
});
byId('public-news').addEventListener('click', event => { if (saving || !mayLeaveEditor()) event.preventDefault(); });
window.addEventListener('beforeunload', event => {
 if (!dirty) return;
 event.preventDefault();
 event.returnValue = '';
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
 statusFilter.value='all';
 statusFilter.querySelector('[value=expired]').textContent=isEvent?'Finalizados':'Vencidas';
 byId('expired-metric').textContent = isEvent ? 'Finalizados' : 'Vencidas';
 byId('search').value = '';
 byId('feedback').textContent='';
 openEditor();
}
byId('news-tab').addEventListener('click',()=>selectKind('news'));
byId('event-tab').addEventListener('click',()=>selectKind('event'));
statusFilter.addEventListener('change',renderList);
byId('search').addEventListener('input',renderList);
for (const metric of metrics) metric.addEventListener('click', () => {
 statusFilter.value = statusFilter.value === metric.dataset.filter ? 'all' : metric.dataset.filter;
 renderList();
});
byId('reload').addEventListener('click', async () => {
 if (saving || !mayLeaveEditor()) return;
 setWorkspaceBusy(true);
 byId('feedback').textContent = 'Cargando publicaciones…';
 try {
  const {news} = await request('/news');
  items = news;
  openEditor(items.find(item => item.id === current?.id));
  byId('feedback').textContent = 'Publicaciones actualizadas.';
 } catch (error) {
  byId('feedback').textContent = error.message;
 } finally {
  setWorkspaceBusy(false);
 }
});
byId('cover').addEventListener('change',()=>{
 const file=byId('cover').files[0];
 if(file&&/^image\/(png|jpeg|webp)$/.test(file.type)&&file.size<=1024*1024)showPreview(URL.createObjectURL(file));
 else showPreview(byId('remove-image').checked ? undefined : savedImageUrl);
});
byId('remove-image').addEventListener('change',()=>{
 if(byId('remove-image').checked){byId('cover').value='';showPreview();}
 else showPreview(savedImageUrl);
});

byId('preview').addEventListener('click', () => {
 const startsAt = outgoing(byId('starts').value);
 const endsAt = outgoing(byId('ends').value);
 byId('preview-title').textContent = byId('title').value.trim() || 'Publicación sin título';
 byId('preview-category').hidden = kind === 'event';
 byId('preview-category').textContent = categoryLabels[byId('publication-category').value];
 byId('preview-text').textContent = byId('message').value.trim() || 'Aún no hay contenido.';
 byId('preview-dates').textContent = startsAt
  ? displayDate.format(new Date(startsAt)) + (endsAt ? ' — ' + displayDate.format(new Date(endsAt)) : '')
  : 'Sin fecha de inicio';
 const attachment = byId('attachment').files[0]?.name ?? (byId('remove').checked ? null : current.file_name);
 byId('preview-file').hidden = !attachment;
 byId('preview-file').textContent = attachment ? 'Adjunto · ' + attachment : '';
 const cover = byId('preview-cover');
 cover.hidden = byId('image-preview').hidden;
 if (cover.hidden) cover.removeAttribute('src');
 else cover.src = byId('image-preview').src;
 byId('preview-dialog').showModal();
});

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
 if (saving || (state !== 'archived' && !editor.reportValidity())) return;
 const item = current;
 const archiving = state === 'archived';
 setWorkspaceBusy(true);
 byId('editor-error').textContent = '';
 byId('feedback').textContent = 'Guardando…';
 try {
  const startsAt = archiving ? item.starts_at ?? null : outgoing(byId('starts').value);
  const endsAt = archiving ? item.ends_at ?? null : outgoing(byId('ends').value);
  if(endsAt&&(!startsAt||endsAt<startsAt))throw new Error('Escribe una fecha de inicio y una fecha final igual o posterior.');
  const saved = await request('/news', { id: item.id, revision: item.revision, state, kind: item.kind,
   publication_category: item.kind === 'news' ? (archiving ? item.publication_category : byId('publication-category').value) : undefined,
   title: archiving ? item.title : byId('title').value, body: archiving ? item.body : byId('message').value,
   starts_at:startsAt,ends_at:endsAt,
   attachment: archiving ? undefined : await fileForSave('attachment','remove',/\.(pdf|md)$/i,2*1024*1024,'Elige un PDF o Markdown de hasta 2 MB.'),
   image: archiving ? undefined : await fileForSave('cover','remove-image',/\.(png|jpe?g|webp)$/i,1024*1024,'Elige una imagen PNG, JPG o WebP de hasta 1 MB.') });
  items = [saved, ...items.filter(entry => entry.id !== saved.id)];
  openEditor(saved);
  byId('feedback').textContent = saveFeedback(saved);
 } catch (error) {
  byId('feedback').textContent = '';
  if (error.status === 401) { showLogin(); byId('login-error').textContent = error.message; }
  else byId('editor-error').textContent = error.message;
 } finally {
  setWorkspaceBusy(false);
 }
}
function saveFeedback(item) {
 const state = visualState(item);
 if (state === 'archived') return 'Publicación retirada.';
 if (state === 'draft') return 'Borrador guardado.';
 if (state === 'scheduled') return item.kind === 'event' ? 'Evento programado.' : 'Noticia programada.';
 if (item.kind === 'event') return 'Evento guardado en el calendario.';
 return state === 'expired' ? 'Noticia guardada en el archivo de Noticias.' : 'Noticia visible en Noticias.';
}
editor.addEventListener('submit', event => {
 event.preventDefault();
 if (editor.reportValidity() && window.confirm(`¿Confirmas la acción «${byId('publish').textContent}»?`)) void save('published');
});
editor.addEventListener('input', () => setDirty(true));
byId('starts').addEventListener('input', updatePublishLabel);
byId('draft').addEventListener('click', () => void save('draft'));
byId('archive').addEventListener('click', () => {
 if (mayLeaveEditor() && window.confirm('¿Archivar esta publicación? Dejará de aparecer en la interfaz estudiantil.')) void save('archived');
});
void request('/session').then(loadWorkspace).catch(error => {
 if (error.status !== 401) byId('login-error').textContent = error.message;
});
