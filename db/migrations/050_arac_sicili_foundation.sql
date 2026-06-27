-- Migration 050: Araç Sicili Foundation
-- Bakım periyotları · TÜVTÜRK muayene takibi · Kasko değer/teklif talebi
-- Plan 37 (revize): Sigorta takip edilmez; araç siciliyle değer üretilir.

-- ─── 1. maintenance_rule_candidates ──────────────────────────────────────────
-- LLM / Gemini çıktısı buraya alınır. Admin onayı olmadan maintenance_rules'a geçmez.

CREATE TABLE IF NOT EXISTS maintenance_rule_candidates (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_payload                  JSONB,
  brand                        TEXT        NOT NULL,
  model                        TEXT        NOT NULL,
  variant                      TEXT,
  matched_vehicle_spec_id      UUID        REFERENCES vehicle_specs(id) ON DELETE SET NULL,
  matched_canonical_vehicle_id UUID        REFERENCES canonical_vehicles(id) ON DELETE SET NULL,
  match_status                 TEXT        NOT NULL DEFAULT 'unmatched',
    -- exact | family_match | fuzzy_match | unmatched
  match_score                  NUMERIC(5,2),
  rule_type                    TEXT        NOT NULL,
    -- periodic_visit | item_schedule | condition_based | manual_required
  item_code                    TEXT,
    -- cabin_filter | brake_fluid | tire_rotation | coolant | hv_battery_check | general_inspection
  interval_km                  INT,
  interval_months              INT,
  first_due_km                 INT,
  first_due_months             INT,
  source_name                  TEXT,
  source_url                   TEXT,
  source_quote                 TEXT,
  source_confidence            TEXT        NOT NULL DEFAULT 'research_needed',
    -- official_manual | official_web | dealer_source | community_unverified | research_needed
  source_depth                 TEXT        NOT NULL DEFAULT 'unknown',
    -- manual_deep_link | official_deep_link | official_homepage | dealer_page | unknown
  research_needed              BOOLEAN     NOT NULL DEFAULT FALSE,
  warnings                     TEXT[],
  missing_fields               TEXT[],
  admin_status                 TEXT        NOT NULL DEFAULT 'pending',
    -- pending | approved | rejected | needs_source
  admin_note                   TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mrc_spec_idx
  ON maintenance_rule_candidates (matched_vehicle_spec_id)
  WHERE matched_vehicle_spec_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mrc_status_idx
  ON maintenance_rule_candidates (admin_status);

-- ─── 2. maintenance_rules ─────────────────────────────────────────────────────
-- Sadece admin onaylı kurallar. source_url boş olamaz.
-- condition_based / manual_required → interval zorunlu değil (BMW, Togg, MINI).

CREATE TABLE IF NOT EXISTS maintenance_rules (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_spec_id       UUID        REFERENCES vehicle_specs(id) ON DELETE CASCADE,
  canonical_vehicle_id  UUID        REFERENCES canonical_vehicles(id) ON DELETE CASCADE,
  rule_type             TEXT        NOT NULL,
    -- periodic_visit | item_schedule | condition_based | manual_required
  item_code             TEXT,
  interval_km           INT,
  interval_months       INT,
  first_due_km          INT,
  first_due_months      INT,
  source_name           TEXT        NOT NULL,
  source_url            TEXT        NOT NULL,
  source_confidence     TEXT        NOT NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mr_source_url_not_empty
    CHECK (source_url <> ''),
  CONSTRAINT mr_interval_required
    CHECK (
      rule_type IN ('condition_based', 'manual_required')
      OR interval_km IS NOT NULL
      OR interval_months IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS mr_spec_idx
  ON maintenance_rules (vehicle_spec_id)
  WHERE vehicle_spec_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mr_canonical_idx
  ON maintenance_rules (canonical_vehicle_id)
  WHERE canonical_vehicle_id IS NOT NULL;

-- ─── 3. vehicle_service_events ────────────────────────────────────────────────
-- Bakım geçmişi (km bazlı). Tek "last_service_km" alanı yerine tam geçmiş.
-- Bu tablo kalan bakım km hesabının temelidir.
-- is_current: bakım hesabında kullanılacak en son kayıt.

CREATE TABLE IF NOT EXISTS vehicle_service_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_date  DATE,
  odometer_km   INT         NOT NULL,
  service_type  TEXT        NOT NULL DEFAULT 'periodic',
    -- periodic | item_specific | user_reported | authorized_service | unknown
  item_codes    TEXT[],     -- gerçekleştirilen bakım kalemleri: cabin_filter, brake_fluid vb.
  source_type   TEXT        NOT NULL DEFAULT 'user_input',
    -- user_input | document_seen | authorized_service_record
  is_current    BOOLEAN     NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vse_vehicle_idx
  ON vehicle_service_events (vehicle_id, is_current, odometer_km DESC);

-- ─── 4. vehicle_inspection_records ───────────────────────────────────────────
-- TÜVTÜRK muayene takibi. Kullanıcı beyanı veya belge görüldü seviyesi.
-- Resmi API / e-Devlet entegrasyonu bu tabloya dahil değildir.
-- is_current: bu araç için geçerli aktif muayene kaydı.
--
-- Hesaplama mantığı:
--   Henüz muayene olmadıysa: first_registration_year/date + 3 → next_inspection_date
--   Muayene olduysa:         last_inspection_date + 2 yıl    → next_inspection_date
--   Tarih bilinemiyorsa UI şöyle konuşur:
--   "İlk muayene yılı tahmini: 2027 — kesin tarih için belge yükleyin."

CREATE TABLE IF NOT EXISTS vehicle_inspection_records (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id               UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  first_registration_date  DATE,       -- mümkünse tam tarih
  first_registration_year  INT,        -- sadece yıl biliniyorsa
  last_inspection_date     DATE,
  next_inspection_date     DATE,       -- hesaplanmış veya belgeyle doğrulanmış
  result                   TEXT        NOT NULL DEFAULT 'unknown',
    -- passed | failed | unknown
  report_number_masked     TEXT,       -- sadece son 4 karakter
  source_type              TEXT        NOT NULL DEFAULT 'user_input',
    -- user_input | document_ocr | edevlet_screenshot
  confidence               TEXT        NOT NULL DEFAULT 'user_declared',
    -- user_declared | document_seen
  is_current               BOOLEAN     NOT NULL DEFAULT TRUE,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vir_vehicle_idx
  ON vehicle_inspection_records (vehicle_id, is_current);

-- ─── 5. vehicle_valuation_snapshots ──────────────────────────────────────────
-- TSB kasko referans değeri anlık görüntüsü.
-- Olasılıksal referans değer; kesin piyasa değeri değildir.
-- Başlangıçta admin girişi; ileride aylık güncelleme otomasyonu planlanır.
-- is_current: bu araç için en son aktif snapshot.

CREATE TABLE IF NOT EXISTS vehicle_valuation_snapshots (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID          NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  valuation_type   TEXT          NOT NULL DEFAULT 'tsb_casco_reference',
    -- tsb_casco_reference | user_market_estimate | dealer_offer
  value_try        NUMERIC(14,2) NOT NULL,
  valuation_month  TEXT          NOT NULL,  -- YYYY-MM
  brand            TEXT          NOT NULL,
  model            TEXT          NOT NULL,
  model_year       INT           NOT NULL,
  variant          TEXT,
  source_type      TEXT          NOT NULL DEFAULT 'admin_entry',
    -- admin_entry | tsb_scrape | user_estimate
  source_url       TEXT,
  confidence       TEXT          NOT NULL DEFAULT 'reference_only',
  is_current       BOOLEAN       NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vvs_vehicle_idx
  ON vehicle_valuation_snapshots (vehicle_id, is_current);

-- ─── 6. vehicle_insurance_value_requests ─────────────────────────────────────
-- Sigorta takip edilmez. Kullanıcı araç siciliyle değer/teklif talebi oluşturur.
-- Her talep anında araç sicilinin snapshot'ını taşır → paylaşılabilir / gönderilebilir.

CREATE TABLE IF NOT EXISTS vehicle_insurance_value_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  report_id           UUID,       -- premium_vehicle_reports.id ile bağlantı (varsa)
  request_type        TEXT        NOT NULL DEFAULT 'casco_value',
    -- casco_value | casco_offer | insurance_partner_quote
  status              TEXT        NOT NULL DEFAULT 'draft',
    -- draft | generated | shared | sent | completed | failed
  insurer_name        TEXT,       -- ileride partner API için
  requested_value_try NUMERIC(14,2),
  returned_value_try  NUMERIC(14,2),
  source_type         TEXT        NOT NULL DEFAULT 'user_download',
    -- user_download | email_share | partner_api
  payload_snapshot    JSONB,      -- talep anında araç sicili + sinyal özeti
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vivr_vehicle_idx
  ON vehicle_insurance_value_requests (vehicle_id, created_at DESC);
