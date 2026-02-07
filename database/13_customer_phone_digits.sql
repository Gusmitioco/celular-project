-- Enforce customer phone as digits-only (Brazil: 10-11 digits including DDD)

-- 1) Sanitize existing data (keep only digits)
UPDATE customers
SET phone = NULLIF(regexp_replace(phone, '\\D+', '', 'g'), '')
WHERE phone IS NOT NULL;

-- 2) Limit storage length
ALTER TABLE customers
ALTER COLUMN phone TYPE VARCHAR(11)
USING NULLIF(regexp_replace(phone, '\\D+', '', 'g'), '');

-- 3) Enforce digits-only and digit count
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_phone_digits_chk'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_phone_digits_chk
    CHECK (phone IS NULL OR phone ~ '^[0-9]{10,11}$');
  END IF;
END $$;
