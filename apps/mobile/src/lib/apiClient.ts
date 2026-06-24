import { Platform } from 'react-native';
import type { VehicleCatalogItem } from '../types/vehicleCatalog';

export type ApiHealth = {
  ok: boolean;
  service: string;
};

export type CreateUserInput = {
  username: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  phone: string;
  fullName: string;
  createdAt: string;
};

export type ApiPremiumAccess = {
  userId: string | null;
  featureKey: string;
  planCode: string;
  status: string;
  hasAccess: boolean;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  reason: string;
};

export type ApiVehicle = {
  id: string;
  vehicleSpecId: string;
  canonicalVehicleId: string;
  vin: string | null;
  displayName: string;
  createdAt: string;
};

export type ApiOwnership = {
  id: string;
  vehicleId: string;
  userId: string;
  startedAt: string;
  ownershipStatus: string;
};

export type ApiActiveBinding = {
  catalogKey: string | null;
  ownership: ApiOwnership;
  vehicle: ApiVehicle;
  access?: { id: string; role: string; permissions: string[] };
} | null;

export type ApiUsageSignal = {
  id: string;
  vehicleId: string | null;
  ownershipId: string | null;
  userId: string | null;
  signalType: string;
  payload: Record<string, unknown>;
  source: string;
  createdAt: string;
};

export type ApiTrip = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  startedAt: string;
  endedAt?: string | null;
  status: string;
  source?: string;
  distanceM?: number | null;
  durationSeconds?: number | null;
  avgSpeedKmh?: number | null;
  driverAssignmentStatus: string;
  hasPendingQuestions?: boolean;
  createdAt?: string;
  ambientTempC?: number | null;
  hvacInferred?: 'cooling' | 'heating' | 'none' | null;
  hvacConfirmationStatus?: 'pending' | 'confirmed' | 'denied' | 'skipped' | 'auto' | null;
};

export type ApiTripSummary = {
  vehicleId: string;
  tripCount: number;
  totalDistanceM: number;
  totalDurationSeconds: number;
  avgSpeedKmh: number;
  unknownDriverTripCount: number;
};

export type ApiTripRouteProgress = {
  tripId: string;
  vehicleId: string;
  userId: string | null;
  status: string;
  savedRouteId: string | null;
  savedRouteLabel: string | null;
  destinationLocationId: string | null;
  destinationLabel: string | null;
  destinationKind: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastRecordedAt: string | null;
  lastSpeedKmh: number | null;
  pointCount: number;
  remainingMeters: number | null;
  remainingKm: number | null;
  nearDestination: boolean;
  stoppedNearDestination: boolean;
};

