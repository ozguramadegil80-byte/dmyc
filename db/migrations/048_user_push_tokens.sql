-- Expo push token per user (upsert-friendly, tek token tutulur)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS expo_push_token text,
  ADD COLUMN IF NOT EXISTS push_token_updated_at timestamptz;
