-- Store login + sessions (employees)

CREATE TABLE IF NOT EXISTS store_users (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_sessions (
  id BIGSERIAL PRIMARY KEY,
  store_user_id BIGINT NOT NULL REFERENCES store_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_store_users_store_id ON store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_sessions_store_user_id ON store_sessions(store_user_id);
CREATE INDEX IF NOT EXISTS idx_store_sessions_expires_at ON store_sessions(expires_at);
