-- Kasko değer raporuna araç fotoğrafı URL'leri eklendi.
-- 4 fotoğraf: ön, arka, sol, sağ.
-- EXIF/GPS metadata Next.js upload route tarafından siliniyor.

ALTER TABLE vehicle_insurance_value_requests
  ADD COLUMN IF NOT EXISTS vehicle_photo_urls TEXT[] NOT NULL DEFAULT '{}';
