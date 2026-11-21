const byId = id => document.getElementById(id);
const base = '/api/v2/editorial';
const stateLabels = { draft: 'Borrador', published: 'Publicada', archived: 'Archivada' };
const login = byId('login');
const editor = byId('editor');
let items = [];
let current;

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
function openEditor(item) {
 current = item ?? { id: crypto.randomUUID(), revision: 0, title: '', body: '', state: 'draft' };
 byId('editor-title').textContent = item ? 'Editar noticia' : 'Nueva noticia';
 byId('state').textContent = stateLabels[current.state];
 byId('title').value = current.title;
 byId('message').value = current.body;
 byId('attachment').value = '';
 byId('remove').checked = false;
 byId('editor-error').textContent = '';
 byId('archive').hidden = !item || current.state === 'archived';
 byId('draft').hidden = current.state === 'published';
 byId('publish').textContent = current.state === 'published' ? 'Actualizar publicación' : 'Publicar noticia';
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
 if (!items.length) {
  const empty = document.createElement('p');
  empty.textContent = 'Todavía no hay noticias. Usa Nueva noticia para crear la primera.';
  list.append(empty);
 }
 for (const item of items) {
  const button = document.createElement('button');
  const title = document.createElement('span');
  const status = document.createElement('small');
  button.type = 'button';
  button.className = 'news-item';
  button.setAttribute('aria-current', String(current?.id === item.id));
  title.textContent = item.title;
  status.textContent = stateLabels[item.state];
  button.append(title, status);
  button.addEventListener('click', () => openEditor(item));
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
 try { await request('/logout', {}); showLogin(); }
 catch (error) { byId('feedback').textContent = error.message; }
});
byId('new').addEventListener('click', () => { openEditor(); byId('title').focus(); });

async function attachmentForSave() {
 const file = byId('attachment').files[0];
 if (!file) return byId('remove').checked ? null : undefined;
 if (!file.size || file.size > 2 * 1024 * 1024 || !/\.(pdf|md)$/i.test(file.name)) throw new Error('Elige un PDF o Markdown de hasta 2 MB.');
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
 byId('list').inert = true;
 byId('editor-error').textContent = '';
 byId('feedback').textContent = 'Guardando…';
 try {
  const saved = await request('/news', { id: item.id, revision: item.revision, state,
   title: byId('title').value, body: byId('message').value, attachment: await attachmentForSave() });
  items = [saved, ...items.filter(entry => entry.id !== saved.id)];
  openEditor(saved);
  byId('feedback').textContent = state === 'published' ? 'La noticia está visible en Banu al Día.' : state === 'archived' ? 'La noticia se archivó y dejó de estar visible.' : 'Borrador guardado.';
 } catch (error) {
  byId('feedback').textContent = '';
  if (error.status === 401) { showLogin(); byId('login-error').textContent = error.message; }
  else byId('editor-error').textContent = error.message;
 } finally {
  busy(editor, false);
  byId('new').disabled = false;
  byId('list').inert = false;
 }
}
editor.addEventListener('submit', event => { event.preventDefault(); void save('published'); });
byId('draft').addEventListener('click', () => void save('draft'));
byId('archive').addEventListener('click', () => void save('archived'));
void request('/session').then(loadWorkspace).catch(error => {
 if (error.status !== 401) byId('login-error').textContent = error.message;
});
