-- Screen replacement options ("Troca de Tela")

-- Catalog of screen options per model (e.g. CHINA LCD, IMPORTADA LCD VD, etc.)
CREATE TABLE IF NOT EXISTS screen_options (
  id         BIGSERIAL PRIMARY KEY,
  model_id   BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_id, label)
);

-- Admin/base price for each screen option
CREATE TABLE IF NOT EXISTS screen_option_prices_admin (
  screen_option_id BIGINT PRIMARY KEY REFERENCES screen_options(id) ON DELETE CASCADE,
  price_cents      INTEGER NOT NULL CHECK (price_cents >= 0),
  currency         CHAR(3) NOT NULL DEFAULT 'BRL'
);

-- Optional per-store override price for each screen option
CREATE TABLE IF NOT EXISTS screen_option_prices_store (
  store_id         BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  screen_option_id BIGINT NOT NULL REFERENCES screen_options(id) ON DELETE CASCADE,
  price_cents      INTEGER NOT NULL CHECK (price_cents >= 0),
  currency         CHAR(3) NOT NULL DEFAULT 'BRL',
  PRIMARY KEY (store_id, screen_option_id)
);

-- Persist which screen option was chosen for the screen replacement item.
ALTER TABLE service_request_items
  ADD COLUMN IF NOT EXISTS screen_option_id BIGINT REFERENCES screen_options(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_request_items_screen_option
  ON service_request_items(screen_option_id);
