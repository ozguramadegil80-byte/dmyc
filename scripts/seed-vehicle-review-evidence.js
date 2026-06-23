const { jsonLiteral, sqlLiteral } = require('./lib/vehicle-catalog');
const { runPsql } = require('./lib/docker-psql');

const evidenceRecords = [
  {
    evidenceKey: 'togg-t10x-official-catalog-2026',
    brand: 'Togg',
    model: 'T10X',
    variant: null,
    specVariant: 'V2 RWD Long Range',
    sourceType: 'official_pdf',
    sourceName: 'Togg T10X Official Catalogue',
    sourceUrl: 'https://trumore-cdn.togg.cloud/ToggT10XKatalog.pdf',
    fieldValues: {
      ac_max_kw: 22,
      dc_max_kw: 180,
      variants: {
        'V1 RWD Standard Range': {
          curb_weight_kg: 1949,
          official_efficiency_wh_km: 195
        },
        'V2 RWD Long Range': {
          curb_weight_kg: 2126,
          official_efficiency_wh_km: 191
        },
        '4More AWD Obsidian': {
          curb_weight_kg: 2133,
          official_efficiency_wh_km: 219
        }
      }
    },
    conflictFields: ['ac_max_kw', 'dc_max_kw', 'curb_weight_kg', 'official_efficiency_wh_km'],
    evidenceStatus: 'applied',
    confidenceScore: 0.95,
    notes: 'T10X variant tablosu resmi katalogdan alındı; aktif katalog değerlerine uygulandı.',
    decisionType: 'update_existing_spec',
    decisionStatus: 'applied',
    fieldDecisions: {
      update_existing_specs: true,
      keep_official_verified: true
    },
    resultingVerificationLevel: 'official_verified',
    rationale: 'Resmi katalog variant bazlı AC/DC, ağırlık ve tüketim alanlarını net verdi.'
  },
  {
    evidenceKey: 'tesla-model-y-tr-current-2026',
    brand: 'Tesla',
    model: 'Model Y',
    variant: null,
    specVariant: 'Premium Long Range AWD',
    sourceType: 'official_page',
    sourceName: 'Tesla Türkiye Model Y',
    sourceUrl: 'https://www.tesla.com/tr_tr/modely',
    fieldValues: {
      variants: {
        'Standard RWD': {
          wltp_range_km: 534,
          dc_max_kw: 175,
          curb_weight_kg: 1906,
          official_efficiency_wh_km: 131
        },
        'Premium Long Range RWD': {
          wltp_range_km: 603,
          dc_max_kw: 250,
          curb_weight_kg: 1891,
          official_efficiency_wh_km: 140
        },
        'Premium Long Range AWD': {
          wltp_range_km: 600,
          dc_max_kw: 250,
          curb_weight_kg: 1997,
          official_efficiency_wh_km: 159
        },
        Performance: {
          wltp_range_km: 580,
          dc_max_kw: 250,
          curb_weight_kg: 2033,
          official_efficiency_wh_km: 162
        }
      }
    },
    conflictFields: ['variant', 'wltp_range_km', 'curb_weight_kg', 'official_efficiency_wh_km'],
    evidenceStatus: 'applied_partial',
    confidenceScore: 0.86,
    notes: 'Tesla Türkiye sayfası güncel varyantları veriyor; batarya kWh açık verilmediği için legacy dataset korundu.',
    decisionType: 'create_new_variant',
    decisionStatus: 'applied',
    fieldDecisions: {
      split_current_variants: true,
      keep_legacy_battery_capacity: true
    },
    resultingVerificationLevel: 'partial_official_verified',
    rationale: 'Resmi değerler variant bazlı ayrıldı; batarya alanı resmi kaynakta eksik olduğu için kısmi doğrulama seçildi.'
  },
  {
    evidenceKey: 'bmw-i4-tr-current-offer-2026',
    brand: 'BMW',
    model: 'i4',
    variant: 'eDrive30 M Sport',
    specVariant: 'eDrive30 M Sport',
    sourceType: 'official_page',
    sourceName: 'BMW Türkiye i4 Technical Data',
    sourceUrl: 'https://www.bmw.com.tr/tr/all-models/i-series/i4/i4-gran-coupe-2024-g26bev-teknik-veri.html',
    fieldValues: {
      current_offer_note: 'Güncel Türkiye sayfası eDrive40 hattını gösteriyor; eDrive30 M Sport birebir doğrulanmadı.'
    },
    conflictFields: ['variant', 'official_sales_status', 'verification_level'],
    evidenceStatus: 'archived_reference',
    confidenceScore: 0.72,
    notes: 'Mevcut eDrive30 M Sport kaydı aktif katalogdan çıkarıldı; DB içinde legacy referans olarak tutuluyor.',
    decisionType: 'archive_legacy_spec',
    decisionStatus: 'applied',
    fieldDecisions: {
      official_sales_status: 'legacy_reference',
      verification_level: 'archived_legacy'
    },
    resultingVerificationLevel: 'archived_legacy',
    rationale: 'Güncel resmi Türkiye trim eşleşmesi net olmadığı için kullanıcı onboarding kataloğunda gösterilmemeli.'
  },
  {
    evidenceKey: 'mercedes-eqe-suv-tr-current-check-2026',
    brand: 'Mercedes-Benz',
    model: 'EQE SUV',
    variant: '350 4MATIC',
    specVariant: '350 4MATIC',
    sourceType: 'official_pdf',
    sourceName: 'Mercedes Türkiye EQE Brochure',
    sourceUrl: 'https://pladmin.mercedes-benz.com.tr/cdn/files/eqe_v295_e-brosur.pdf',
    fieldValues: {
      current_brochure_note: 'Güncel broşür EQE sedan içeriği veriyor; EQE SUV 350 4MATIC için birebir teknik kaynak net değil.'
    },
    conflictFields: ['model', 'variant', 'official_sales_status', 'verification_level'],
    evidenceStatus: 'archived_reference',
    confidenceScore: 0.68,
    notes: 'EQE SUV kaydı aktif katalogdan çıkarıldı; güncel SUV kaynağı bulunana kadar legacy referans.',
    decisionType: 'archive_legacy_spec',
    decisionStatus: 'applied',
    fieldDecisions: {
      official_sales_status: 'legacy_reference',
      verification_level: 'archived_legacy'
    },
    resultingVerificationLevel: 'archived_legacy',
    rationale: 'Güncel kaynak sedan broşürü olduğu için SUV kaydı kesin aktif katalog değeri gibi sunulamaz.'
  }
];

