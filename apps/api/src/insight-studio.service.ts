import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type SimpleFilter = { field: string; op: string; value: unknown };
type FilterGroup = { operator?: 'AND' | 'OR'; filters: Array<SimpleFilter | FilterGroup> };
type FilterRuleSet = FilterGroup;

// Allowed filter fields mapped to their safe SQL expressions.
// Only fields listed here can appear in filter rules — prevents SQL injection.
const FILTER_FIELD_MAP: Record<string, string> = {
  // Vehicle spec
  brand:               'vs.brand',
  model:               'vs.model',
  battery_net_kwh:     'vs.battery_net_kwh',
  wltp_range_km:       'vs.wltp_range_km',
  // Usage profile
  avg_daily_km:        'up.avg_daily_km',
  city_trip_ratio:     'up.city_trip_ratio',
  highway_trip_ratio:  'up.highway_trip_ratio',
  dc_charge_ratio:     'up.dc_charge_ratio',
  home_charge_ratio:   'up.home_charge_ratio',
  up_confidence:       'up.confidence_score',
  // Battery lifecycle
  battery_usage_grade: 'bls.battery_usage_grade',
  total_efc:           'bls.total_efc',
  bls_dc_charge_ratio: 'bls.dc_charge_ratio',
  high_soc_charge:     'bls.high_soc_charge_count',
  dc_charge_count:     'bls.dc_charge_count',
  ac_charge_count:     'bls.ac_charge_count',
  bls_confidence:      'bls.confidence_score',
};

const ALLOWED_OPS = new Set(['=', '!=', '>', '<', '>=', '<=']);

function isSimpleFilter(f: SimpleFilter | FilterGroup): f is SimpleFilter {
  return 'field' in f;
}

function buildWhereClause(rules: FilterRuleSet, params: unknown[]): string {
  const operator = rules.operator ?? 'AND';
  const clauses: string[] = [];

  for (const filter of rules.filters) {
    if (isSimpleFilter(filter)) {
      const sqlExpr = FILTER_FIELD_MAP[filter.field];
      if (!sqlExpr) continue;
      if (!ALLOWED_OPS.has(filter.op)) continue;
      params.push(filter.value);
      clauses.push(`${sqlExpr} ${filter.op} $${params.length}`);
    } else {
      const nested = buildWhereClause(filter as FilterRuleSet, params);
      if (nested !== 'TRUE') clauses.push(`(${nested})`);
    }
  }

  return clauses.length === 0 ? 'TRUE' : clauses.join(` ${operator} `);
}

@Injectable()
export class InsightStudioService {
  constructor(private readonly db: DatabaseService) {}

  async executeQuery(filterRules: FilterRuleSet) {
    const params: unknown[] = [];
    const whereClause = buildWhereClause(filterRules, params);

    const res = await this.db.query(
      `
        SELECT
          COUNT(DISTINCT v.id)::int                                                        AS vehicle_count,
          COALESCE(SUM(tc.trip_count), 0)::int                                             AS trip_count,
          AVG(up.confidence_score)::numeric(5,4)                                           AS confidence_avg,
          jsonb_build_object(
            'brands',         jsonb_agg(DISTINCT vs.brand)          FILTER (WHERE vs.brand IS NOT NULL),
            'batteryGrades',  jsonb_agg(DISTINCT bls.battery_usage_grade) FILTER (WHERE bls.battery_usage_grade IS NOT NULL),
            'profileTypes',   jsonb_agg(DISTINCT up.profile_type)   FILTER (WHERE up.profile_type IS NOT NULL)
          )                                                                                 AS breakdown
        FROM vehicles v
        LEFT JOIN vehicle_specs vs           ON vs.id = v.vehicle_spec_id
        LEFT JOIN vehicle_ownerships vo      ON vo.vehicle_id = v.id AND vo.ended_at IS NULL
        LEFT JOIN usage_profiles up          ON up.vehicle_id = v.id
        LEFT JOIN vehicle_battery_lifecycle_stats bls ON bls.vehicle_id = v.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS trip_count FROM trips WHERE vehicle_id = v.id
        ) tc ON true
        WHERE ${whereClause}
      `,
      params,
    );

    const row = res.rows[0];
    return {
      vehicleCount:  Number(row?.vehicle_count ?? 0),
      tripCount:     Number(row?.trip_count ?? 0),
      confidenceAvg: row?.confidence_avg != null ? Number(row.confidence_avg) : null,
      breakdown:     row?.breakdown ?? {},
    };
  }

  async saveQuery(body: {
    queryName: string;
    requesterLabel?: string;
    filterRules: FilterRuleSet;
  }) {
    const result = await this.executeQuery(body.filterRules);

    const res = await this.db.query(
      `
        INSERT INTO insight_queries (
          query_name, requester_label, filter_rules, result_summary,
          vehicle_count, trip_count, confidence_avg, executed_at
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, now())
        RETURNING
          id,
          query_name       AS "queryName",
          requester_label  AS "requesterLabel",
          vehicle_count    AS "vehicleCount",
          trip_count       AS "tripCount",
          confidence_avg   AS "confidenceAvg",
          executed_at      AS "executedAt",
          created_at       AS "createdAt"
      `,
      [
        body.queryName,
        body.requesterLabel ?? null,
        JSON.stringify(body.filterRules),
        JSON.stringify(result),
        result.vehicleCount,
        result.tripCount,
        result.confidenceAvg,
      ],
    );

    return { ...res.rows[0], result };
  }

