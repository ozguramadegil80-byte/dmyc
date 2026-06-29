-- 055: AC/DC charge split columns on monthly_reports
ALTER TABLE monthly_reports
  ADD COLUMN IF NOT EXISTS ac_energy_kwh   numeric(10,3),
  ADD COLUMN IF NOT EXISTS ac_cost_amount  numeric(12,2),
  ADD COLUMN IF NOT EXISTS dc_energy_kwh   numeric(10,3),
  ADD COLUMN IF NOT EXISTS dc_cost_amount  numeric(12,2);
