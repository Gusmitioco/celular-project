-- TechFix seed (expanded demo data)

-- Stores
INSERT INTO stores (name, city, address)
VALUES
  ('TechFix Belo Horizonte', 'Belo Horizonte', 'Rua Principal, 123 - Centro'),
  ('CelularPro Belo Horizonte', 'Belo Horizonte', 'Av. Brasil, 456 - Shopping Center'),
  ('TechFix São Paulo', 'São Paulo', 'Av. Paulista, 1000 - Bela Vista'),
  ('FastRepair São Paulo', 'São Paulo', 'Rua Augusta, 321 - Consolação')
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

-- Store supports which models (expanded)
-- TechFix BH supports: Samsung + Apple + Google (selected models)
INSERT INTO store_models (store_id, model_id)
SELECT s.id, m.id
FROM stores s
JOIN models m ON m.name IN (
  'Galaxy S24 Ultra','Galaxy S23','Galaxy A54','Galaxy S22',
  'iPhone 15 Pro','iPhone 14','iPhone 13',
  'Pixel 8'
)
WHERE s.name = 'TechFix Belo Horizonte'
ON CONFLICT DO NOTHING;

-- CelularPro BH supports: Samsung + Motorola + Xiaomi (selected models)
INSERT INTO store_models (store_id, model_id)
SELECT s.id, m.id
FROM stores s
JOIN models m ON m.name IN (
  'Galaxy S23','Galaxy Z Flip 5','Galaxy A54',
  'Moto G84','Moto G73',
  'Redmi Note 13','Redmi Note 12','Poco X5'
)
WHERE s.name = 'CelularPro Belo Horizonte'
ON CONFLICT DO NOTHING;

-- TechFix SP supports: Apple + Samsung + OnePlus + ASUS (selected models)
INSERT INTO store_models (store_id, model_id)
SELECT s.id, m.id
FROM stores s
JOIN models m ON m.name IN (
  'iPhone 15 Pro','iPhone 14','iPhone 12',
  'Galaxy S24 Ultra','Galaxy S23','Galaxy Z Flip 5',
  'OnePlus 12',
  'ROG Phone 7'
)
WHERE s.name = 'TechFix São Paulo'
ON CONFLICT DO NOTHING;

-- FastRepair SP supports: Xiaomi + Motorola + Huawei + Google (selected models)
INSERT INTO store_models (store_id, model_id)
SELECT s.id, m.id
FROM stores s
JOIN models m ON m.name IN (
  'Redmi Note 13','Poco X5',
  'Moto Edge 40',
  'P50 Pro',
  'Pixel 7'
)
WHERE s.name = 'FastRepair São Paulo'
ON CONFLICT DO NOTHING;

-- Prices (store + model + service)
-- Helper rule: you only get store results if store_models link exists,
-- and checkout works only for services with prices inserted.

-- TECHFIX BH — Galaxy S24 Ultra (lots of services)
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Tela',35900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Bateria',18900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Reparo de Conector de Carga',12900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Alto-falante',9900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Microfone',9500),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Câmera Traseira',29900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Câmera Frontal',21900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Botões',11000),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Vidro Traseiro',24900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Reparo de Placa',46900),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX BH — iPhone 14 (includes Face ID + vidro traseiro)
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('TechFix Belo Horizonte','iPhone 14','Troca de Tela',43900),
  ('TechFix Belo Horizonte','iPhone 14','Troca de Bateria',22900),
  ('TechFix Belo Horizonte','iPhone 14','Reparo de Conector de Carga',14900),
  ('TechFix Belo Horizonte','iPhone 14','Troca de Alto-falante',12900),
  ('TechFix Belo Horizonte','iPhone 14','Troca de Câmera Traseira',33900),
  ('TechFix Belo Horizonte','iPhone 14','Troca de Câmera Frontal',25900),
  ('TechFix Belo Horizonte','iPhone 14','Troca de Vidro Traseiro',27900),
  ('TechFix Belo Horizonte','iPhone 14','Reparo Face ID / Biometria',34900),
  ('TechFix Belo Horizonte','iPhone 14','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX BH — Pixel 8
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('TechFix Belo Horizonte','Pixel 8','Troca de Tela',38900),
  ('TechFix Belo Horizonte','Pixel 8','Troca de Bateria',20900),
  ('TechFix Belo Horizonte','Pixel 8','Reparo de Conector de Carga',13900),
  ('TechFix Belo Horizonte','Pixel 8','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- CELULARPRO BH — Galaxy S23
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('CelularPro Belo Horizonte','Galaxy S23','Troca de Tela',32900),
  ('CelularPro Belo Horizonte','Galaxy S23','Troca de Bateria',16900),
  ('CelularPro Belo Horizonte','Galaxy S23','Reparo de Conector de Carga',11900),
  ('CelularPro Belo Horizonte','Galaxy S23','Troca de Microfone',8900),
  ('CelularPro Belo Horizonte','Galaxy S23','Diagnóstico',6000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- CELULARPRO BH — Moto G84
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('CelularPro Belo Horizonte','Moto G84','Troca de Tela',20900),
  ('CelularPro Belo Horizonte','Moto G84','Troca de Bateria',12900),
  ('CelularPro Belo Horizonte','Moto G84','Reparo de Conector de Carga',9900),
  ('CelularPro Belo Horizonte','Moto G84','Troca de Alto-falante',7900),
  ('CelularPro Belo Horizonte','Moto G84','Diagnóstico',6000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- CELULARPRO BH — Redmi Note 13
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('CelularPro Belo Horizonte','Redmi Note 13','Troca de Tela',23900),
  ('CelularPro Belo Horizonte','Redmi Note 13','Troca de Bateria',13900),
  ('CelularPro Belo Horizonte','Redmi Note 13','Reparo de Conector de Carga',9900),
  ('CelularPro Belo Horizonte','Redmi Note 13','Troca de Microfone',7900),
  ('CelularPro Belo Horizonte','Redmi Note 13','Diagnóstico',6000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX SP — iPhone 15 Pro
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('TechFix São Paulo','iPhone 15 Pro','Troca de Tela',49900),
  ('TechFix São Paulo','iPhone 15 Pro','Troca de Bateria',24900),
  ('TechFix São Paulo','iPhone 15 Pro','Troca de Vidro Traseiro',31900),
  ('TechFix São Paulo','iPhone 15 Pro','Reparo Face ID / Biometria',37900),
  ('TechFix São Paulo','iPhone 15 Pro','Diagnóstico',8000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- TECHFIX SP — OnePlus 12
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('TechFix São Paulo','OnePlus 12','Troca de Tela',37900),
  ('TechFix São Paulo','OnePlus 12','Troca de Bateria',19900),
  ('TechFix São Paulo','OnePlus 12','Reparo de Conector de Carga',12900),
  ('TechFix São Paulo','OnePlus 12','Diagnóstico',8000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;

-- FASTREPAIR SP — Pixel 7 + Huawei P50 Pro
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('FastRepair São Paulo','Pixel 7','Troca de Tela',32900),
  ('FastRepair São Paulo','Pixel 7','Troca de Bateria',17900),
  ('FastRepair São Paulo','Pixel 7','Diagnóstico',7000),

  ('FastRepair São Paulo','P50 Pro','Troca de Tela',38900),
  ('FastRepair São Paulo','P50 Pro','Troca de Bateria',21900),
  ('FastRepair São Paulo','P50 Pro','Desoxidação (líquido)',15900),
  ('FastRepair São Paulo','P50 Pro','Diagnóstico',7000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name
ON CONFLICT (store_id, model_id, service_id) DO NOTHING;
