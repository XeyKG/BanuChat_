import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const task=process.argv.includes('--uix04b')?'UIX-04B':process.argv.includes('--uix04a')?'UIX-04A':process.argv.includes('--brand')?'UIX-03':process.argv.includes('--secondary')?'UIX-02':'UIX-01';
const widths=['UIX-04A','UIX-04B'].includes(task)?[1440,820,390,360]:[1366,768,390];
const root=path.resolve(task==='UIX-04B'?'.expo/uix04b':task==='UIX-04A'?'.expo/uix04a':task==='UIX-03'?'.expo/uix03':task==='UIX-02'?'.expo/uix02':'.expo/uix01');
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
if(task==='UIX-04B'){
  const visualPairs=[];
  for(const [reference,name] of [['history','history'],['progress','progress'],['calendar','calendar'],['news','announcements'],['oe2','oe2'],['changes','changes'],['document','document']])for(const width of widths){
    visualPairs.push({name,width,reference:`reference-render/${reference}-${width}.png`,app:`after/${name}-${width}.png`});
  }
  await writeFile(path.join(root,'mockup-comparison.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BanuChat · UIX-04B / referencia</title><style>body{font:16px/1.6 system-ui;background:#faf9fb;color:#24283c;margin:24px}article{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{max-width:100%;border:1px solid #e9e7ec}h2{margin-top:40px}a{color:#80265a}@media(max-width:700px){article{grid-template-columns:1fr}}</style><h1>Mockup aprobado / UIX-04B</h1><p>Referencia HTML offline y app React Native Web con API sintética interceptada. Datos y capacidades del producto conservados: no hay favoritos, publicación editorial ni recordatorios web simulados. Notificaciones es exclusiva de Android y se compara en la galería nativa.</p><a href="comparison-index.html">Antes / después</a> · <a href="android/index.html">Android físico</a>${visualPairs.map(p=>`<h2>${p.name} · ${p.width}px</h2><article><figure><figcaption>Referencia aprobada</figcaption><img loading="lazy" src="${p.reference}" alt="Mockup ${p.name}"></figure><figure><figcaption>App UIX-04B</figcaption><img loading="lazy" src="${p.app}" alt="App ${p.name}"></figure></article>`).join('')}</html>`);
  const native=[];
  for(const name of ['home-top','history','progress','calendar','announcements','oe2','changes','before-after','document','notifications']){
    const files={before:`before/${name}.png`,final:name==='document'?'after/document.png':name==='history'?'final/history-clean.png':name==='home-top'?'final/home-clean.png':`final/${name}.png`};
    const sha256={};for(const stage of ['before','final'])sha256[stage]=createHash('sha256').update(await readFile(path.join(root,'android',files[stage]))).digest('hex');native.push({name,files,sha256});
  }
  await writeFile(path.join(root,'android/comparison-manifest.json'),JSON.stringify({scope:'Physical development build only; no TalkBack or release performance claim',pairs:native},null,2));
  await writeFile(path.join(root,'android/index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BanuChat · UIX-04B Android físico</title><style>body{font:16px/1.6 system-ui;margin:24px;background:#faf9fb;color:#24283c}article{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0}img{width:100%;max-width:400px}h2{margin-top:40px}a{color:#80265a}@media(max-width:650px){article{grid-template-columns:1fr}}</style><h1>Android físico · antes / después</h1><p>Development build existente. Fuente del sistema conservada. Capturas con datos del entorno local; no acreditan TalkBack, WCAG completo ni rendimiento release. La serie limpia está en final/. El visor y su retorno usan la comprobación inicial de UIX-04B en after/; los ajustes posteriores se limitaron a estadísticas y ARIA.</p><a href="../comparison-index.html">Comparación web</a> · <a href="report.json">Resultados y límites</a>${native.map(p=>`<h2>${p.name}</h2><article>${['before','final'].map(stage=>`<figure><figcaption>${stage==='before'?'Antes':'Después'}</figcaption><img loading="lazy" src="${p.files[stage]}" alt="${p.name} ${stage}"></figure>`).join('')}</article>`).join('')}<h2>Estados y filtros finales</h2>${['changes-summary','progress-filter','calendar-filter','oe2-calls','oe2-news','notifications-details','document-return'].map(name=>`<figure><figcaption>${name}</figcaption><img loading="lazy" src="${name==='document-return'?'after':'final'}/${name}.png" alt="${name}"></figure>`).join('')}</html>`);
  const extra=after.shots.filter(shot=>!before.shots.some(previous=>previous.file===shot.file));
  await writeFile(path.join(root,'extra-states.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BanuChat · UIX-04B estados adicionales</title><style>body{font:16px/1.6 system-ui;margin:24px;background:#faf9fb;color:#24283c}img{max-width:100%;height:auto}a{color:#80265a}</style><h1>Estados adicionales UIX-04B</h1><p>API completamente interceptada; no es evidencia de servicios reales.</p><a href="comparison-index.html">Antes / después</a>${extra.map(shot=>`<h2>${shot.name} · ${shot.width}px</h2><img loading="lazy" src="after/${shot.file}" alt="${shot.name} ${shot.width}px">`).join('')}</html>`);
  console.log('UIX04B_MOCKUP_PAIRS '+visualPairs.length+' NATIVE_PAIRS '+native.length);
}
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
