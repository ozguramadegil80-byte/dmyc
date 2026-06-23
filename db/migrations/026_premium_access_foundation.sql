CREATE TABLE IF NOT EXISTS user_premium_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'free_trial',
  status text NOT NULL DEFAULT 'active',
  feature_key text NOT NULL DEFAULT 'premium_guidance',
  trial_ends_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  current_period_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS user_premium_entitlements_user_status_idx
  ON user_premium_entitlements (user_id, status, trial_ends_at DESC);

INSERT INTO user_premium_entitlements (user_id, plan_code, status, feature_key, trial_ends_at)
SELECT id, 'free_trial', 'active', 'premium_guidance', now() + interval '30 days'
FROM users
ON CONFLICT (user_id, feature_key) DO NOTHING;
