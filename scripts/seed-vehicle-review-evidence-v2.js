const path = require('path');
const { jsonLiteral, readVehicleSpecs, specKey, sqlLiteral } = require('./lib/vehicle-catalog');
const { runPsql } = require('./lib/docker-psql');

const seedPath = process.argv[2] || path.join(__dirname, '..', 'Docs', 'vehicle_specs_master_v2.json');
const specs = readVehicleSpecs(seedPath);

const statements = [
  'BEGIN;',
  'TRUNCATE TABLE vehicle_spec_review_decisions, vehicle_source_evidence RESTART IDENTITY CASCADE;'
];

for (const spec of specs) {
  const evidence = buildEvidence(spec);

  statements.push(`
WITH matched_spec AS (
  SELECT id, canonical_vehicle_id
  FROM vehicle_specs
  WHERE brand = ${sqlLiteral(spec.brand)}
    AND model = ${sqlLiteral(spec.model)}
    AND variant = ${sqlLiteral(spec.variant)}
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
    ${sqlLiteral(evidence.evidenceKey)},
    ${sqlLiteral(evidence.sourceType)},
    ${sqlLiteral(evidence.sourceName)},
    ${sqlLiteral(evidence.sourceUrl)},
    ${sqlLiteral(spec.brand)},
    ${sqlLiteral(spec.model)},
    ${sqlLiteral(spec.variant)},
    ${jsonLiteral(evidence.fieldValues)},
    ARRAY[${evidence.conflictFields.map(sqlLiteral).join(', ')}]::text[],
    ${sqlLiteral(evidence.evidenceStatus)},
    ${sqlLiteral(evidence.confidenceScore)},
    ${sqlLiteral(evidence.notes)},
    ${jsonLiteral(evidence.rawPayload)}
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
  ${sqlLiteral(evidence.decisionType)},
  ${sqlLiteral(evidence.decisionStatus)},
  'system_seed_v2',
  now(),
  ${jsonLiteral(evidence.fieldDecisions)},
  ${sqlLiteral(spec.verification_level)},
  ${sqlLiteral(evidence.rationale)}
FROM upserted_evidence
WHERE NOT EXISTS (
  SELECT 1
  FROM vehicle_spec_review_decisions existing
  WHERE existing.evidence_id = upserted_evidence.id
    AND existing.decision_type = ${sqlLiteral(evidence.decisionType)}
);
`);
}

statements.push('COMMIT;');
statements.push("SELECT 'vehicle_source_evidence_count' AS metric, count(*) AS value FROM vehicle_source_evidence;");
statements.push("SELECT 'vehicle_spec_review_decisions_count' AS metric, count(*) AS value FROM vehicle_spec_review_decisions;");

runPsql(statements.join('\n'));

function buildEvidence(spec) {
  const status = classifyStatus(spec);
  const missingFields = technicalFields().filter((field) => spec[field] === null || spec[field] === undefined);
  const conflictFields = [...new Set([...(spec.known_issues?.length ? ['known_issues'] : []), ...missingFields])];

  return {
    evidenceKey: `v2-${specKey(spec).replace(/[^a-z0-9]+/g, '-')}`,
    sourceType: classifySourceType(spec),
    sourceName: spec.source_name ?? 'vehicle_specs_master_v2',
    sourceUrl: spec.source_url ?? '',
    fieldValues: pickFieldValues(spec),
    conflictFields,
    evidenceStatus: status.evidenceStatus,
    confidenceScore: status.confidenceScore,
    notes: buildNotes(spec, missingFields),
    rawPayload: spec,
    decisionType: status.decisionType,
    decisionStatus: status.decisionStatus,
    fieldDecisions: {
      seed_version: 'vehicle_specs_master_v2',
      identity_confidence: spec.identity_confidence ?? null,
      spec_confidence: spec.spec_confidence ?? null,
      missing_fields: missingFields,
      known_issues: spec.known_issues ?? []
    },
    rationale: status.rationale
  };
}

function classifyStatus(spec) {
  if (spec.verification_level === 'official_verified') {
    return {
      evidenceStatus: 'applied',
      decisionStatus: 'applied',
      decisionType: 'accept_v2_official_spec',
      confidenceScore: 0.95,
      rationale: 'V2 seed kaydı resmi veya üretici kaynağıyla doğrulanmış kabul edildi.'
    };
  }

  if (spec.verification_level === 'verified' || spec.verification_level === 'partial_official_verified') {
    return {
      evidenceStatus: 'applied_partial',
      decisionStatus: 'applied',
      decisionType: 'accept_v2_verified_spec',
      confidenceScore: 0.8,
      rationale: 'V2 seed kaydı doğrulanmış veya kısmi resmi kaynakla katalogda kullanılabilir kabul edildi.'
    };
  }

  return {
    evidenceStatus: 'pending_review',
    decisionStatus: 'pending',
    decisionType: 'needs_v2_source_review',
    confidenceScore: 0.45,
    rationale: 'V2 seed kaydı eksik veya araştırma gerektiren kaynakla geldi; admin review bekler.'
  };
}

function classifySourceType(spec) {
  const sourceText = [spec.source_name, spec.source_url, spec.verification_level].filter(Boolean).join(' ').toLowerCase();

  if (sourceText.includes('official') || sourceText.includes('türkiye') || sourceText.includes('catalogue') || sourceText.includes('broşür')) {
    return 'official_or_local_source';
  }

  if (sourceText.includes('ev database') || sourceText.includes('evspecifications')) {
    return 'community_catalog';
  }

  return 'research_needed';
}

function pickFieldValues(spec) {
  const fields = [
    'variant_display_name',
    'model_family',
    'trim',
    'drive_type',
    'range_type',
    ...technicalFields(),
    'source_name',
    'source_url',
    'verification_level',
    'identity_confidence',
    'spec_confidence',
    'known_issues'
  ];

  return Object.fromEntries(fields.map((field) => [field, spec[field] ?? null]));
}

function technicalFields() {
  return [
    'battery_gross_kwh',
    'battery_net_kwh',
    'wltp_range_km',
    'ac_max_kw',
    'dc_max_kw',
    'vehicle_class',
    'curb_weight_kg',
    'official_efficiency_wh_km',
    'recommended_daily_soc_min',
    'recommended_daily_soc_max',
    'heat_pump_available',
    'heat_pump_standard',
    'battery_chemistry',
    'charging_port_type',
    'towing_capacity_kg',
    'seats'
  ];
}

function buildNotes(spec, missingFields) {
  const issueCount = spec.known_issues?.length ?? 0;
  const parts = [
    `${spec.brand} ${spec.model} ${spec.variant_display_name ?? spec.variant} v2 seed kaydı.`,
    `Eksik teknik alan: ${missingFields.length}.`,
    `Known issue: ${issueCount}.`
  ];

  return parts.join(' ');
}
