-- TechFix schema

CREATE TABLE IF NOT EXISTS stores (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT 'TBD'
);

CREATE TABLE IF NOT EXISTS brands (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS models (
  id          BIGSERIAL PRIMARY KEY,
  brand_id    BIGINT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  UNIQUE (brand_id, name)
);

CREATE TABLE IF NOT EXISTS store_models (
  store_id    BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  model_id    BIGINT NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  PRIMARY KEY (store_id, model_id)
);

CREATE TABLE IF NOT EXISTS services (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS store_model_service_prices (
  store_id    BIGINT NOT NULL,
  model_id    BIGINT NOT NULL,
  service_id  BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency    CHAR(3) NOT NULL DEFAULT 'BRL',
  notes       TEXT,

  PRIMARY KEY (store_id, model_id, service_id),
  FOREIGN KEY (store_id, model_id)
    REFERENCES store_models(store_id, model_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
CREATE INDEX IF NOT EXISTS idx_models_brand ON models(brand_id);
CREATE INDEX IF NOT EXISTS idx_prices_service ON store_model_service_prices(service_id);
