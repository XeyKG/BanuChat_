// Portable evidence allowlist: intercepted synthetic web data only.
// Never copies Android documents, real WEB-02 captures, credentials or browser profiles.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('.expo/uix04c'),output=path.join(root,'share');
const read=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const before=await read('before/report.json'),after=await read('after/report.json');
assert.deepEqual(before.errors,[]);assert.deepEqual(after.errors,[]);
assert.equal(after.escapedApi,0);
await mkdir(output,{recursive:true});
const sections=[];
async function pair(section,name,left,right,note=''){
 const files=[];
 for(const [index,source] of [left,right].entries()){
  const file=`${sections.length}-${index}.png`,bytes=await readFile(path.join(root,source));
  await copyFile(path.join(root,source),path.join(output,file));
  files.push({file,source,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 sections.push({section,name,note,files});
}
for(const shot of before.shots){
 assert.ok(after.shots.some(item=>item.file===shot.file),shot.file);
 await pair('Comparación general',`${shot.name} · ${shot.width} px`,`before/${shot.file}`,`after/${shot.file}`,
  shot.name.includes('text-150')?'CDP aceptó escala OS 1,5; esta emulación no prueba que el texto CSS en px haya aumentado. El estrés CSS real aparece más abajo.':'Base HEAD inicial frente al bundle final, con fixtures sintéticos iguales.');
}
for(const file of ['source-before-expand-390.png','source-expanded-390.png']){
 await pair('Fuentes y posición de lectura',file,`scroll-stress/before/${file}`,`scroll-stress/after/${file}`,
  'Reproducción focal antes/después de corregir scroll: cuatro mensajes sintéticos. Desplazamiento al expandir: −754 px → 0 px.');
}
for(const name of ['home','oe2','changes']){
 const file=`${name}-css-text-150-360.png`;
 await pair('Texto ampliado real por CSS',`${name} · 360 px · 150%`,`text-stress/iterations/01/${file}`,`text-stress/after/${file}`,
  'Izquierda: iteración de diagnóstico UIX-04C previa al ajuste de CTA/encabezado, no HEAD inicial. Derecha: final. Fuente y altura de línea multiplicadas por 1,5; no es una prueba Android.');
}
const observations={
 scope:'Only synthetic intercepted browser data. No real CCD documents or Android screenshots in this share folder.',
 interactions:await read('after/interaction-report.json'),
 sourceExpansion:{before:await read('scroll-stress/before/scroll-report.json'),after:await read('scroll-stress/after/scroll-report.json')},
 textStress:await read('text-stress/after/text-report.json'),
 limits:['Screenshots do not certify TalkBack or WCAG.','Desktop editor timing includes two requestAnimationFrame callbacks, not native FPS.','Before document Enter diagnostic used an incomplete CDP key event; it was a driver issue, not a product defect.'],
};
await writeFile(path.join(output,'observations.json'),JSON.stringify(observations,null,2));
await writeFile(path.join(output,'manifest.json'),JSON.stringify({scope:observations.scope,pairs:sections},null,2));
const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const groups=[...new Set(sections.map(item=>item.section))];
await writeFile(path.join(output,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BanuChat · UIX-04C</title>
<style>body{margin:0;background:#faf9fb;color:#24283c;font:16px/1.6 system-ui}header,main{max-width:1480px;margin:auto;padding:24px}a{color:#80265a}nav{display:flex;flex-wrap:wrap;gap:16px}article{margin:32px 0}section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0}figcaption{font-weight:700;padding:8px 0}img{width:100%;height:auto;border:1px solid #e9e7ec;box-sizing:border-box}a:focus-visible{outline:3px solid #9b326f;outline-offset:3px}h2{margin-top:48px}@media(max-width:650px){section{grid-template-columns:1fr}}</style>
<header><h1>BanuChat · UIX-04C</h1><p>Interacción y accesibilidad; diseño aprobado conservado. ${sections.length} comparaciones, con rutas relativas y datos sintéticos interceptados. Ninguna imagen de documentos CCD reales ni captura Android se incluye en esta carpeta compartible.</p><p>Web: 1440, 820, 390 y 360 px × 900. Texto CSS al 150% en 360 px. Las capturas no acreditan TalkBack ni rendimiento release.</p><nav>${groups.map((name,i)=>`<a href="#group-${i}">${escape(name)}</a>`).join('')}<a href="manifest.json">Manifiesto SHA-256</a><a href="observations.json">Mediciones y límites</a></nav></header><main>${groups.map((group,i)=>`<h2 id="group-${i}">${escape(group)}</h2>${sections.filter(item=>item.section===group).map(item=>`<article><h3>${escape(item.name)}</h3><p>${escape(item.note)}</p><section>${item.files.map((file,index)=>`<figure><figcaption>${index===0?'Antes':'Después'}</figcaption><a href="${file.file}"><img loading="lazy" src="${file.file}" alt="${escape(item.name)} · ${index===0?'antes':'después'}"></a></figure>`).join('')}</section></article>`).join('')}`).join('')}</main></html>`);
console.log(`UIX04C_PORTABLE_GALLERY ${sections.length} pairs · ${path.join(output,'index.html')}`);
