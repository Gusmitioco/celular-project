-- ConSERTE FACIL seed (expanded demo data)

-- Stores
INSERT INTO stores (name, city, address)
VALUES
  -- MVP city pre-defined: Teixeira de Freitas (single-city launch)
  ('ConSERTE FACIL', 'Teixeira de Freitas', 'Rua Centro, 333 - Colina Verde')
ON CONFLICT DO NOTHING;



-- Brands
INSERT INTO brands (name) VALUES
  ('Apple'),
  ('Samsung'),
  ('Motorola'),
  ('Xiaomi'),
  ('Google'),
  ('OnePlus'),
  ('ASUS'),
  ('Huawei')
ON CONFLICT (name) DO NOTHING;

-- Models
INSERT INTO models (brand_id, name)
SELECT b.id, v.model_name
FROM (VALUES
  -- Samsung
  ('Samsung', 'Galaxy S24 Ultra'),
  ('Samsung', 'Galaxy S23'),
  ('Samsung', 'Galaxy A54'),
  ('Samsung', 'Galaxy Z Flip 5'),
  ('Samsung', 'Galaxy S22'),

  -- Apple
  ('Apple', 'iPhone 15 Pro'),
  ('Apple', 'iPhone 14'),
  ('Apple', 'iPhone 13'),
  ('Apple', 'iPhone 12'),

  -- Motorola
  ('Motorola', 'Moto G84'),
  ('Motorola', 'Moto G73'),
  ('Motorola', 'Moto Edge 40'),

  -- Xiaomi
  ('Xiaomi', 'Redmi Note 13'),
  ('Xiaomi', 'Redmi Note 12'),
  ('Xiaomi', 'Poco X5'),

  -- Google
  ('Google', 'Pixel 8'),
  ('Google', 'Pixel 7'),

  -- OnePlus
  ('OnePlus', 'OnePlus 12'),
  ('OnePlus', 'OnePlus 11'),

  -- ASUS
  ('ASUS', 'ROG Phone 7'),

  -- Huawei
  ('Huawei', 'P50 Pro')
) AS v(brand_name, model_name)
JOIN brands b ON b.name = v.brand_name
ON CONFLICT (brand_id, name) DO NOTHING;

-- Services (expanded)
INSERT INTO services (name) VALUES
  ('Troca de Tela'),
  ('Troca de Bateria'),
  ('Reparo de Conector de Carga'),
  ('Troca de Alto-falante'),
  ('Troca de Câmera Traseira'),
  ('Troca de Câmera Frontal'),
  ('Reparo de Placa'),
  ('Troca de Microfone'),
  ('Troca de Botões'),
  ('Troca de Vidro Traseiro'),
  ('Reparo Face ID / Biometria'),
  ('Desoxidação (líquido)'),
  ('Diagnóstico')
ON CONFLICT (name) DO NOTHING;

-- Store supports which models (single-store MVP)
-- In this MVP, the city is fixed (Teixeira de Freitas) and there is only one store.
-- We link the store to all seeded models so the public flow can list brands/models normally.
INSERT INTO store_models (store_id, model_id)
SELECT s.id, m.id
FROM stores s
CROSS JOIN models m
WHERE s.name = 'ConSERTE FACIL'
ON CONFLICT DO NOTHING;

-- Prices (store + model + service)
-- Helper rule: you only get store results if store_models link exists,
-- and checkout works only for services with prices inserted.

