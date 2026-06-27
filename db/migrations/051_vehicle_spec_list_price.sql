-- Migration 051: vehicle_specs'e sıfır araç liste fiyatı sütunları ekle
-- Plan 37 Kasko Değer Karnesi: MSR × amortisman × batarya_katsayısı × km_katsayısı
-- Fiyatlar: Türkiye resmi katalog / bayi liste fiyatı (KDV + ÖTV dahil)
-- Kaynak: 2025 yılı bayi liste fiyatları (yaklaşık, TSB referans fiyatları değil)

ALTER TABLE vehicle_specs
  ADD COLUMN IF NOT EXISTS list_price_try  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS list_price_year INT;

-- ─── BMW ──────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 3050000.00, list_price_year = 2024
WHERE brand = 'BMW' AND model = 'i4' AND variant = 'i4 eDrive40 Sport Line';

UPDATE vehicle_specs SET list_price_try = 3350000.00, list_price_year = 2024
WHERE brand = 'BMW' AND model = 'i4' AND variant = 'i4 eDrive40 M Sport';

UPDATE vehicle_specs SET list_price_try = 3550000.00, list_price_year = 2025
WHERE brand = 'BMW' AND model = 'i4' AND variant = 'i4 eDrive40 Edition M Sport';

UPDATE vehicle_specs SET list_price_try = 2950000.00, list_price_year = 2024
WHERE brand = 'BMW' AND model = 'iX3' AND variant = 'iX3 M Sport';

-- ─── BYD ──────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1150000.00, list_price_year = 2025
WHERE brand = 'BYD' AND model = 'Atto 2' AND variant = 'Atto 2 Boost';

UPDATE vehicle_specs SET list_price_try = 1050000.00, list_price_year = 2025
WHERE brand = 'BYD' AND model = 'Atto 2' AND variant = 'Atto 2 Comfort';

UPDATE vehicle_specs SET list_price_try = 1350000.00, list_price_year = 2025
WHERE brand = 'BYD' AND model = 'Atto 3' AND variant = 'Atto 3 Design';

UPDATE vehicle_specs SET list_price_try = 950000.00, list_price_year = 2025
WHERE brand = 'BYD' AND model = 'Dolphin' AND variant = 'Dolphin Design';

UPDATE vehicle_specs SET list_price_try = 1650000.00, list_price_year = 2025
WHERE brand = 'BYD' AND model = 'Seal' AND variant = 'Seal Excellence AWD';

UPDATE vehicle_specs SET list_price_try = 1850000.00, list_price_year = 2025
WHERE brand = 'BYD' AND model = 'Sealion 7' AND variant = 'Sealion 7';

UPDATE vehicle_specs SET list_price_try = 1700000.00, list_price_year = 2025
WHERE brand = 'BYD' AND model = 'Seal U EV' AND variant = 'Seal U EV Design';

-- ─── Hyundai ──────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 2100000.00, list_price_year = 2025
WHERE brand = 'Hyundai' AND model = 'Ioniq 5' AND variant = 'Ioniq 5 Dynamic';

UPDATE vehicle_specs SET list_price_try = 2350000.00, list_price_year = 2025
WHERE brand = 'Hyundai' AND model = 'Ioniq 5' AND variant = 'Ioniq 5 Progressive';

UPDATE vehicle_specs SET list_price_try = 3250000.00, list_price_year = 2025
WHERE brand = 'Hyundai' AND model = 'Ioniq 5' AND variant = 'Ioniq 5 N';

UPDATE vehicle_specs SET list_price_try = 2500000.00, list_price_year = 2025
WHERE brand = 'Hyundai' AND model = 'Ioniq 5' AND variant = 'Ioniq 5 Advance';

UPDATE vehicle_specs SET list_price_try = 2200000.00, list_price_year = 2024
WHERE brand = 'Hyundai' AND model = 'Ioniq 5' AND variant = 'Ioniq 5 Dynamic Vision Roof';

UPDATE vehicle_specs SET list_price_try = 2250000.00, list_price_year = 2025
WHERE brand = 'Hyundai' AND model = 'Ioniq 6' AND variant = 'Ioniq 6 Progressive';

-- ─── KGM ──────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1450000.00, list_price_year = 2025
WHERE brand = 'KGM' AND model = 'Torres EVX' AND variant = 'Torres EVX';

-- ─── Kia ──────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1150000.00, list_price_year = 2025
WHERE brand = 'Kia' AND model = 'EV3' AND variant = 'EV3 Elegance';

UPDATE vehicle_specs SET list_price_try = 1300000.00, list_price_year = 2025
WHERE brand = 'Kia' AND model = 'EV3' AND variant = 'EV3 Prestige';

UPDATE vehicle_specs SET list_price_try = 3000000.00, list_price_year = 2025
WHERE brand = 'Kia' AND model = 'EV6' AND variant = 'EV6 GT';

UPDATE vehicle_specs SET list_price_try = 2450000.00, list_price_year = 2025
WHERE brand = 'Kia' AND model = 'EV6' AND variant = 'EV6 Prestige';

-- ─── Mercedes-Benz ────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 4500000.00, list_price_year = 2025
WHERE brand = 'Mercedes-Benz' AND model = 'EQE SUV' AND variant = 'EQE 350 4MATIC AMG';

-- ─── MG ───────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 950000.00, list_price_year = 2025
WHERE brand = 'MG' AND model = 'MG4 Electric' AND variant = 'MG4 Electric Comfort';

UPDATE vehicle_specs SET list_price_try = 1100000.00, list_price_year = 2025
WHERE brand = 'MG' AND model = 'MG4 Electric' AND variant = 'MG4 Electric Luxury';

