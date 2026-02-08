-- Screen replacement prices (per-store only)
--
-- Changes:
--  - Remove admin/base price table.
--  - Prices live only in screen_option_prices_store.
--  - price_cents = 0 means unavailable.
--  - last_price_cents stores the last non-zero value to support a UI toggle.

-- Drop admin price table (no longer used)
DROP TABLE IF EXISTS screen_option_prices_admin;

-- Add support columns for availability toggle
ALTER TABLE screen_option_prices_store
  ADD COLUMN IF NOT EXISTS last_price_cents INTEGER NOT NULL DEFAULT 0;

-- Ensure price has a default (0 = unavailable)
ALTER TABLE screen_option_prices_store
  ALTER COLUMN price_cents SET DEFAULT 0;

-- Backfill last_price_cents from current price when missing
UPDATE screen_option_prices_store
   SET last_price_cents = GREATEST(price_cents, 0)
 WHERE last_price_cents IS NULL OR last_price_cents = 0;

-- Keep constraints consistent
ALTER TABLE screen_option_prices_store
  DROP CONSTRAINT IF EXISTS screen_option_prices_store_price_cents_check;
ALTER TABLE screen_option_prices_store
  ADD CONSTRAINT screen_option_prices_store_price_cents_check CHECK (price_cents >= 0);

ALTER TABLE screen_option_prices_store
  DROP CONSTRAINT IF EXISTS screen_option_prices_store_last_price_cents_check;
ALTER TABLE screen_option_prices_store
  ADD CONSTRAINT screen_option_prices_store_last_price_cents_check CHECK (last_price_cents >= 0);
