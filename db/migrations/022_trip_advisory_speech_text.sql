ALTER TABLE trip_advisories
  ADD COLUMN IF NOT EXISTS speech_text text;
