-- Customer service requests (checkout codes)

CREATE TABLE IF NOT EXISTS service_requests (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  -- customer_id is optional to allow guest checkouts (no login)
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  total_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_request_items (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  UNIQUE (request_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_store_id ON service_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);
