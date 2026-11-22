BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE banuchat_editorial.news
  ADD COLUMN publication_category text NOT NULL DEFAULT 'news',
  ADD CONSTRAINT editorial_publication_category_check
    CHECK (publication_category IN ('news', 'calls', 'programming')
      AND (kind = 'news' OR publication_category = 'news'));

COMMIT;