export type ApiTripRecap = {
  id: string;
  tripId: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  distanceKm: string;
  durationMinutes: number;
  chargeDurationMinutes: number;
  energyUsedKwh: string | null;
  energyCost: string | null;
  arrivalSoc: string | null;
  passengerCount: number | null;
  climateUsage: string | null;
  efficiencyRating: string;
  drivingProfile: string;
  tripSummary: string;
  shareText: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiTripShareCard = {
  id: string;
  tripRecapId: string;
  tripId: string;
  vehicleId: string;
  cardType: string;
  publicToken: string;
  shareCount: number;
  sharePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ApiChargeSession = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  startedAt: string;
  endedAt: string | null;
  chargeLocationType: string;
  connectorType: string | null;
  startSoc: number | null;
  endSoc: number | null;
  energyKwh: number | null;
  costAmount: number | null;
  currency: string | null;
  source: string;
  confidenceScore: number;
  evidenceStatus: string;
  createdAt: string;
};

export type ApiChargingDecisionEvent = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  chargeSessionId: string | null;
  decisionAt: string;
  triggerType: string;
  perceivedNeed: string | null;
  startSoc: number | null;
  targetSoc: number | null;
  source: string;
  confidenceScore: number;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ApiChargeSummary = {
  vehicleId: string;
  chargeSessionCount: number;
  totalEnergyKwh: number;
  totalCostAmount: number;
  avgConfidenceScore: number;
  estimationContinuesWithoutManualData: boolean;
};

export type ApiUsageProfile = {
  vehicleId: string;
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
  lastCalculatedAt: string | null;
};

export type ApiRouteSummary = {
  vehicleId: string;
  routeCount: number;
  learnedRouteCount: number;
  totalObservedTripCount: number;
  topRoute: {
    id: string;
    routeKey: string;
    observedTripCount: number;
    confidenceScore: number | null;
  } | null;
  status: 'learning' | 'observed';
};

export type ApiSavedLocation = {
  id: string;
  userId: string;
  label: string;
  locationKind: 'home' | 'work' | 'school' | 'custom' | string;
  address: string | null;
  googlePlaceId: string | null;
  latitude: number;
  longitude: number;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiSavedRoute = {
  id: string;
  userId: string;
  originLocationId: string;
  destinationLocationId: string;
  label: string;
  confirmationCount: number;
  confidenceScore: number;
  lastConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  originLabel: string;
  destinationLabel: string;
};

export type ApiBatteryLifecycle = {
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  totalEfc: number;
  totalStressAdjustedCycles: number;
  avgChargeStartSoc: number | null;
  avgChargeEndSoc: number | null;
  acChargeCount: number;
  dcChargeCount: number;
  dcChargeRatio: number | null;
  highSocChargeCount: number;
  lowSocChargeCount: number;
  estimatedHighSocHours: number;
  estimatedLowSocEvents: number;
  avgStressMultiplier: number | null;
  batteryUsageGrade: string;
  confidenceScore: number;
  lastCalculatedAt: string | null;
};

export type ApiMonthlyReport = {
  vehicleId: string;
  periodYear: number | null;
  periodMonth: number | null;
  tripCount: number;
  totalDistanceM: number;
  totalDurationSeconds: number;
  avgSpeedKmh: number | null;
  totalEnergyKwh: number | null;
  totalCostAmount: number;
  currency: string;
  costPerKm: number | null;
  acChargeCount: number;
  dcChargeCount: number;
  fossilEquivCost: number | null;
  estimatedSavings: number | null;
  confidenceScore: number;
  lastCalculatedAt: string | null;
};

export type ApiAnnualReport = {
  vehicleId: string;
  periodYear: number | null;
  totalDistanceM: number;
  totalDurationSeconds: number;
  avgSpeedKmh: number | null;
  totalEnergyKwh: number | null;
  totalCostAmount: number;
  currency: string;
  costPerKm: number | null;
  acChargeCount: number;
  dcChargeCount: number;
  fossilEquivCost: number | null;
  estimatedSavings: number | null;
  optionalInsurance: number | null;
  optionalServiceCost: number | null;
  totalOwnershipCost: number | null;
  confidenceScore: number;
  lastCalculatedAt: string | null;
};

export type ApiPlacePrediction = {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export type ApiPlaceAutocompleteResult = {
  status: string;
  predictions: ApiPlacePrediction[];
};

export type ApiPlaceDetailsResult = {
  status: string;
  place: {
    address: string | null;
    googlePlaceId: string;
    latitude: number;
    longitude: number;
    name: string;
  } | null;
};

export type ApiRoutePreview = {
  status: string;
  route: {
    provider: string;
    originLabel?: string;
    destinationLabel?: string;
    distanceKm: number;
    durationMinutes: number;
    encodedPolyline: string | null;
    bounds: Record<string, unknown>;
    roadProfile: 'city' | 'mixed' | 'highway' | string;
    steps: Array<Record<string, unknown>>;
  } | null;
};

export type ApiRoutePlan = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  originLabel: string;
  destinationLabel: string;
  savedName: string | null;
  requestedDistanceKm: number;
  estimatedDurationMinutes: number | null;
  confidenceScore: number;
  feasibilityStatus: 'safe' | 'tight' | 'charge_required' | string;
  requestedAt: string;
  createdAt: string;
  scenario: {
    passengerCount: number;
    cargoLevel: string;
    weatherProfile: string;
    roadProfile: string;
    startSoc: number;
    targetArrivalSoc: number;
    estimatedConsumptionWhKm: number | null;
    estimatedEnergyKwh: number | null;
    usableEnergyKwh: number | null;
    energyMarginKwh: number | null;
    expectedRangeKm: number | null;
  };
  strategy: {
    type: string;
    summary: string;
    recommendedStartSoc: number;
    recommendedArrivalBufferSoc: number;
    chargeNeeded: boolean;
    estimatedChargeStops: number;
  };
  chargeStopCandidates: Array<{
    sequence: number;
    reason: string;
    energyNeededKwh: number | null;
    estimatedDcMinutes: number | null;
  }>;
};

export type ApiChargeStopPoiCandidate = {
  id: string;
  routePlanId: string;
  chargeStopCandidateId: string;
  stationPoiId: string;
  rank: number;
  detourKm: number | null;
  distanceFromOriginKm: number | null;
  remainingToDestinationKm: number | null;
  matchScore: number | null;
  recommendationReason: string;
  createdAt: string;
  station: {
    id: string;
    marketCode: string;
    googlePlaceId: string | null;
    sourceType: string;
    operatorName: string;
    stationName: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    maxDcKw: number | null;
    connectorTypes: string[];
    operationalStatus: string;
    evidenceStatus: string;
    sourceLabel: string | null;
    sourceUrl: string | null;
  };
};

export type ApiChargeStopPoiResult = {
  routePlanId: string;
  status: 'ready' | 'empty' | 'not_required' | 'no_verified_operator_poi' | string;
  candidates: ApiChargeStopPoiCandidate[];
};

export type ApiRouteGeometrySnapshot = {
  id: string;
  routePlanId: string;
  vehicleId: string;
  provider: string;
  providerRouteId: string | null;
  originLabel: string;
  destinationLabel: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  encodedPolyline: string | null;
  bounds: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  confidenceScore: number | null;
  createdAt: string;
};

export type ApiTripAdvisory = {
  id: string;
  vehicleId: string;
  routePlanId: string | null;
  tripId: string | null;
  guidanceSessionId: string;
  advisoryType: string;
  severity: 'info' | 'warning' | 'critical' | string;
  title: string;
  message: string;
  recommendedAction: string | null;
  speechText: string | null;
  triggerContext: Record<string, unknown>;
  priority: number;
  createdAt: string;
};

export type ApiPremiumGuidance = {
  session: {
    id: string;
    vehicleId: string;
    routePlanId: string | null;
    tripId: string | null;
    ownershipId: string | null;
    userId: string | null;
    status: string;
    guidanceMode: string;
    startedAt: string;
    endedAt: string | null;
    createdAt: string;
  } | null;
  advisories: ApiTripAdvisory[];
};

export type ApiLiveTripGuidance = ApiPremiumGuidance & {
  progress: ApiTripRouteProgress;
};

export type ApiCommunityBenchmark = {
  vehicleId: string;
  benchmarkCount: number;
  readyBenchmarkCount: number;
  totalMatchedTripCount: number;
  topBenchmark: {
    matchedTripCount: number;
    matchQualityScore: number | null;
    communityAvgDistanceM: number | null;
    communityAvgDurationSeconds: number | null;
    communityAvgSpeedKmh: number | null;
    communityAvgConsumptionKwh100Km: number | null;
    communityWarning: string | null;
  } | null;
  status: 'learning' | 'ready';
};

const envApiBaseUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.EXPO_PUBLIC_DMYC_API_URL;

const browserLocation = (globalThis as {
  location?: { hostname?: string; protocol?: string };
}).location;

const browserApiBaseUrl = browserLocation?.hostname
  ? `${browserLocation.protocol === 'https:' ? 'https:' : 'http:'}//${browserLocation.hostname}:4311`
  : 'http://localhost:4311';

export const API_BASE_URL =
  envApiBaseUrl ?? (Platform.OS === 'web' ? browserApiBaseUrl : 'http://192.168.1.21:4311');

const REQUEST_TIMEOUT_MS = 8000;

export async function fetchApiHealth() {
  return fetchJson<ApiHealth>('/health');
}

export async function fetchVehicleSpecs(market = 'TR') {
  return fetchJson<VehicleCatalogItem[]>(`/vehicle-specs?market=${encodeURIComponent(market)}`);
}

export async function createUser(input: CreateUserInput) {
  return fetchJson<ApiUser>('/users', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function loginUser(input: LoginUserInput) {
  return fetchJson<ApiUser>('/users/login', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function fetchActiveBindingForUser(userId: string) {
  return fetchJson<ApiActiveBinding>(`/users/${userId}/active-binding`);
}

export async function fetchActiveVehiclesForUser(userId: string) {
  return fetchJson<NonNullable<ApiActiveBinding>[]>(`/users/${userId}/vehicles`);
}

export async function fetchCurrentVehicleContext(userId: string) {
  return fetchJson<ApiActiveBinding>(`/users/${userId}/vehicle-context`);
}

export async function fetchPremiumAccess(userId: string) {
  return fetchJson<ApiPremiumAccess>(`/users/${userId}/premium-access`);
}

export async function fetchSavedLocations(userId: string) {
  return fetchJson<ApiSavedLocation[]>(`/users/${userId}/saved-locations`);
}

export async function createSavedLocation(
  userId: string,
  input: {
    label: string;
    locationKind?: string;
    address?: string;
    googlePlaceId?: string;
    latitude: number;
    longitude: number;
    source?: string;
  },
) {
  return fetchJson<ApiSavedLocation>(`/users/${userId}/saved-locations`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function updateSavedLocation(
  userId: string,
  locationId: string,
  input: { label: string; locationKind?: string },
) {
  return fetchJson<ApiSavedLocation>(`/users/${userId}/saved-locations/${locationId}`, {
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export async function deleteSavedLocation(userId: string, locationId: string) {
  await fetchJson<void>(`/users/${userId}/saved-locations/${locationId}`, { method: 'DELETE' });
}

export async function fetchSavedRoutes(userId: string) {
  return fetchJson<ApiSavedRoute[]>(`/users/${userId}/saved-routes`);
}

export async function deleteSavedRoute(userId: string, routeId: string) {
  await fetchJson<void>(`/users/${userId}/saved-routes/${routeId}`, { method: 'DELETE' });
}

export async function createSavedRoute(
  userId: string,
  input: {
    label: string;
    originLocationId: string;
    destinationLocationId: string;
  },
) {
  return fetchJson<ApiSavedRoute>(`/users/${userId}/saved-routes`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function createVehicle(input: { catalogKey?: string | null; vehicleSpecId?: string | null }) {
  return fetchJson<ApiVehicle>('/vehicles', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export type ApiAssessment = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  purchaseYear: number | null;
  odometerKm: number;
  city: string | null;
  vehicleAgeYears: number;
  annualKm: number;
  monthlyKm: number;
  practicalRangeKm: number | null;
  estimatedTotalFullCycles: number | null;
  estimatedMonthlyFullCycles: number | null;
  cityTrafficClass: string | null;
  usageLoadMultiplier: number | null;
  usageLoadAdjustedAnnualKm: number | null;
  scenarioId: string;
  scenarioTitle: string;
  scenarioBody: string;
  confidence: string;
  createdAt: string;
};

export async function createOwnership(input: {
  userId: string;
  vehicleId: string;
  purchaseYear?: number | null;
  odometerKm?: number | null;
}) {
  return fetchJson<ApiOwnership>('/vehicle-ownerships', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function createVehicleAssessment(
  vehicleId: string,
  input: {
    odometerKm: number;
    purchaseYear?: number | null;
    city?: string | null;
    ownershipId?: string | null;
    usageType?: string | null;
  },
) {
  return fetchJson<ApiAssessment>(`/vehicles/${vehicleId}/assessment`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function fetchLatestAssessment(vehicleId: string) {
  return fetchJson<ApiAssessment | null>(`/vehicles/${vehicleId}/assessment/latest`);
}

export async function createUsageSignal(input: {
  vehicleId?: string;
  ownershipId?: string;
  userId?: string;
  signalType: string;
  payload?: Record<string, unknown>;
  source?: string;
}) {
  return fetchJson<ApiUsageSignal>('/usage-signals', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function createTrip(input: {
  vehicleId: string;
  ownershipId?: string;
  userId?: string;
  startedAt?: string;
  startLocation?: { latitude: number; longitude: number };
  source?: string;
  plannedRouteId?: string;
  destinationLocationId?: string;
}) {
  return fetchJson<ApiTrip>('/trips', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function appendTripPoints(
  tripId: string,
  input: {
    points: Array<{
      recordedAt?: string;
      latitude: number;
      longitude: number;
      speedKmh?: number;
      headingDegrees?: number;
      altitudeM?: number;
      accuracyM?: number;
      source?: string;
    }>;
  },
) {
  return fetchJson<{ tripId: string; insertedCount: number }>(`/trips/${tripId}/points`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function finishTrip(
  tripId: string,
  input: {
    endedAt?: string;
    endLocation?: { latitude: number; longitude: number };
  },
) {
  return fetchJson<ApiTrip>(`/trips/${tripId}/finish`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function fetchTripRouteProgress(tripId: string) {
  return fetchJson<ApiTripRouteProgress | null>(`/trips/${tripId}/route-progress`);
}

export async function confirmTripHvac(tripId: string, confirmed: boolean) {
  return fetchJson<{ learned: boolean }>(`/trips/${tripId}/hvac-confirmation`, {
    method: 'PATCH',
    body: JSON.stringify({ confirmed }),
  });
}

export async function createTripRecap(tripId: string) {
  return fetchJson<ApiTripRecap>(`/trips/${tripId}/recap`, {
    method: 'POST',
  });
}

export async function fetchTripRecap(tripId: string) {
  return fetchJson<ApiTripRecap | null>(`/trips/${tripId}/recap`);
}

export async function createTripShareCard(recapId: string, cardType: 'story' | 'whatsapp' | 'x' | 'public' = 'story') {
  return fetchJson<ApiTripShareCard>(`/trip-recaps/${recapId}/share-cards`, {
    body: JSON.stringify({ cardType }),
    method: 'POST',
  });
}

export async function fetchTripSummary(vehicleId: string) {
  return fetchJson<ApiTripSummary>(`/vehicles/${vehicleId}/trip-summary`);
}

export async function createChargeSession(input: {
  vehicleId: string;
  ownershipId?: string;
  userId?: string;
  startedAt?: string;
  endedAt?: string;
  location?: { latitude: number; longitude: number };
  chargeLocationType?: string;
  connectorType?: string;
  startSoc?: number;
  endSoc?: number;
  energyKwh?: number;
  costAmount?: number;
  currency?: string;
  source?: string;
  confidenceScore?: number;
}) {
  return fetchJson<ApiChargeSession>('/charge-sessions', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function createChargingDecisionEvent(input: {
  vehicleId: string;
  ownershipId?: string;
  userId?: string;
  chargeSessionId?: string;
  decisionAt?: string;
  decisionLocation?: { latitude: number; longitude: number };
  triggerType?: string;
  perceivedNeed?: string;
  startSoc?: number;
  targetSoc?: number;
  source?: string;
  confidenceScore?: number;
  payload?: Record<string, unknown>;
}) {
  return fetchJson<ApiChargingDecisionEvent>('/charging-decision-events', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function fetchChargeSummary(vehicleId: string) {
  return fetchJson<ApiChargeSummary>(`/vehicles/${vehicleId}/charge-summary`);
}

export async function fetchUsageProfile(vehicleId: string) {
  return fetchJson<ApiUsageProfile>(`/vehicles/${vehicleId}/usage-profile`);
}

export async function fetchRouteSummary(vehicleId: string) {
  return fetchJson<ApiRouteSummary>(`/vehicles/${vehicleId}/route-summary`);
}

export async function fetchBatteryLifecycle(vehicleId: string) {
  return fetchJson<ApiBatteryLifecycle>(`/vehicles/${vehicleId}/battery-lifecycle`);
}

export async function fetchCommunityBenchmark(vehicleId: string) {
  return fetchJson<ApiCommunityBenchmark>(`/vehicles/${vehicleId}/community-benchmark`);
}

export async function fetchMonthlyReport(vehicleId: string) {
  return fetchJson<ApiMonthlyReport>(`/vehicles/${vehicleId}/monthly-report/latest`);
}

export async function fetchAnnualReport(vehicleId: string) {
  return fetchJson<ApiAnnualReport>(`/vehicles/${vehicleId}/annual-report/latest`);
}

export type ApiStateSnapshot = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  snapshotReason: string;
  snapshotDate: string;
  tripCount: number;
  totalDistanceM: number;
  totalEnergyKwh: number | null;
  batteryUsageGrade: string;
  totalEfc: number;
  confidenceScore: number;
  createdAt: string;
};

export type ApiVehicleDriver = {
  id: string;
  vehicleId: string;
  userId: string | null;
  driverLabel: string;
  activeSince: string;
  activeUntil: string | null;
  createdAt: string;
};

export type ApiTransferRequest = {
  id: string;
  vehicleId: string;
  fromOwnershipId: string | null;
  toUserId: string | null;
  status: 'pending' | 'accepted' | 'cancelled';
  dataShareConsent: boolean;
  requestedAt: string;
  resolvedAt: string | null;
  createdAt: string;
};

export type ApiPublicReport = {
  id: string;
  vehicleId: string;
  shareToken: string;
  verificationLevel: 'basic' | 'confirmed' | 'verified';
  snapshotData: {
    tripCount: number;
    chargeCount: number;
    learnedRoutes: number;
    distanceBand: string;
    batteryUsageGrade: string;
    totalEfc: number | null;
    usageSinceDate: string | null;
    verificationLevel: string;
    generatedAt: string;
  };
  viewCount: number;
  expiresAt: string | null;
  createdAt: string;
};

export type ApiRegistrySummary = {
  vehicleId: string;
  ownerships: Array<{
    id: string;
    userId: string;
    startedAt: string;
    endedAt: string | null;
    ownershipStatus: string;
  }>;
  snapshots: ApiStateSnapshot[];
  drivers: ApiVehicleDriver[];
  recentTransfers: ApiTransferRequest[];
};

export async function fetchRegistrySummary(vehicleId: string) {
  return fetchJson<ApiRegistrySummary>(`/vehicles/${vehicleId}/registry`);
}

export async function fetchStateSnapshots(vehicleId: string) {
  return fetchJson<ApiStateSnapshot[]>(`/vehicles/${vehicleId}/state-snapshots`);
}

export async function createStateSnapshot(vehicleId: string, reason = 'manual') {
  return fetchJson<ApiStateSnapshot>(`/vehicles/${vehicleId}/state-snapshots`, {
    body: JSON.stringify({ reason }),
    method: 'POST',
  });
}

export async function fetchDrivers(vehicleId: string) {
  return fetchJson<ApiVehicleDriver[]>(`/vehicles/${vehicleId}/drivers`);
}

export async function addDriver(
  vehicleId: string,
  input: { userId?: string; driverLabel?: string; activeSince?: string },
) {
  return fetchJson<ApiVehicleDriver>(`/vehicles/${vehicleId}/drivers`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function fetchTransferRequests(vehicleId: string) {
  return fetchJson<ApiTransferRequest[]>(`/vehicles/${vehicleId}/transfer-requests`);
}

export async function createTransferRequest(
  vehicleId: string,
  input: { toUserId?: string; dataShareConsent?: boolean },
) {
  return fetchJson<ApiTransferRequest>(`/vehicles/${vehicleId}/transfer-requests`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function resolveTransferRequest(
  transferId: string,
  status: 'accepted' | 'cancelled',
) {
  return fetchJson<ApiTransferRequest>(`/transfer-requests/${transferId}`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
  });
}

export async function generatePublicReport(vehicleId: string) {
  return fetchJson<ApiPublicReport>(`/vehicles/${vehicleId}/public-report`, {
    method: 'POST',
  });
}

export async function fetchPublicReport(vehicleId: string) {
  return fetchJson<ApiPublicReport | null>(`/vehicles/${vehicleId}/public-report`);
}

export async function fetchPublicReportByToken(token: string) {
  return fetchJson<ApiPublicReport | null>(`/public/vehicles/${token}`);
}

export type ApiContextQuestion = {
  id: string;
  tripId: string;
  vehicleId: string;
  questionType: 'CLIMATE_USAGE' | 'PASSENGER_COUNT' | 'CARGO_PRESENCE' | 'DEVIATION_REASON' | 'SERVICE_VISIT';
  isSilenced: boolean;
  answeredAt: string | null;
  createdAt: string;
  metadata?: Record<string, string>;
};

export async function fetchTripContextQuestions(tripId: string) {
  return fetchJson<ApiContextQuestion[]>(`/trips/${tripId}/context-questions`);
}

export async function recordTripContextAnswer(
  tripId: string,
  questionType: string,
  answer: string,
) {
  return fetchJson<{ ok: boolean; tripId: string; questionType: string; answer: string }>(
    `/trips/${tripId}/context-answers`,
    { body: JSON.stringify({ questionType, answer }), method: 'POST' },
  );
}

export type ApiServiceVisit = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  tripId: string | null;
  visitDate: string;
  visitType: string;
  odometerKm: number | null;
  serviceLocationName: string | null;
  detectionMethod: string;
  userConfirmed: boolean;
  notes: string | null;
  confidenceScore: number;
  createdAt: string;
  evidence: Array<{
    id: string;
    evidenceType: string;
    storageUri: string | null;
    confidenceScore: number;
  }>;
};

export type ApiServiceCompliance = {
  vehicleId: string;
  total: number;
  onTime: number;
  rate: number | null;
  serviceIntervalKm: number;
  nextServiceKm: number | null;
};

export async function fetchServiceVisits(vehicleId: string) {
  return fetchJson<ApiServiceVisit[]>(`/vehicles/${vehicleId}/service-visits`);
}

export async function createServiceVisit(vehicleId: string, body: {
  visitType?: string;
  visitDate?: string;
  odometerKm?: number;
  notes?: string;
  ownershipId?: string;
  userConfirmed?: boolean;
}) {
  return fetchJson<ApiServiceVisit>('/service-visits', {
    body: JSON.stringify({ vehicleId, ...body }),
    method: 'POST',
  });
}

export async function fetchServiceCompliance(vehicleId: string) {
  return fetchJson<ApiServiceCompliance>(`/vehicles/${vehicleId}/service-compliance`);
}

export type ApiExternalBatteryReport = {
  id: string;
  vehicleId: string;
  provider: string;
  reportType: string | null;
  reportUrl: string | null;
  reportDate: string | null;
  sohPercent: number | null;
  sourceType: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type ApiPremiumReport = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  reportData: {
    vehicleSummary: {
      scenarioId: string;
      scenarioTitle: string;
      odometerKm: number;
      vehicleAgeYears: number;
      annualKm: number;
      practicalRangeKm: number | null;
      estimatedTotalFullCycles: number | null;
      city: string | null;
      cityTrafficClass: string | null;
    } | null;
    driverUsageProfile: {
      included: boolean;
      dataSource: string;
      confidence: string;
      drivingStyle: {
        label: string;
        score: number | null;
        signals: {
          factoryReferenceConsumptionKwhPer100Km: number | null;
          consumptionDeviationPercent: number | null;
          dcFastChargeRatio: number | null;
          highSocChargeCount: number | null;
          lowSocChargeCount: number | null;
          totalChargeCount: number | null;
          batteryUsageGrade: string | null;
        };
      };
      chargingStyle: {
        label: string;
        dcFastChargeRatio: number | null;
        highSocWaitingRisk: string;
        lowSocUsageRisk: string;
      };
      summary: string;
    };
    economicSummary: {
      totalKwh: number | null;
      currentTariffCost: number | null;
      activeTariffTlPerKwh: number | null;
      fossilEquivCost: number | null;
      estimatedSavingsTl: number | null;
      currency: string;
    };
    verificationSummary: {
      shareToken: string;
      verificationLevel: string;
      generatedAt: string;
    } | null;
    externalBatteryReports: ApiExternalBatteryReport[];
    generatedAt: string;
  };
  drivingStyleLabel: string | null;
  drivingStyleScore: number | null;
  consumptionDeviationPercent: number | null;
  totalKwh: number | null;
  estimatedSavingsTl: number | null;
  confidence: string;
  createdAt: string;
};

export async function createPremiumReport(vehicleId: string, ownershipId?: string | null) {
  return fetchJson<ApiPremiumReport>(`/vehicles/${vehicleId}/premium-report`, {
    body: JSON.stringify({ ownershipId: ownershipId ?? undefined }),
    method: 'POST',
  });
}

export async function fetchLatestPremiumReport(vehicleId: string) {
  return fetchJson<ApiPremiumReport | null>(`/vehicles/${vehicleId}/premium-report/latest`);
}

export async function fetchPremiumReportPreview(vehicleId: string) {
  return fetchJson<ApiPremiumReport['reportData']>(`/vehicles/${vehicleId}/premium-report/preview`);
}

export async function addExternalBatteryReport(
  vehicleId: string,
  body: {
    provider: string;
    reportType?: string;
    reportUrl?: string;
    reportDate?: string;
    sohPercent?: number;
    notes?: string;
    ownershipId?: string;
  },
) {
  return fetchJson<ApiExternalBatteryReport>(`/vehicles/${vehicleId}/external-battery-reports`, {
    body: JSON.stringify(body),
    method: 'POST',
  });
}

export async function fetchExternalBatteryReports(vehicleId: string) {
  return fetchJson<ApiExternalBatteryReport[]>(`/vehicles/${vehicleId}/external-battery-reports`);
}

export async function fetchPlaceAutocomplete(
  input: string,
  language = 'tr',
  locationBias?: { latitude: number; longitude: number } | null,
) {
  const params = new URLSearchParams({
    input,
    language,
  });

  if (locationBias) {
    params.set('latitude', String(locationBias.latitude));
    params.set('longitude', String(locationBias.longitude));
  }

  return fetchJson<ApiPlaceAutocompleteResult>(`/maps/places/autocomplete?${params.toString()}`);
}

export async function fetchPlaceDetails(placeId: string, language = 'tr') {
  const params = new URLSearchParams({
    language,
    placeId,
  });

  return fetchJson<ApiPlaceDetailsResult>(`/maps/places/details?${params.toString()}`);
}

export async function fetchRoutePreview(input: {
  originLabel?: string;
  originPlaceId?: string;
  originLocation?: { latitude: number; longitude: number };
  destinationLabel?: string;
  destinationPlaceId?: string;
  destinationLocation?: { latitude: number; longitude: number };
  language?: string;
}) {
  return fetchJson<ApiRoutePreview>('/maps/route-preview', {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function createRoutePlan(
  vehicleId: string,
  input: {
    ownershipId?: string;
    userId?: string;
    savedName?: string;
    originLabel?: string;
    destinationLabel?: string;
    distanceKm: number;
    passengerCount?: number;
    cargoLevel?: string;
    weatherProfile?: string;
    roadProfile?: string;
    startSoc?: number;
    targetArrivalSoc?: number;
  },
) {
  return fetchJson<ApiRoutePlan>(`/vehicles/${vehicleId}/route-plans`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function fetchLatestRoutePlan(vehicleId: string) {
  return fetchJson<ApiRoutePlan | null>(`/vehicles/${vehicleId}/route-plans/latest`);
}

export async function createRouteGeometry(routePlanId: string, input?: NonNullable<ApiRoutePreview['route']>) {
  return fetchJson<ApiRouteGeometrySnapshot>(`/route-plans/${routePlanId}/route-geometry`, {
    body: JSON.stringify(input ?? {}),
    method: 'POST',
  });
}

export async function fetchLatestRouteGeometry(routePlanId: string) {
  return fetchJson<ApiRouteGeometrySnapshot | null>(`/route-plans/${routePlanId}/route-geometry/latest`);
}

export async function createChargeStopPoiCandidates(routePlanId: string) {
  return fetchJson<ApiChargeStopPoiResult>(`/route-plans/${routePlanId}/charge-stop-poi-candidates`, {
    method: 'POST',
  });
}

export async function fetchChargeStopPoiCandidates(routePlanId: string) {
  return fetchJson<ApiChargeStopPoiResult>(`/route-plans/${routePlanId}/charge-stop-poi-candidates`);
}

export async function createPremiumGuidance(routePlanId: string) {
  return fetchJson<ApiPremiumGuidance>(`/route-plans/${routePlanId}/premium-guidance`, {
    method: 'POST',
  });
}

export async function createMockGuidance(routePlanId: string, input: {
  pointCount?: number;
  distanceKm?: number;
  source?: string;
}) {
  return fetchJson<ApiPremiumGuidance>(`/route-plans/${routePlanId}/mock-guidance`, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export async function createLiveTripGuidance(tripId: string) {
  return fetchJson<ApiLiveTripGuidance>(`/trips/${tripId}/live-guidance`, {
    method: 'POST',
  });
}

export async function fetchLatestTripAdvisories(vehicleId: string) {
  return fetchJson<ApiPremiumGuidance>(`/vehicles/${vehicleId}/trip-advisories/latest`);
}

export type NearbyEvStation = {
  googlePlaceId: string;
  stationName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  maxDcKw: number | null;
  connectorTypes: string[];
  operationalStatus: 'active' | 'closed';
  sourceUrl: string | null;
};

export async function fetchNearbyEvStations(latitude: number, longitude: number) {
  return fetchJson<{ status: string; stations: NearbyEvStation[] }>(
    `/maps/places/nearby-ev?latitude=${latitude}&longitude=${longitude}`,
  );
}

// ── Vehicle access (rol/izin) ─────────────────────────────────────────────

export type ApiVehicleAccess = {
  accessId: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  role: 'owner' | 'manager' | 'driver' | 'viewer';
  permissions: string[];
  accessStatus: 'invited' | 'active' | 'suspended' | 'revoked';
  createdAt: string;
};

export type ApiMyVehicleAccess = {
  vehicleId: string;
  role: 'owner' | 'manager' | 'driver' | 'viewer';
  permissions: string[];
  accessStatus: string;
};

export async function fetchMyVehicleAccess(vehicleId: string, userId: string) {
  return fetchJson<ApiMyVehicleAccess>(
    `/vehicles/${vehicleId}/access/me?userId=${userId}`,
  );
}

export async function listVehicleAccess(vehicleId: string, userId: string) {
  return fetchJson<ApiVehicleAccess[]>(
    `/vehicles/${vehicleId}/access?userId=${userId}`,
  );
}

export async function revokeVehicleAccess(vehicleId: string, accessId: string, userId: string) {
  return fetchJson<{ id: string; accessStatus: string }>(
    `/vehicles/${vehicleId}/access/${accessId}/revoke?userId=${userId}`,
    { method: 'POST' },
  );
}

// ── Vehicle access invites ────────────────────────────────────────────────

export type ApiVehicleInvite = {
  status: 'PENDING';
  shareUrl: string;
  webUrl: string;
};

export type ApiAcceptInviteResult = {
  vehicleId: string;
  role: string;
  accessStatus: string;
};

export async function createVehicleInvite(
  vehicleId: string,
  userId: string,
  body: { identifier: string; role?: string; permissions?: string[] },
) {
  return fetchJson<ApiVehicleInvite>(
    `/vehicles/${vehicleId}/invites?userId=${userId}`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function acceptVehicleInvite(token: string, userId: string) {
  return fetchJson<ApiAcceptInviteResult>(
    `/vehicle-invites/${token}/accept`,
    { method: 'POST', body: JSON.stringify({ userId }) },
  );
}

export type ApiRouteFingerprint = {
  id: string;
  vehicleId: string;
  routeKey: string;
  originCell: string;
  destinationCell: string;
  normalDistanceM: number | null;
  normalDurationSeconds: number | null;
  normalAvgSpeedKmh: number | null;
  observedTripCount: number;
  confidenceScore: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  behaviorEcoScore: number | null;
  behaviorTripCount: number;
};

export async function listRouteFingerprints(vehicleId: string): Promise<ApiRouteFingerprint[]> {
  try {
    return await fetchJson<ApiRouteFingerprint[]>(`/vehicles/${vehicleId}/route-fingerprints`);
  } catch {
    return [];
  }
}

export async function matchRouteOrigin(vehicleId: string, lat: number, lng: number): Promise<ApiRouteFingerprint[]> {
  try {
    return await fetchJson<ApiRouteFingerprint[]>(
      `/vehicles/${vehicleId}/route-fingerprints/match-origin?lat=${lat}&lng=${lng}`,
    );
  } catch {
    return [];
  }
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(payload?.message ?? `API request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
