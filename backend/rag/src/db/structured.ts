import type { Catalogs, ManifestItem } from '../types.js';
import type { WriterLease } from './writer-lock.js';
import { invariant } from './errors.js';
import { finishItem, provenance } from './runs.js';

// Identifiers are fixed literals. Dataset values only enter positional parameters.
export const STRUCTURED_SQL = {
  course: `INSERT INTO banuchat.courses (dataset_release_id,course_key,name,description,status,source_path,source_locator,source_sha256) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
  announcement: `INSERT INTO banuchat.announcements (dataset_release_id,announcement_key,title,description,valid_from,valid_until,source_path,source_locator,source_sha256) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
  profile: `INSERT INTO banuchat.synthetic_profiles (dataset_release_id,profile_key,alias,source_path,source_locator,source_sha256) VALUES ($1,$2,$3,$4,$5,$6)`,
  calendar_event: `INSERT INTO banuchat.calendar_events (dataset_release_id,event_key,title,description,event_type,starts_at,ends_at,course_key,announcement_key,source_path,source_locator,source_sha256) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  profile_course: `INSERT INTO banuchat.profile_courses (dataset_release_id,profile_key,course_key,status,progress_percent,started_at,completed_at,source_path,source_locator,source_sha256) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
} as const;
export function findItem(items: readonly ManifestItem[], kind: ManifestItem['kind'], key: string): ManifestItem {
  const matches = items.filter(item => item.kind === kind && item.key === key);
  invariant(matches.length === 1 && matches[0]);
  return matches[0];
}
export async function stageStructured(lease: WriterLease, release: string, run: string,
  data: Readonly<Catalogs>, items: readonly ManifestItem[]): Promise<void> {
  const write = async (kind: keyof typeof STRUCTURED_SQL, key: string, fields: unknown[]): Promise<void> => {
    const item = findItem(items, kind, key);
    await lease.transaction(async () => {
      await lease.query(STRUCTURED_SQL[kind], [release, ...fields, ...provenance(item)]);
      await finishItem(lease, run, item);
    });
  };
  for (const row of data.courses) await write('course', row.course_key, [row.course_key, row.name, row.description, row.status]);
  for (const row of data.announcements) await write('announcement', row.announcement_key,
    [row.announcement_key, row.title, row.description, row.valid_from, row.valid_until]);
  for (const row of data.profiles) await write('profile', row.profile_key, [row.profile_key, row.alias]);
  for (const row of data.events) await write('calendar_event', row.event_key,
    [row.event_key, row.title, row.description, row.event_type, row.starts_at, row.ends_at, row.course_key, row.announcement_key]);
  for (const row of data.progress) await write('profile_course', `${row.profile_key}/${row.course_key}`,
    [row.profile_key, row.course_key, row.status, row.progress_percent, row.started_at, row.completed_at]);
}
