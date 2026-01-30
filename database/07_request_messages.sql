-- Chat groundwork: messages tied to a service request

CREATE TABLE IF NOT EXISTS request_messages (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer','store','admin','system')),
  sender_id BIGINT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_messages_request_id_created_at
  ON request_messages (request_id, created_at);
