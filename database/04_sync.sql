CREATE TABLE IF NOT EXISTS service_request_syncs (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'error'
  http_status INT,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
