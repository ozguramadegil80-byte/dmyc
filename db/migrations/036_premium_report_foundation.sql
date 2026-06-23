-- Plan 27 — Premium EV Kullanım Raporu foundation
-- premium_vehicle_reports: deterministic 4-section report stored as jsonb
-- external_battery_reports: user-linked third-party battery reports (TÜV, AVILOO, etc.)

CREATE TABLE IF NOT EXISTS premium_vehicle_reports (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id                      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id                    uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,

  report_data                     jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Denormed for quick listing/filtering without unpacking jsonb
  driving_style_label             text,
  driving_style_score             integer,
  consumption_deviation_percent   numeric(6,2),
  total_kwh                       numeric(12,2),
  estimated_savings_tl            numeric(12,2),
  confidence                      text NOT NULL DEFAULT 'estimated',

  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premium_vehicle_reports_vehicle_idx
  ON premium_vehicle_reports (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS premium_vehicle_reports_ownership_idx
  ON premium_vehicle_reports (ownership_id, created_at DESC)
  WHERE ownership_id IS NOT NULL;

-- Provider-agnostic external battery report links.
-- valid source_type: 'external_certified_report' | 'dealer_report' | 'owner_manual'
-- valid status: 'linked' | 'verified' | 'expired'
CREATE TABLE IF NOT EXISTS external_battery_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id  uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,

  provider      text NOT NULL,        -- 'TUV_Rheinland', 'AVILOO', 'Hella_Gutmann', 'other'
  report_type   text,                 -- 'Battery Quick Check', 'SOH Report', etc.
  report_url    text,
  report_date   date,
  soh_percent   numeric(5,2),         -- state of health % if available
  source_type   text NOT NULL DEFAULT 'external_certified_report',
  status        text NOT NULL DEFAULT 'linked',
  notes         text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_battery_reports_vehicle_idx
  ON external_battery_reports (vehicle_id, report_date DESC NULLS LAST);
