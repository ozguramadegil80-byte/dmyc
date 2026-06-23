-- vehicle_public_reports: araç başına tek aktif rapor garantisi.
-- ON CONFLICT (vehicle_id) DO UPDATE için gerekli.
ALTER TABLE vehicle_public_reports
  ADD CONSTRAINT IF NOT EXISTS vehicle_public_reports_vehicle_id_key UNIQUE (vehicle_id);
