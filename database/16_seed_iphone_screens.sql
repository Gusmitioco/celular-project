-- Seed de telas de iPhone (Troca de Tela)
-- Gerado automaticamente em 2026-02-11
-- Regras:
--  - Cria marca iPhone (se não existir)
--  - Cria modelos listados (se não existirem)
--  - Cria opções de tela (screen_options) por modelo
--  - Preço por loja em screen_option_prices_store (ConSERTE FACIL / Teixeira de Freitas)
--  - Itens sem preço na lista entram como R$ 10,00 (1000 cents)

BEGIN;

-- Compat: garante colunas esperadas (caso 15_screen_prices_no_admin.sql ainda não tenha rodado)
ALTER TABLE screen_option_prices_store
  ADD COLUMN IF NOT EXISTS last_price_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE screen_option_prices_store
  ALTER COLUMN price_cents SET DEFAULT 0;

-- Garante store única
INSERT INTO stores (name, city, address)
VALUES ('ConSERTE FACIL', 'Teixeira de Freitas', 'Rua Centro, 333 - Colina Verde')
ON CONFLICT DO NOTHING;

-- Garante marca
INSERT INTO brands (name) VALUES ('iPhone')
ON CONFLICT (name) DO NOTHING;

WITH
store_row AS (
  SELECT id AS store_id FROM stores WHERE name = 'ConSERTE FACIL' LIMIT 1
),
brand_row AS (
  SELECT id AS brand_id FROM brands WHERE name = 'iPhone' LIMIT 1
),
raw AS (
  SELECT *
  FROM (VALUES
  ('iPhone 11','CHINA LCD/VD (PRETO)',19999),
  ('iPhone 11','IMPORTADA LCD/VD (PRETO)',21999),
  ('iPhone 11','NACIONAL (PRETO)',24999),
  ('iPhone 11 Pro','CHINA LCD/VD (PRETO)',23499),
  ('iPhone 11 Pro','IMPORTADA LCD/VD (PRETO)',25499),
  ('iPhone 11 Pro','NACIONAL OLED (PRETO)',34499),
  ('iPhone 11 Pro Max','CHINA LCD/VIVID (PRETO)',24499),
  ('iPhone 11 Pro Max','IMPORTADA LCD/VIVID (PRETO)',26499),
  ('iPhone 11 Pro Max','OLED (PRETO)',39499),
  ('iPhone 12','CHINA LCD/VD (PRETO)',24499),
  ('iPhone 12','IMPORTADA LCD/VD (PRETO)',27499),
  ('iPhone 12','NACIONAL OLED (PRETO)',52499),
  ('iPhone 12 Mini','CHINA VD(PRETO)',35999),
  ('iPhone 12 Mini','IMPORTADA VD(PRETO)',37999),
  ('iPhone 12 Mini','NACIONAL OLED (PRETO)',52499),
  ('iPhone 12 Pro','CHINA LCD/VD (PRETO)',24499),
  ('iPhone 12 Pro','IMPORTADA LCD/VD (PRETO)',27499),
  ('iPhone 12 Pro','NACIONAL OLED (PRETO)',52499),
  ('iPhone 12 Pro Max','CHINA LCD/VD (PRETO)',29999),
  ('iPhone 12 Pro Max','IMPORTADA LCD/VD (PRETO)',31999),
  ('iPhone 12 Pro Max','NACIONAL OLED (PRETO)',51999),
  ('iPhone 13','CHINA LCD/VD (PRETO)',38499),
  ('iPhone 13','IMPORTADA LCD/VD (PRETO)',39999),
  ('iPhone 13','NACIONAL OLED (PRETO)',49500),
  ('iPhone 13 Mini','CHINA LCD/VD (PRETO)',35499),
  ('iPhone 13 Mini','IMPORTADA LCD/VD (PRETO)',37499),
  ('iPhone 13 Mini','NACIONAL OLED (PRETO)',52499),
  ('iPhone 13 Pro','CHINA LCD/VD (PRETO)',43499),
  ('iPhone 13 Pro','IMPORTADA LCD/VIVID (PRETO)',45499),
  ('iPhone 13 Pro','NACIONAL OLED (PRETO)',55499),
  ('iPhone 13 Pro Max','CHINA LCD/VIVID (PRETO)',50500),
  ('iPhone 13 Pro Max','NACIONAL OLED S/MENSAGEM (PRETO)',84999),
  ('iPhone 13 Pro Max','OLED (PRETO)',59999),
  ('iPhone 14','CHINA LCD/VD (PRETO)',39500),
  ('iPhone 14','IMPORTADA LCD/VD (PRETO)',41999),
  ('iPhone 14','OLED (PRETO)',58999),
  ('iPhone 14 Plus','CHINA LCD/VIVID (PRETO)',44499),
  ('iPhone 14 Plus','IMPORTADA LCD/VD (PRETO)',56999),
  ('iPhone 14 Plus','NACIONAL OLED (PRETO)',88999),
  ('iPhone 14 Plus','NACIONAL OLED S/ MENSAGEM (PRETO)',99999),
  ('iPhone 14 Pro','CHINA LCD/VD (PRETO)',49499),
  ('iPhone 14 Pro','IMPORTADA LCD/VD (PRETO)',56499),
  ('iPhone 14 Pro','NACIONAL OLED (PRETO)',99999),
  ('iPhone 14 Pro','NACIONAL OLED S/ MENSAGEM (PRETO)',111999),
  ('iPhone 14 Pro Max','CHINA LCD/VD (PRETO)',59999),
  ('iPhone 14 Pro Max','IMPORTADA LCD/VD (PRETO)',68999),
  ('iPhone 14 Pro Max','NACIONAL OLED (PRETO)',139999),
  ('iPhone 14 Pro Max','NACIONAL OLED S/MENSAGEM (PRETO)',169999),
  ('iPhone 15','CHINA LCD/VD (PRETO)',49499),
  ('iPhone 15','IMPORTADA LCD/VD (PRETO)',56999),
  ('iPhone 15','NACIONAL OLED (PRETO)',119999),
  ('iPhone 15','NACIONAL OLED S/MENSAGEM (PRETO)',149999),
  ('iPhone 15 Plus','CHINA LCD/VIVID (PRETO)',1000),
  ('iPhone 15 Plus','IMPORTADA LCD/VD (PRETO)',1000),
  ('iPhone 15 Plus','NACIONAL OLED (PRETO)',1000),
  ('iPhone 15 Plus','NACIONAL OLED S/MENSAGEM(PRETO)',1000),
  ('iPhone 15 Pro','CHINA LCD/VD (PRETO)',1000),
  ('iPhone 15 Pro','IMPORTADA LCD/VD (PRETO)',1000),
  ('iPhone 15 Pro','NACIONAL OLED (PRETO)',1000),
  ('iPhone 15 Pro','NACIONAL OLED S/ MENSAGEM (PRETO)',1000),
  ('iPhone 15 Pro Max','CHINA LCD/VD (PRETO)',74499),
  ('iPhone 15 Pro Max','IMPORTADA LCD/VD (PRETO)',88499),
  ('iPhone 15 Pro Max','NACIONAL OLED (PRETO)',138999),
  ('iPhone 15 Pro Max','NACIONAL OLED S/MENSAGEM (PRETO)',168999),
  ('iPhone 16','CHINA LCD/VD (PRETO)',86499),
  ('iPhone 16','NACIONAL OLED (PRETO)',159999),
  ('iPhone 16','NACIONAL OLED S /MENSAGEM (PRETO)',189999),
  ('iPhone 16 Plus','CHINA LCD/VD(PRETO)',99999),
  ('iPhone 16 Plus','IMPORTADA LCD/VD (PRETO)',110999),
  ('iPhone 16 Plus','NACIONAL OLED (PRETO)',158999),
  ('iPhone 16 Plus','NACIONAL OLED S/MENSAGEM (PRETO)',200999),
  ('iPhone 16 Pro','CHINA LCD/VD (PRETO)',110999),
  ('iPhone 16 Pro','IMPORTADA LCD/VD (PRETO)',128999),
  ('iPhone 16 Pro','NACIONAL OLED (PRETO)',179999),
  ('iPhone 16 Pro','NACIONAL OLED S/MENSAGEM (PRETO)',219999),
  ('iPhone 16 Pro Max','CHINA LCD/VD (PRETO)',114999),
  ('iPhone 16 Pro Max','IMPORTADA LCD/VD (PRETO)',129999),
  ('iPhone 16 Pro Max','NACIONAL OLED (PRETO)',189999),
  ('iPhone 16 Pro Max','NACIONAL OLED S/ MENSAGEM (PRETO)',249999),
  ('iPhone 5G','CHINA LCD (PRETO/BRANCO)',11999),
  ('iPhone 5G','IMPORTADA LCD (PRETO/BRANCO)',12999),
  ('iPhone 5G','NACIONAL LCD (PRETO/BRANCO)',15999),
  ('iPhone 6','CHINA LCD (PRETO/BRANCO)',14999),
  ('iPhone 6','IMPORTADA LCD VD (PRETO/BRANCO)',16999),
  ('iPhone 6','NACIONAL LCD (PRETO/BRANCO)',14999),
  ('iPhone 6G Plus','CHINA LCD (PRETO/BRANCO)',15499),
  ('iPhone 6G Plus','IMPORTADA LCD (PRETO/BRANCO)',17499),
  ('iPhone 6G Plus','NACIONAL LCD (PRETO/BRANCO)',20999),
  ('iPhone 6S','IMPORTADA LCD (PRETO/BRANCO)',14999),
  ('iPhone 6S','IMPORTADA LCD VD (PRETO/BRANCO)',17399),
  ('iPhone 6S','NACIONAL LCD VD (PRETO/BRANCO)',20999),
  ('iPhone 6S Plus','CHINA LCD (PRETO/BRANCO)',15999),
  ('iPhone 6S Plus','IMPORTADA LCD VD (PRETO/BRANCO)',18999),
  ('iPhone 6S Plus','NACIONAL LCD VD (PRETO/BRANCO)',20999),
  ('iPhone 7G','CHINA LCD (PRETO/BRANCO)',14999),
  ('iPhone 7G','IMPORTADA LCD VD (PRETO/BRANCO)',17399),
  ('iPhone 7G','NACIONAL LCD (PRETO/BRANCO)',20999),
  ('iPhone 7G Plus','CHINA LCD (PRETO/BRANCO)',15999),
  ('iPhone 7G Plus','IMPORTADA LCD VD (PRETO/BRANCO)',18999),
  ('iPhone 7G Plus','NACIONAL LCD VD (PRETO/BRANCO)',20999),
  ('iPhone 8G Plus','CHINA LCD (PRETO/BRANCO)',15999),
  ('iPhone 8G Plus','IMPORTADA LCD VD (PRETO)',18999),
  ('iPhone 8G Plus','NACIONAL LCD VD (PRETO)',20999),
  ('iPhone 8G/SE 2º','CHINA LCD (PRETO/BRANCO)',14999),
  ('iPhone 8G/SE 2º Geração','IMPORTADA LCD VD (PRETO/BRANCO)',17399),
  ('iPhone 8G/SE 2º Geração','NACIONAL LCD VD (PRETO/BRANCO)',20999),
  ('iPhone X','CHINA LCD MDL (PRETO)',17499),
  ('iPhone X','IMPORTADA LCD/VD JK (PRETO)',20499),
  ('iPhone X','NACIONAL OLED (PRETO)',26499),
  ('iPhone XR','CHINA LCD/VIVID (PRETO)',19999),
  ('iPhone XR','IMPORTADA LCD/VD (PRETO)',21499),
  ('iPhone XR','NACIONAL LCD/VD(PRETO)',24499),
  ('iPhone XS','CHINA LCD MDL (PRETO)',17499),
  ('iPhone XS','IMPORTADA LCD/VD JK (PRETO)',20499),
  ('iPhone XS','NACIONAL OLED (PRETO)',26499),
  ('iPhone XS Max','CHINA LCD/VD (PRETO)',22499),
  ('iPhone XS Max','IMPORTADA (PRETO)',24499),
  ('iPhone XS Max','NACIONAL OLED (PRETO)',28999)
  ) AS v(model_name, option_label, price_cents)
),
ins_models AS (
  INSERT INTO models (brand_id, name)
  SELECT b.brand_id, r.model_name
  FROM (SELECT DISTINCT model_name FROM raw) r
  CROSS JOIN brand_row b
  ON CONFLICT (brand_id, name) DO NOTHING
  RETURNING id, name
),
all_models AS (
  SELECT m.id, m.name
  FROM models m
  JOIN brand_row b ON b.brand_id = m.brand_id
  JOIN (SELECT DISTINCT model_name FROM raw) r ON r.model_name = m.name
),
link_store_models AS (
  INSERT INTO store_models (store_id, model_id)
  SELECT s.store_id, m.id
  FROM store_row s
  CROSS JOIN all_models m
  ON CONFLICT DO NOTHING
),
ins_options AS (
  INSERT INTO screen_options (model_id, label, active)
  SELECT m.id, r.option_label, TRUE
  FROM raw r
  JOIN all_models m ON m.name = r.model_name
  ON CONFLICT (model_id, label) DO NOTHING
  RETURNING id, model_id, label
),
all_options AS (
  SELECT so.id, so.model_id, so.label
  FROM screen_options so
  JOIN all_models m ON m.id = so.model_id
  JOIN raw r ON r.model_name = m.name AND r.option_label = so.label
  GROUP BY so.id, so.model_id, so.label
)
INSERT INTO screen_option_prices_store (store_id, screen_option_id, price_cents, currency, last_price_cents)
SELECT s.store_id, o.id, r.price_cents, 'BRL', r.price_cents
FROM store_row s
JOIN all_options o ON TRUE
JOIN raw r
  ON r.option_label = o.label
 AND r.model_name = (SELECT name FROM models WHERE id = o.model_id)
ON CONFLICT (store_id, screen_option_id) DO UPDATE
SET price_cents = EXCLUDED.price_cents,
    last_price_cents = EXCLUDED.last_price_cents,
    currency = EXCLUDED.currency;

COMMIT;
