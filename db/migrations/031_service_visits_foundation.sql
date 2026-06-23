-- Extend vehicle_specs with manufacturer service interval
ALTER TABLE vehicle_specs ADD COLUMN IF NOT EXISTS service_interval_km integer;

-- Extend trip_context_questions with freeform metadata (e.g. poi name for SERVICE_VISIT)
ALTER TABLE trip_context_questions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Known service POIs — used for GPS proximity detection at trip end
CREATE TABLE IF NOT EXISTS service_pois (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  location    geography(Point, 4326) NOT NULL,
  city        text,
  brand       text,
  poi_type    text NOT NULL DEFAULT 'service_center',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Service visits recorded per vehicle (GPS-detected or manually entered)
CREATE TABLE IF NOT EXISTS service_visits (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            uuid NOT NULL REFERENCES vehicles(id),
  ownership_id          uuid REFERENCES vehicle_ownerships(id),
  user_id               uuid REFERENCES users(id),
  trip_id               uuid REFERENCES trips(id),
  service_poi_id        uuid REFERENCES service_pois(id),
  visit_date            date NOT NULL DEFAULT CURRENT_DATE,
  visit_type            text NOT NULL DEFAULT 'other',
  odometer_km           integer,
  service_location_name text,
  detection_method      text NOT NULL DEFAULT 'manual',
  user_confirmed        boolean NOT NULL DEFAULT false,
  notes                 text,
  confidence_score      numeric(5,4) NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Evidence files/confirmations attached to a service visit
CREATE TABLE IF NOT EXISTS service_evidence (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_visit_id uuid NOT NULL REFERENCES service_visits(id) ON DELETE CASCADE,
  evidence_type    text NOT NULL DEFAULT 'user_confirm',
  storage_uri      text,
  raw_payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_pois_location_gix
  ON service_pois USING GIST (location);

CREATE INDEX IF NOT EXISTS service_visits_vehicle_id_idx
  ON service_visits (vehicle_id);

CREATE INDEX IF NOT EXISTS service_visits_vehicle_date_idx
  ON service_visits (vehicle_id, visit_date DESC);

CREATE INDEX IF NOT EXISTS service_visits_trip_id_idx
  ON service_visits (trip_id);

CREATE INDEX IF NOT EXISTS service_visits_type_idx
  ON service_visits (vehicle_id, visit_type);

CREATE INDEX IF NOT EXISTS service_evidence_visit_id_idx
  ON service_evidence (service_visit_id);
