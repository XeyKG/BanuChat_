import type { Oe2Category, Oe2SourceContract } from './types.js';

export const OE2_SOURCES: readonly Oe2SourceContract[] = [
  {
    source_id: 'fixture-academic-offer-v1', category: 'academic_offer',
    url: 'fixture://academic-offer-v1', apparent_owner: 'BanuChat evaluation',
    content_type: 'Representative academic offer records', format: 'fixture_json',
    extraction_method: 'Strict JSON fixture parser',
    access_restrictions: 'Local evaluation only; not institutional data',
    publication_date: 'available', observed_frequency: 'Controlled by the evaluation',
    authorization_status: 'fixture_only', fixture_path: 'academic-offer.json',
  },
  {
    source_id: 'fixture-calls-v1', category: 'calls',
    url: 'fixture://calls-v1', apparent_owner: 'BanuChat evaluation',
    content_type: 'Representative call records', format: 'fixture_json',
    extraction_method: 'Strict JSON fixture parser',
    access_restrictions: 'Local evaluation only; not institutional data',
    publication_date: 'available', observed_frequency: 'Controlled by the evaluation',
    authorization_status: 'fixture_only', fixture_path: 'calls.json',
  },
  {
    source_id: 'fixture-news-v1', category: 'news',
    url: 'fixture://news-v1', apparent_owner: 'BanuChat evaluation',
    content_type: 'Representative news records', format: 'fixture_json',
    extraction_method: 'Strict JSON fixture parser',
    access_restrictions: 'Local evaluation only; not institutional data',
    publication_date: 'available', observed_frequency: 'Controlled by the evaluation',
    authorization_status: 'fixture_only', fixture_path: 'news.json',
  },
];

export function resolveOe2Source(category: Oe2Category, sourceId: string): Oe2SourceContract {
  const source = OE2_SOURCES.find(item => item.category === category && item.source_id === sourceId);
  if (source === undefined || source.authorization_status !== 'fixture_only'
    || source.format !== 'fixture_json' || source.fixture_path === undefined) {
    throw new Error('OE2_SOURCE_NOT_AUTHORIZED');
  }
  return source;
}
