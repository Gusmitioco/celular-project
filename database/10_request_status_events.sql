-- 1) Audit log table: track transitions + who did it + optional note (reason)
CREATE TABLE IF NOT EXISTS service_request_events (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,             -- e.g. 'status_change', 'accept'
  from_status TEXT NULL,
  to_status TEXT NULL,

  actor_type TEXT NOT NULL,             -- 'store_user' | 'admin' | 'system'
  actor_id BIGINT NULL,                 -- store_users.id or admins.id etc

  note TEXT NULL,                       -- cancellation reason, comments, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_events_request_id
  ON service_request_events(request_id, created_at DESC);
