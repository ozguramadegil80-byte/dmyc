import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type TariffPeriod = {
  id: string;
  periodId: string;
  marketCode: string;
  subscriberType: string;
  tariffType: string;
  tier: string;
  tlPerKwh: number;
  taxIncluded: boolean;
  validFrom: string;
  validTo: string | null;
  source: string;
};

type CostModesInput = {
  totalKwh: number;
  monthCount: number;
  startDate?: string;
  subscriberType?: string;
  marketCode?: string;
  equivalentKm?: number;
  gasolinePriceTlPerLiter?: number;
  litersPerHundredKm?: number;
};

@Injectable()
export class ElectricityTariffService {
  constructor(private readonly db: DatabaseService) {}

  async listPeriods(marketCode = 'TR', subscriberType?: string): Promise<TariffPeriod[]> {
    const params: unknown[] = [marketCode];
    let filter = 'WHERE market_code = $1';
    if (subscriberType) {
      params.push(subscriberType);
      filter += ' AND subscriber_type = $2';
    }

    const res = await this.db.query(
      `SELECT id, period_id AS "periodId", market_code AS "marketCode",
              subscriber_type AS "subscriberType", tariff_type AS "tariffType",
              tier, tl_per_kwh AS "tlPerKwh", tax_included AS "taxIncluded",
              valid_from AS "validFrom", valid_to AS "validTo", source, created_at AS "createdAt"
       FROM electricity_tariff_periods
       ${filter}
       ORDER BY valid_from DESC`,
      params,
    );

    return res.rows.map((r) => ({ ...r, tlPerKwh: Number(r.tlPerKwh) } as TariffPeriod));
  }

  async getActiveTariff(subscriberType = 'residential', marketCode = 'TR'): Promise<TariffPeriod | null> {
    const res = await this.db.query(
      `SELECT id, period_id AS "periodId", market_code AS "marketCode",
              subscriber_type AS "subscriberType", tariff_type AS "tariffType",
              tier, tl_per_kwh AS "tlPerKwh", tax_included AS "taxIncluded",
              valid_from AS "validFrom", valid_to AS "validTo", source
       FROM electricity_tariff_periods
       WHERE market_code = $1 AND subscriber_type = $2 AND valid_to IS NULL
       ORDER BY valid_from DESC
       LIMIT 1`,
      [marketCode, subscriberType],
    );

    if (!res.rows[0]) return null;
    return { ...res.rows[0], tlPerKwh: Number(res.rows[0].tlPerKwh) } as TariffPeriod;
  }

  async getTariffForDate(date: string, subscriberType = 'residential', marketCode = 'TR'): Promise<TariffPeriod | null> {
    const res = await this.db.query(
      `SELECT id, period_id AS "periodId", market_code AS "marketCode",
              subscriber_type AS "subscriberType", tariff_type AS "tariffType",
              tier, tl_per_kwh AS "tlPerKwh", tax_included AS "taxIncluded",
              valid_from AS "validFrom", valid_to AS "validTo", source
       FROM electricity_tariff_periods
       WHERE market_code = $1
         AND subscriber_type = $2
         AND valid_from <= $3::date
         AND (valid_to IS NULL OR valid_to >= $3::date)
       ORDER BY valid_from DESC
       LIMIT 1`,
      [marketCode, subscriberType, date],
    );

    if (!res.rows[0]) return null;
    return { ...res.rows[0], tlPerKwh: Number(res.rows[0].tlPerKwh) } as TariffPeriod;
  }

