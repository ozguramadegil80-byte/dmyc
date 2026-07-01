-- 058: report_source_snapshots — immutable kaynak meta kayıtları
-- Her premium rapor oluşturulduğunda, o anki veri kaynaklarının "fotoğrafı" alınır.
-- Bu tablo güncellenmez; yalnızca INSERT edilir.

CREATE TABLE IF NOT EXISTS report_source_snapshots (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id                   UUID NOT NULL REFERENCES premium_vehicle_reports(id) ON DELETE CASCADE,
  vehicle_id                  UUID NOT NULL,
  snapshot_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Kullanım profili kaynağı
  usage_confidence            TEXT,   -- 'low' | 'medium' | 'high'
  usage_data_source           TEXT,   -- 'vehicle_data' | null

  -- Batarya verisi
  battery_grade               TEXT,   -- 'A+' | 'B+' | vb. | null
  battery_confidence_score    NUMERIC(4,2),

  -- Sürüş verileri
  total_charge_sessions       INT,
  assessment_included         BOOLEAN NOT NULL DEFAULT false,
  verification_level          TEXT,   -- 'basic' | 'confirmed' | 'verified' | null
  external_reports_count      INT NOT NULL DEFAULT 0,

  -- Tüm kaynakların esnek kaydı (JSON)
  sources_summary             JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT report_source_snapshots_report_id_key UNIQUE (report_id)
);

CREATE INDEX IF NOT EXISTS idx_report_source_snapshots_vehicle
  ON report_source_snapshots (vehicle_id);

COMMENT ON TABLE report_source_snapshots IS
  'Rapor oluşturma anındaki veri kaynaklarının değişmez anlık görüntüsü. '
  'Gelecekteki sorgular hangi verinin hangi güvenle hesaba katıldığını buradan okur.';
