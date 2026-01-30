-- 12_request_chat_controls.sql
-- Admin-only controls for customer chat

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS customer_messages_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS customer_messages_blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_messages_blocked_by TEXT;

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_messages_blocked
  ON service_requests(customer_messages_blocked);