  async addTariffPeriod(body: {
    periodId: string;
    marketCode?: string;
    subscriberType?: string;
    tariffType?: string;
    tier?: string;
    tlPerKwh: number;
    taxIncluded?: boolean;
    validFrom: string;
    source?: string;
  }) {
    const marketCode = body.marketCode ?? 'TR';
    const subscriberType = body.subscriberType ?? 'residential';

    // Close the previous active period the day before this new one starts
    await this.db.query(
      `UPDATE electricity_tariff_periods
       SET valid_to = $1::date - INTERVAL '1 day'
       WHERE market_code = $2 AND subscriber_type = $3 AND valid_to IS NULL`,
      [body.validFrom, marketCode, subscriberType],
    );

    const res = await this.db.query(
      `INSERT INTO electricity_tariff_periods
         (period_id, market_code, subscriber_type, tariff_type, tier,
          tl_per_kwh, tax_included, valid_from, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9)
       ON CONFLICT (period_id) DO UPDATE SET
         tl_per_kwh   = EXCLUDED.tl_per_kwh,
         valid_from   = EXCLUDED.valid_from,
         source       = EXCLUDED.source
       RETURNING
         id, period_id AS "periodId", market_code AS "marketCode",
         subscriber_type AS "subscriberType", tl_per_kwh AS "tlPerKwh",
         tax_included AS "taxIncluded", valid_from AS "validFrom",
         valid_to AS "validTo", source, created_at AS "createdAt"`,
      [
        body.periodId,
        marketCode,
        subscriberType,
        body.tariffType ?? 'single_time',
        body.tier ?? 'standard',
        body.tlPerKwh,
        body.taxIncluded ?? true,
        body.validFrom,
        body.source ?? 'EPDK',
      ],
    );

    return { ...res.rows[0], tlPerKwh: Number(res.rows[0].tlPerKwh) };
  }

  // Month-by-month historical cost using the tariff period active in each month
  async calculateHistoricalCost(input: {
    startDate: string;
    totalKwh: number;
    monthCount: number;
    subscriberType?: string;
    marketCode?: string;
  }) {
    const periods = await this.listPeriods(input.marketCode ?? 'TR', input.subscriberType ?? 'residential');
    const kwhPerMonth = input.totalKwh / Math.max(1, input.monthCount);
    let totalCost = 0;

    const start = new Date(input.startDate);
    for (let i = 0; i < input.monthCount; i++) {
      const monthDate = new Date(Date.UTC(start.getFullYear(), start.getMonth() + i, 1));

      const tariff = periods.find((p) => {
        const from = new Date(p.validFrom);
        const to = p.validTo ? new Date(p.validTo) : null;
        return from <= monthDate && (to === null || to >= monthDate);
      });

      if (tariff) {
        totalCost += kwhPerMonth * tariff.tlPerKwh;
      }
    }

    return {
      totalCost: Math.round(totalCost),
      kwhPerMonth: Math.round(kwhPerMonth * 10) / 10,
    };
  }

  // Three cost modes: historical tariff | current tariff | gasoline equivalent
  async calculateCostModes(input: CostModesInput) {
    const subscriberType = input.subscriberType ?? 'residential';
    const marketCode = input.marketCode ?? 'TR';

    // Mode 1: Historical — month-by-month tariff periods
    let historicalTariffCost: number | null = null;
    if (input.startDate && input.monthCount > 0) {
      const hist = await this.calculateHistoricalCost({
        startDate: input.startDate,
        totalKwh: input.totalKwh,
        monthCount: input.monthCount,
        subscriberType,
        marketCode,
      });
      historicalTariffCost = hist.totalCost;
    }

    // Mode 2: Current tariff
    const activeTariff = await this.getActiveTariff(subscriberType, marketCode);
    const currentTariffCost = activeTariff
      ? Math.round(input.totalKwh * activeTariff.tlPerKwh)
      : null;

    // Mode 3: Gasoline equivalent
    let gasolineEquivalentCost: number | null = null;
    if (input.equivalentKm && input.gasolinePriceTlPerLiter && input.litersPerHundredKm) {
      gasolineEquivalentCost = Math.round(
        (input.equivalentKm / 100) * input.litersPerHundredKm * input.gasolinePriceTlPerLiter,
      );
    }

    const estimatedSaving =
      gasolineEquivalentCost !== null && currentTariffCost !== null
        ? gasolineEquivalentCost - currentTariffCost
        : null;

    return {
      totalKwh: input.totalKwh,
      historicalTariffCost,
      currentTariffCost,
      gasolineEquivalentCost,
      estimatedSaving,
      activeTariff: activeTariff
        ? { tlPerKwh: activeTariff.tlPerKwh, validFrom: activeTariff.validFrom }
        : null,
    };
  }
}
