ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS created_fingerprint TEXT;

-- Enforce "no duplicate created request" per customer:
-- only applies when status='created' and fingerprint is present.
CREATE UNIQUE INDEX IF NOT EXISTS uq_requests_created_fingerprint
ON service_requests (customer_id, created_fingerprint)
WHERE status = 'created' AND created_fingerprint IS NOT NULL;
