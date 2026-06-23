import { Injectable } from '@nestjs/common';
import { VehicleSpecDto } from './types';

type UsageProfileProjection = {
  profileType: string;
  avgDailyKm: number | null;
  avgWeeklyKm: number | null;
  cityTripRatio: number | null;
  highwayTripRatio: number | null;
  dcChargeRatio: number | null;
  homeChargeRatio: number | null;
  avgStartSoc: number | null;
  avgEndSoc: number | null;
  confidenceScore: number;
  lastCalculatedAt: Date | string | null;
};

@Injectable()
export class FirstCardService {
  build(vehicle: VehicleSpecDto, usageProfile?: UsageProfileProjection) {
    const batteryCapacityKwh = vehicle.batteryNetKwh ?? vehicle.batteryGrossKwh;
    const usageConfidenceScore = usageProfile?.confidenceScore ?? 0;

    return {
      displayName: vehicle.displayName,
      sections: {
        factory: 'Fabrika Verisi',
        estimatedRange: 'Tahmini Gerçek Menzil',
        learnedUsage: 'Senin Kullanımından Öğrenilenler',
        dataConfidence: 'Veri Güveni',
        missingSignals: 'Eksik / Beklenen Sinyaller',
      },
      factoryRangeKm: vehicle.wltpRangeKm,
      expectedRealRangeMinKm: estimateRange(vehicle.wltpRangeKm, 0.72),
      expectedRealRangeMaxKm: estimateRange(vehicle.wltpRangeKm, 0.88),
      batteryCapacityKwh,
      batteryCapacitySource:
        vehicle.batteryNetKwh !== null
          ? 'net'
          : vehicle.batteryGrossKwh !== null
            ? 'gross'
            : 'unknown',
      acMaxKw: vehicle.acMaxKw,
      dcMaxKw: vehicle.dcMaxKw,
      dailySocMin: vehicle.recommendedDailySocMin,
      dailySocMax: vehicle.recommendedDailySocMax,
      dataConfidenceLabel: confidenceLabel(vehicle),
      usageProfile: usageProfile
        ? {
            profileType: usageProfile.profileType,
            avgDailyKm: usageProfile.avgDailyKm,
            avgWeeklyKm: usageProfile.avgWeeklyKm,
            cityTripRatio: usageProfile.cityTripRatio,
            highwayTripRatio: usageProfile.highwayTripRatio,
            dcChargeRatio: usageProfile.dcChargeRatio,
            homeChargeRatio: usageProfile.homeChargeRatio,
            avgStartSoc: usageProfile.avgStartSoc,
            avgEndSoc: usageProfile.avgEndSoc,
            confidenceScore: usageConfidenceScore,
            confidenceLabel: usageConfidenceLabel(usageConfidenceScore),
            learningState: usageLearningState(usageProfile.profileType, usageConfidenceScore),
            lastCalculatedAt: usageProfile.lastCalculatedAt,
            missingSignals: missingSignals(usageProfile),
          }
        : {
            profileType: 'unknown',
            avgDailyKm: null,
            avgWeeklyKm: null,
            cityTripRatio: null,
            highwayTripRatio: null,
            dcChargeRatio: null,
            homeChargeRatio: null,
            avgStartSoc: null,
            avgEndSoc: null,
            confidenceScore: 0,
            confidenceLabel: 'Öğreniyor',
            learningState: 'Sinyal bekleniyor',
            lastCalculatedAt: null,
            missingSignals: ['completed_trip', 'charge_session'],
          },
    };
  }
}

function estimateRange(rangeKm: number | null, factor: number) {
  return rangeKm === null ? null : Math.round(rangeKm * factor);
}

function confidenceLabel(vehicle: VehicleSpecDto) {
  const sourceText = [vehicle.sourceName, vehicle.sourceUrl, vehicle.verificationLevel]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr-TR');

  return sourceText.includes('official') || sourceText.includes('resmi') ? 'Fabrika Verisi' : 'Topluluk Verisi';
}

function usageConfidenceLabel(score: number) {
  if (score >= 0.65) {
    return 'Daha güvenilir';
  }

  if (score >= 0.35) {
    return 'Tahmini';
  }

  return 'Öğreniyor';
}

function usageLearningState(profileType: string, score: number) {
  if (profileType === 'observed' && score >= 0.35) {
    return 'Kullanım sinyali oluştu';
  }

  if (profileType === 'learning' || score > 0) {
    return 'Öğreniyor';
  }

  return 'Sinyal bekleniyor';
}

function missingSignals(profile: UsageProfileProjection) {
  const missing: string[] = [];

  if (profile.avgDailyKm === null || profile.cityTripRatio === null) {
    missing.push('completed_trip');
  }

  if (profile.homeChargeRatio === null || profile.avgStartSoc === null || profile.avgEndSoc === null) {
    missing.push('charge_session');
  }

  return missing;
}
