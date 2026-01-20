-- TechFix seed (placeholder/demo data)

-- Stores
INSERT INTO stores (name, city, address)
VALUES
  ('TechFix Belo Horizonte', 'Belo Horizonte', 'Rua Principal, 123 - Centro'),
  ('CelularPro Belo Horizonte', 'Belo Horizonte', 'Av. Brasil, 456 - Shopping Center')
ON CONFLICT DO NOTHING;

-- Brands
INSERT INTO brands (name) VALUES
  ('Apple'),
  ('Samsung'),
  ('Motorola'),
  ('Xiaomi')
ON CONFLICT (name) DO NOTHING;

-- Models
INSERT INTO models (brand_id, name)
SELECT b.id, v.model_name
FROM (VALUES
  ('Samsung', 'Galaxy S24 Ultra'),
  ('Samsung', 'Galaxy S23'),
  ('Samsung', 'Galaxy A54'),
  ('Samsung', 'Galaxy Z Flip 5'),
  ('Apple', 'iPhone 15 Pro'),
  ('Apple', 'iPhone 14'),
  ('Motorola', 'Moto G84'),
  ('Xiaomi', 'Redmi Note 13')
) AS v(brand_name, model_name)
JOIN brands b ON b.name = v.brand_name
ON CONFLICT (brand_id, name) DO NOTHING;

-- Services
INSERT INTO services (name) VALUES
  ('Troca de Tela'),
  ('Troca de Bateria'),
  ('Reparo de Conector de Carga'),
  ('Troca de Alto-falante'),
  ('Troca de Câmera Traseira'),
  ('Reparo de Placa')
ON CONFLICT (name) DO NOTHING;

-- Store supports which models
-- TechFix BH supports Samsung + Apple (some models)
INSERT INTO store_models (store_id, model_id)
SELECT s.id, m.id
FROM stores s
JOIN brands b ON b.name IN ('Samsung', 'Apple')
JOIN models m ON m.brand_id = b.id
WHERE s.name = 'TechFix Belo Horizonte'
  AND m.name IN ('Galaxy S24 Ultra','Galaxy S23','Galaxy A54','iPhone 14','iPhone 15 Pro')
ON CONFLICT DO NOTHING;

-- CelularPro BH supports Samsung + Motorola + Xiaomi (some models)
INSERT INTO store_models (store_id, model_id)
SELECT s.id, m.id
FROM stores s
JOIN models m ON m.name IN ('Galaxy S23','Galaxy Z Flip 5','Moto G84','Redmi Note 13')
WHERE s.name = 'CelularPro Belo Horizonte'
ON CONFLICT DO NOTHING;

-- Prices (store + model + service)
-- TechFix BH prices for Galaxy S24 Ultra
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Tela',35000),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Bateria',18000),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Reparo de Conector de Carga',12000),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Alto-falante',9000),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Troca de Câmera Traseira',28000),
  ('TechFix Belo Horizonte','Galaxy S24 Ultra','Reparo de Placa',45000),

  ('TechFix Belo Horizonte','iPhone 14','Troca de Tela',42000),
  ('TechFix Belo Horizonte','iPhone 14','Troca de Bateria',22000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name;

-- CelularPro BH prices
INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
SELECT s.id, m.id, sv.id, p.price_cents, 'BRL'
FROM (VALUES
  ('CelularPro Belo Horizonte','Galaxy S23','Troca de Tela',33000),
  ('CelularPro Belo Horizonte','Galaxy S23','Troca de Bateria',17000),

  ('CelularPro Belo Horizonte','Moto G84','Troca de Tela',21000),
  ('CelularPro Belo Horizonte','Moto G84','Troca de Bateria',12000),

  ('CelularPro Belo Horizonte','Redmi Note 13','Troca de Tela',24000),
  ('CelularPro Belo Horizonte','Redmi Note 13','Troca de Bateria',13000)
) AS p(store_name, model_name, service_name, price_cents)
JOIN stores s ON s.name = p.store_name
JOIN models m ON m.name = p.model_name
JOIN services sv ON sv.name = p.service_name;
