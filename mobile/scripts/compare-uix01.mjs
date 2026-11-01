import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const task=process.argv.includes('--uix04a')?'UIX-04A':process.argv.includes('--brand')?'UIX-03':process.argv.includes('--secondary')?'UIX-02':'UIX-01';
const widths=task==='UIX-04A'?[1440,820,390,360]:[1366,768,390];
const root=path.resolve(task==='UIX-04A'?'.expo/uix04a':task==='UIX-03'?'.expo/uix03':task==='UIX-02'?'.expo/uix02':'.expo/uix01');
const before=JSON.parse(await readFile(path.join(root,'before/report.json'),'utf8'));
const after=JSON.parse(await readFile(path.join(root,'after/report.json'),'utf8'));
assert.deepEqual(before.errors,[]);assert.deepEqual(after.errors,[]);
const pairs=[];
for(const shot of before.shots){
  const match=after.shots.find(s=>s.file===shot.file);assert.ok(match,shot.file);
  const hashes={};
  for(const stage of ['before','after'])hashes[stage]=createHash('sha256').update(await readFile(path.join(root,stage,shot.file))).digest('hex');
  pairs.push({file:shot.file,name:shot.name,width:shot.width,sha256:hashes});
}
await writeFile(path.join(root,'comparison-manifest.json'),JSON.stringify({scope:'Synthetic UI screenshots only; see reports for limits',pairs},null,2));
await writeFile(path.join(root,'comparison-index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BanuChat · ${task} antes y después</title>
<style>body{margin:0;background:#f5f6fa;color:#101223;font:16px/1.5 system-ui}header,main{max-width:1600px;margin:auto;padding:24px}h1{font-size:28px}a{color:#2b3fc4}nav{display:flex;flex-wrap:wrap;gap:16px}section{margin:32px 0}article{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0}figcaption{font-weight:600;padding:8px}img{width:100%;height:auto;border:1px solid #d4d8e3;box-sizing:border-box}figure a:focus-visible{outline:3px solid #3b4fe0;outline-offset:3px}@media(max-width:600px){article{grid-template-columns:1fr}}</style>
<header><h1>BanuChat · ${task}</h1><p>Antes / después · ${widths.join(", ")} px × 900. ${pairs.length} pares. Datos 100 % sintéticos interceptados en la pestaña; ninguna petición al backend.</p><nav>${widths.map(w=>`<a href="#width-${w}">${w} px</a>`).join('')}<a href="comparison-manifest.json">Manifiesto SHA-256</a></nav></header><main>${widths.map(w=>`<h2 id="width-${w}">${w} px</h2>${pairs.filter(p=>p.width===w).map(p=>`<section><h3>${p.name}</h3><article>${['before','after'].map(s=>`<figure><figcaption>${s==='before'?'Antes':'Después'}</figcaption><a href="${s}/${p.file}"><img loading="lazy" src="${s}/${p.file}" alt="${p.name}, ${w} px, ${s==='before'?'antes':'después'}"></a></figure>`).join('')}</article></section>`).join('')}`).join('')}</main></html>`);
console.log('COMPARISONS '+pairs.length+' '+path.join(root,'comparison-index.html'));
if(task==='UIX-04A'){
  const visualPairs=[];
  for(const name of ['login','home','chat'])for(const width of widths){
    const file=`${name}-${width}.png`,hashes={};
    for(const stage of ['reference-render','after'])hashes[stage]=createHash('sha256').update(await readFile(path.join(root,stage,file))).digest('hex');
    visualPairs.push({name,width,file,sha256:hashes});
  }
  await writeFile(path.join(root,'mockup-comparison-manifest.json'),JSON.stringify({scope:'Offline approved HTML versus real app UI with synthetic intercepted API; text/data intentionally differ',pairs:visualPairs},null,2));
  await writeFile(path.join(root,'mockup-comparison.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BanuChat · Mockup aprobado / UIX-04A</title><style>body{font:16px/1.6 system-ui;background:#faf9fb;color:#24283c;margin:24px}article{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;border:1px solid #e9e7ec}h2{margin-top:40px}a{color:#80265a}@media(max-width:700px){article{grid-template-columns:1fr}}</style><h1>Mockup aprobado / Aplicación UIX-04A</h1><p>Login, Home y Chat a los mismos tamaños. Izquierda: HTML aprobado, renderizado sin red. Derecha: app React Native Web con servicios interceptados y datos sintéticos. La autenticación, los textos, los avisos y los datos reales de la app se conservan; el HTML no es evidencia funcional.</p><a href="comparison-index.html">Antes / después de la app</a>${visualPairs.map(p=>`<h2>${p.name} · ${p.width}px</h2><article>${['reference-render','after'].map((stage,i)=>`<figure><figcaption>${i?'Aplicación UIX-04A':'Mockup aprobado'}</figcaption><a href="${stage}/${p.file}"><img loading="lazy" src="${stage}/${p.file}" alt="${p.name}, ${p.width}px, ${i?'app':'referencia'}"></a></figure>`).join('')}</article>`).join('')}</html>`);
  console.log('MOCKUP_COMPARISONS '+visualPairs.length);
}
