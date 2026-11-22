import type {Announcement, AnnouncementsResponse, AnnouncementStatus} from '../api/announcements';
import type {Oe2Category, Oe2Response, Programming, Publication} from '../api/oe2-demo';

export const newsCategories = {all:'Todas',news:'Noticias',calls:'Convocatorias',programming:'Programación'} as const;
export const newsStatuses = {all:'Todos los estados',active:'Vigentes',upcoming:'Próximas',expired:'Finalizadas'} as const;
export type NewsCategory = keyof typeof newsCategories;
export type NewsStatus = keyof typeof newsStatuses;
export type NewsSource = 'announcements' | Oe2Category;
export type NewsOrigin =
  | {kind:'editorial'|'catalog'; releaseId:string; record:Announcement}
  | {kind:'oe2'; releaseId:string; record:Publication|Programming};
export type NewsItem = {
  key:string;
  category:Oe2Category;
  status:AnnouncementStatus;
  title:string;
  description?:string;
  starts:string;
  ends:string|null;
  publishedAt?:string;
  programming?:Programming;
  editorialKey?:string;
  origins:NewsOrigin[];
};

const normalize = (text:string) => text.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es').replace(/\s+/gu,' ').trim();

export function newsExcerpt(text:string) {
  const words = text.trim().split(/\s+/u);
  const limit = Math.min(22, Math.max(1, Math.ceil(words.length / 2)));
  if (words.length === 1 && [...text].length <= 28) return undefined;
  const excerpt = [...words.slice(0,limit).join(' ')].slice(0,138).join('').trimEnd();
  return excerpt.length < text.trim().length ? excerpt+'…' : undefined;
}

export function announcementsToNews(feed:AnnouncementsResponse):NewsItem[] {
  return feed.announcements.map(record=>{
    const editorial = /^editorial-(?:(?:image|file)-)*[0-9a-f-]{36}$/u.test(record.announcement_key);
    const isCall = /^convocatoria\b/u.test(normalize(record.title)) ||
      /^convocatoria\b/u.test(normalize(record.description));
    return {
      key:'announcements:'+record.announcement_key,
      category:isCall?'calls':'news',
      title:record.title,
      description:record.description,
      starts:record.valid_from,
      ends:record.valid_until,
      status:record.temporal_status,
      editorialKey:editorial?record.announcement_key:undefined,
      origins:[{kind:editorial?'editorial':'catalog',releaseId:feed.release_id,record}],
    };
  });
}

export function oe2ToNews(feed:Oe2Response, category:Oe2Category):NewsItem[] {
  return (feed.programming??feed.announcements??[]).map(record=>{
    const programming = 'course_code' in record ? record : undefined;
    const status = record.temporal_status;
    return {
      key:'oe2:'+category+':'+record.id,category,title:record.title,
      description:'description' in record ? record.description : undefined,
      starts:'start_date' in record ? record.start_date : record.valid_from,
      ends:'end_date' in record ? record.end_date : record.valid_until,
      status:status==='upcoming'?'upcoming':status==='finished'||status==='expired'?'expired':'active',
      publishedAt:record.source.published_at,programming,
      origins:[{kind:'oe2',releaseId:feed.release_id,record}],
    };
  });
}

function fingerprint(item:NewsItem) {
  if (!item.description) return undefined;
  return JSON.stringify([normalize(item.title),normalize(item.description),Date.parse(item.starts),item.ends===null?null:Date.parse(item.ends)]);
}

const originKey = (origin:NewsOrigin) => JSON.stringify([origin.kind,origin.releaseId,
  origin.kind==='oe2'?origin.record.id:origin.record.announcement_key]);

export function mergeNews(sources:NewsItem[][]):NewsItem[] {
  const items = new Map<string,NewsItem>();
  const content = new Map<string,string>();
  for (const item of sources.flat()) {
    const match = fingerprint(item);
    const key = (match ? content.get(match) : undefined) ?? item.key;
    const prior = items.get(key);
    if (!prior) {
      items.set(key,item);
      if (match) content.set(match,key);
      continue;
    }
    const priorKeys = new Set(prior.origins.map(originKey));
    const added = item.origins.filter(origin=>!priorKeys.has(originKey(origin)));
    if (!added.length) continue;
    const presentation = item.editorialKey&&!prior.editorialKey ? item : prior;
    const classified = item.origins.some(origin=>origin.kind==='oe2') ? item : prior;
    items.set(key,{...presentation,key,category:classified.category,publishedAt:prior.publishedAt??item.publishedAt,
      origins:[...prior.origins,...added]});
  }
  return [...items.values()].sort((a,b)=>b.starts.localeCompare(a.starts)||a.title.localeCompare(b.title,'es'));
}

export function filterNews(items:NewsItem[], category:NewsCategory, status:NewsStatus, query:string) {
  const words = normalize(query).split(' ').filter(Boolean);
  return items.filter(item=>{
    if (category!=='all' && item.category!==category || status!=='all' && item.status!==status) return false;
    const course = item.programming;
    const text = normalize([item.title,item.description,course?.course_code,course?.period,course?.mode].join(' '));
    return words.every(word=>text.includes(word));
  });
}