  async listQueries() {
    const res = await this.db.query(
      `
        SELECT
          id,
          query_name       AS "queryName",
          requester_label  AS "requesterLabel",
          vehicle_count    AS "vehicleCount",
          trip_count       AS "tripCount",
          confidence_avg   AS "confidenceAvg",
          result_summary   AS "resultSummary",
          executed_at      AS "executedAt",
          created_at       AS "createdAt"
        FROM insight_queries
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [],
    );
    return res.rows.map((r) => ({
      ...r,
      vehicleCount: r.vehicleCount != null ? Number(r.vehicleCount) : null,
      tripCount: r.tripCount != null ? Number(r.tripCount) : null,
      confidenceAvg: r.confidenceAvg != null ? Number(r.confidenceAvg) : null,
    }));
  }

  async createSegment(body: {
    segmentKey: string;
    label: string;
    description?: string;
    filterRules: FilterRuleSet;
  }) {
    const res = await this.db.query(
      `
        INSERT INTO ad_segments (segment_key, label, description, filter_rules)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (segment_key) DO UPDATE SET
          label        = EXCLUDED.label,
          description  = EXCLUDED.description,
          filter_rules = EXCLUDED.filter_rules,
          updated_at   = now()
        RETURNING
          id,
          segment_key        AS "segmentKey",
          label,
          description,
          vehicle_count      AS "vehicleCount",
          last_calculated_at AS "lastCalculatedAt",
          created_at         AS "createdAt"
      `,
      [body.segmentKey, body.label, body.description ?? null, JSON.stringify(body.filterRules)],
    );
    return res.rows[0] ?? null;
  }

  async listSegments() {
    const res = await this.db.query(
      `
        SELECT
          id,
          segment_key        AS "segmentKey",
          label,
          description,
          vehicle_count      AS "vehicleCount",
          last_calculated_at AS "lastCalculatedAt",
          created_at         AS "createdAt",
          updated_at         AS "updatedAt"
        FROM ad_segments
        ORDER BY vehicle_count DESC, created_at ASC
      `,
      [],
    );
    return res.rows.map((r) => ({
      ...r,
      vehicleCount: Number(r.vehicleCount ?? 0),
    }));
  }

  async refreshSegment(segmentKey: string) {
    const segRes = await this.db.query(
      `SELECT filter_rules FROM ad_segments WHERE segment_key = $1`,
      [segmentKey],
    );
    const segment = segRes.rows[0];
    if (!segment) return null;

    const result = await this.executeQuery(segment.filter_rules as FilterRuleSet);

    await this.db.query(
      `
        UPDATE ad_segments
        SET vehicle_count = $1, last_calculated_at = now(), updated_at = now()
        WHERE segment_key = $2
      `,
      [result.vehicleCount, segmentKey],
    );

    return { segmentKey, ...result };
  }

  async seedDefaultSegments() {
    const defaults: Array<{
      segmentKey: string;
      label: string;
      description: string;
      filterRules: FilterRuleSet;
    }> = [
      {
        segmentKey: 'high_dc_user',
        label: 'Yüksek DC Şarj Kullanıcısı',
        description: 'Şarj oturumlarının %40\'ından fazlası DC hızlı şarj',
        filterRules: {
          operator: 'AND',
          filters: [{ field: 'bls_dc_charge_ratio', op: '>', value: 0.4 }],
        },
      },
      {
        segmentKey: 'long_trip_ev',
        label: 'Uzun Mesafe EV Sürücüsü',
        description: 'Günlük ortalama 80 km üzeri yolculuk yapan',
        filterRules: {
          operator: 'AND',
          filters: [{ field: 'avg_daily_km', op: '>', value: 80 }],
        },
      },
      {
        segmentKey: 'city_only',
        label: 'Şehir İçi Kullanıcı',
        description: 'Yolculukların %80\'i şehir içi',
        filterRules: {
          operator: 'AND',
          filters: [{ field: 'city_trip_ratio', op: '>', value: 0.8 }],
        },
      },
      {
        segmentKey: 'high_stress_battery',
        label: 'Yüksek Stres Batarya Profili',
        description: 'Batarya kullanım derecesi yüksek stres olarak hesaplanan araçlar',
        filterRules: {
          operator: 'AND',
          filters: [{ field: 'battery_usage_grade', op: '=', value: 'high_stress' }],
        },
      },
    ];

    for (const seg of defaults) {
      await this.createSegment(seg);
    }

    return { seeded: defaults.length, segments: defaults.map((s) => s.segmentKey) };
  }
}
