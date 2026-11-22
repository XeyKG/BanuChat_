/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {announcementsToNews,filterNews,mergeNews,newsExcerpt,oe2ToNews} from '../src/utils/news-feed';
import type {AnnouncementsResponse} from '../src/api/announcements';
import type {Oe2Response} from '../src/api/oe2-demo';

const date='2026-11-20T13:00:00Z';
const source={source_id:'demo',record_id:'versioned-1',published_at:date,source_version:'2',
  record_sha256:'a'.repeat(64),snapshot_sha256:'b'.repeat(64)};
const announcementKey='editorial-image-file-11111111-1111-4111-8111-111111111111';
const editorial:AnnouncementsResponse={release_id:'catálogo',reference_time:date,announcements:[{
  announcement_key:announcementKey,title:'Convocatoria de Analítica',
  description:'Participa en el ejercicio de lectura. Completa la guía del taller.',
  valid_from:date,valid_until:null,temporal_status:'active',
}]};
const versioned:Oe2Response={release_id:'oe2-demo',published_at:date,reference_time:date,evidence_mode:'fictional_auxiliary',
  announcements:[{id:'calls-1',type:'calls',title:'Convocatoria de Analítica',description:editorial.announcements[0].description,
    valid_from:'2026-11-20T08:00:00-05:00',valid_until:null,temporal_status:'active',source}]};

test('combines identical cross-source records while keeping both origins and editorial media',()=>{
  const primary=announcementsToNews(editorial);
  const auxiliary=oe2ToNews(versioned,'calls');
  const [record,...others]=mergeNews([primary,auxiliary,oe2ToNews(structuredClone(versioned),'calls')]);
  assert.equal(others.length,0);
  assert.equal(record.editorialKey,announcementKey);
  assert.equal(record.origins.length,2);
  assert.equal(record.origins[1].kind,'oe2');
  assert.equal(record.description,editorial.announcements[0].description);
});

test('retains recurring publications with different dates or text and searches accents, full text and course metadata',()=>{
  const rows=announcementsToNews({...editorial,announcements:[...editorial.announcements,
    {...editorial.announcements[0],announcement_key:'another',valid_from:'2026-12-02T13:00:00Z',temporal_status:'upcoming'}]});
  const programming=oe2ToNews({...versioned,announcements:undefined,programming:[{
    id:'p1',title:'Grupo práctico',course_code:'CCD-82',period:'202690',mode:'Presencial',
    start_date:'2026-10-01',end_date:'2026-10-03',temporal_status:'finished',source,
  }]},'programming');
  const news=mergeNews([rows,[],programming]);
  assert.equal(news.length,3);
  assert.equal(filterNews(news,'calls','upcoming','analitica taller').length,1);
  assert.equal(filterNews(news,'programming','expired','202690 CCD-82').length,1);
  assert.equal(filterNews(news,'programming','upcoming','').length,0);
  assert.equal(filterNews(news,'news','all','').length,0);
});

test('never exposes the complete original in an excerpt, including short bodies',()=>{
  assert.equal(newsExcerpt('Una frase pequeña.'),'Una frase…');
  assert.equal(newsExcerpt('Aviso.'),undefined);
  const body='Introducción detallada. '.repeat(50);
  const excerpt=newsExcerpt(body)!;
  assert.ok(excerpt.length<=139 && excerpt.endsWith('…'));
  assert.notEqual(excerpt,body);
});