-- ─── MINI ─────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 2200000.00, list_price_year = 2025
WHERE brand = 'MINI' AND model = 'Countryman Electric' AND variant = 'Countryman E Classic';

UPDATE vehicle_specs SET list_price_try = 2500000.00, list_price_year = 2025
WHERE brand = 'MINI' AND model = 'Countryman Electric' AND variant = 'Countryman SE ALL4 Favoured';

UPDATE vehicle_specs SET list_price_try = 2850000.00, list_price_year = 2025
WHERE brand = 'MINI' AND model = 'Countryman Electric' AND variant = 'Countryman SE ALL4 JCW';

-- ─── Opel ─────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1200000.00, list_price_year = 2024
WHERE brand = 'Opel' AND model = 'Mokka Electric' AND variant = 'Mokka Electric Ultimate';

-- ─── Peugeot ──────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1100000.00, list_price_year = 2025
WHERE brand = 'Peugeot' AND model = 'E-208' AND variant = 'E-208 GT';

-- ─── Renault ──────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1550000.00, list_price_year = 2025
WHERE brand = 'Renault' AND model = 'Megane E-Tech' AND variant = 'Megane E-Tech Iconic';

UPDATE vehicle_specs SET list_price_try = 1350000.00, list_price_year = 2025
WHERE brand = 'Renault' AND model = 'Megane E-Tech' AND variant = 'Megane E-Tech Techno';

-- ─── Skywell ──────────────────────────────────────────────────────────────────
-- ET5 LR Premium artık satılmıyor; son bilinen Türkiye liste fiyatı

UPDATE vehicle_specs SET list_price_try = 850000.00, list_price_year = 2022
WHERE brand = 'Skywell' AND model = 'ET5' AND variant = 'ET5 LR Premium';

UPDATE vehicle_specs SET list_price_try = 1300000.00, list_price_year = 2025
WHERE brand = 'Skywell' AND model = 'ET5' AND variant = 'ET5 Legend';

UPDATE vehicle_specs SET list_price_try = 1100000.00, list_price_year = 2025
WHERE brand = 'Skywell' AND model = 'ET5' AND variant = 'ET5 LR Elite';

-- ─── Tesla ────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 2150000.00, list_price_year = 2025
WHERE brand = 'Tesla' AND model = 'Model Y' AND variant = 'Model Y Long Range AWD';

UPDATE vehicle_specs SET list_price_try = 2600000.00, list_price_year = 2025
WHERE brand = 'Tesla' AND model = 'Model Y' AND variant = 'Model Y Performance';

UPDATE vehicle_specs SET list_price_try = 1850000.00, list_price_year = 2025
WHERE brand = 'Tesla' AND model = 'Model Y' AND variant = 'Model Y Arkadan Çekiş';

UPDATE vehicle_specs SET list_price_try = 2100000.00, list_price_year = 2025
WHERE brand = 'Tesla' AND model = 'Model Y' AND variant = 'Model Y Long Range Arkadan Çekiş';

-- ─── Togg ─────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1150000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10F' AND variant = 'T10F V1 RWD Standart Menzil';

UPDATE vehicle_specs SET list_price_try = 1350000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10F' AND variant = 'T10F V1 RWD Uzun Menzil';

UPDATE vehicle_specs SET list_price_try = 1700000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10F' AND variant = 'T10F V2 4More';

UPDATE vehicle_specs SET list_price_try = 1500000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10F' AND variant = 'T10F V2 RWD Uzun Menzil';

UPDATE vehicle_specs SET list_price_try = 950000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10X' AND variant = 'T10X V1 RWD Standart Menzil';

UPDATE vehicle_specs SET list_price_try = 1100000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10X' AND variant = 'T10X V1 RWD Uzun Menzil';

UPDATE vehicle_specs SET list_price_try = 1200000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10X' AND variant = 'T10X V2 RWD Uzun Menzil';

UPDATE vehicle_specs SET list_price_try = 1400000.00, list_price_year = 2025
WHERE brand = 'Togg' AND model = 'T10X' AND variant = 'T10X V2 4More Obsidiyen';

-- ─── Volvo ────────────────────────────────────────────────────────────────────

UPDATE vehicle_specs SET list_price_try = 1500000.00, list_price_year = 2025
WHERE brand = 'Volvo' AND model = 'EX30' AND variant = 'EX30 Core';

UPDATE vehicle_specs SET list_price_try = 1700000.00, list_price_year = 2025
WHERE brand = 'Volvo' AND model = 'EX30' AND variant = 'EX30 Plus';

UPDATE vehicle_specs SET list_price_try = 1900000.00, list_price_year = 2025
WHERE brand = 'Volvo' AND model = 'EX30' AND variant = 'EX30 Ultra';

UPDATE vehicle_specs SET list_price_try = 2050000.00, list_price_year = 2025
WHERE brand = 'Volvo' AND model = 'EX40' AND variant = 'EX40 Core';

UPDATE vehicle_specs SET list_price_try = 2250000.00, list_price_year = 2025
WHERE brand = 'Volvo' AND model = 'EX40' AND variant = 'EX40 Plus';

UPDATE vehicle_specs SET list_price_try = 2500000.00, list_price_year = 2025
WHERE brand = 'Volvo' AND model = 'EX40' AND variant = 'EX40 Ultra';

-- ─── Doğrulama ────────────────────────────────────────────────────────────────
-- SELECT brand, model, variant, year_from, list_price_try, list_price_year
-- FROM vehicle_specs
-- WHERE list_price_try IS NULL
-- ORDER BY brand, model;
-- → Hiç satır dönmemeli (53/53 güncellendi)
