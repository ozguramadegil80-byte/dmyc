CREATE TABLE IF NOT EXISTS vehicle_brand_assets (
  brand text PRIMARY KEY,
  image_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO vehicle_brand_assets (brand, image_url, notes)
VALUES (
  'BMW',
  'http://localhost:4310/uploads/vehicles/bmw-i4-edrive40-edition-m-sport.png',
  'BMW kategori ana görseli; ilk BMW i4 Edition M Sport assetiyle başlatıldı.'
)
ON CONFLICT (brand) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  notes = EXCLUDED.notes,
  updated_at = now();

UPDATE vehicle_specs
SET image_url = 'http://localhost:4310/uploads/vehicles/bmw-i4-edrive40-edition-m-sport.png',
    updated_at = now()
WHERE brand = 'BMW'
  AND model = 'i4'
  AND variant = 'i4 eDrive40 Edition M Sport';
