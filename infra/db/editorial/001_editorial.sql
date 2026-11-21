BEGIN;
CREATE SCHEMA banuchat_editorial;
REVOKE ALL ON SCHEMA banuchat_editorial FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA banuchat_editorial TO cloud_runtime;

CREATE TABLE banuchat_editorial.accounts (
  username text PRIMARY KEY CHECK (username ~ '^[a-z][a-z0-9._-]{2,63}$'),
  password_hash text NOT NULL CHECK (password_hash LIKE '$argon2id$%'),
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE banuchat_editorial.sessions (
  digest text PRIMARY KEY CHECK (digest ~ '^[0-9a-f]{64}$'),
  username text NOT NULL REFERENCES banuchat_editorial.accounts(username),
  expires_at timestamptz NOT NULL
);
CREATE INDEX editorial_session_expiry ON banuchat_editorial.sessions(expires_at);
CREATE TABLE banuchat_editorial.news (
  id uuid PRIMARY KEY,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 8000),
  state text NOT NULL CHECK (state IN ('draft','published','archived')),
  updated_by text NOT NULL REFERENCES banuchat_editorial.accounts(username),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  file_name text,
  file_bytes bytea,
  CHECK (state <> 'published' OR published_at IS NOT NULL),
  CHECK ((file_name IS NULL) = (file_bytes IS NULL)),
  CHECK (file_bytes IS NULL OR octet_length(file_bytes) BETWEEN 1 AND 2097152)
);
CREATE INDEX editorial_published_news ON banuchat_editorial.news(published_at DESC, id) WHERE state='published';
ALTER TABLE banuchat_editorial.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE banuchat_editorial.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banuchat_editorial.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY editorial_accounts_read ON banuchat_editorial.accounts FOR SELECT TO cloud_runtime USING (true);
CREATE POLICY editorial_sessions_access ON banuchat_editorial.sessions TO cloud_runtime USING (true) WITH CHECK (true);
CREATE POLICY editorial_news_access ON banuchat_editorial.news TO cloud_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON ALL TABLES IN SCHEMA banuchat_editorial FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON banuchat_editorial.accounts TO cloud_runtime;
GRANT SELECT, INSERT, DELETE ON banuchat_editorial.sessions TO cloud_runtime;
GRANT SELECT, INSERT, UPDATE ON banuchat_editorial.news TO cloud_runtime;
COMMIT;
