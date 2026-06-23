import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

export type PremiumAccessStatus = {
  userId: string | null;
  featureKey: string;
  planCode: string;
  status: string;
  hasAccess: boolean;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  reason: 'active_trial' | 'active_period' | 'no_user' | 'not_found' | 'expired' | 'inactive';
};

type PremiumEntitlementRow = {
  userId: string;
  featureKey: string;
  planCode: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
};

const DEFAULT_FEATURE_KEY = 'premium_guidance';

@Injectable()
export class PremiumAccessService {
  constructor(private readonly db: DatabaseService) {}

  async ensureTrialForUser(userId: string, featureKey = DEFAULT_FEATURE_KEY) {
    await this.db.query(
      `
        INSERT INTO user_premium_entitlements (user_id, plan_code, status, feature_key, trial_ends_at)
        VALUES ($1, 'free_trial', 'active', $2, now() + interval '30 days')
        ON CONFLICT (user_id, feature_key)
        DO UPDATE SET updated_at = now()
      `,
      [userId, featureKey],
    );

    return this.getAccess(userId, featureKey);
  }

  async getAccess(userId: string | null | undefined, featureKey = DEFAULT_FEATURE_KEY): Promise<PremiumAccessStatus> {
    if (!userId) {
      return {
        userId: null,
        featureKey,
        planCode: 'none',
        status: 'missing_user',
        hasAccess: false,
        trialEndsAt: null,
        currentPeriodEndsAt: null,
        reason: 'no_user',
      };
    }

    const result = await this.db.query<PremiumEntitlementRow>(
      `
        SELECT
          user_id AS "userId",
          feature_key AS "featureKey",
          plan_code AS "planCode",
          status,
          trial_ends_at AS "trialEndsAt",
          current_period_ends_at AS "currentPeriodEndsAt"
        FROM user_premium_entitlements
        WHERE user_id = $1
          AND feature_key = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId, featureKey],
    );

    const entitlement = result.rows[0];

    if (!entitlement) {
      return {
        userId,
        featureKey,
        planCode: 'none',
        status: 'not_found',
        hasAccess: false,
        trialEndsAt: null,
        currentPeriodEndsAt: null,
        reason: 'not_found',
      };
    }

    const now = Date.now();
    const trialUntil = entitlement.trialEndsAt ? Date.parse(entitlement.trialEndsAt) : 0;
    const paidUntil = entitlement.currentPeriodEndsAt ? Date.parse(entitlement.currentPeriodEndsAt) : 0;
    const active = entitlement.status === 'active';
    const hasTrial = active && trialUntil > now;
    const hasPaidPeriod = active && paidUntil > now;

    return {
      ...entitlement,
      hasAccess: hasTrial || hasPaidPeriod,
      reason: hasTrial ? 'active_trial' : hasPaidPeriod ? 'active_period' : active ? 'expired' : 'inactive',
    };
  }
}
