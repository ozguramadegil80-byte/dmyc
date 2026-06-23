const { runPsql } = require('./lib/docker-psql');

runPsql(`
SELECT PostGIS_Version() AS postgis_version;
SELECT count(*) AS canonical_vehicles_count FROM canonical_vehicles;
SELECT count(*) AS vehicle_specs_count FROM vehicle_specs;
SELECT count(*) AS vehicle_source_evidence_count FROM vehicle_source_evidence;
SELECT count(*) AS vehicle_spec_review_decisions_count FROM vehicle_spec_review_decisions;
SELECT brand, model, variant, wltp_range_km
FROM vehicle_specs
ORDER BY brand, model, variant
LIMIT 5;
`);
