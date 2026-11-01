import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('.expo/uix01');
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
await writeFile(path.join(root,'comparison-index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BanuChat · UIX-01 antes y después</title>
<style>body{margin:0;background:#f5f6fa;color:#101223;font:16px/1.5 system-ui}header,main{max-width:1600px;margin:auto;padding:24px}h1{font-size:28px}a{color:#2b3fc4}nav{display:flex;flex-wrap:wrap;gap:16px}section{margin:32px 0}article{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0}figcaption{font-weight:600;padding:8px}img{width:100%;height:auto;border:1px solid #d4d8e3;box-sizing:border-box}figure a:focus-visible{outline:3px solid #3b4fe0;outline-offset:3px}@media(max-width:600px){article{grid-template-columns:1fr}}</style>
<header><h1>BanuChat · UIX-01</h1><p>Antes / después · escritorio 1366, tablet 768, móvil 390 × 900. ${pairs.length} pares. Datos 100 % sintéticos interceptados en la pestaña; ninguna petición al backend.</p><nav>${[1366,768,390].map(w=>`<a href="#width-${w}">${w} px</a>`).join('')}<a href="comparison-manifest.json">Manifiesto SHA-256</a></nav></header><main>${[1366,768,390].map(w=>`<h2 id="width-${w}">${w} px</h2>${pairs.filter(p=>p.width===w).map(p=>`<section><h3>${p.name}</h3><article>${['before','after'].map(s=>`<figure><figcaption>${s==='before'?'Antes':'Después'}</figcaption><a href="${s}/${p.file}"><img loading="lazy" src="${s}/${p.file}" alt="${p.name}, ${w} px, ${s==='before'?'antes':'después'}"></a></figure>`).join('')}</article></section>`).join('')}`).join('')}</main></html>`);
console.log('COMPARISONS '+pairs.length+' '+path.join(root,'comparison-index.html'));