const statements = ['BEGIN;'];

for (const record of evidenceRecords) {
  statements.push(`
WITH matched_spec AS (
  SELECT id, canonical_vehicle_id
  FROM vehicle_specs
  WHERE brand = ${sqlLiteral(record.brand)}
    AND model = ${sqlLiteral(record.model)}
    AND variant = ${sqlLiteral(record.specVariant)}
  ORDER BY created_at DESC
  LIMIT 1
),
upserted_evidence AS (
  INSERT INTO vehicle_source_evidence (
    vehicle_spec_id,
    canonical_vehicle_id,
    evidence_key,
    source_type,
    source_name,
    source_url,
    brand,
    model,
    variant,
    field_values,
    conflict_fields,
    evidence_status,
    confidence_score,
    notes,
    raw_payload
  )
  SELECT
    matched_spec.id,
    matched_spec.canonical_vehicle_id,
    ${sqlLiteral(record.evidenceKey)},
    ${sqlLiteral(record.sourceType)},
    ${sqlLiteral(record.sourceName)},
    ${sqlLiteral(record.sourceUrl)},
    ${sqlLiteral(record.brand)},
    ${sqlLiteral(record.model)},
    ${sqlLiteral(record.variant)},
    ${jsonLiteral(record.fieldValues)},
    ARRAY[${record.conflictFields.map(sqlLiteral).join(', ')}]::text[],
    ${sqlLiteral(record.evidenceStatus)},
    ${sqlLiteral(record.confidenceScore)},
    ${sqlLiteral(record.notes)},
    ${jsonLiteral(record)}
  FROM matched_spec
  ON CONFLICT (evidence_key) DO UPDATE SET
    vehicle_spec_id = EXCLUDED.vehicle_spec_id,
    canonical_vehicle_id = EXCLUDED.canonical_vehicle_id,
    source_type = EXCLUDED.source_type,
    source_name = EXCLUDED.source_name,
    source_url = EXCLUDED.source_url,
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    variant = EXCLUDED.variant,
    field_values = EXCLUDED.field_values,
    conflict_fields = EXCLUDED.conflict_fields,
    evidence_status = EXCLUDED.evidence_status,
    confidence_score = EXCLUDED.confidence_score,
    notes = EXCLUDED.notes,
    raw_payload = EXCLUDED.raw_payload,
    updated_at = now()
  RETURNING id, vehicle_spec_id
)
INSERT INTO vehicle_spec_review_decisions (
  vehicle_spec_id,
  evidence_id,
  decision_type,
  decision_status,
  decided_by,
  decided_at,
  field_decisions,
  resulting_verification_level,
  rationale
)
SELECT
  upserted_evidence.vehicle_spec_id,
  upserted_evidence.id,
  ${sqlLiteral(record.decisionType)},
  ${sqlLiteral(record.decisionStatus)},
  'system_seed',
  now(),
  ${jsonLiteral(record.fieldDecisions)},
  ${sqlLiteral(record.resultingVerificationLevel)},
  ${sqlLiteral(record.rationale)}
FROM upserted_evidence
WHERE NOT EXISTS (
  SELECT 1
  FROM vehicle_spec_review_decisions existing
  WHERE existing.evidence_id = upserted_evidence.id
    AND existing.decision_type = ${sqlLiteral(record.decisionType)}
);
`);
}

statements.push('COMMIT;');
statements.push("SELECT 'vehicle_source_evidence_count' AS metric, count(*) AS value FROM vehicle_source_evidence;");
statements.push("SELECT 'vehicle_spec_review_decisions_count' AS metric, count(*) AS value FROM vehicle_spec_review_decisions;");

runPsql(statements.join('\n'));
