-- Track what each store user has read, per request (for unread badges)

CREATE TABLE IF NOT EXISTS store_request_reads (
  store_user_id BIGINT NOT NULL REFERENCES store_users(id) ON DELETE CASCADE,
  request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  last_read_message_id BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_store_request_reads_request_id
  ON store_request_reads (request_id);

CREATE INDEX IF NOT EXISTS idx_store_request_reads_store_user_id
  ON store_request_reads (store_user_id);
