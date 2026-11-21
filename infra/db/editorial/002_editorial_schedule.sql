BEGIN;
ALTER TABLE banuchat_editorial.news
  ADD COLUMN kind text NOT NULL DEFAULT 'news' CHECK (kind IN ('news','event')),
  ADD COLUMN starts_at timestamptz,
  ADD COLUMN ends_at timestamptz,
  ADD COLUMN image_name text,
  ADD COLUMN image_mime text,
  ADD COLUMN image_bytes bytea,
  ADD CONSTRAINT editorial_dates CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at >= starts_at)),
  ADD CONSTRAINT editorial_event_dates CHECK (kind <> 'event' OR starts_at IS NOT NULL),
  ADD CONSTRAINT editorial_image CHECK (
    (image_name IS NULL AND image_mime IS NULL AND image_bytes IS NULL) OR
    (image_name IS NOT NULL AND image_mime IS NOT NULL AND image_bytes IS NOT NULL
      AND image_mime IN ('image/png','image/jpeg','image/webp')
      AND octet_length(image_bytes) BETWEEN 1 AND 1048576)
  );

CREATE VIEW banuchat_editorial.base_items WITH (security_invoker=true) AS
  SELECT md5('news:'||a.dataset_release_id||':'||a.announcement_key)::uuid AS id,
         a.dataset_release_id, 'news'::text AS kind, a.announcement_key::text AS source_key,
         a.title::text AS title, a.description::text AS body, a.valid_from AS starts_at, a.valid_until AS ends_at,
         NULL::text AS event_type, NULL::text AS course_key, NULL::text AS announcement_key
  FROM banuchat.announcements a
  UNION ALL
  SELECT md5('event:'||e.dataset_release_id||':'||e.event_key)::uuid, e.dataset_release_id, 'event', e.event_key::text,
         e.title::text, e.description::text, e.starts_at, e.ends_at,
         e.event_type::text, e.course_key::text, e.announcement_key::text
  FROM banuchat.calendar_events e;

CREATE INDEX editorial_event_dates_idx ON banuchat_editorial.news(starts_at, id)
  WHERE kind='event' AND state='published';
REVOKE ALL ON banuchat_editorial.base_items FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON banuchat_editorial.base_items TO cloud_runtime;
COMMIT;