-- TECHFIX BH — Galaxy S24 Ultra (lots of services)
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Tela',35900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Bateria',18900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Reparo de Conector de Carga',12900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Alto-falante',9900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Microfone',9500),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Câmera Traseira',29900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Câmera Frontal',21900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Botões',11000),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Troca de Vidro Traseiro',24900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Reparo de Placa',46900),
  ('ConSERTE FACIL','Galaxy S24 Ultra','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX BH — iPhone 14 (includes Face ID + vidro traseiro)
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','iPhone 14','Troca de Tela',43900),
  ('ConSERTE FACIL','iPhone 14','Troca de Bateria',22900),
  ('ConSERTE FACIL','iPhone 14','Reparo de Conector de Carga',14900),
  ('ConSERTE FACIL','iPhone 14','Troca de Alto-falante',12900),
  ('ConSERTE FACIL','iPhone 14','Troca de Câmera Traseira',33900),
  ('ConSERTE FACIL','iPhone 14','Troca de Câmera Frontal',25900),
  ('ConSERTE FACIL','iPhone 14','Troca de Vidro Traseiro',27900),
  ('ConSERTE FACIL','iPhone 14','Reparo Face ID / Biometria',34900),
  ('ConSERTE FACIL','iPhone 14','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX BH — Pixel 8
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','Pixel 8','Troca de Tela',38900),
  ('ConSERTE FACIL','Pixel 8','Troca de Bateria',20900),
  ('ConSERTE FACIL','Pixel 8','Reparo de Conector de Carga',13900),
  ('ConSERTE FACIL','Pixel 8','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- CELULARPRO BH — Galaxy S23
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','Galaxy S23','Troca de Tela',32900),
  ('ConSERTE FACIL','Galaxy S23','Troca de Bateria',16900),
  ('ConSERTE FACIL','Galaxy S23','Reparo de Conector de Carga',11900),
  ('ConSERTE FACIL','Galaxy S23','Troca de Microfone',8900),
  ('ConSERTE FACIL','Galaxy S23','Diagnóstico',6000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- CELULARPRO BH — Moto G84
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','Moto G84','Troca de Tela',20900),
  ('ConSERTE FACIL','Moto G84','Troca de Bateria',12900),
  ('ConSERTE FACIL','Moto G84','Reparo de Conector de Carga',9900),
  ('ConSERTE FACIL','Moto G84','Troca de Alto-falante',7900),
  ('ConSERTE FACIL','Moto G84','Diagnóstico',6000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- CELULARPRO BH — Redmi Note 13
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','Redmi Note 13','Troca de Tela',23900),
  ('ConSERTE FACIL','Redmi Note 13','Troca de Bateria',13900),
  ('ConSERTE FACIL','Redmi Note 13','Reparo de Conector de Carga',9900),
  ('ConSERTE FACIL','Redmi Note 13','Troca de Microfone',7900),
  ('ConSERTE FACIL','Redmi Note 13','Diagnóstico',6000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX SP — iPhone 15 Pro
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','iPhone 15 Pro','Troca de Tela',49900),
  ('ConSERTE FACIL','iPhone 15 Pro','Troca de Bateria',24900),
  ('ConSERTE FACIL','iPhone 15 Pro','Troca de Vidro Traseiro',31900),
  ('ConSERTE FACIL','iPhone 15 Pro','Reparo Face ID / Biometria',37900),
  ('ConSERTE FACIL','iPhone 15 Pro','Diagnóstico',8000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX SP — OnePlus 12
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','OnePlus 12','Troca de Tela',37900),
  ('ConSERTE FACIL','OnePlus 12','Troca de Bateria',19900),
  ('ConSERTE FACIL','OnePlus 12','Reparo de Conector de Carga',12900),
  ('ConSERTE FACIL','OnePlus 12','Diagnóstico',8000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- FASTREPAIR SP — Pixel 7 + Huawei P50 Pro
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('ConSERTE FACIL','Pixel 7','Troca de Tela',32900),
  ('ConSERTE FACIL','Pixel 7','Troca de Bateria',17900),
  ('ConSERTE FACIL','Pixel 7','Diagnóstico',7000),

  ('ConSERTE FACIL','P50 Pro','Troca de Tela',38900),
  ('ConSERTE FACIL','P50 Pro','Troca de Bateria',21900),
  ('ConSERTE FACIL','P50 Pro','Desoxidação (líquido)',15900),
  ('ConSERTE FACIL','P50 Pro','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;
