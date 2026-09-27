import type { ContentProfile } from '../types.js';

/** Explicit opt-in counts for this approved v1, not universal parser limits. */
export const SYNTHETIC_V1_PROFILE: ContentProfile = Object.freeze({
  dataset_key: 'banuchat-synthetic', manifest_version: '1.0.0', schema_version: '1.0.0',
  synthetic: true, timezone: 'America/Bogota', files: 18, items: 76,
  kinds: Object.freeze({ document: 12, course: 12, calendar_event: 22,
    announcement: 8, profile: 4, profile_course: 18 }),
  chunked_documents: 10, full_documents: 2,
});
