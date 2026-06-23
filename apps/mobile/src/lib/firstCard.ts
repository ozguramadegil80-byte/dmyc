import type { VehicleCatalogItem } from '../types/vehicleCatalog';

export type FirstCard = {
  displayName: string;
  factoryRangeKm: number | null;
  expectedRealRangeMinKm: number | null;
  expectedRealRangeMaxKm: number | null;
  batteryCapacityKwh: number | null;
  batteryCapacitySource: 'net' | 'gross' | 'unknown';
  acMaxKw: number | null;
  dcMaxKw: number | null;
  dailySocMin: number | null;
  dailySocMax: number | null;
  dataConfidenceLabel: string;
};

const RANGE_MIN_FACTOR = 0.72;
const RANGE_MAX_FACTOR = 0.88;

export function buildFirstCard(vehicle: VehicleCatalogItem): FirstCard {
  const batteryCapacityKwh = vehicle.batteryNetKwh ?? vehicle.batteryGrossKwh;
  const batteryCapacitySource =
    vehicle.batteryNetKwh !== null
      ? 'net'
      : vehicle.batteryGrossKwh !== null
        ? 'gross'
        : 'unknown';

  return {
    displayName: vehicle.displayName,
    factoryRangeKm: vehicle.wltpRangeKm,
    expectedRealRangeMinKm: estimateRange(vehicle.wltpRangeKm, RANGE_MIN_FACTOR),
    expectedRealRangeMaxKm: estimateRange(vehicle.wltpRangeKm, RANGE_MAX_FACTOR),
    batteryCapacityKwh,
    batteryCapacitySource,
    acMaxKw: vehicle.acMaxKw,
    dcMaxKw: vehicle.dcMaxKw,
    dailySocMin: vehicle.recommendedDailySocMin,
    dailySocMax: vehicle.recommendedDailySocMax,
    dataConfidenceLabel: confidenceLabel(vehicle),
  };
}

function estimateRange(rangeKm: number | null, factor: number) {
  if (rangeKm === null) {
    return null;
  }

  return Math.round(rangeKm * factor);
}

function confidenceLabel(vehicle: VehicleCatalogItem) {
  const sourceText = [vehicle.sourceName, vehicle.sourceUrl, vehicle.verificationLevel]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr-TR');

  return sourceText.includes('official') || sourceText.includes('resmi') ? 'Fabrika Verisi' : 'Topluluk Verisi';
}
