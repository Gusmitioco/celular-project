-- 11_request_lifecycle.sql
-- Track lifecycle + cancellation metadata for service_requests

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS in_progress_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by_store_user_id BIGINT REFERENCES store_users(id) ON DELETE SET NULL;

-- Helpful indexes for admin/reporting later
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_in_progress_at ON service_requests(in_progress_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_done_at ON service_requests(done_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_cancelled_at ON service_requests(cancelled_at);
