-- vehicle_public_reports: araç başına tek aktif rapor garantisi.
-- ON CONFLICT (vehicle_id) DO UPDATE için gerekli.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicle_public_reports_vehicle_id_key'
      AND conrelid = 'vehicle_public_reports'::regclass
  ) THEN
    ALTER TABLE vehicle_public_reports
      ADD CONSTRAINT vehicle_public_reports_vehicle_id_key UNIQUE (vehicle_id);
  END IF;
END $$;
