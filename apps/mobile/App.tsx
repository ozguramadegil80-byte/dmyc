import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
// react-native-maps: native only. Android requires API key in AndroidManifest (EAS build plugin injects it).
// Keep Android blocked until a new EAS build is taken — old APK was built without the key, native crash occurs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RNMaps: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try { RNMaps = require('react-native-maps'); } catch { /* maps not in this build */ }
}
const MapView = RNMaps?.default ?? null;
const Marker = RNMaps?.Marker ?? null;
import {
  appendTripPoints,
  createChargingDecisionEvent,
  createChargeSession,
  createChargeStopPoiCandidates,
  createLiveTripGuidance,
  createMockGuidance,
  createRoutePlan,
  createRouteGeometry,
  createSavedLocation,
  createSavedRoute,
  deleteSavedLocation,
  deleteSavedRoute,
  fetchNearbyEvStations,
  updateSavedLocation,
  createOwnership,
  createPremiumGuidance,
  createTripRecap,
  createTripShareCard,
  createTrip,
  createUser,
  createUsageSignal,
  createVehicle,
  fetchAnnualReport,
  fetchBatteryLifecycle,
  fetchMonthlyReport,
  fetchPublicReport,
  generatePublicReport,
  fetchRegistrySummary,
  fetchChargeSummary,
  fetchChargeStopPoiCandidates,
  fetchCommunityBenchmark,
  fetchRouteSummary,
  fetchLatestRoutePlan,
  fetchLatestRouteGeometry,
  fetchLatestTripAdvisories,
  fetchPlaceAutocomplete,
  fetchPlaceDetails,
  fetchPremiumAccess,
  fetchRoutePreview,
  fetchSavedLocations,
  fetchSavedRoutes,
  fetchTripRouteProgress,
  fetchTripSummary,
  fetchUsageProfile,
  fetchTripContextQuestions,
  recordTripContextAnswer,
  fetchServiceVisits,
  fetchServiceCompliance,
  createServiceVisit,
  fetchLatestAssessment,
  createVehicleAssessment,
  fetchLatestPremiumReport,
  createPremiumReport,
  addExternalBatteryReport,
  fetchApiHealth,
  fetchActiveBindingForUser,
  fetchActiveVehiclesForUser,
  listVehicleAccess,
  revokeVehicleAccess,
  createVehicleInvite,
  acceptVehicleInvite,
  matchRouteOrigin,
  listRouteFingerprints,
  type ApiRouteFingerprint,
  fetchVehicleSpecs,
  confirmTripHvac,
  finishTrip,
  loginUser,
  API_BASE_URL,
  type ApiActiveBinding,
  type ApiAnnualReport,
  type ApiBatteryLifecycle,
  type ApiMonthlyReport,
  type ApiContextQuestion,
  type ApiPublicReport,
  type ApiRegistrySummary,
  type ApiAssessment,
  type ApiPremiumReport,
  type ApiServiceVisit,
  type ApiServiceCompliance,
  type ApiChargeSession,
  type ApiChargeSummary,
  type ApiChargeStopPoiCandidate,
  type ApiChargeStopPoiResult,
  type ApiCommunityBenchmark,
  type ApiOwnership,
  type ApiPlacePrediction,
  type ApiPremiumAccess,
  type ApiPremiumGuidance,
  type ApiRouteGeometrySnapshot,
  type ApiRoutePlan,
  type ApiRoutePreview,
  type ApiRouteSummary,
  type ApiSavedLocation,
  type ApiSavedRoute,
  type ApiTrip,
  type ApiTripRecap,
  type ApiTripRouteProgress,
  type ApiTripShareCard,
  type ApiTripSummary,
  type ApiUser,
  type ApiUsageProfile,
  type ApiVehicle,
  type ApiVehicleAccess,
  type ApiVehicleInvite,
} from './src/lib/apiClient';
import { getTooltip, type TooltipKey } from './src/lib/tooltips';
import { buildFirstCard } from './src/lib/firstCard';
import {
  getBrandImageUrl,
  getBrands,
  getModelImageUrl,
  getModelsForBrand,
  getVariantsForModel,
  vehicleCatalog,
} from './src/lib/vehicleCatalog';
import { createTranslator, t, type Locale } from './src/i18n';
import type { VehicleCatalogItem } from './src/types/vehicleCatalog';

const SELECTED_VEHICLE_STORAGE_KEY = 'dmyc:selectedVehicleId';
const REGISTERED_USER_STORAGE_KEY = 'dmyc:registeredUser';
const BACKEND_BINDING_STORAGE_KEY = 'dmyc:backendBinding';
const TRACKING_MODE_STORAGE_KEY = 'dmyc:trackingMode';
const MARKET_STORAGE_KEY = 'dmyc:marketCode';
const LANGUAGE_STORAGE_KEY = 'dmyc:language';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBZlRjiGpz87gR2N5N0JbCeMaHDkL5FEy17bu2WXRrnfobOqireWsbn5foynK2wnPeiAI7oSXwiaBBNBFXlfaFq434Fn0CZlxKjhLhmOcaRdPhzEuESlYuODjpmbQBDhQmBxNzcao-dAOK7SyvWv1EY0PYNYLUfhTtiQiWBTmG_wSyO8cAv0j37TzhHpzhqhhvioR1YteqYuqTTAeC59SuZ8CbcGweqUSLn2pE7nGT4-HrJM-781mypqH_U0O1Kkme4KJZc8UKICj7f';

type Step = 'login' | 'register' | 'tracking' | 'brand' | 'model' | 'variant' | 'assessment'
          | 'today' | 'yolculuk' | 'sarj' | 'karne' | 'arac'
          | 'range' | 'locations' | 'profile';
type TrackingMode = 'basic' | 'advanced' | 'precise';
type MarketCode = 'TR' | 'GB';
type PlaceSearchStatus = 'idle' | 'searching' | 'empty' | 'error';
type RouteSaveIntent = 'saved' | 'skip';
type CurrentLocationResult =
  | { ok: true; latitude: number; longitude: number; accuracyM?: number | null }
  | { ok: false; reason: 'unsupported' | 'denied' | 'timeout' | 'unavailable' };
type AutoTripStatus =
  | 'off'
  | 'permissionPending'
  | 'watching'
  | 'moving'
  | 'active'
  | 'stopping'
  | 'permissionDenied'
  | 'unavailable';

const AUTO_TRIP_START_SPEED_KMH = 5;
const AUTO_TRIP_START_DEBOUNCE_MS = 15000;
const AUTO_TRIP_STOP_SPEED_KMH = 2;
const AUTO_TRIP_STOP_DEBOUNCE_MS = 180000;
const AUTO_TRIP_WATCH_TIME_INTERVAL_MS = 5000;
const AUTO_TRIP_WATCH_DISTANCE_INTERVAL_M = 10;
const UNKNOWN_ROUTE_NOTIFY_MS = 10 * 60 * 1000;
const HVAC_NOTIFY_DELAY_MS = 10 * 60 * 1000;
const SAVED_LOCATION_MATCH_RADIUS_M = 300;
const HVAC_LEARNED_KEY_COOLING = '@dmyc/hvac_cooling_learned';
const HVAC_LEARNED_KEY_HEATING = '@dmyc/hvac_heating_learned';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type RegistrationForm = {
  username: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
};

type LoginForm = {
  email: string;
  password: string;
};

type BackendBinding = {
  user: ApiUser;
  vehicle: ApiVehicle;
  ownership: ApiOwnership;
  catalogKey: string;
  access?: { id: string; role: string; permissions: string[] };
};

type TripPoint = {
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh?: number;
  accuracyM?: number;
};

type RoutePlanForm = {
  originLabel: string;
  originPlaceId: string;
  originLatitude: number | null;
  originLongitude: number | null;
  destinationLabel: string;
  destinationPlaceId: string;
  distanceKm: string;
  passengerCount: string;
  cargoLevel: 'light' | 'normal' | 'heavy';
  weatherProfile: 'normal' | 'cold' | 'hot' | 'rain';
  roadProfile: 'city' | 'mixed' | 'highway';
  startSoc: string;
  targetArrivalSoc: string;
};

type SavedLocationForm = {
  label: string;
  locationKind: 'home' | 'work' | 'school' | 'custom';
  searchLabel: string;
  selectedPlaceId: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  routeLabel: string;
  routeOriginId: string;
  routeDestinationId: string;
};

type ChargeForm = {
  startSoc: string;
  endSoc: string;
  energyKwh: string;
  costAmount: string;
  locationType: string;
  perceivedNeed: string;
  targetSoc: string;
  stationName: string;
};

function getTrackingModes(locale: Locale): Array<{
  mode: TrackingMode;
  title: string;
  description: string;
  details: string[];
}> {
  const translate = createTranslator(locale);

  return [
  {
    mode: 'basic',
    title: translate('mobile.tracking.basic.title'),
    description: translate('mobile.tracking.basic.description'),
    details: [
      translate('mobile.tracking.basic.detail.noExtraInput'),
      translate('mobile.tracking.basic.detail.estimatedRange'),
      translate('mobile.tracking.basic.detail.tripSummary'),
    ],
  },
  {
    mode: 'advanced',
    title: translate('mobile.tracking.advanced.title'),
    description: translate('mobile.tracking.advanced.description'),
    details: [
      translate('mobile.tracking.advanced.detail.optionalSoc'),
      translate('mobile.tracking.advanced.detail.betterChargeSummary'),
      translate('mobile.tracking.advanced.detail.higherConfidence'),
    ],
  },
  {
    mode: 'precise',
    title: translate('mobile.tracking.precise.title'),
    description: translate('mobile.tracking.precise.description'),
    details: [
      translate('mobile.tracking.precise.detail.documentVerification'),
      translate('mobile.tracking.precise.detail.realCost'),
      translate('mobile.tracking.precise.detail.preciseConsumption'),
    ],
  },
  ];
}

const emptyRegistrationForm: RegistrationForm = {
  username: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
};

const emptyLoginForm: LoginForm = {
  email: '',
  password: '',
};

const emptyRoutePlanForm: RoutePlanForm = {
  originLabel: '',
  originPlaceId: '',
  originLatitude: null,
  originLongitude: null,
  destinationLabel: '',
  destinationPlaceId: '',
  distanceKm: '',
  passengerCount: '2',
  cargoLevel: 'normal',
  weatherProfile: 'normal',
  roadProfile: 'mixed',
  startSoc: '80',
  targetArrivalSoc: '15',
};

const emptySavedLocationForm: SavedLocationForm = {
  label: '',
  locationKind: 'custom',
  searchLabel: '',
  selectedPlaceId: '',
  latitude: null,
  longitude: null,
  address: '',
  routeLabel: '',
  routeOriginId: '',
  routeDestinationId: '',
};

const emptyChargeForm: ChargeForm = {
  startSoc: '',
  endSoc: '',
  energyKwh: '',
  costAmount: '',
  locationType: 'unknown',
  perceivedNeed: '',
  targetSoc: '',
  stationName: '',
};

export default function App() {
  const [step, setStep] = useState<Step>('login');
  const [catalogItems, setCatalogItems] = useState<VehicleCatalogItem[]>(vehicleCatalog);
  const [catalogSource, setCatalogSource] = useState<'local' | 'api'>('local');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>(emptyRegistrationForm);
  const [loginForm, setLoginForm] = useState<LoginForm>(emptyLoginForm);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'saving'>('idle');
  const [registeredUser, setRegisteredUser] = useState<ApiUser | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'saving'>('idle');
  const [trackingMode, setTrackingMode] = useState<TrackingMode | null>(null);
  const [marketCode, setMarketCode] = useState<MarketCode>('TR');
  const [language, setLanguage] = useState<Locale>('tr');
  const [backendBinding, setBackendBinding] = useState<BackendBinding | null>(null);
  const [bindingStatus, setBindingStatus] = useState<'idle' | 'saving' | 'linked' | 'offline'>('idle');
  const [userVehicles, setUserVehicles] = useState<NonNullable<ApiActiveBinding>[]>([]);
  const [showVehicleSwitcher, setShowVehicleSwitcher] = useState(false);
  const [showDriversModal, setShowDriversModal] = useState(false);
  const [driversAccessList, setDriversAccessList] = useState<ApiVehicleAccess[]>([]);
  const [driversModalLoading, setDriversModalLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<ApiVehicleInvite | null>(null);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [acceptToken, setAcceptToken] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);
  const [vehicleRoutes, setVehicleRoutes] = useState<ApiRouteFingerprint[]>([]);
  const [showRouteSaveModal, setShowRouteSaveModal] = useState(false);
  const [originSaveName, setOriginSaveName] = useState('');
  const [routeSaveOrigin, setRouteSaveOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [showHvacModal, setShowHvacModal] = useState(false);
  const [pendingHvacTrip, setPendingHvacTrip] = useState<{ id: string; tempC: number; type: 'cooling' | 'heating' } | null>(null);
  const [activeTrip, setActiveTrip] = useState<ApiTrip | null>(null);
  const [lastCompletedTrip, setLastCompletedTrip] = useState<ApiTrip | null>(null);
  const [lastTripRecap, setLastTripRecap] = useState<ApiTripRecap | null>(null);
  const [lastTripShareCard, setLastTripShareCard] = useState<ApiTripShareCard | null>(null);
  const [tripPoints, setTripPoints] = useState<TripPoint[]>([]);
  const [tripRouteProgress, setTripRouteProgress] = useState<ApiTripRouteProgress | null>(null);
  const [tripSummary, setTripSummary] = useState<ApiTripSummary | null>(null);
  const [tripStatus, setTripStatus] = useState<'idle' | 'working' | 'offline'>('idle');
  const [tripMessage, setTripMessage] = useState<string | null>(null);
  const [testModeStatus, setTestModeStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [testModeMessage, setTestModeMessage] = useState<string | null>(null);
  const [autoTripEnabled, setAutoTripEnabled] = useState(false);
  const [autoTripStatus, setAutoTripStatus] = useState<AutoTripStatus>('off');
  const [autoTripMessage, setAutoTripMessage] = useState<string | null>(null);
  const [chargeForm, setChargeForm] = useState<ChargeForm>(emptyChargeForm);
  const [chargeStartedAt, setChargeStartedAt] = useState<Date | null>(null);
  const [lastChargeSession, setLastChargeSession] = useState<ApiChargeSession | null>(null);
  const [chargeSummary, setChargeSummary] = useState<ApiChargeSummary | null>(null);
  const [chargeStatus, setChargeStatus] = useState<'idle' | 'saving' | 'offline'>('idle');
  const [chargeMessage, setChargeMessage] = useState<string | null>(null);
  const [usageProfile, setUsageProfile] = useState<ApiUsageProfile | null>(null);
  const [routeSummary, setRouteSummary] = useState<ApiRouteSummary | null>(null);
  const [batteryLifecycle, setBatteryLifecycle] = useState<ApiBatteryLifecycle | null>(null);
  const [communityBenchmark, setCommunityBenchmark] = useState<ApiCommunityBenchmark | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<ApiMonthlyReport | null>(null);
  const [annualReport, setAnnualReport] = useState<ApiAnnualReport | null>(null);
  const [registrySummary, setRegistrySummary] = useState<ApiRegistrySummary | null>(null);
  const [publicReport, setPublicReport] = useState<ApiPublicReport | null>(null);
  const [serviceVisits, setServiceVisits] = useState<ApiServiceVisit[]>([]);
  const [serviceCompliance, setServiceCompliance] = useState<ApiServiceCompliance | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<ApiAssessment | null>(null);
  const [premiumReport, setPremiumReport] = useState<ApiPremiumReport | null>(null);
  const [assessmentOdometerKm, setAssessmentOdometerKm] = useState('');
  const [assessmentPurchaseYear, setAssessmentPurchaseYear] = useState('');
  const [assessmentCity, setAssessmentCity] = useState('');
  const [pendingContextQuestions, setPendingContextQuestions] = useState<ApiContextQuestion[]>([]);
  const [contextQuestionIndex, setContextQuestionIndex] = useState(0);
  const [routePlanForm, setRoutePlanForm] = useState<RoutePlanForm>(emptyRoutePlanForm);
  const [routePlan, setRoutePlan] = useState<ApiRoutePlan | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<ApiRouteGeometrySnapshot | null>(null);
  const [chargeStopPois, setChargeStopPois] = useState<ApiChargeStopPoiResult | null>(null);
  const [premiumAccess, setPremiumAccess] = useState<ApiPremiumAccess | null>(null);
  const [premiumGuidance, setPremiumGuidance] = useState<ApiPremiumGuidance | null>(null);
  const [routePlanStatus, setRoutePlanStatus] = useState<'idle' | 'saving' | 'offline'>('idle');
  const [routePlanMessage, setRoutePlanMessage] = useState<string | null>(null);
  const [routeSavePromptVisible, setRouteSavePromptVisible] = useState(false);
  const [routeSaveName, setRouteSaveName] = useState('');
  const [originPredictions, setOriginPredictions] = useState<ApiPlacePrediction[]>([]);
  const [originSearchStatus, setOriginSearchStatus] = useState<PlaceSearchStatus>('idle');
  const [destinationPredictions, setDestinationPredictions] = useState<ApiPlacePrediction[]>([]);
  const [destinationSearchStatus, setDestinationSearchStatus] = useState<PlaceSearchStatus>('idle');
  const [routePreview, setRoutePreview] = useState<ApiRoutePreview | null>(null);
  const [savedLocations, setSavedLocations] = useState<ApiSavedLocation[]>([]);
  const savedLocationsRef = useRef<ApiSavedLocation[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<ApiSavedRoute[]>([]);
  const [savedLocationForm, setSavedLocationForm] = useState<SavedLocationForm>(emptySavedLocationForm);
  const [savedLocationPredictions, setSavedLocationPredictions] = useState<ApiPlacePrediction[]>([]);
  const [savedLocationSearchStatus, setSavedLocationSearchStatus] = useState<PlaceSearchStatus>('idle');
  const [savedLocationStatus, setSavedLocationStatus] = useState<'idle' | 'saving' | 'offline'>('idle');
  const [savedLocationMessage, setSavedLocationMessage] = useState<string | null>(null);
  const [selectedSavedRouteId, setSelectedSavedRouteId] = useState<string>('');
  const [selectedDestinationLocationId, setSelectedDestinationLocationId] = useState<string>('');
  const [tripOriginQuery, setTripOriginQuery] = useState<string>('');
  const [tripOriginPredictions, setTripOriginPredictions] = useState<ApiPlacePrediction[]>([]);
  const [tripOriginLocation, setTripOriginLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tripDestQuery, setTripDestQuery] = useState<string>('');
  const [tripDestPredictions, setTripDestPredictions] = useState<ApiPlacePrediction[]>([]);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState<'origin' | 'destination'>('destination');
  const [tripWelcomeVisible, setTripWelcomeVisible] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeModalIsOnboarding, setWelcomeModalIsOnboarding] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCatalogItem | null>(null);
  const activeTripRef = useRef<ApiTrip | null>(null);
  const backendBindingRef = useRef<BackendBinding | null>(null);
  const tripPointsRef = useRef<TripPoint[]>([]);
  const autoTripSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const autoTripMovingSinceRef = useRef<number | null>(null);
  const autoTripStoppedSinceRef = useRef<number | null>(null);
  const autoTripWorkingRef = useRef(false);
  const autoTripPointIndexRef = useRef(0);
  const detectedRouteRef = useRef<ApiRouteFingerprint | null>(null);
  const routeMatchCheckedRef = useRef(false);
  const unknownOriginTripRef = useRef<{ lat: number; lng: number } | null>(null);
  const unknownRouteNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hvacNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const brands = useMemo(() => getBrands(catalogItems), [catalogItems]);
  const visibleBrands = useMemo(
    () => filterText(brands, brandQuery),
    [brandQuery, brands]
  );
  const popularBrands = useMemo(() => {
    const preferred = ['Tesla', 'Togg', 'BYD', 'Hyundai', 'Kia', 'BMW', 'Mercedes'];
    return preferred.filter((brand) => brands.includes(brand));
  }, [brands]);
  const brandImageByBrand = useMemo(
    () =>
      Object.fromEntries(
        brands.map((brand) => [brand, getBrandImageUrl(brand, catalogItems)])
      ),
    [brands, catalogItems]
  );
  const models = useMemo(
    () => getModelsForBrand(selectedBrand, catalogItems),
    [catalogItems, selectedBrand]
  );
  const visibleModels = useMemo(
    () => filterText(models, modelQuery),
    [modelQuery, models]
  );
  const variants = useMemo(
    () => getVariantsForModel(selectedBrand, selectedModel, catalogItems),
    [catalogItems, selectedBrand, selectedModel]
  );
  const selectedBrandImage = useMemo(
    () => getBrandImageUrl(selectedBrand, catalogItems),
    [catalogItems, selectedBrand]
  );
  const selectedModelImage = useMemo(
    () => getModelImageUrl(selectedBrand, selectedModel, catalogItems),
    [catalogItems, selectedBrand, selectedModel]
  );

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    backendBindingRef.current = backendBinding;
  }, [backendBinding]);

  useEffect(() => {
    savedLocationsRef.current = savedLocations;
  }, [savedLocations]);

  useEffect(() => {
    tripPointsRef.current = tripPoints;
  }, [tripPoints]);

  const loadCatalogFromApi = async () => {
    setApiStatus('checking');

    try {
      await fetchApiHealth();
      const apiCatalog = await fetchVehicleSpecs(marketCode);
      setCatalogItems(apiCatalog);
      setCatalogSource('api');
      setApiStatus('online');
    } catch {
      setCatalogItems(marketCode === 'TR' ? vehicleCatalog : []);
      setCatalogSource('local');
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    loadCatalogFromApi();
  }, [marketCode]);

  useEffect(() => {
    if (step !== 'range') {
      return undefined;
    }

    const query = routePlanForm.originLabel.trim();

    if (query.length < 2 || routePlanForm.originPlaceId || hasRouteOriginLocation(routePlanForm)) {
      setOriginPredictions([]);
      setOriginSearchStatus('idle');
      return undefined;
    }

    const timeout = setTimeout(() => {
      setOriginSearchStatus('searching');
      fetchPlaceAutocomplete(query, language)
        .then((result) => {
          setOriginPredictions(result.predictions);
          setOriginSearchStatus(result.predictions.length > 0 ? 'idle' : 'empty');
        })
        .catch(() => {
          setOriginPredictions([]);
          setOriginSearchStatus('error');
        });
    }, 350);

    return () => clearTimeout(timeout);
  }, [language, routePlanForm.originLabel, routePlanForm.originLatitude, routePlanForm.originLongitude, routePlanForm.originPlaceId, step]);

  useEffect(() => {
    if (step !== 'range') {
      return undefined;
    }

    const query = routePlanForm.destinationLabel.trim();

    if (query.length < 2 || routePlanForm.destinationPlaceId) {
      setDestinationPredictions([]);
      setDestinationSearchStatus('idle');
      return undefined;
    }

    const timeout = setTimeout(() => {
      setDestinationSearchStatus('searching');
      fetchPlaceAutocomplete(query, language, getRouteOriginLocation(routePlanForm))
        .then((result) => {
          setDestinationPredictions(result.predictions);
          setDestinationSearchStatus(result.predictions.length > 0 ? 'idle' : 'empty');
        })
        .catch(() => {
          setDestinationPredictions([]);
          setDestinationSearchStatus('error');
        });
    }, 350);

    return () => clearTimeout(timeout);
  }, [language, routePlanForm.destinationLabel, routePlanForm.destinationPlaceId, routePlanForm.originLatitude, routePlanForm.originLongitude, step]);

  useEffect(() => {
    const hasOrigin = Boolean(routePlanForm.originPlaceId) || hasRouteOriginLocation(routePlanForm);
    const hasDestination = Boolean(routePlanForm.destinationPlaceId);

    if (step !== 'range' || !hasOrigin || !hasDestination) {
      return;
    }

    fetchRoutePreview({
      destinationLabel: routePlanForm.destinationLabel,
      destinationPlaceId: routePlanForm.destinationPlaceId,
      language,
      originLabel: routePlanForm.originLabel,
      originLocation: getRouteOriginLocation(routePlanForm) ?? undefined,
      originPlaceId: routePlanForm.originPlaceId,
    })
      .then((preview) => {
        setRoutePreview(preview);

        if (preview.route) {
          setRoutePlanForm((current) => ({
            ...current,
            distanceKm: String(preview.route?.distanceKm ?? current.distanceKm),
            roadProfile: preview.route?.roadProfile === 'city' || preview.route?.roadProfile === 'highway' ? preview.route.roadProfile : 'mixed',
          }));
        }
      })
      .catch(() => setRoutePreview(null));
  }, [language, routePlanForm.destinationPlaceId, routePlanForm.originLatitude, routePlanForm.originLongitude, routePlanForm.originPlaceId, step]);

  useEffect(() => {
    if (!autoTripEnabled) {
      autoTripSubscriptionRef.current?.remove();
      autoTripSubscriptionRef.current = null;
      autoTripMovingSinceRef.current = null;
      autoTripStoppedSinceRef.current = null;
      setAutoTripStatus('off');
      return undefined;
    }

    if (!backendBinding) {
      setAutoTripStatus('unavailable');
      setAutoTripMessage(t('mobile.autoTrip.message.needsBinding'));
      return undefined;
    }

    let cancelled = false;

    const startWatcher = async () => {
      setAutoTripStatus('permissionPending');
      setAutoTripMessage(null);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (cancelled) {
          return;
        }

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setAutoTripStatus('permissionDenied');
          setAutoTripEnabled(false);
          setAutoTripMessage(t('mobile.autoTrip.message.permissionDenied'));
          return;
        }

        autoTripSubscriptionRef.current?.remove();
        autoTripSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: AUTO_TRIP_WATCH_DISTANCE_INTERVAL_M,
            timeInterval: AUTO_TRIP_WATCH_TIME_INTERVAL_MS,
          },
          (position) => {
            void handleAutoTripPosition(position);
          },
        );

        if (!cancelled) {
          setAutoTripStatus(activeTripRef.current ? 'active' : 'watching');
          setAutoTripMessage(t('mobile.autoTrip.message.watching'));
        }
      } catch {
        if (!cancelled) {
          setAutoTripStatus('unavailable');
          setAutoTripEnabled(false);
          setAutoTripMessage(t('mobile.autoTrip.message.unavailable'));
        }
      }
    };

    void startWatcher();

    return () => {
      cancelled = true;
      autoTripSubscriptionRef.current?.remove();
      autoTripSubscriptionRef.current = null;
    };
  }, [autoTripEnabled, backendBinding?.ownership.id, backendBinding?.user.id, backendBinding?.vehicle.id]);

  // Bildirim izni + notification tap handler
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'unknown_route' && data?.lat && data?.lng) {
        setRouteSaveOrigin({ lat: data.lat as number, lng: data.lng as number });
        setOriginSaveName('');
        setShowRouteSaveModal(true);
      }
      if (data?.type === 'hvac_check' && data?.tripId) {
        setPendingHvacTrip({
          id: data.tripId as string,
          tempC: data.tempC as number,
          type: data.hvacType as 'cooling' | 'heating',
        });
        setShowHvacModal(true);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!backendBinding) {
      setUsageProfile(null);
      setRouteSummary(null);
      setBatteryLifecycle(null);
      setCommunityBenchmark(null);
      setRoutePlan(null);
      setRouteGeometry(null);
      setChargeStopPois(null);
      setPremiumGuidance(null);
      setSavedLocations([]);
      setSavedRoutes([]);
      return;
    }

    refreshUsageProfile(backendBinding.vehicle.id);
    refreshRouteSummary(backendBinding.vehicle.id);
    refreshBatteryLifecycle(backendBinding.vehicle.id);
    refreshCommunityBenchmark(backendBinding.vehicle.id);
    refreshMonthlyReport(backendBinding.vehicle.id);
    refreshAnnualReport(backendBinding.vehicle.id);
    refreshRegistrySummary(backendBinding.vehicle.id);
    refreshPublicReport(backendBinding.vehicle.id);
    refreshServiceData(backendBinding.vehicle.id);
    refreshLatestAssessment(backendBinding.vehicle.id);
    refreshPremiumReport(backendBinding.vehicle.id);
    fetchLatestRoutePlan(backendBinding.vehicle.id)
      .then((latestPlan) => {
        setRoutePlan(latestPlan);
        if (latestPlan) {
          fetchLatestRouteGeometry(latestPlan.id).then(setRouteGeometry).catch(() => setRouteGeometry(null));
          fetchChargeStopPoiCandidates(latestPlan.id).then(setChargeStopPois).catch(() => setChargeStopPois(null));
        } else {
          setRouteGeometry(null);
          setChargeStopPois(null);
        }
      })
      .catch(() => {
        setRoutePlan(null);
        setRouteGeometry(null);
        setChargeStopPois(null);
      });
    fetchLatestTripAdvisories(backendBinding.vehicle.id).then(setPremiumGuidance).catch(() => setPremiumGuidance(null));
    refreshSavedLocationData(backendBinding.user.id);
  }, [backendBinding]);

  useEffect(() => {
    if (step !== 'locations') {
      return undefined;
    }

    const query = savedLocationForm.searchLabel.trim();

    if (query.length < 2 || savedLocationForm.selectedPlaceId) {
      setSavedLocationPredictions([]);
      setSavedLocationSearchStatus('idle');
      return undefined;
    }

    const timeout = setTimeout(() => {
      setSavedLocationSearchStatus('searching');
      fetchPlaceAutocomplete(query, language)
        .then((result) => {
          setSavedLocationPredictions(result.predictions);
          setSavedLocationSearchStatus(result.predictions.length > 0 ? 'idle' : 'empty');
        })
        .catch(() => {
          setSavedLocationPredictions([]);
          setSavedLocationSearchStatus('error');
        });
    }, 350);

    return () => clearTimeout(timeout);
  }, [language, savedLocationForm.searchLabel, savedLocationForm.selectedPlaceId, step]);

  // Trip origin autocomplete
  useEffect(() => {
    const query = tripOriginQuery.trim();
    if (query.length < 2) { setTripOriginPredictions([]); return undefined; }
    const timeout = setTimeout(() => {
      fetchPlaceAutocomplete(query, language)
        .then((result) => setTripOriginPredictions(result.predictions))
        .catch(() => setTripOriginPredictions([]));
    }, 350);
    return () => clearTimeout(timeout);
  }, [language, tripOriginQuery]);

  // Trip destination autocomplete
  useEffect(() => {
    const query = tripDestQuery.trim();
    if (query.length < 2) {
      setTripDestPredictions([]);
      return undefined;
    }
    const timeout = setTimeout(() => {
      fetchPlaceAutocomplete(query, language)
        .then((result) => setTripDestPredictions(result.predictions))
        .catch(() => setTripDestPredictions([]));
    }, 350);
    return () => clearTimeout(timeout);
  }, [language, tripDestQuery]);

  const selectTripOriginPlace = async (prediction: ApiPlacePrediction) => {
    try {
      const details = await fetchPlaceDetails(prediction.placeId, language);
      const place = details.place;
      if (!place) return;
      setTripOriginLocation({ latitude: place.latitude, longitude: place.longitude });
      setTripOriginQuery(prediction.description);
      setTripOriginPredictions([]);
    } catch {}
  };

  const clearTripOrigin = () => {
    setTripOriginLocation(null);
    setTripOriginQuery('');
    setTripOriginPredictions([]);
  };

  const selectTripDestinationPlace = async (prediction: ApiPlacePrediction) => {
    const binding = backendBindingRef.current;
    if (!binding) return;
    try {
      const details = await fetchPlaceDetails(prediction.placeId, language);
      const place = details.place;
      if (!place) return;
      const location = await createSavedLocation(binding.user.id, {
        label: prediction.description,
        locationKind: 'waypoint',
        address: prediction.description,
        googlePlaceId: place.googlePlaceId,
        latitude: place.latitude,
        longitude: place.longitude,
        source: 'trip_destination',
      });
      setSelectedDestinationLocationId(location.id);
      setSelectedSavedRouteId('');
      setTripDestQuery(prediction.description);
      setTripDestPredictions([]);
    } catch {
      // silently ignore — user can retry
    }
  };

  // MapLocationPicker: select destination without saving
  const selectMapLocation = async (
    coord: { latitude: number; longitude: number },
    label: string,
    placeId: string | null,
  ) => {
    const binding = backendBindingRef.current;
    if (!binding) return;
    try {
      const location = await createSavedLocation(binding.user.id, {
        label: label || 'Hedef',
        locationKind: 'waypoint',
        address: label,
        googlePlaceId: placeId ?? undefined,
        latitude: coord.latitude,
        longitude: coord.longitude,
        source: 'trip_destination',
      });
      setSelectedDestinationLocationId(location.id);
      setSelectedSavedRouteId('');
      setTripDestQuery(label || 'Hedef');
      setTripDestPredictions([]);
    } catch {}
  };

  // MapLocationPicker: save with a user-given name
  const saveMapLocation = async (
    saveName: string,
    coord: { latitude: number; longitude: number },
    label: string,
    placeId: string | null,
  ) => {
    const binding = backendBindingRef.current;
    if (!binding) return;
    const location = await createSavedLocation(binding.user.id, {
      label: saveName,
      address: label,
      googlePlaceId: placeId ?? undefined,
      latitude: coord.latitude,
      longitude: coord.longitude,
      source: 'manual',
    });
    setSavedLocations((prev) => [...prev, location]);
    setSelectedDestinationLocationId(location.id);
    setSelectedSavedRouteId('');
    setTripDestQuery(saveName);
    setTripDestPredictions([]);
  };

  useEffect(() => {
    let isMounted = true;

    if (!registeredUser) {
      setPremiumAccess(null);
      return () => {
        isMounted = false;
      };
    }

    fetchPremiumAccess(registeredUser.id)
      .then((access) => {
        if (isMounted) {
          setPremiumAccess(access);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPremiumAccess(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [registeredUser]);

  useEffect(() => {
    let isMounted = true;

    async function restoreUser() {
      const [storedUser, storedBinding, storedTrackingMode, storedMarketCode, storedLanguage] = await Promise.all([
        safeStorageGet(REGISTERED_USER_STORAGE_KEY),
        safeStorageGet(BACKEND_BINDING_STORAGE_KEY),
        safeStorageGet(TRACKING_MODE_STORAGE_KEY),
        safeStorageGet(MARKET_STORAGE_KEY),
        safeStorageGet(LANGUAGE_STORAGE_KEY),
      ]);

      if (!isMounted) {
        return;
      }

      let restoredUser: ApiUser | null = null;
      let restoredBindingLinked = false;

      if (storedUser) {
        const parsedUser = safeJsonParse<ApiUser>(storedUser);

        if (parsedUser) {
          restoredUser = parsedUser;
          setRegisteredUser(parsedUser);
        } else {
          await safeStorageRemove(REGISTERED_USER_STORAGE_KEY);
        }
      }

      if (isTrackingMode(storedTrackingMode)) {
        setTrackingMode(storedTrackingMode);
      }

      if (isMarketCode(storedMarketCode)) {
        setMarketCode(storedMarketCode);
      }

      if (isLocale(storedLanguage)) {
        setLanguage(storedLanguage);
      } else {
        const inferredLanguage = inferDeviceLanguage();
        const inferredMarket = inferMarketFromDevice(inferredLanguage);
        setLanguage(inferredLanguage);
        setMarketCode(inferredMarket);
        await Promise.all([
          safeStorageSet(LANGUAGE_STORAGE_KEY, inferredLanguage),
          safeStorageSet(MARKET_STORAGE_KEY, inferredMarket),
        ]);
      }

      if (storedBinding) {
        const parsedBinding = safeJsonParse<BackendBinding>(storedBinding);
        const parsedUser = storedUser ? safeJsonParse<ApiUser>(storedUser) : null;

        if (parsedBinding && parsedUser && parsedBinding.user.id === parsedUser.id) {
          restoredBindingLinked = true;
          setBackendBinding(parsedBinding);
          setBindingStatus('linked');
        } else {
          await safeStorageRemove(BACKEND_BINDING_STORAGE_KEY);
          await safeStorageRemove(SELECTED_VEHICLE_STORAGE_KEY);
        }
      }

      if (restoredUser) {
        setStep(restoredBindingLinked ? 'today' : storedTrackingMode ? 'brand' : 'tracking');
      }
    }

    restoreUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSelection() {
      if (!registeredUser || backendBinding?.user.id !== registeredUser.id) {
        return;
      }

      const storedVehicleId = await safeStorageGet(SELECTED_VEHICLE_STORAGE_KEY);
      const vehicleKey = storedVehicleId ?? backendBinding.catalogKey;
      const storedVehicle = catalogItems.find((vehicle) => stableVehicleKey(vehicle) === vehicleKey || vehicle.id === vehicleKey);

      if (isMounted && storedVehicle) {
        setSelectedBrand(storedVehicle.brand);
        setSelectedModel(storedVehicle.model);
        setSelectedVehicle(storedVehicle);
        setStep('today');
      }
    }

    restoreSelection();

    return () => {
      isMounted = false;
    };
  }, [backendBinding, catalogItems, registeredUser]);

  const chooseBrand = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
    setSelectedVehicle(null);
    setModelQuery('');
    AsyncStorage.removeItem(SELECTED_VEHICLE_STORAGE_KEY);
  };

  const chooseModel = (model: string) => {
    setSelectedModel(model);
    setSelectedVehicle(null);
    AsyncStorage.removeItem(SELECTED_VEHICLE_STORAGE_KEY);
  };

  const updateRegistrationForm = (field: keyof RegistrationForm, value: string) => {
    setRegistrationForm((current) => ({ ...current, [field]: value }));
    setRegistrationError(null);
  };

  const updateLoginForm = (field: keyof LoginForm, value: string) => {
    setLoginForm((current) => ({ ...current, [field]: value }));
    setLoginError(null);
  };

  const submitLogin = async () => {
    const email = loginForm.email.trim();

    if (!email || !loginForm.password) {
      setLoginError('E-posta ve şifre zorunludur.');
      return;
    }

    setLoginStatus('saving');
    setLoginError(null);

    try {
      const user = await loginUser({ email, password: loginForm.password });
      const storedBindingValue = await safeStorageGet(BACKEND_BINDING_STORAGE_KEY);
      const storedBinding = storedBindingValue ? safeJsonParse<BackendBinding>(storedBindingValue) : null;

      setRegisteredUser(user);
      setLoginForm(emptyLoginForm);
      await safeStorageSet(REGISTERED_USER_STORAGE_KEY, JSON.stringify(user));

      if (storedBinding?.user.id === user.id) {
        setBackendBinding(storedBinding);
        setBindingStatus('linked');
        setStep('today');
      } else {
        if (storedBinding) {
          await safeStorageRemove(BACKEND_BINDING_STORAGE_KEY);
          await safeStorageRemove(SELECTED_VEHICLE_STORAGE_KEY);
        }

        const apiBinding = await restoreActiveBindingFromApi(user);

        if (apiBinding) {
          setStep('today');
        } else {
          setBackendBinding(null);
          setBindingStatus('idle');
          setStep('tracking');
        }
      }

    } catch (error) {
      setLoginError(authErrorMessage(error, 'login'));
    } finally {
      setLoginStatus('idle');
    }
  };

  const submitRegistration = async () => {
    const validationError = validateRegistrationForm(registrationForm);

    if (validationError) {
      setRegistrationError(validationError);
      return;
    }

    setRegistrationStatus('saving');
    setRegistrationError(null);

    try {
      const user = await createUser({
        username: registrationForm.username.trim(),
        email: registrationForm.email.trim(),
        phone: registrationForm.phone.trim(),
        password: registrationForm.password,
        passwordConfirmation: registrationForm.passwordConfirmation,
      });

      await Promise.all([
        safeStorageRemove(BACKEND_BINDING_STORAGE_KEY),
        safeStorageRemove(SELECTED_VEHICLE_STORAGE_KEY),
        safeStorageRemove(TRACKING_MODE_STORAGE_KEY),
      ]);
      setBackendBinding(null);
      setBindingStatus('idle');
      setTrackingMode(null);
      setSelectedBrand(null);
      setSelectedModel(null);
      setSelectedVehicle(null);
      setUsageProfile(null);
      setRegisteredUser(user);
      setStep('tracking');
      await safeStorageSet(REGISTERED_USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      setRegistrationError(authErrorMessage(error, 'register'));
    } finally {
      setRegistrationStatus('idle');
    }
  };

  const logout = async () => {
    setRegisteredUser(null);
    setBackendBinding(null);
    setUsageProfile(null);
    setActiveTrip(null);
    setLastCompletedTrip(null);
    setLastTripRecap(null);
    setLastTripShareCard(null);
    setTripPoints([]);
    setTripRouteProgress(null);
    setTripSummary(null);
    setLastChargeSession(null);
    setChargeSummary(null);
    setRoutePlan(null);
    setRouteGeometry(null);
    setChargeStopPois(null);
    setPremiumGuidance(null);
    setSavedLocations([]);
    setSavedRoutes([]);
    setSavedLocationForm(emptySavedLocationForm);
    setRoutePlanForm(emptyRoutePlanForm);
    setLoginForm(emptyLoginForm);
    setLoginError(null);
    setStep('login');
    await safeStorageRemove(REGISTERED_USER_STORAGE_KEY);
  };

  const chooseVehicle = (vehicle: VehicleCatalogItem) => {
    setSelectedVehicle(vehicle);
    setBackendBinding(null);
    setBindingStatus('idle');
    AsyncStorage.setItem(SELECTED_VEHICLE_STORAGE_KEY, stableVehicleKey(vehicle));
    AsyncStorage.removeItem(BACKEND_BINDING_STORAGE_KEY);
  };

  const chooseTrackingMode = async (mode: TrackingMode) => {
    setTrackingMode(mode);
    await AsyncStorage.setItem(TRACKING_MODE_STORAGE_KEY, mode);
  };

  const chooseLanguage = async (locale: Locale) => {
    const inferredMarket = inferMarketFromDevice(locale);
    const marketChanged = inferredMarket !== marketCode;

    setLanguage(locale);
    setMarketCode(inferredMarket);
    await Promise.all([
      safeStorageSet(LANGUAGE_STORAGE_KEY, locale),
      safeStorageSet(MARKET_STORAGE_KEY, inferredMarket),
    ]);

    if (!marketChanged) {
      return;
    }

    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedVehicle(null);
    setBackendBinding(null);
    setBindingStatus('idle');
    await Promise.all([
      safeStorageRemove(SELECTED_VEHICLE_STORAGE_KEY),
      safeStorageRemove(BACKEND_BINDING_STORAGE_KEY),
    ]);
  };

  const refreshUsageProfile = async (vehicleId: string) => {
    try {
      const profile = await fetchUsageProfile(vehicleId);
      setUsageProfile(profile);
    } catch {
      setUsageProfile(null);
    }
  };

  const refreshRouteSummary = async (vehicleId: string) => {
    try {
      const summary = await fetchRouteSummary(vehicleId);
      setRouteSummary(summary);
    } catch {
      setRouteSummary(null);
    }
  };

  const refreshMonthlyReport = async (vehicleId: string) => {
    try {
      const report = await fetchMonthlyReport(vehicleId);
      setMonthlyReport(report);
    } catch {
      setMonthlyReport(null);
    }
  };

  const refreshAnnualReport = async (vehicleId: string) => {
    try {
      const report = await fetchAnnualReport(vehicleId);
      setAnnualReport(report);
    } catch {
      setAnnualReport(null);
    }
  };

  const refreshRegistrySummary = async (vehicleId: string) => {
    try {
      const summary = await fetchRegistrySummary(vehicleId);
      setRegistrySummary(summary);
    } catch {
      setRegistrySummary(null);
    }
  };

  const refreshPublicReport = async (vehicleId: string) => {
    try {
      const report = await fetchPublicReport(vehicleId);
      setPublicReport(report);
    } catch {
      setPublicReport(null);
    }
  };

  const refreshServiceData = async (vehicleId: string) => {
    try {
      const [visits, compliance] = await Promise.all([
        fetchServiceVisits(vehicleId),
        fetchServiceCompliance(vehicleId),
      ]);
      setServiceVisits(visits);
      setServiceCompliance(compliance);
    } catch {
      setServiceVisits([]);
      setServiceCompliance(null);
    }
  };

  const refreshLatestAssessment = async (vehicleId: string) => {
    try {
      const assessment = await fetchLatestAssessment(vehicleId);
      setLatestAssessment(assessment);
    } catch {
      setLatestAssessment(null);
    }
  };

  const refreshPremiumReport = async (vehicleId: string) => {
    try {
      const report = await fetchLatestPremiumReport(vehicleId);
      setPremiumReport(report);
    } catch {
      setPremiumReport(null);
    }
  };

  const refreshBatteryLifecycle = async (vehicleId: string) => {
    try {
      const lifecycle = await fetchBatteryLifecycle(vehicleId);
      setBatteryLifecycle(lifecycle);
    } catch {
      setBatteryLifecycle(null);
    }
  };

  const refreshCommunityBenchmark = async (vehicleId: string) => {
    try {
      const benchmark = await fetchCommunityBenchmark(vehicleId);
      setCommunityBenchmark(benchmark);
    } catch {
      setCommunityBenchmark(null);
    }
  };

  const refreshSavedLocationData = async (userId: string) => {
    try {
      const [locations, routes] = await Promise.all([
        fetchSavedLocations(userId),
        fetchSavedRoutes(userId),
      ]);
      setSavedLocations(locations);
      setSavedRoutes(routes);
    } catch {
      setSavedLocations([]);
      setSavedRoutes([]);
    }
  };

  const refreshTripRouteProgress = async (tripId: string) => {
    try {
      const progress = await fetchTripRouteProgress(tripId);
      setTripRouteProgress(progress);
      if (progress) {
        try {
          const guidance = await createLiveTripGuidance(tripId);
          setPremiumGuidance(guidance);
        } catch {
          // Live progress remains useful even if advisory persistence fails.
        }
      }
      return progress;
    } catch {
      setTripRouteProgress(null);
      return null;
    }
  };

  const refreshTripRecap = async (tripId: string) => {
    try {
      const recap = await createTripRecap(tripId);
      const shareCard = await createTripShareCard(recap.id, 'story');
      setLastTripRecap(recap);
      setLastTripShareCard(shareCard);
      return { recap, shareCard };
    } catch {
      setLastTripRecap(null);
      setLastTripShareCard(null);
      return null;
    }
  };

  const refreshUserVehicles = async (userId: string) => {
    try {
      const vehicles = await fetchActiveVehiclesForUser(userId);
      setUserVehicles(vehicles);
    } catch {
      // non-fatal — single-vehicle fallback works
    }
  };

  const scheduleUnknownRouteNotification = (lat: number, lng: number) => {
    if (unknownRouteNotifyTimerRef.current) {
      clearTimeout(unknownRouteNotifyTimerRef.current);
    }
    unknownRouteNotifyTimerRef.current = setTimeout(async () => {
      unknownRouteNotifyTimerRef.current = null;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Yeni rota tespit edildi',
          body: 'Farklı bir konumdan gittiğinizi görüyorum. Bu yolculuk araç karnesine işlenecektir — rotayı kaydetmek ister misiniz?',
          data: { type: 'unknown_route', lat, lng },
        },
        trigger: null, // hemen gönder
      });
    }, UNKNOWN_ROUTE_NOTIFY_MS);
  };

  const cancelUnknownRouteNotification = () => {
    if (unknownRouteNotifyTimerRef.current) {
      clearTimeout(unknownRouteNotifyTimerRef.current);
      unknownRouteNotifyTimerRef.current = null;
    }
  };

  const scheduleHvacNotification = async (trip: { id: string; tempC: number; type: 'cooling' | 'heating' }) => {
    const learnedKey = trip.type === 'cooling' ? HVAC_LEARNED_KEY_COOLING : HVAC_LEARNED_KEY_HEATING;
    const learned = await AsyncStorage.getItem(learnedKey).catch(() => null);
    if (learned && learned !== 'unknown') return;

    if (hvacNotifyTimerRef.current) clearTimeout(hvacNotifyTimerRef.current);

    hvacNotifyTimerRef.current = setTimeout(async () => {
      hvacNotifyTimerRef.current = null;
      const tempStr = `${Math.round(trip.tempC)}°C`;
      const body = trip.type === 'cooling'
        ? `Bugün ${tempStr}'ydi — klima kullandınız mı? Menzil hesabınıza ekleyelim.`
        : `Bugün ${tempStr}'ydi — ısıtma sistemi kullandınız mı?`;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Enerji tüketimi', body, data: { type: 'hvac_check', tripId: trip.id, tempC: trip.tempC, hvacType: trip.type } },
        trigger: null,
      });
    }, HVAC_NOTIFY_DELAY_MS);
  };

  const cancelHvacNotification = () => {
    if (hvacNotifyTimerRef.current) {
      clearTimeout(hvacNotifyTimerRef.current);
      hvacNotifyTimerRef.current = null;
    }
  };

  const refreshVehicleRoutes = async (vehicleId: string) => {
    try {
      const routes = await listRouteFingerprints(vehicleId);
      setVehicleRoutes(routes);
    } catch {
      // non-fatal
    }
  };

  const restoreActiveBindingFromApi = async (user: ApiUser) => {
    try {
      const activeBinding = await fetchActiveBindingForUser(user.id);
      void refreshUserVehicles(user.id);
      if (activeBinding?.vehicle?.id) {
        void refreshVehicleRoutes(activeBinding.vehicle.id);
      }

      if (!activeBinding) {
        return null;
      }

      const binding = buildBackendBinding(user, activeBinding);
      setBackendBinding(binding);
      setBindingStatus('linked');
      await safeStorageSet(BACKEND_BINDING_STORAGE_KEY, JSON.stringify(binding));
      if (binding.catalogKey) {
        await safeStorageSet(SELECTED_VEHICLE_STORAGE_KEY, binding.catalogKey);
      }

      return binding;
    } catch {
      return null;
    }
  };

  const switchToVehicle = async (vehicleEntry: NonNullable<ApiActiveBinding>) => {
    if (!registeredUser) return;
    const binding = buildBackendBinding(registeredUser, vehicleEntry);
    setBackendBinding(binding);
    setBindingStatus('linked');
    await safeStorageSet(BACKEND_BINDING_STORAGE_KEY, JSON.stringify(binding));
    if (binding.catalogKey) {
      await safeStorageSet(SELECTED_VEHICLE_STORAGE_KEY, binding.catalogKey);
    }
    setShowVehicleSwitcher(false);
    setStep('today');
  };

  const openDriversModal = async (vehicleId: string, userId: string) => {
    setShowDriversModal(true);
    setDriversModalLoading(true);
    setDriversAccessList([]);
    setInviteResult(null);
    setInviteIdentifier('');
    try {
      const list = await listVehicleAccess(vehicleId, userId);
      setDriversAccessList(list);
    } catch {
      // show empty state
    } finally {
      setDriversModalLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!registeredUser || !backendBinding || !inviteIdentifier.trim()) return;
    setInviteLoading(true);
    try {
      const result = await createVehicleInvite(backendBinding.vehicle.id, registeredUser.id, {
        identifier: inviteIdentifier.trim(),
        role: 'driver',
        permissions: ['add_charge', 'add_trip'],
      });
      setInviteResult(result);
    } catch {
      // keep form open
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    if (!registeredUser || !backendBinding) return;
    try {
      await revokeVehicleAccess(backendBinding.vehicle.id, accessId, registeredUser.id);
      setDriversAccessList((prev) => prev.filter((a) => a.accessId !== accessId));
    } catch {
      // ignore
    }
  };

  const handleAcceptInvite = async () => {
    if (!registeredUser || !acceptToken.trim()) return;
    setAcceptLoading(true);
    setAcceptMessage(null);
    try {
      await acceptVehicleInvite(acceptToken.trim(), registeredUser.id);
      setAcceptMessage('Araç erişimi kabul edildi.');
      setAcceptToken('');
      void refreshUserVehicles(registeredUser.id);
    } catch {
      setAcceptMessage('Davet kabul edilemedi. Token geçersiz veya süresi dolmuş olabilir.');
    } finally {
      setAcceptLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'tracking') {
      setStep('register');
      return;
    }

    if (step === 'brand') {
      setStep('tracking');
      return;
    }

    if (step === 'assessment') {
      setStep('variant');
      return;
    }

    if (step === 'range') {
      setStep('yolculuk');
      return;
    }

    if (step === 'locations') {
      setStep('arac');
      return;
    }

    if (step === 'profile') {
      setStep(backendBinding ? 'arac' : 'brand');
      return;
    }

    if (step === 'variant') {
      setStep('model');
      return;
    }

    if (step === 'model') {
      setStep('brand');
    }
  };

  const skipToSummary = () => {
    const fallbackVehicle = selectedVehicle ?? catalogItems[0] ?? null;

    if (fallbackVehicle) {
      setSelectedBrand(fallbackVehicle.brand);
      setSelectedModel(fallbackVehicle.model);
      chooseVehicle(fallbackVehicle);
      setStep('today');
    }
  };

  const bindSelectedVehicle = async () => {
    if (!registeredUser || !selectedVehicle) {
      return;
    }

    if (
      backendBinding?.user.id === registeredUser.id &&
      backendBinding.catalogKey === stableVehicleKey(selectedVehicle)
    ) {
      setBindingStatus('linked');
      return;
    }

    if (apiStatus === 'offline') {
      setBindingStatus('offline');
      return;
    }

    setBindingStatus('saving');

    try {
      const vehicle = await createVehicle({
        catalogKey: selectedVehicle.catalogKey,
        vehicleSpecId: selectedVehicle.vehicleSpecId,
      });
      const parsedOdometerKm = parseInt(assessmentOdometerKm, 10) || null;
      const parsedPurchaseYear = parseInt(assessmentPurchaseYear, 10) || null;
      const ownership = await createOwnership({
        userId: registeredUser.id,
        vehicleId: vehicle.id,
        purchaseYear: parsedPurchaseYear,
        odometerKm: parsedOdometerKm,
      });
      if (parsedOdometerKm && parsedOdometerKm > 0) {
        createVehicleAssessment(vehicle.id, {
          odometerKm: parsedOdometerKm,
          purchaseYear: parsedPurchaseYear,
          city: assessmentCity || null,
          ownershipId: ownership.id,
        })
          .then(setLatestAssessment)
          .catch(() => {});
      }

      if (trackingMode) {
        try {
          await createUsageSignal({
            ownershipId: ownership.id,
            payload: {
              selectedAt: new Date().toISOString(),
              trackingMode,
            },
            signalType: 'tracking_mode_selected',
            source: 'mobile_onboarding',
            userId: registeredUser.id,
            vehicleId: vehicle.id,
          });
        } catch {
          // Tracking mode is stored locally; do not block vehicle ownership binding.
        }
      }

      const binding = {
        catalogKey: stableVehicleKey(selectedVehicle),
        ownership,
        user: registeredUser,
        vehicle,
      };

      setBackendBinding(binding);
      setBindingStatus('linked');
      await AsyncStorage.setItem(BACKEND_BINDING_STORAGE_KEY, JSON.stringify(binding));
    } catch {
      setBackendBinding(null);
      setBindingStatus('offline');
    }
  };

  const handleContinue = async () => {
    if (step === 'variant') {
      setStep('assessment');
      return;
    }

    if (step === 'assessment') {
      const hasOdometer = parseInt(assessmentOdometerKm, 10) > 0;
      await bindSelectedVehicle();
      if (hasOdometer) { setWelcomeModalIsOnboarding(true); setShowWelcomeModal(true); }
      setStep('yolculuk');
      setTripWelcomeVisible(true);
      return;
    }

    setStep(nextStep(step));
  };

  const startTripFromPoint = async (
    firstPoint: TripPoint,
    source: 'manual' | 'auto',
    routeIntent?: { plannedRouteId?: string; destinationLocationId?: string },
  ) => {
    const binding = backendBindingRef.current;

    if (!binding) {
      setTripStatus('offline');
      setTripMessage(t('mobile.autoTrip.message.needsBinding'));
      return null;
    }

    setTripStatus('working');
    setTripMessage(null);

    try {
      const trip = await createTrip({
        ownershipId: binding.ownership.id,
        source: source === 'auto' ? 'mobile_auto_gps' : 'mobile_gps',
        startLocation: {
          latitude: firstPoint.latitude,
          longitude: firstPoint.longitude,
        },
        destinationLocationId: routeIntent?.destinationLocationId,
        plannedRouteId: routeIntent?.plannedRouteId,
        startedAt: firstPoint.recordedAt,
        userId: binding.user.id,
        vehicleId: binding.vehicle.id,
      });

      await appendTripPoints(trip.id, {
        points: [firstPoint],
      });

      setActiveTrip(trip);
      setLastCompletedTrip(null);
      setLastTripRecap(null);
      setLastTripShareCard(null);
      setTripPoints([firstPoint]);
      setTripMessage(source === 'auto' ? t('mobile.autoTrip.message.started') : 'Yolculuk başladı. Sürücü bilinmiyorsa unknown kalacak.');
      const progress = await refreshTripRouteProgress(trip.id);
      setTripMessage(tripStartMessage(source, progress));
      return trip;
    } catch {
      setTripStatus('offline');
      setTripMessage(source === 'auto' ? t('mobile.autoTrip.message.startFailed') : 'Yolculuk başlatılamadı. API veya konum erişimini kontrol et.');
      return null;
    } finally {
      setTripStatus('idle');
    }
  };

  const appendTripPointToActiveTrip = async (point: TripPoint, source: 'manual' | 'auto') => {
    const trip = activeTripRef.current;

    if (!trip) {
      return false;
    }

    setTripStatus('working');
    if (source === 'manual') {
      setTripMessage(null);
    }

    try {
      await appendTripPoints(trip.id, {
        points: [point],
      });
      setTripPoints((current) => [...current, point]);
      const progress = await refreshTripRouteProgress(trip.id);
      if (source === 'manual') {
        setTripMessage(progress?.stoppedNearDestination
          ? `${progress.destinationLabel ?? 'Hedef'} yakınındasın. Buraya geldiniz, doğru mu?`
          : 'Yeni GPS noktası eklendi.');
      }
      return true;
    } catch {
      setTripStatus('offline');
      setTripMessage(source === 'auto' ? t('mobile.autoTrip.message.pointFailed') : 'GPS noktası eklenemedi. Ağ veya konum erişimini kontrol et.');
      return false;
    } finally {
      setTripStatus('idle');
    }
  };

  const finishTripWithPoint = async (finalPoint: TripPoint, source: 'manual' | 'auto') => {
    const trip = activeTripRef.current;
    const binding = backendBindingRef.current;

    if (!trip || !binding) {
      return null;
    }

    setTripStatus('working');
    if (source === 'manual') {
      setTripMessage(null);
    }

    try {
      await appendTripPoints(trip.id, {
        points: [finalPoint],
      });
      const completedTrip = await finishTrip(trip.id, {
        endedAt: finalPoint.recordedAt,
        endLocation: {
          latitude: finalPoint.latitude,
          longitude: finalPoint.longitude,
        },
      });
      const summary = await fetchTripSummary(binding.vehicle.id);
      await refreshUsageProfile(binding.vehicle.id);
      await refreshRouteSummary(binding.vehicle.id);
      await refreshCommunityBenchmark(binding.vehicle.id);
      refreshMonthlyReport(binding.vehicle.id);
      refreshAnnualReport(binding.vehicle.id);
      void refreshVehicleRoutes(binding.vehicle.id);
      const recapResult = await refreshTripRecap(completedTrip.id);

      if (completedTrip.hvacInferred === 'cooling' || completedTrip.hvacInferred === 'heating') {
        void scheduleHvacNotification({
          id: completedTrip.id,
          tempC: completedTrip.ambientTempC ?? 0,
          type: completedTrip.hvacInferred,
        });
      }

      if (completedTrip.hasPendingQuestions) {
        try {
          const questions = await fetchTripContextQuestions(completedTrip.id);
          if (questions.length > 0) {
            setPendingContextQuestions(questions);
            setContextQuestionIndex(0);
          }
        } catch { /* context soruları opsiyonel */ }
      }

      setActiveTrip(null);
      setLastCompletedTrip(completedTrip);
      setTripPoints((current) => [...current, finalPoint]);
      setTripRouteProgress(null);
      setTripSummary(summary);
      setTripMessage(
        recapResult
          ? source === 'auto'
            ? `${t('mobile.autoTrip.message.finished')} Trip özeti ve paylaş kartı hazır.`
            : 'Yolculuk tamamlandı. Trip özeti ve paylaş kartı hazır.'
          : source === 'auto'
            ? t('mobile.autoTrip.message.finished')
            : 'Yolculuk tamamlandı ve özet güncellendi.',
      );
      return completedTrip;
    } catch {
      setTripStatus('offline');
      setTripMessage(source === 'auto' ? t('mobile.autoTrip.message.finishFailed') : 'Yolculuk bitirilemedi. Ağ veya konum erişimini kontrol et.');
      return null;
    } finally {
      setTripStatus('idle');
    }
  };

  const startTripRecording = async () => {
    if (!backendBindingRef.current) {
      setTripStatus('offline');
      setTripMessage(t('mobile.autoTrip.message.needsBinding'));
      return;
    }

    if (savedRoutes.length > 0 && !selectedSavedRouteId && !selectedDestinationLocationId) {
      setTripMessage('Nereye gidiyorsun? Kayıtlı rota veya varış konumu seç.');
      return;
    }

    const firstPoint = tripOriginLocation
      ? { latitude: tripOriginLocation.latitude, longitude: tripOriginLocation.longitude, recordedAt: new Date().toISOString() }
      : await getCurrentTripPoint(0);
    await startTripFromPoint(firstPoint, 'manual', {
      destinationLocationId: selectedDestinationLocationId || undefined,
      plannedRouteId: selectedSavedRouteId || undefined,
    });
  };

  const appendCurrentTripPoint = async () => {
    if (!activeTripRef.current) {
      return;
    }

    const point = await getCurrentTripPoint(tripPointsRef.current.length);
    await appendTripPointToActiveTrip(point, 'manual');
  };

  const finishActiveTrip = async () => {
    if (!activeTripRef.current || !backendBindingRef.current) {
      return;
    }

    const finalPoint = await getCurrentTripPoint(tripPointsRef.current.length);
    await finishTripWithPoint(finalPoint, 'manual');
  };

  const createShareCardForLastRecap = async () => {
    if (!lastTripRecap) {
      return;
    }

    setTripStatus('working');
    setTripMessage(null);

    try {
      const shareCard = await createTripShareCard(lastTripRecap.id, 'story');
      setLastTripShareCard(shareCard);
      setTripMessage('Paylaş kartı hazır.');
    } catch {
      setTripStatus('offline');
      setTripMessage('Paylaş kartı üretilemedi. API bağlantısını kontrol et.');
    } finally {
      setTripStatus('idle');
    }
  };

  const runMockRouteSimulation = async (guidanceRoutePlan: ApiRoutePlan, binding: BackendBinding) => {
    setTestModeStatus('running');
    setTestModeMessage('Menzil rotası mock sürüş ve canlı sesli koç akışına bağlanıyor...');
    setTripMessage('Menzil rotası mock sürüş olarak kayıt altına alınıyor...');

    try {
      const points = buildMockRoutePoints();
      const trip = await createTrip({
        ownershipId: binding.ownership.id,
        source: 'mock_route_test_mode',
        startLocation: {
          latitude: points[0].latitude,
          longitude: points[0].longitude,
        },
        startedAt: points[0].recordedAt,
        userId: binding.user.id,
        vehicleId: binding.vehicle.id,
      });

      await appendTripPoints(trip.id, { points });
      const lastPoint = points[points.length - 1];
      const completedTrip = await finishTrip(trip.id, {
        endedAt: lastPoint.recordedAt,
        endLocation: {
          latitude: lastPoint.latitude,
          longitude: lastPoint.longitude,
        },
      });
      const summary = await fetchTripSummary(binding.vehicle.id);
      await refreshUsageProfile(binding.vehicle.id);
      await refreshRouteSummary(binding.vehicle.id);
      await refreshCommunityBenchmark(binding.vehicle.id);
      refreshMonthlyReport(binding.vehicle.id);
      refreshAnnualReport(binding.vehicle.id);
      void refreshVehicleRoutes(binding.vehicle.id);
      const recapResult = await refreshTripRecap(completedTrip.id);
      const guidance = await createMockGuidance(guidanceRoutePlan.id, {
        distanceKm: guidanceRoutePlan.requestedDistanceKm ?? undefined,
        pointCount: points.length,
        source: 'mock_route_test_mode',
      });

      // Plan 26: assessment — önce mevcut varsa kullan, yoksa onboarding state'ten al
      let assessmentResult: ApiAssessment | null = latestAssessment;
      if (!assessmentResult) {
        const parsedOdometer = parseInt(assessmentOdometerKm, 10) || null;
        const parsedYear = parseInt(assessmentPurchaseYear, 10) || null;
        if (parsedOdometer && parsedOdometer > 0) {
          try {
            assessmentResult = await createVehicleAssessment(binding.vehicle.id, {
              odometerKm: parsedOdometer,
              purchaseYear: parsedYear,
              city: assessmentCity || null,
            });
            setLatestAssessment(assessmentResult);
          } catch { /* non-blocking */ }
        }
      }

      // Plan 27: premium rapor
      let premiumResult = null;
      try {
        premiumResult = await createPremiumReport(binding.vehicle.id, binding.ownership.id);
        setPremiumReport(premiumResult);
      } catch { /* non-blocking */ }

      setRoutePlan(guidanceRoutePlan);
      setActiveTrip(null);
      setLastCompletedTrip(completedTrip);
      setTripPoints(points);
      setTripSummary(summary);
      setPremiumGuidance(guidance);
      setTestModeStatus('done');
      setTestModeMessage(
        `Test modu ${points.length} mock GPS noktası ve ${guidance.advisories.length} canlı tavsiye üretti.${
          recapResult ? ' Trip özeti hazır.' : ''
        }${assessmentResult ? ' Gün 0 değerlendirmesi oluştu.' : ''}${premiumResult ? ' Premium rapor hazır.' : ''}`,
      );
      setTripMessage(
        `Test modu ${points.length} mock GPS noktası ve ${guidance.advisories.length} canlı tavsiye üretti.${
          recapResult ? ' Trip özeti hazır.' : ''
        }${assessmentResult ? ' Gün 0 değerlendirmesi oluştu.' : ''}${premiumResult ? ' Premium rapor hazır.' : ''}`,
      );
      return guidance;
    } catch {
      setTestModeStatus('error');
      setTripStatus('offline');
      setTestModeMessage('Menzil planı oluştu ama mock sürüş/guidance üretilemedi. API bağlantısını kontrol et.');
      setTripMessage('Menzil planı oluştu ama mock sürüş/guidance üretilemedi. API bağlantısını kontrol et.');
      return null;
    } finally {
      setTripStatus('idle');
    }
  };

  const handleAutoTripPosition = async (position: Location.LocationObject) => {
    if (autoTripWorkingRef.current || !backendBindingRef.current) {
      return;
    }

    autoTripWorkingRef.current = true;

    try {
      const point = tripPointFromLocation(position, autoTripPointIndexRef.current);
      autoTripPointIndexRef.current += 1;
      const speedKmh = point.speedKmh ?? 0;
      const now = Date.now();
      const currentTrip = activeTripRef.current;

      if (!currentTrip) {
        autoTripStoppedSinceRef.current = null;

        if (speedKmh > AUTO_TRIP_START_SPEED_KMH) {
          const isFirstMovement = autoTripMovingSinceRef.current === null;
          autoTripMovingSinceRef.current ??= now;

          // On first movement: check saved locations (B) + route fingerprints (A36)
          if (isFirstMovement && !routeMatchCheckedRef.current) {
            routeMatchCheckedRef.current = true;
            cancelUnknownRouteNotification();

            // B: kayıtlı konuma yakın mı? → anında tanı
            const nearSaved = savedLocationsRef.current.find(
              (loc) => haversineM(point.latitude, point.longitude, loc.latitude, loc.longitude) <= SAVED_LOCATION_MATCH_RADIUS_M,
            );
            if (nearSaved) {
              detectedRouteRef.current = { id: 'saved', routeKey: nearSaved.label } as unknown as ApiRouteFingerprint;
              setAutoTripMessage(`${nearSaved.label} konumundan hareket algılandı`);
              unknownOriginTripRef.current = null;
            } else {
              unknownOriginTripRef.current = { lat: point.latitude, lng: point.longitude };
              // A36: route fingerprint match
              const binding = backendBindingRef.current;
              if (binding) {
                matchRouteOrigin(binding.vehicle.id, point.latitude, point.longitude)
                  .then((matches) => {
                    const best = matches.find((m) => (m.confidenceScore ?? 0) >= 0.5);
                    if (best) {
                      detectedRouteRef.current = best;
                      unknownOriginTripRef.current = null;
                      setAutoTripMessage(formatRouteLabel(best) + ' hattı algılandı');
                    }
                  })
                  .catch(() => {});
              }
            }
          }

          const elapsed = now - autoTripMovingSinceRef.current;
          // Bilinen kaynak (kayıtlı konum veya öğrenilmiş hat): 3s. Bilinmeyen: 15s.
          const debounce = detectedRouteRef.current ? 3000 : AUTO_TRIP_START_DEBOUNCE_MS;
          setAutoTripStatus(elapsed >= debounce ? 'active' : 'moving');

          if (elapsed >= debounce) {
            await startTripFromPoint(point, 'auto');
            autoTripMovingSinceRef.current = null;
            detectedRouteRef.current = null;
            routeMatchCheckedRef.current = false;
          }
        } else {
          autoTripMovingSinceRef.current = null;
          routeMatchCheckedRef.current = false;
          detectedRouteRef.current = null;
          setAutoTripStatus('watching');
        }

        return;
      }

      await appendTripPointToActiveTrip(point, 'auto');

      if (speedKmh < AUTO_TRIP_STOP_SPEED_KMH) {
        autoTripStoppedSinceRef.current ??= now;
        const elapsed = now - autoTripStoppedSinceRef.current;
        setAutoTripStatus(elapsed >= AUTO_TRIP_STOP_DEBOUNCE_MS ? 'watching' : 'stopping');

        if (elapsed >= AUTO_TRIP_STOP_DEBOUNCE_MS) {
          await finishTripWithPoint(point, 'auto');
          autoTripStoppedSinceRef.current = null;
          // Unknown origin → 10dk hareketsizlik sonrası bildirim
          if (unknownOriginTripRef.current) {
            scheduleUnknownRouteNotification(
              unknownOriginTripRef.current.lat,
              unknownOriginTripRef.current.lng,
            );
            unknownOriginTripRef.current = null;
          }
        }
      } else {
        autoTripStoppedSinceRef.current = null;
        setAutoTripStatus('active');
        // Hareket devam ediyorsa bildirim timer'ını iptal et
        cancelUnknownRouteNotification();
      }
    } finally {
      autoTripWorkingRef.current = false;
    }
  };

  const updateRoutePlanForm = (field: keyof RoutePlanForm, value: string) => {
    setRoutePlanForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'originLabel' ? { originLatitude: null, originLongitude: null, originPlaceId: '' } : null),
      ...(field === 'destinationLabel' ? { destinationPlaceId: '' } : null),
    }));
    if (field === 'originLabel') {
      setOriginSearchStatus(value.trim().length >= 2 ? 'searching' : 'idle');
    }

    if (field === 'destinationLabel') {
      setDestinationSearchStatus(value.trim().length >= 2 ? 'searching' : 'idle');
    }

    setRoutePreview(null);
    setRoutePlanMessage(null);
  };

  const selectRoutePlace = (field: 'origin' | 'destination', prediction: ApiPlacePrediction) => {
    setRoutePlanForm((current) => ({
      ...current,
      ...(field === 'origin'
        ? { originLabel: prediction.description, originLatitude: null, originLongitude: null, originPlaceId: prediction.placeId }
        : { destinationLabel: prediction.description, destinationPlaceId: prediction.placeId }),
    }));
    setRoutePreview(null);
    if (field === 'origin') {
      setOriginPredictions([]);
      setOriginSearchStatus('idle');
    } else {
      setDestinationPredictions([]);
      setDestinationSearchStatus('idle');
    }
  };

  const useCurrentRouteOrigin = async () => {
    setRoutePlanForm((current) => ({
      ...current,
      originLabel: 'Konum alınıyor...',
      originLatitude: null,
      originLongitude: null,
      originPlaceId: '',
    }));
    setOriginPredictions([]);
    setOriginSearchStatus('idle');
    setRoutePreview(null);
    setRoutePlanMessage('Anlık GPS konumu isteniyor. Tarayıcı izin penceresi çıkarsa izin ver.');

    const point = await readCurrentLocationPoint();

    if (!point.ok) {
      setRoutePlanForm((current) => ({
        ...current,
        originLabel: '',
        originLatitude: null,
        originLongitude: null,
        originPlaceId: '',
      }));
      setRoutePlanMessage(currentLocationErrorMessage(point.reason));
      return;
    }

    const originLabel = `Buradan (${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)})`;

    setRoutePlanForm((current) => ({
      ...current,
      originLabel,
      originLatitude: point.latitude,
      originLongitude: point.longitude,
      originPlaceId: '',
    }));
    setOriginPredictions([]);
    setOriginSearchStatus('idle');
    setRoutePreview(null);
    setRoutePlanMessage('Anlık GPS konumu başlangıç olarak eklendi.');
  };

  const updateSavedLocationForm = (field: keyof SavedLocationForm, value: string) => {
    setSavedLocationForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'searchLabel'
        ? { selectedPlaceId: '', latitude: null, longitude: null, address: '' }
        : null),
    }));
    setSavedLocationMessage(null);

    if (field === 'searchLabel') {
      setSavedLocationSearchStatus(value.trim().length >= 2 ? 'searching' : 'idle');
    }
  };

  const selectSavedLocationPrediction = async (prediction: ApiPlacePrediction) => {
    setSavedLocationStatus('saving');
    setSavedLocationMessage(null);

    try {
      const details = await fetchPlaceDetails(prediction.placeId, language);

      if (!details.place) {
        setSavedLocationMessage('Konum detayı alınamadı.');
        return;
      }

      setSavedLocationForm((current) => ({
        ...current,
        address: details.place?.address ?? prediction.description,
        label: current.label || details.place?.name || prediction.mainText,
        latitude: details.place?.latitude ?? null,
        longitude: details.place?.longitude ?? null,
        searchLabel: prediction.description,
        selectedPlaceId: details.place?.googlePlaceId ?? prediction.placeId,
      }));
      setSavedLocationPredictions([]);
      setSavedLocationSearchStatus('idle');
    } catch {
      setSavedLocationMessage('Google konum detayı alınamadı. API anahtarını kontrol et.');
    } finally {
      setSavedLocationStatus('idle');
    }
  };

  const useCurrentSavedLocation = async () => {
    setSavedLocationForm((current) => ({
      ...current,
      address: 'Konum alınıyor...',
      latitude: null,
      longitude: null,
      searchLabel: 'Konum alınıyor...',
      selectedPlaceId: '',
    }));
    setSavedLocationPredictions([]);
    setSavedLocationSearchStatus('idle');
    setSavedLocationMessage('Anlık GPS konumu isteniyor. Tarayıcı izin penceresi çıkarsa izin ver.');

    const point = await readCurrentLocationPoint();

    if (!point.ok) {
      setSavedLocationForm((current) => ({
        ...current,
        address: '',
        latitude: null,
        longitude: null,
        searchLabel: '',
        selectedPlaceId: '',
      }));
      setSavedLocationMessage(currentLocationErrorMessage(point.reason));
      return;
    }

    setSavedLocationForm((current) => ({
      ...current,
      address: 'Mevcut konum',
      latitude: point.latitude,
      longitude: point.longitude,
      searchLabel: 'Mevcut konum',
      selectedPlaceId: '',
    }));
    setSavedLocationPredictions([]);
    setSavedLocationSearchStatus('idle');
    setSavedLocationMessage('Mevcut konum pinlendi. Kaydetmek için ad ver.');
  };

  const saveSavedLocation = async () => {
    if (!backendBinding) {
      setSavedLocationStatus('offline');
      setSavedLocationMessage(t('mobile.autoTrip.message.needsBinding'));
      return;
    }

    const label = savedLocationForm.label.trim();

    if (!label || savedLocationForm.latitude === null || savedLocationForm.longitude === null) {
      setSavedLocationMessage('Konum adı ve pin gerekli.');
      return;
    }

    setSavedLocationStatus('saving');
    setSavedLocationMessage(null);

    try {
      const location = await createSavedLocation(backendBinding.user.id, {
        address: savedLocationForm.address || undefined,
        googlePlaceId: savedLocationForm.selectedPlaceId || undefined,
        label,
        latitude: savedLocationForm.latitude,
        locationKind: savedLocationForm.locationKind,
        longitude: savedLocationForm.longitude,
        source: savedLocationForm.selectedPlaceId ? 'google_place_pin' : 'mobile_current_location',
      });
      const locations = await fetchSavedLocations(backendBinding.user.id);
      setSavedLocations(locations);
      setSavedLocationForm((current) => ({
        ...emptySavedLocationForm,
        routeOriginId: current.routeOriginId || location.id,
      }));
      setSavedLocationMessage(`${location.label} kaydedildi.`);
    } catch {
      setSavedLocationStatus('offline');
      setSavedLocationMessage('Konum kaydedilemedi. API bağlantısını kontrol et.');
    } finally {
      setSavedLocationStatus('idle');
    }
  };

  const saveSavedRoute = async () => {
    if (!backendBinding) {
      setSavedLocationStatus('offline');
      setSavedLocationMessage(t('mobile.autoTrip.message.needsBinding'));
      return;
    }

    const label = savedLocationForm.routeLabel.trim();
    const originLocationId = savedLocationForm.routeOriginId;
    const destinationLocationId = savedLocationForm.routeDestinationId;

    if (!label || !originLocationId || !destinationLocationId || originLocationId === destinationLocationId) {
      setSavedLocationMessage('Rota adı, başlangıç ve varış konumu gerekli.');
      return;
    }

    setSavedLocationStatus('saving');
    setSavedLocationMessage(null);

    try {
      const route = await createSavedRoute(backendBinding.user.id, {
        destinationLocationId,
        label,
        originLocationId,
      });
      const routes = await fetchSavedRoutes(backendBinding.user.id);
      setSavedRoutes(routes);
      setSelectedSavedRouteId(route.id);
      setSelectedDestinationLocationId('');
      setSavedLocationForm((current) => ({
        ...current,
        routeLabel: '',
      }));
      setSavedLocationMessage(`${route.label} rotası kaydedildi.`);
    } catch {
      setSavedLocationStatus('offline');
      setSavedLocationMessage('Rota kaydedilemedi. Konumları kontrol et.');
    } finally {
      setSavedLocationStatus('idle');
    }
  };

  const saveRoutePlan = () => {
    if (!backendBinding) {
      setRoutePlanStatus('offline');
      setRoutePlanMessage(t('mobile.range.message.needsBinding'));
      return;
    }

    const distanceKm = parseOptionalNumber(routePlanForm.distanceKm);

    if (!distanceKm || distanceKm <= 0) {
      setRoutePlanMessage(t('mobile.range.message.distanceRequired'));
      return;
    }

    setRouteSaveName(defaultRouteSaveName(routePlanForm));
    setRouteSavePromptVisible(true);
  };

  const submitRoutePlan = async (intent: RouteSaveIntent) => {
    if (!backendBinding) {
      setRouteSavePromptVisible(false);
      setRoutePlanStatus('offline');
      setRoutePlanMessage(t('mobile.range.message.needsBinding'));
      return;
    }

    const distanceKm = parseOptionalNumber(routePlanForm.distanceKm);

    if (!distanceKm || distanceKm <= 0) {
      setRouteSavePromptVisible(false);
      setRoutePlanMessage(t('mobile.range.message.distanceRequired'));
      return;
    }

    const savedName = intent === 'saved' ? routeSaveName.trim() : '';

    setRouteSavePromptVisible(false);
    setRoutePlanStatus('saving');
    setRoutePlanMessage(null);

    try {
      const plan = await createRoutePlan(backendBinding.vehicle.id, {
        cargoLevel: routePlanForm.cargoLevel,
        destinationLabel: routePlanForm.destinationLabel.trim() || undefined,
        distanceKm,
        originLabel: routePlanForm.originLabel.trim() || undefined,
        ownershipId: backendBinding.ownership.id,
        passengerCount: parseOptionalNumber(routePlanForm.passengerCount),
        roadProfile: routePlanForm.roadProfile,
        savedName: savedName || undefined,
        startSoc: parseOptionalNumber(routePlanForm.startSoc),
        targetArrivalSoc: parseOptionalNumber(routePlanForm.targetArrivalSoc),
        userId: backendBinding.user.id,
        weatherProfile: routePlanForm.weatherProfile,
      });

      setRoutePlan(plan);
      setRouteGeometry(null);
      setChargeStopPois(null);
      setPremiumGuidance(null);

      try {
        const geometry = await createRouteGeometry(plan.id, routePreview?.route ?? undefined);
        setRouteGeometry(geometry);
      } catch {
        setRouteGeometry(null);
      }

      try {
        const poiCandidates = await createChargeStopPoiCandidates(plan.id);
        setChargeStopPois(poiCandidates);
      } catch {
        setChargeStopPois(null);
      }

      try {
        const guidance = await createPremiumGuidance(plan.id);
        setPremiumGuidance(guidance);
      } catch {
        setPremiumGuidance(null);
      }

      let successMessage = savedName ? `${t('mobile.range.message.saved')} ${savedName}` : t('mobile.range.message.saved');

      if (isOxgurunalUser(backendBinding.user)) {
        const mockGuidance = await runMockRouteSimulation(plan, backendBinding);
        successMessage = mockGuidance
          ? `${successMessage} Test modu rotayı gidilmiş gibi kaydetti; sesli koç tavsiyeleri hazır.`
          : `${successMessage} Mock sürüş/guidance üretilemedi.`;
      }

      setRoutePlanMessage(successMessage);
    } catch {
      setRoutePlanStatus('offline');
      setRoutePlanMessage(t('mobile.range.message.failed'));
      return;
    } finally {
      setRoutePlanStatus('idle');
    }
  };

  const updateChargeForm = (field: keyof ChargeForm, value: string) => {
    setChargeForm((current) => ({ ...current, [field]: value }));
    setChargeMessage(null);
  };

  const saveChargeSession = async () => {
    if (!backendBinding) {
      setChargeStatus('offline');
      setChargeMessage('Şarj kaydı için önce araç backend sahiplik bağı kurulmalı.');
      return;
    }

    setChargeStatus('saving');
    setChargeMessage(null);

    const parsed = parseChargeForm(chargeForm);

    let autoPerceivedNeed = chargeForm.perceivedNeed.trim();
    if (!autoPerceivedNeed && chargeStartedAt) {
      const diffMs = Date.now() - chargeStartedAt.getTime();
      const totalMin = Math.max(1, Math.floor(diffMs / 60000));
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      autoPerceivedNeed = h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
    }

    try {
      const now = new Date().toISOString();
      const chargeSession = await createChargeSession({
        chargeLocationType: chargeForm.locationType || 'unknown',
        confidenceScore: parsed.hasManualData ? 0.35 : 0.1,
        costAmount: parsed.costAmount,
        currency: parsed.costAmount === undefined ? undefined : 'TRY',
        endSoc: parsed.endSoc,
        energyKwh: parsed.energyKwh,
        endedAt: now,
        ownershipId: backendBinding.ownership.id,
        source: parsed.hasManualData ? 'mobile_manual' : 'mobile_minimal',
        startSoc: parsed.startSoc,
        startedAt: now,
        userId: backendBinding.user.id,
        vehicleId: backendBinding.vehicle.id,
      });

      await createChargingDecisionEvent({
        chargeSessionId: chargeSession.id,
        confidenceScore: parsed.hasDecisionData ? 0.35 : 0.1,
        decisionAt: now,
        ownershipId: backendBinding.ownership.id,
        perceivedNeed: autoPerceivedNeed || undefined,
        source: 'mobile_manual',
        startSoc: parsed.startSoc,
        targetSoc: parsed.targetSoc,
        triggerType: autoPerceivedNeed ? 'user_reported_need' : 'unknown',
        userId: backendBinding.user.id,
        vehicleId: backendBinding.vehicle.id,
      });

      const summary = await fetchChargeSummary(backendBinding.vehicle.id);
      await refreshUsageProfile(backendBinding.vehicle.id);
      await refreshBatteryLifecycle(backendBinding.vehicle.id);
      refreshMonthlyReport(backendBinding.vehicle.id);
      refreshAnnualReport(backendBinding.vehicle.id);

      setLastChargeSession(chargeSession);
      setChargeSummary(summary);
      setChargeForm(emptyChargeForm);
      setChargeStartedAt(null);
      setChargeMessage('Şarj oturumu ve karar anı kaydedildi. Boş alanlar unknown/tahmini kaldı.');
    } catch {
      setChargeStatus('offline');
      setChargeMessage('Şarj kaydı oluşturulamadı. API bağlantısını kontrol et.');
      return;
    } finally {
      setChargeStatus('idle');
    }
  };

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" />
      {step !== 'login' ? (
        isMainTab(step) ? (
          <MainTopBar
            title={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}`.toUpperCase() : 'EV KARNESİ'}
            onOpenProfile={() => setStep('arac')}
            user={registeredUser}
          />
        ) : (
          <>
            <TopBar
              canGoBack={isOnboardingStep(step) ? step !== 'register' : true}
              canSkip={isOnboardingStep(step) && step !== 'register' && step !== 'tracking' && Boolean(registeredUser)}
              onBack={goBack}
              onOpenProfile={() => setStep('profile')}
              onSkip={skipToSummary}
              showProfile={false}
              title={titleForStep(step, selectedBrand, selectedModel, language)}
            />
            {isOnboardingStep(step) ? <StepProgress language={language} step={step} /> : null}
          </>
        )
      ) : null}

      {step === 'login' ? (
        <LoginStep
          error={loginError}
          form={loginForm}
          language={language}
          onChange={updateLoginForm}
          onChangeLanguage={chooseLanguage}
          onOpenRegister={() => {
            setRegistrationError(null);
            setStep('register');
          }}
          onSubmit={submitLogin}
          saving={loginStatus === 'saving'}
        />
      ) : null}

      {step === 'register' ? (
        <RegisterStep
          error={registrationError}
          form={registrationForm}
          language={language}
          onChange={updateRegistrationForm}
          onChangeLanguage={chooseLanguage}
          onSubmit={submitRegistration}
          onOpenLogin={() => setStep('login')}
          saving={registrationStatus === 'saving'}
        />
      ) : null}

      {step === 'tracking' ? (
        <TrackingStep
          language={language}
          onSelectMode={chooseTrackingMode}
          selectedMode={trackingMode}
        />
      ) : null}

      {step === 'brand' ? (
        <BrandStep
          apiStatus={apiStatus}
          brandQuery={brandQuery}
          brandImageByBrand={brandImageByBrand}
          catalogCount={catalogItems.length}
          catalogSource={catalogSource}
          onRetryApi={loadCatalogFromApi}
          onSelectBrand={chooseBrand}
          popularBrands={popularBrands}
          selectedBrand={selectedBrand}
          setBrandQuery={setBrandQuery}
          visibleBrands={visibleBrands}
        />
      ) : null}

      {step === 'model' ? (
        <ModelStep
          modelQuery={modelQuery}
          onSelectModel={chooseModel}
          selectedBrand={selectedBrand}
          selectedBrandImage={selectedBrandImage}
          selectedModel={selectedModel}
          setModelQuery={setModelQuery}
          visibleModels={visibleModels}
        />
      ) : null}

      {step === 'variant' ? (
        <VariantStep
          onSelectVehicle={chooseVehicle}
          selectedBrand={selectedBrand}
          selectedModel={selectedModel}
          selectedModelImage={selectedModelImage}
          selectedVehicle={selectedVehicle}
          variants={variants}
        />
      ) : null}

      {step === 'assessment' ? (
        <AssessmentInputStep
          odometerKm={assessmentOdometerKm}
          purchaseYear={assessmentPurchaseYear}
          city={assessmentCity}
          language={language}
          onChangeOdometerKm={setAssessmentOdometerKm}
          onChangePurchaseYear={setAssessmentPurchaseYear}
          onChangeCity={setAssessmentCity}
          vehicle={selectedVehicle}
        />
      ) : null}

      <WelcomeAssessmentModal
        visible={showWelcomeModal}
        assessment={latestAssessment}
        isOnboarding={welcomeModalIsOnboarding}
        vehicle={selectedVehicle}
        onDismiss={() => { setShowWelcomeModal(false); setWelcomeModalIsOnboarding(false); }}
      />

      <VehicleSwitcherModal
        visible={showVehicleSwitcher}
        vehicles={userVehicles}
        activeVehicleId={backendBinding?.vehicle.id ?? null}
        onSwitch={switchToVehicle}
        onClose={() => setShowVehicleSwitcher(false)}
      />

      {/* ── BİLİNMEYEN ROTA KAYDET ─────────────────────────────────── */}
      <Modal transparent animationType="fade" visible={showRouteSaveModal} onRequestClose={() => setShowRouteSaveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.routeSaveModal}>
            <Text style={styles.routeSaveTitle}>ROTAYI KAYDET</Text>
            <Text style={styles.routeSaveDesc}>Bu başlangıç konumuna bir isim verin. Bir dahaki seferinde otomatik algılanacak.</Text>
            <TextInput
              style={styles.routeSaveInput}
              placeholder="örn. Ev, İş, Spor Salonu..."
              placeholderTextColor={colors.muted}
              value={originSaveName}
              onChangeText={setOriginSaveName}
              autoFocus
              returnKeyType="done"
            />
            <View style={styles.routeSaveActions}>
              <Pressable accessibilityRole="button" onPress={() => setShowRouteSaveModal(false)} style={styles.routeSaveCancelBtn}>
                <Text style={styles.routeSaveCancelText}>GEÇ</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  if (!originSaveName.trim() || !routeSaveOrigin || !registeredUser) return;
                  try {
                    const loc = await createSavedLocation(registeredUser.id, {
                      label: originSaveName.trim(),
                      latitude: routeSaveOrigin.lat,
                      longitude: routeSaveOrigin.lng,
                      locationKind: 'other',
                    });
                    setSavedLocations((prev) => [...prev, loc]);
                    setShowRouteSaveModal(false);
                    setOriginSaveName('');
                    setRouteSaveOrigin(null);
                  } catch { /* ignore */ }
                }}
                style={[styles.routeSaveSaveBtn, !originSaveName.trim() && { opacity: 0.4 }]}
              >
                <Text style={styles.routeSaveSaveText}>KAYDET</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── HVAC ONAY ────────────────────────────────────────────────── */}
      <Modal transparent animationType="fade" visible={showHvacModal} onRequestClose={() => setShowHvacModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.routeSaveModal}>
            <Text style={styles.routeSaveTitle}>ENERJİ TÜKETİMİ</Text>
            <Text style={styles.routeSaveDesc}>
              {pendingHvacTrip
                ? `Bugün ${Math.round(pendingHvacTrip.tempC)}°C'ydi. ${pendingHvacTrip.type === 'cooling' ? 'Klima' : 'Isıtma sistemi'} kullandınız mı? Menzil hesabınıza ekleyelim.`
                : ''}
            </Text>
            <View style={styles.routeSaveActions}>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  setShowHvacModal(false);
                  if (pendingHvacTrip) {
                    try {
                      const result = await confirmTripHvac(pendingHvacTrip.id, false);
                      const key = pendingHvacTrip.type === 'cooling' ? HVAC_LEARNED_KEY_COOLING : HVAC_LEARNED_KEY_HEATING;
                      if (result.learned) await AsyncStorage.setItem(key, 'no');
                    } catch { /* non-fatal */ }
                    setPendingHvacTrip(null);
                  }
                }}
                style={styles.routeSaveCancelBtn}
              >
                <Text style={styles.routeSaveCancelText}>HAYIR</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  setShowHvacModal(false);
                  if (pendingHvacTrip) {
                    try {
                      const result = await confirmTripHvac(pendingHvacTrip.id, true);
                      const key = pendingHvacTrip.type === 'cooling' ? HVAC_LEARNED_KEY_COOLING : HVAC_LEARNED_KEY_HEATING;
                      if (result.learned) await AsyncStorage.setItem(key, 'yes');
                    } catch { /* non-fatal */ }
                    setPendingHvacTrip(null);
                  }
                }}
                style={styles.routeSaveSaveBtn}
              >
                <Text style={styles.routeSaveSaveText}>EVET, KULLANDIM</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <DriversModal
        visible={showDriversModal}
        vehicleName={backendBinding?.vehicle.displayName ?? ''}
        accessList={driversAccessList}
        loading={driversModalLoading}
        inviteIdentifier={inviteIdentifier}
        inviteLoading={inviteLoading}
        inviteResult={inviteResult}
        onChangeIdentifier={setInviteIdentifier}
        onCreateInvite={handleCreateInvite}
        onRevoke={handleRevokeAccess}
        onClose={() => { setShowDriversModal(false); setInviteResult(null); setInviteIdentifier(''); }}
      />

      {step === 'today' ? (
        <SummaryStep
          latestAssessment={latestAssessment}
          language={language}
          onOpenAssessmentModal={() => setShowWelcomeModal(true)}
          onPlanRange={() => setStep('range')}
          onStartDriving={() => setStep('yolculuk')}
          user={registeredUser}
          vehicle={selectedVehicle}
        />
      ) : null}

      {step === 'yolculuk' ? (
        <TripRecorderStep
          activeTrip={activeTrip}
          autoTripEnabled={autoTripEnabled}
          autoTripMessage={autoTripMessage}
          autoTripStatus={autoTripStatus}
          backendBinding={backendBinding}
          destQuery={tripDestQuery}
          onClearOrigin={clearTripOrigin}
          onOriginPlaceSelect={selectTripOriginPlace}
          onOriginSearch={setTripOriginQuery}
          originPredictions={tripOriginPredictions}
          originQuery={tripOriginQuery}
          lastCompletedTrip={lastCompletedTrip}
          lastTripRecap={lastTripRecap}
          lastTripShareCard={lastTripShareCard}
          language={language}
          message={tripMessage}
          onAppendPoint={appendCurrentTripPoint}
          onCreateShareCard={createShareCardForLastRecap}
          onDestSearch={setTripDestQuery}
          onDeleteLocation={async (locationId) => {
            if (!backendBinding) return;
            await deleteSavedLocation(backendBinding.user.id, locationId);
            setSavedLocations((prev) => prev.filter((l) => l.id !== locationId));
          }}
          onDeleteRoute={async (routeId) => {
            if (!backendBinding) return;
            await deleteSavedRoute(backendBinding.user.id, routeId);
            setSavedRoutes((prev) => prev.filter((r) => r.id !== routeId));
          }}
          onFinishTrip={finishActiveTrip}
          onManageLocations={() => setStep('locations')}
          onOpenMap={(mode) => { setMapPickerMode(mode); setMapPickerVisible(true); }}
          onUpdateLocation={async (locationId, label, kind) => {
            if (!backendBinding) return;
            const updated = await updateSavedLocation(backendBinding.user.id, locationId, { label, locationKind: kind });
            setSavedLocations((prev) => prev.map((l) => l.id === locationId ? updated : l));
          }}
          onPlaceSelect={selectTripDestinationPlace}
          onStartTrip={startTripRecording}
          onSelectDestination={setSelectedDestinationLocationId}
          onSelectRoute={setSelectedSavedRouteId}
          onToggleAutoTrip={setAutoTripEnabled}
          placePredictions={tripDestPredictions}
          points={tripPoints}
          savedLocations={savedLocations}
          savedRoutes={savedRoutes}
          selectedDestinationLocationId={selectedDestinationLocationId}
          selectedSavedRouteId={selectedSavedRouteId}
          status={tripStatus}
          routeProgress={tripRouteProgress}
          guidance={premiumGuidance}
          summary={tripSummary}
          vehicle={selectedVehicle}
        />
      ) : null}

      {pendingContextQuestions.length > 0 && contextQuestionIndex < pendingContextQuestions.length ? (
        <ContextQuestionCard
          question={pendingContextQuestions[contextQuestionIndex]}
          totalCount={pendingContextQuestions.length}
          currentIndex={contextQuestionIndex}
          onAnswer={async (answer) => {
            const q = pendingContextQuestions[contextQuestionIndex];
            if (q) {
              try {
                await recordTripContextAnswer(q.tripId, q.questionType, answer);
              } catch { /* opsiyonel */ }
            }
            setContextQuestionIndex((i) => i + 1);
          }}
          onSkip={() => setContextQuestionIndex(pendingContextQuestions.length)}
        />
      ) : null}

      {step === 'range' ? (
        <RangePlannerStep
          backendBinding={backendBinding}
          destinationPredictions={destinationPredictions}
          destinationSearchStatus={destinationSearchStatus}
          form={routePlanForm}
          language={language}
          message={routePlanMessage}
          onChange={updateRoutePlanForm}
          onSave={saveRoutePlan}
          onSelectPlace={selectRoutePlace}
          onUseCurrentOrigin={useCurrentRouteOrigin}
          chargeStopPois={chargeStopPois}
          geometry={routeGeometry}
          premiumAccess={premiumAccess}
          guidance={premiumGuidance}
          originPredictions={originPredictions}
          originSearchStatus={originSearchStatus}
          plan={routePlan}
          routePreview={routePreview}
          status={routePlanStatus}
        />
      ) : null}

      {step === 'sarj' ? (
        <ChargeLoggerStep
          backendBinding={backendBinding}
          chargeStartedAt={chargeStartedAt}
          form={chargeForm}
          lastChargeSession={lastChargeSession}
          message={chargeMessage}
          onChange={updateChargeForm}
          onSave={saveChargeSession}
          onStartTimer={() => setChargeStartedAt(new Date())}
          savedLocations={savedLocations}
          status={chargeStatus}
          summary={chargeSummary}
        />
      ) : null}

      {step === 'locations' ? (
        <SavedLocationsStep
          form={savedLocationForm}
          locations={savedLocations}
          message={savedLocationMessage}
          onChange={updateSavedLocationForm}
          onSaveLocation={saveSavedLocation}
          onSaveRoute={saveSavedRoute}
          onSelectPrediction={selectSavedLocationPrediction}
          onUseCurrentLocation={useCurrentSavedLocation}
          predictions={savedLocationPredictions}
          routes={savedRoutes}
          searchStatus={savedLocationSearchStatus}
          status={savedLocationStatus}
        />
      ) : null}

      {step === 'karne' ? (
        <KarneScreen
          batteryLifecycle={batteryLifecycle}
          communityBenchmark={communityBenchmark}
          monthlyReport={monthlyReport}
          usageProfile={usageProfile}
          routeSummary={routeSummary}
          language={language}
        />
      ) : null}

      {step === 'arac' ? (
        <AracScreen
          annualReport={annualReport}
          batteryLifecycle={batteryLifecycle}
          canManageDrivers={
            backendBinding?.access?.permissions?.includes('manage_vehicle') === true ||
            backendBinding?.access?.permissions?.includes('add_driver') === true ||
            backendBinding?.access?.role === 'owner'
          }
          language={language}
          latestAssessment={latestAssessment}
          onOpenAssessmentModal={() => setShowWelcomeModal(true)}
          onAddExternalReport={async (provider: string, reportUrl?: string, sohPercent?: number) => {
            if (!backendBinding?.vehicle.id) return;
            try {
              await addExternalBatteryReport(backendBinding.vehicle.id, { provider, reportUrl, sohPercent, ownershipId: backendBinding.ownership.id });
              await refreshPremiumReport(backendBinding.vehicle.id);
            } catch { /* ignore */ }
          }}
          onAddServiceVisit={async () => {
            if (!backendBinding?.vehicle.id) return;
            try {
              await createServiceVisit(backendBinding.vehicle.id, { visitType: 'other', userConfirmed: true });
              await refreshServiceData(backendBinding.vehicle.id);
            } catch { /* ignore */ }
          }}
          onGeneratePremiumReport={async () => {
            if (!backendBinding?.vehicle.id) return;
            try {
              const report = await createPremiumReport(backendBinding.vehicle.id, backendBinding.ownership.id);
              setPremiumReport(report);
            } catch { /* ignore */ }
          }}
          onGeneratePublicReport={async () => {
            if (!backendBinding?.vehicle.id) return;
            try {
              const report = await generatePublicReport(backendBinding.vehicle.id);
              setPublicReport(report);
            } catch { /* ignore */ }
          }}
          onManageLocations={() => setStep('locations')}
          onLogout={logout}
          onOpenDrivers={() => {
            if (backendBinding?.vehicle.id && registeredUser?.id) {
              void openDriversModal(backendBinding.vehicle.id, registeredUser.id);
            }
          }}
          onOpenProfile={() => setStep('profile')}
          premiumReport={premiumReport}
          publicReport={publicReport}
          registrySummary={registrySummary}
          serviceCompliance={serviceCompliance}
          serviceVisits={serviceVisits}
          user={registeredUser}
          vehicle={selectedVehicle}
          vehicleRoutes={vehicleRoutes}
        />
      ) : null}

      {step === 'profile' ? (
        <ProfileStep
          acceptLoading={acceptLoading}
          acceptMessage={acceptMessage}
          acceptToken={acceptToken}
          backendBinding={backendBinding}
          message={profileMessage}
          userVehicles={userVehicles}
          onAcceptInvite={handleAcceptInvite}
          onChangeAcceptToken={setAcceptToken}
          onChangePassword={() => setProfileMessage('Şifre değiştirme paneli hazır.')}
          onLogout={logout}
          onOpenVehicleSwitcher={() => setShowVehicleSwitcher(true)}
          onSelectVehicle={() => setStep('brand')}
          user={registeredUser}
        />
      ) : null}

      {isAppMainStep(step) ? (
        <BottomNav activeStep={step} onNavigate={setStep} />
      ) : null}

      {isOnboardingStep(step) ? (
        <BottomAction
          disabled={!canContinue(step, selectedBrand, selectedModel, selectedVehicle, trackingMode)}
          label={continueLabel(step, language)}
          loading={bindingStatus === 'saving'}
          onPress={handleContinue}
        />
      ) : null}

      {routeSavePromptVisible ? (
        <RouteSavePrompt
          language={language}
          name={routeSaveName}
          onCancel={() => setRouteSavePromptVisible(false)}
          onChangeName={setRouteSaveName}
          onSave={() => submitRoutePlan('saved')}
          onSkip={() => submitRoutePlan('skip')}
        />
      ) : null}

      <MapLocationPicker
        language={language}
        mode={mapPickerMode}
        onClose={() => setMapPickerVisible(false)}
        onConfirm={(coord, label) => {
          if (mapPickerMode === 'origin') {
            setTripOriginLocation(coord);
            setTripOriginQuery(label);
            setTripOriginPredictions([]);
          } else {
            selectMapLocation(coord, label, null);
          }
        }}
        onSave={(saveName, coord, label) => saveMapLocation(saveName, coord, label, null)}
        visible={mapPickerVisible}
      />

      {/* Trip welcome modal — shown once after onboarding */}
      {tripWelcomeVisible && registeredUser ? (
        <Modal animationType="fade" transparent visible={tripWelcomeVisible} onRequestClose={() => setTripWelcomeVisible(false)}>
          <View style={styles.tripWelcomeOverlay}>
            <View style={styles.tripWelcomeCard}>
              <Text style={styles.tripWelcomeTitle}>Hoş geldiniz, {registeredUser.fullName || registeredUser.username || 'Sürücü'} 👋</Text>
              <Text style={styles.tripWelcomeBody}>
                Sistemin konumları otomatik algılayabilmesi için sürekli kullandığınız konumları kaydedebilirsiniz.{'\n\n'}Bu kayıtlı rotalar algılandığında sistem sizden sürekli teyit istemeyecektir.{'\n\n'}Aşağıdaki haritayı kullanarak NEREDEN ve NEREYE noktalarınızı seçin, kaydedin.
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setTripWelcomeVisible(false)} style={styles.tripWelcomeBtn}>
                <Text style={styles.tripWelcomeBtnText}>ANLADIM</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

type TopBarProps = {
  canGoBack: boolean;
  canSkip: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onSkip: () => void;
  showProfile: boolean;
  title: string;
};

function TopBar({ canGoBack, canSkip, onBack, onOpenProfile, onSkip, showProfile, title }: TopBarProps) {
  return (
    <View style={[styles.topBar, { paddingTop: STATUS_BAR_HEIGHT, height: 56 + STATUS_BAR_HEIGHT }]}>
      <Pressable
        accessibilityRole="button"
        disabled={!canGoBack}
        onPress={onBack}
        style={[styles.topIconButton, !canGoBack ? styles.invisible : null]}
      >
        <Text style={styles.topIconText}>‹</Text>
      </Pressable>
      <Text numberOfLines={1} style={styles.topTitle}>
        {title}
      </Text>
      <View style={styles.topRightActions}>
        {canSkip ? (
          <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>ATLA</Text>
          </Pressable>
        ) : null}
        {showProfile ? (
          <Pressable accessibilityLabel="Profil" accessibilityRole="button" onPress={onOpenProfile} style={styles.profileButton}>
            <Text style={styles.profileButtonText}>P</Text>
          </Pressable>
        ) : (
          <View style={styles.topIconButton} />
        )}
      </View>
    </View>
  );
}

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0;

function MainTopBar({
  title,
  onOpenProfile,
  user,
}: {
  title: string;
  onOpenProfile: () => void;
  user: ApiUser | null;
}) {
  const initial = (user?.fullName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase();
  return (
    <View style={styles.mainTopBar}>
      <View style={styles.mainTopBarLeft}>
        <Text style={styles.mainTopBarBrand}>DMyC</Text>
        <Text numberOfLines={1} style={styles.mainTopBarTitle}>{title}</Text>
      </View>
      <Pressable accessibilityLabel="Profil" accessibilityRole="button" onPress={onOpenProfile} style={styles.mainTopBarAvatar}>
        <Text style={styles.mainTopBarAvatarText}>{initial}</Text>
      </Pressable>
    </View>
  );
}

function StepProgress({ language, step }: { language: Locale; step: Step }) {
  const activeIndex = stepIndex(step);
  const labels = language === 'en'
    ? ['Register', 'Tracking', 'Brand', 'Model', 'Variant', 'Card']
    : ['Kayıt', 'Takip', 'Marka', 'Model', 'Variant', 'Karne'];

  return (
    <View style={styles.stepBar}>
      {labels.map((label, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;

        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                isActive || isDone ? styles.stepDotActive : null,
              ]}
            >
              <Text style={[styles.stepDotText, isActive || isDone ? styles.stepDotTextActive : null]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, isActive ? styles.stepLabelActive : null]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

type LoginStepProps = {
  error: string | null;
  form: LoginForm;
  language: Locale;
  onChange: (field: keyof LoginForm, value: string) => void;
  onChangeLanguage: (locale: Locale) => void;
  onOpenRegister: () => void;
  onSubmit: () => void;
  saving: boolean;
};

function LoginStep({ error, form, language, onChange, onChangeLanguage, onOpenRegister, onSubmit, saving }: LoginStepProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const copy = language === 'en'
    ? {
        title: 'Welcome Back',
        description: 'Sign in to access your vehicle data and latest card.',
        email: 'EMAIL',
        password: 'PASSWORD',
        show: 'SHOW',
        hide: 'HIDE',
        submitting: 'SIGNING IN',
        submit: 'SIGN IN  →',
        noAccount: "Don't have an account?",
        register: 'Register',
      }
    : {
        title: 'Tekrar Hoş Geldiniz',
        description: 'Aracınızın gerçek verilerine ve güncel karnenize erişmek için giriş yapın.',
        email: 'E-POSTA',
        password: 'ŞİFRE',
        show: 'GÖSTER',
        hide: 'GİZLE',
        submitting: 'GİRİŞ YAPILIYOR',
        submit: 'GİRİŞ YAP  →',
        noAccount: 'Hesabınız yok mu?',
        register: 'Kayıt Ol',
      };

  return (
    <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
      <View style={styles.loginHeader}>
        <LanguageFlags language={language} onChange={onChangeLanguage} />
        <View style={styles.loginLogo}>
          <Text style={styles.loginLogoText}>D</Text>
        </View>
        <Text style={styles.loginHeading}>{copy.title}</Text>
        <Text style={styles.loginDescription}>{copy.description}</Text>
      </View>

      <View style={styles.loginForm}>
        <Text style={styles.label}>{copy.email}</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(value) => onChange('email', value)}
          placeholder="ornek@domain.com"
          placeholderTextColor={colors.muted}
          style={styles.loginInput}
          value={form.email}
        />

        <Text style={styles.label}>{copy.password}</Text>
        <View style={styles.passwordInputWrap}>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={(value) => onChange('password', value)}
            onSubmitEditing={onSubmit}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry={!passwordVisible}
            style={styles.passwordInput}
            value={form.password}
          />
          <Pressable
            accessibilityLabel={passwordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
            accessibilityRole="button"
            onPress={() => setPasswordVisible((current) => !current)}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>{passwordVisible ? copy.hide : copy.show}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={onSubmit}
          style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
        >
          <Text style={[styles.primaryButtonText, saving ? styles.primaryButtonTextDisabled : null]}>
            {saving ? copy.submitting : copy.submit}
          </Text>
        </Pressable>
      </View>

      <View style={styles.loginFooter}>
        <Text style={styles.loginFooterText}>{copy.noAccount}</Text>
        <Pressable accessibilityRole="button" onPress={onOpenRegister}>
          <Text style={styles.loginRegisterText}>{copy.register}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function LanguageFlags({ language, onChange }: { language: Locale; onChange: (locale: Locale) => void }) {
  return (
    <View accessibilityLabel="Dil seçimi" style={styles.languageFlags}>
      <Pressable
        accessibilityLabel="Türkçe"
        accessibilityRole="button"
        onPress={() => onChange('tr')}
        style={[styles.languageFlagButton, language === 'tr' ? styles.languageFlagButtonActive : null]}
      >
        <Text style={styles.languageFlagEmoji}>🇹🇷</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="English"
        accessibilityRole="button"
        onPress={() => onChange('en')}
        style={[styles.languageFlagButton, language === 'en' ? styles.languageFlagButtonActive : null]}
      >
        <Text style={styles.languageFlagEmoji}>🇬🇧</Text>
      </Pressable>
    </View>
  );
}

type RegisterStepProps = {
  error: string | null;
  form: RegistrationForm;
  language: Locale;
  onChange: (field: keyof RegistrationForm, value: string) => void;
  onChangeLanguage: (locale: Locale) => void;
  onOpenLogin: () => void;
  onSubmit: () => void;
  saving: boolean;
};

function RegisterStep({ error, form, language, onChange, onChangeLanguage, onOpenLogin, onSubmit, saving }: RegisterStepProps) {
  const copy = language === 'en'
    ? {
        badge: 'USER REGISTRATION',
        title: 'Let us get to know you',
        description: 'Vehicle, trip, and charging data will be linked to this account.',
        username: 'USERNAME',
        email: 'EMAIL',
        phone: 'PHONE',
        password: 'PASSWORD',
        passwordConfirmation: 'CONFIRM PASSWORD',
        submitting: 'REGISTERING',
        submit: 'REGISTER',
        phoneNote: 'Phone verification will be added with OTP in a later step.',
        existing: 'Already have an account?',
        login: 'Sign In',
      }
    : {
        badge: 'KULLANICI KAYDI',
        title: 'Önce seni tanıyalım',
        description: 'Araç, yolculuk ve şarj verileri bu kullanıcı hesabına bağlanacak.',
        username: 'KULLANICI ADI',
        email: 'EPOSTA',
        phone: 'TELEFON',
        password: 'ŞİFRE',
        passwordConfirmation: 'ŞİFRE DOĞRULAMA',
        submitting: 'KAYIT YAPILIYOR',
        submit: 'KAYIT OL',
        phoneNote: 'Telefon numarası şimdilik elle alınır; doğrulama sonraki OTP adımında yapılacak.',
        existing: 'Zaten hesabın var mı?',
        login: 'Giriş Yap',
      };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LanguageFlags language={language} onChange={onChangeLanguage} />
      <View style={styles.accountPanel}>
        <Text style={styles.badge}>{copy.badge}</Text>
        <Text style={styles.heading}>{copy.title}</Text>
        <Text style={styles.description}>{copy.description}</Text>
      </View>

      <Text style={styles.label}>{copy.username}</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={(value) => onChange('username', value)}
        placeholder="ornek_kullanici"
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={form.username}
      />

      <Text style={styles.label}>{copy.email}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={(value) => onChange('email', value)}
        placeholder="ornek@mail.com"
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={form.email}
      />

      <Text style={styles.label}>{copy.phone}</Text>
      <TextInput
        keyboardType="phone-pad"
        onChangeText={(value) => onChange('phone', value)}
        placeholder="+905551112233"
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={form.phone}
      />

      <Text style={styles.label}>{copy.password}</Text>
      <TextInput
        onChangeText={(value) => onChange('password', value)}
        placeholder="En az 8 karakter"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.searchInput}
        value={form.password}
      />

      <Text style={styles.label}>{copy.passwordConfirmation}</Text>
      <TextInput
        onChangeText={(value) => onChange('passwordConfirmation', value)}
        placeholder="Şifreyi tekrar yaz"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.searchInput}
        value={form.passwordConfirmation}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={onSubmit}
        style={[styles.primaryButton, saving ? styles.primaryButtonDisabled : null]}
      >
        <Text style={[styles.primaryButtonText, saving ? styles.primaryButtonTextDisabled : null]}>
          {saving ? copy.submitting : copy.submit}
        </Text>
      </Pressable>

      <Text style={styles.footerQuote}>
        {copy.phoneNote}
      </Text>
      <View style={styles.inlineAuthLink}>
        <Text style={styles.loginFooterText}>{copy.existing}</Text>
        <Pressable accessibilityRole="button" onPress={onOpenLogin}>
          <Text style={styles.loginRegisterText}>{copy.login}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type TrackingStepProps = {
  language: Locale;
  onSelectMode: (mode: TrackingMode) => void;
  selectedMode: TrackingMode | null;
};

function TrackingStep({ language, onSelectMode, selectedMode }: TrackingStepProps) {
  const trackingModes = getTrackingModes(language);
  const copy = language === 'en'
    ? {
        badge: 'TRACKING MODE',
        title: 'Choose your accuracy level',
        description: 'DMyC keeps working without manual data. This choice only controls how strongly calculations can be verified.',
      }
    : {
        badge: 'TAKİP MODU',
        title: 'Doğruluk seviyeni seç',
        description: 'DMyC veri vermezsen çalışmayı bırakmaz. Bu seçim sadece hesapların ne kadar doğrulanacağını belirler.',
      };

  return (
    <ScrollView contentContainerStyle={styles.contentWithBottomAction}>
      <View style={styles.accountPanel}>
        <Text style={styles.badge}>{copy.badge}</Text>
        <Text style={styles.heading}>{copy.title}</Text>
        <Text style={styles.description}>{copy.description}</Text>
      </View>

      <View style={styles.trackingStack}>
        {trackingModes.map((item) => {
          const selected = selectedMode === item.mode;

          return (
            <Pressable
              accessibilityRole="button"
              key={item.mode}
              onPress={() => onSelectMode(item.mode)}
              style={[styles.trackingCard, selected ? styles.selectedCard : null]}
            >
              <View style={styles.variantTopRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.trackingTitle}>{item.title}</Text>
                  <Text style={styles.trackingDescription}>{item.description}</Text>
                </View>
                <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              </View>

              <View style={styles.trackingDetailRow}>
                {item.details.map((detail) => (
                  <Text key={detail} style={styles.trackingPill}>
                    {detail}
                  </Text>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

type BrandStepProps = {
  apiStatus: 'checking' | 'online' | 'offline';
  brandQuery: string;
  brandImageByBrand: Record<string, string | null>;
  catalogCount: number;
  catalogSource: 'local' | 'api';
  onRetryApi: () => void;
  onSelectBrand: (brand: string) => void;
  popularBrands: string[];
  selectedBrand: string | null;
  setBrandQuery: (value: string) => void;
  visibleBrands: string[];
};

function BrandStep({
  apiStatus,
  brandQuery,
  brandImageByBrand,
  catalogCount,
  catalogSource,
  onRetryApi,
  onSelectBrand,
  popularBrands,
  selectedBrand,
  setBrandQuery,
  visibleBrands,
}: BrandStepProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>HIZLI BUL</Text>
      <TextInput
        onChangeText={setBrandQuery}
        placeholder="Marka ara..."
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={brandQuery}
      />

      <View style={styles.sourceRow}>
        <Text style={styles.sourceText}>
          Veri kaynağı: {catalogSource === 'api' ? 'API' : 'Local katalog'} · API:{' '}
          {apiStatusLabel(apiStatus)}
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetryApi} style={styles.retryButton}>
          <Text style={styles.retryText}>Yeniden dene</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.heading}>Popüler</Text>
        <Text style={styles.countText}>{popularBrands.length} MARKA</Text>
      </View>

      <View style={styles.popularGrid}>
        {popularBrands.map((brand, index) => (
          <BrandCard
            brand={brand}
            featured={index === 0}
            imageUrl={brandImageByBrand[brand] ?? null}
            key={brand}
            onPress={() => onSelectBrand(brand)}
            selected={selectedBrand === brand}
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.label}>ALFABETİK</Text>
        <Text style={styles.countText}>{catalogCount} ARAÇ</Text>
      </View>

      <View style={styles.listPanel}>
        {visibleBrands.map((brand) => (
          <ListRow
            key={brand}
            left={brand[0] ?? ''}
            onPress={() => onSelectBrand(brand)}
            selected={selectedBrand === brand}
            title={brand}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function BrandCard({
  brand,
  featured,
  imageUrl,
  onPress,
  selected,
}: {
  brand: string;
  featured?: boolean;
  imageUrl?: string | null;
  onPress: () => void;
  selected: boolean;
}) {
  const cardImage = imageUrl ?? HERO_IMAGE;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        featured ? styles.featuredBrandCard : styles.brandCard,
        selected ? styles.selectedCard : null,
      ]}
    >
      {featured ? <Image source={{ uri: cardImage }} style={styles.featuredImage} /> : null}
      {featured ? <View style={styles.imageShade} /> : null}
      <View style={featured ? styles.featuredContent : styles.brandContent}>
        {featured || !imageUrl ? (
          <Text style={styles.brandIcon}>{brand.slice(0, 1)}</Text>
        ) : (
          <Image source={{ uri: imageUrl }} style={styles.brandThumb} />
        )}
        <Text style={featured ? styles.featuredBrandTitle : styles.brandTitle}>{brand}</Text>
      </View>
    </Pressable>
  );
}

type ModelStepProps = {
  modelQuery: string;
  onSelectModel: (model: string) => void;
  selectedBrand: string | null;
  selectedBrandImage: string | null;
  selectedModel: string | null;
  setModelQuery: (value: string) => void;
  visibleModels: string[];
};

function ModelStep({
  modelQuery,
  onSelectModel,
  selectedBrand,
  selectedBrandImage,
  selectedModel,
  setModelQuery,
  visibleModels,
}: ModelStepProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroPanel}>
        <Image source={{ uri: selectedBrandImage ?? HERO_IMAGE }} style={styles.heroImage} />
        <View style={styles.heroShade} />
        <View style={styles.heroTextBlock}>
          <Text style={styles.badge}>MARKA SEÇİMİ</Text>
          <Text style={styles.heroTitle}>{selectedBrand ?? 'Marka'}</Text>
        </View>
      </View>

      <Text style={styles.heading}>Model seç</Text>
      <Text style={styles.description}>
        Aracının modelini seç. Variant seçimini bir sonraki adımda yapacağız.
      </Text>

      <TextInput
        onChangeText={setModelQuery}
        placeholder="Model ara..."
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={modelQuery}
      />

      <View style={styles.listPanel}>
        {visibleModels.map((model) => (
          <ListRow
            key={model}
            left={model.slice(0, 1)}
            onPress={() => onSelectModel(model)}
            selected={selectedModel === model}
            title={model}
          />
        ))}
      </View>
    </ScrollView>
  );
}

type VariantStepProps = {
  onSelectVehicle: (vehicle: VehicleCatalogItem) => void;
  selectedBrand: string | null;
  selectedModel: string | null;
  selectedModelImage: string | null;
  selectedVehicle: VehicleCatalogItem | null;
  variants: VehicleCatalogItem[];
};

function VariantStep({
  onSelectVehicle,
  selectedBrand,
  selectedModel,
  selectedModelImage,
  selectedVehicle,
  variants,
}: VariantStepProps) {
  return (
    <ScrollView contentContainerStyle={styles.contentWithBottomAction}>
      <View style={styles.heroPanel}>
        <Image source={{ uri: selectedModelImage ?? HERO_IMAGE }} style={styles.heroImage} />
        <View style={styles.heroShade} />
        <View style={styles.heroTextBlock}>
          <Text style={styles.badge}>CURRENT SELECTION</Text>
          <Text style={styles.heroTitle}>
            {selectedBrand} {selectedModel}
          </Text>
        </View>
      </View>

      <Text style={styles.heading}>Variant seç</Text>
      <Text style={styles.description}>
        Konfigürasyonu seçtiğinde ilk karne için fabrika verisini hazırlayacağız.
      </Text>

      <View style={styles.variantStack}>
        {variants.map((vehicle) => (
          <VariantCard
            key={vehicle.id}
            onPress={() => onSelectVehicle(vehicle)}
            selected={selectedVehicle?.id === vehicle.id}
            vehicle={vehicle}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function VariantCard({
  onPress,
  selected,
  vehicle,
}: {
  onPress: () => void;
  selected: boolean;
  vehicle: VehicleCatalogItem;
}) {
  const rangeProgress = vehicle.wltpRangeKm
    ? Math.max(18, Math.min(100, Math.round((vehicle.wltpRangeKm / 620) * 100)))
    : 20;
  const vehicleImage = vehicle.imageUrl ?? vehicle.brandImageUrl;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.variantCard, selected ? styles.selectedCard : null]}
    >
      <View style={styles.variantTopRow}>
        {vehicleImage ? <Image source={{ uri: vehicleImage }} style={styles.variantThumb} /> : null}
        <View style={styles.flexOne}>
          <Text style={styles.label}>{vehicle.driveType ?? 'EV'}</Text>
          <Text style={styles.variantTitle}>{vehicle.variant}</Text>
        </View>
        <View style={styles.metricRight}>
          <Text style={styles.metricPrimary}>{formatKw(vehicle.dcMaxKw)}</Text>
          <Text style={styles.metricTiny}>DC FAST</Text>
        </View>
      </View>

      <View style={styles.specGrid}>
        <MiniSpec label="BATARYA" value={formatKwh(vehicle.batteryNetKwh ?? vehicle.batteryGrossKwh)} />
        <MiniSpec label="MENZİL" value={formatKm(vehicle.wltpRangeKm)} />
        <MiniSpec label="AC" value={formatKw(vehicle.acMaxKw)} />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${rangeProgress}%` }]} />
      </View>
    </Pressable>
  );
}

function SummaryStep({
  latestAssessment,
  language,
  onOpenAssessmentModal,
  onPlanRange,
  onStartDriving,
  user,
  vehicle,
}: {
  latestAssessment: ApiAssessment | null;
  language: Locale;
  onOpenAssessmentModal: () => void;
  onPlanRange: () => void;
  onStartDriving: () => void;
  user: ApiUser | null;
  vehicle: VehicleCatalogItem | null;
}) {
  if (!vehicle) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.heading}>Araç bekleniyor</Text>
        <Text style={styles.description}>İlk karne için önce bir variant seçmelisin.</Text>
      </View>
    );
  }

  const firstCard = buildFirstCard(vehicle);
  const vehicleImage = vehicle.imageUrl ?? vehicle.brandImageUrl ?? HERO_IMAGE;
  const translate = createTranslator(language);
  const socMin = firstCard.dailySocMin ?? 20;
  const socMax = firstCard.dailySocMax ?? 80;

  return (
    <ScrollView contentContainerStyle={styles.todayScroll} style={styles.todayRoot}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <View style={styles.todayHero}>
        <Image source={{ uri: vehicleImage }} style={styles.todayHeroImage} />
        <View style={styles.todayHeroShade} />
        <View style={styles.todayHeroBadgeWrap}>
          <Text style={styles.todayHeroBadgeText}>{vehicle.variant.toUpperCase()}</Text>
        </View>
        <View style={styles.todayHeroTitleWrap}>
          <Text style={styles.todayHeroName}>{vehicle.brand} {vehicle.model}</Text>
        </View>
      </View>

      <View style={styles.todayBody}>

        {/* ── ANA METRİK ────────────────────────────────────────────── */}
        <View style={styles.todayCard}>
          <View style={styles.todayCardLabelRow}>
            <Text style={styles.todayCardLabel}>BEKLENEN GERÇEK KULLANIM</Text>
            <InfoBadge tooltipKey="realRange" />
          </View>
          <Text style={styles.todayMainValue}>
            {formatRange(firstCard.expectedRealRangeMinKm, firstCard.expectedRealRangeMaxKm)}
          </Text>
          <Text style={styles.todayCardHint}>Gerçek kullanım şartları altında ilk menzil tahmini</Text>
        </View>

        {/* ── SPEC GRİD (4 tile) ────────────────────────────────────── */}
        <View style={styles.todaySpecGrid}>
          {([
            { label: 'WLTP MENZİLİ', value: formatKm(firstCard.factoryRangeKm), tooltipKey: 'wltp' as TooltipKey },
            { label: 'DC ŞARJ',      value: formatKw(firstCard.dcMaxKw),         tooltipKey: undefined },
            { label: 'BATARYA',      value: formatKwh(firstCard.batteryCapacityKwh), tooltipKey: undefined },
            { label: 'VERİMLİLİK',   value: formatEfficiency(vehicle.officialEfficiencyWhKm), tooltipKey: undefined },
          ] as const).map((item) => (
            <View key={item.label} style={styles.todaySpecTile}>
              <View style={styles.todayTileLabelRow}>
                <Text style={styles.todayTileLabel}>{item.label}</Text>
                {item.tooltipKey ? <InfoBadge tooltipKey={item.tooltipKey} /> : null}
              </View>
              <Text style={styles.todayTileValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── ŞARJ ARALIĞI ──────────────────────────────────────────── */}
        <View style={styles.todayCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.todayCardLabel}>ÖNERİLEN GÜNLÜK ŞARJ ARALIĞI</Text>
            <Text style={styles.todaySocValue}>{`%${socMin} – %${socMax}`}</Text>
          </View>
          <View style={styles.todaySocTrack}>
            <View
              style={[
                styles.todaySocFill,
                { left: `${socMin}%`, right: `${100 - socMax}%` },
              ]}
            />
          </View>
        </View>

        {/* ── GÜN 0 DEĞERLENDİRME ──────────────────────────────────── */}
        {latestAssessment ? (
          <View style={styles.todayAssessmentCard}>
            <View style={styles.todayAssessmentHeader}>
              <Text style={styles.todayAssessmentTitle}>{translate('mobile.assessment.step')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onOpenAssessmentModal}
                style={[styles.todayScenarioPill, { backgroundColor: scenarioColor(latestAssessment.scenarioId) }]}
              >
                <Text style={styles.todayScenarioPillText}>{latestAssessment.scenarioTitle}</Text>
              </Pressable>
            </View>
            <View style={styles.todayAssessmentGrid}>
              {([
                { label: translate('mobile.assessment.metric.annualKm'),      value: latestAssessment.annualKm.toLocaleString('tr-TR'), tooltipKey: undefined,  br: true,  bb: true  },
                { label: translate('mobile.assessment.metric.estimatedCycle'), value: String(latestAssessment.estimatedTotalFullCycles ?? '—'), tooltipKey: 'efc' as TooltipKey, br: false, bb: true  },
                { label: translate('mobile.assessment.metric.vehicleAge'),     value: `${latestAssessment.vehicleAgeYears} ${translate('mobile.assessment.unit.years')}`, tooltipKey: undefined, br: true,  bb: false },
                { label: translate('mobile.assessment.metric.city'),           value: latestAssessment.city ?? '—', tooltipKey: undefined, br: false, bb: false },
              ]).map((tile) => (
                <View
                  key={tile.label}
                  style={[
                    styles.todayAssessmentTile,
                    tile.br ? styles.todayTileBorderRight  : null,
                    tile.bb ? styles.todayTileBorderBottom : null,
                  ]}
                >
                  <View style={styles.todayTileLabelRow}>
                    <Text style={styles.todayTileLabel}>{tile.label}</Text>
                    {tile.tooltipKey ? <InfoBadge tooltipKey={tile.tooltipKey} /> : null}
                  </View>
                  <Text style={styles.todayTileValue}>{tile.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── CTA BUTONLAR ──────────────────────────────────────────── */}
        <View style={styles.todayActions}>
          <Pressable accessibilityRole="button" onPress={onStartDriving} style={styles.todayPrimaryButton}>
            <Text style={styles.todayPrimaryButtonText}>YOLCULUK BAŞLAT  ↗</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onPlanRange} style={styles.todaySecondaryButton}>
            <Text style={styles.todaySecondaryButtonText}>MENZİL PLANLA  ≡</Text>
          </Pressable>
        </View>

      </View>
    </ScrollView>
  );
}

function ContextQuestionCard({
  question,
  totalCount,
  currentIndex,
  onAnswer,
  onSkip,
}: {
  question: ApiContextQuestion;
  totalCount: number;
  currentIndex: number;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}) {
  const questionConfig: Record<
    ApiContextQuestion['questionType'],
    { label: string; options: Array<{ value: string; label: string }> }
  > = {
    CLIMATE_USAGE: {
      label: 'Klima açık mıydı?',
      options: [
        { value: 'on', label: 'Evet' },
        { value: 'off', label: 'Hayır' },
        { value: 'unknown', label: 'Bilmiyorum' },
      ],
    },
    PASSENGER_COUNT: {
      label: 'Araçta kaç kişiydiniz?',
      options: [
        { value: '1', label: '1 kişi' },
        { value: '2', label: '2 kişi' },
        { value: '3+', label: '3 veya fazlası' },
      ],
    },
    CARGO_PRESENCE: {
      label: 'Ağır yük var mıydı?',
      options: [
        { value: 'yes', label: 'Evet' },
        { value: 'no', label: 'Hayır' },
      ],
    },
    DEVIATION_REASON: {
      label: 'Bu yolculuk alışılagelen rotandan farklı görünüyor.',
      options: [
        { value: 'traffic_detour', label: 'Trafik/yol nedeniyle' },
        { value: 'different_destination', label: 'Farklı varış noktası' },
        { value: 'normal', label: 'Normal yolculuktu' },
      ],
    },
    SERVICE_VISIT: {
      label: question.metadata?.poiName
        ? `"${question.metadata.poiName}" yakınında uzun süre durduğunu gördüm. Bakım mı yaptırdın?`
        : 'Bir servis noktasına gittiğini gördüm. Bakım mı yaptırdın?',
      options: [
        { value: 'periodic', label: 'Evet, periyodik bakım' },
        { value: 'repair', label: 'Evet, tamir/arıza' },
        { value: 'hayir', label: 'Hayır' },
      ],
    },
  };

  const config = questionConfig[question.questionType];
  if (!config) return null;

  return (
    <View style={styles.contextCardOverlay}>
      <View style={styles.contextCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.badge}>{currentIndex + 1} / {totalCount}</Text>
          <Pressable accessibilityRole="button" onPress={onSkip}>
            <Text style={styles.contextSkip}>Atla</Text>
          </Pressable>
        </View>
        <Text style={styles.contextQuestion}>{config.label}</Text>
        <View style={styles.contextOptions}>
          {config.options.map((opt) => (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              style={styles.contextOptionButton}
              onPress={() => onAnswer(opt.value)}
            >
              <Text style={styles.contextOptionText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function ProfileStep({
  acceptLoading,
  acceptMessage,
  acceptToken,
  backendBinding,
  message,
  userVehicles,
  onAcceptInvite,
  onChangeAcceptToken,
  onChangePassword,
  onLogout,
  onOpenVehicleSwitcher,
  onSelectVehicle,
  user,
}: {
  acceptLoading: boolean;
  acceptMessage: string | null;
  acceptToken: string;
  backendBinding: BackendBinding | null;
  message: string | null;
  userVehicles: NonNullable<ApiActiveBinding>[];
  onAcceptInvite: () => void;
  onChangeAcceptToken: (v: string) => void;
  onChangePassword: () => void;
  onLogout: () => void;
  onOpenVehicleSwitcher: () => void;
  onSelectVehicle: () => void;
  user: ApiUser | null;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.accountPanel}>
        <Text style={styles.badge}>PROFİL</Text>
        <Text style={styles.heading}>{user?.fullName || user?.username || 'Kullanıcı'}</Text>
        <Text style={styles.description}>{user?.email ?? 'E-posta yok'} · {user?.phone ?? 'Telefon yok'}</Text>
      </View>

      <View style={styles.bindingPanel}>
        <Text style={styles.label}>AKTİF ARAÇ</Text>
        <Text style={styles.bindingTitle}>{backendBinding?.vehicle.displayName ?? 'Araç bağlı değil'}</Text>
        {backendBinding?.ownership.userId ? (
          <View style={[styles.aracPill, { alignSelf: 'flex-start', marginTop: 6, backgroundColor: roleColor(backendBinding.access?.role ?? 'owner') + '22' }]}>
            <Text style={[styles.aracPillText, { color: roleColor(backendBinding.access?.role ?? 'owner') }]}>
              {roleLabel(backendBinding.access?.role ?? 'owner').toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Araçlarım — çoklu araç listesi */}
      {userVehicles.length > 1 ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>ARAÇLARIM</Text>
            <Text style={[styles.signalCaption, { marginBottom: 0 }]}>{userVehicles.length} araç</Text>
          </View>
          {userVehicles.slice(0, 3).map((v) => {
            const isActive = v.vehicle.id === backendBinding?.vehicle.id;
            const role = v.access?.role ?? 'owner';
            return (
              <View key={v.vehicle.id} style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={[styles.bindingText, { flex: 1 }]} numberOfLines={1}>{v.vehicle.displayName}</Text>
                <View style={[styles.aracPill, { backgroundColor: isActive ? colors.cyan + '22' : roleColor(role) + '22', marginLeft: 8 }]}>
                  <Text style={[styles.aracPillText, { color: isActive ? colors.cyan : roleColor(role) }]}>
                    {isActive ? 'AKTİF' : roleLabel(role).toUpperCase()}
                  </Text>
                </View>
              </View>
            );
          })}
          <Pressable accessibilityRole="button" onPress={onOpenVehicleSwitcher} style={[styles.secondaryButton, { marginTop: 12 }]}>
            <Text style={styles.secondaryButtonText}>ARAÇ DEĞIŞTIR</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Davet kabul */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>DAVET KABUL ET</Text>
        <Text style={[styles.signalCaption, { marginBottom: 8 }]}>Bir araç sahibinden davet aldıysan token'ı buraya yapıştır.</Text>
        <TextInput
          style={styles.formInput}
          placeholder="Davet token'ı"
          value={acceptToken}
          onChangeText={onChangeAcceptToken}
          autoCapitalize="none"
        />
        {acceptMessage ? (
          <Text style={[styles.signalCaption, { marginTop: 6, color: acceptMessage.includes('kabul edildi') ? '#22c55e' : '#ef4444' }]}>
            {acceptMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={[styles.secondaryButton, { marginTop: 8, opacity: acceptLoading ? 0.5 : 1 }]}
          onPress={onAcceptInvite}
          disabled={acceptLoading}
        >
          <Text style={styles.secondaryButtonText}>{acceptLoading ? 'KONTROL EDİLİYOR...' : 'KABUL ET'}</Text>
        </Pressable>
      </View>

      {message ? <Text style={styles.tripMessage}>{message}</Text> : null}

      <View style={styles.tripActions}>
        <Pressable accessibilityRole="button" onPress={onChangePassword} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>ŞİFRE DEĞİŞTİR</Text>
        </Pressable>
        {userVehicles.length <= 1 ? (
          <Pressable accessibilityRole="button" onPress={onSelectVehicle} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>ARAÇ DEĞİŞTİR</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>HESAPTAN ÇIKIŞ YAP</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Android navigation bar height varies: gesture nav ~24dp, 3-button ~48dp, Samsung ~56dp
// Proper fix via useSafeAreaInsets() comes with next build (react-native-safe-area-context)
const BOTTOM_NAV_INSET = Platform.OS === 'android' ? 48 : 34;

function BottomNav({ activeStep, onNavigate }: { activeStep: Step; onNavigate: (step: Step) => void }) {
  const items: Array<{ label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; step: Step }> = [
    { label: 'GARAJ',    icon: 'speed',         step: 'today'    },
    { label: 'YOLCULUK', icon: 'route',          step: 'yolculuk' },
    { label: 'ŞARJ',     icon: 'bolt',           step: 'sarj'     },
    { label: 'KARNE',    icon: 'military-tech',  step: 'karne'    },
    { label: 'ARAÇ',     icon: 'directions-car', step: 'arac'     },
  ];

  const activeTab =
    activeStep === 'range'     ? 'yolculuk' :
    activeStep === 'locations' ? 'yolculuk' :
    activeStep === 'profile'   ? 'arac'     : activeStep;

  return (
    <View style={[styles.bottomNav, { height: 64 + BOTTOM_NAV_INSET, paddingBottom: BOTTOM_NAV_INSET }]}>
      {items.map((item) => {
        const selected = item.step === activeTab;

        return (
          <Pressable
            accessibilityRole="button"
            key={item.step}
            onPress={() => onNavigate(item.step)}
            style={styles.bottomNavItem}
          >
            {selected && <View style={styles.bottomNavActiveBar} />}
            <MaterialIcons name={item.icon} size={24} color={selected ? colors.cyan : colors.muted} />
            <Text style={[styles.bottomNavLabel, selected ? styles.bottomNavLabelActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── KarneScreen ─────────────────────────────────────────────────────────────

type KarneScreenProps = {
  batteryLifecycle: ApiBatteryLifecycle | null;
  communityBenchmark: ApiCommunityBenchmark | null;
  monthlyReport: ApiMonthlyReport | null;
  usageProfile: ApiUsageProfile | null;
  routeSummary: ApiRouteSummary | null;
  language: Locale;
};

function KarneScreen({ batteryLifecycle, communityBenchmark, monthlyReport, usageProfile, routeSummary, language }: KarneScreenProps) {
  const translate = createTranslator(language);

  const showMonthly   = !!monthlyReport;
  const showUsage     = !!(usageProfile && (usageProfile.confidenceScore ?? 0) >= 0.50);
  const showBattery   = !!(batteryLifecycle && (batteryLifecycle.confidenceScore ?? 0) >= 0.45);
  const showRoute     = routeSummary?.status === 'observed';
  const showCommunity = communityBenchmark?.status === 'ready';
  const hasAny        = showMonthly || showUsage || showBattery || showRoute || showCommunity;

  return (
    <ScrollView contentContainerStyle={styles.karneScroll}>

      {/* ── ÖĞRENME DURUMU (veri yokken) ──────────────────────────────── */}
      {!hasAny && (
        <View style={styles.karneLearnCard}>
          <View style={styles.karneLearnBody}>
            <Text style={styles.karneLearnWave}>〜</Text>
            <Text style={styles.karneLearnTitle}>Sistem seni tanımaya başlıyor.</Text>
            <Text style={styles.karneLearnSub}>
              İlk yolculuk ve şarj kaydından sonra kişisel özetler açılır.
            </Text>
            <View style={styles.karneLearnGrid}>
              {[
                'Aylık kullanım', 'Profil',
                'Batarya yaşam', 'Rota',
              ].map((item) => (
                <View key={item} style={styles.karneLearnGridItem}>
                  <View style={styles.karneLearnDot} />
                  <Text style={styles.karneLearnItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── VERİ KARTLARI (space-y-sm = 12px gap) ─────────────────────── */}
      {hasAny && (
      <View style={styles.karneDataStack}>

      {/* ── BU AY ─────────────────────────────────────────────────────── */}
      {showMonthly && (
        <View style={styles.karneCard}>
          <View style={styles.karneCardHeader}>
            <Text style={styles.karneCardTitle}>BU AY</Text>
            <View style={styles.karneBadge}>
              <Text style={styles.karneBadgeText}>
                {`${monthlyReport!.periodYear}/${String(monthlyReport!.periodMonth).padStart(2, '0')}`}
              </Text>
            </View>
          </View>
          <View style={styles.karneDataGrid}>
            <KarneDataItem label="MESAFE" value={`${Math.round(monthlyReport!.totalDistanceM / 1000)}`} unit="km" />
            <KarneDataItem label="ENERJİ MALİYETİ" value={formatTL(monthlyReport!.totalCostAmount)} accent />
            <KarneDataItem label="BİRİM MALİYET" value={monthlyReport!.costPerKm ? monthlyReport!.costPerKm.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'} unit="₺/km" />
            <KarneDataItem label="TASARRUF" value={monthlyReport!.estimatedSavings != null && monthlyReport!.estimatedSavings > 0 ? formatTL(monthlyReport!.estimatedSavings) : '—'} accent />
          </View>
          <View style={styles.karneCardFooter}>
            <Text style={styles.karneFooterLeft}>{monthlyReport!.tripCount} yolculuk</Text>
            <Text style={styles.karneFooterRight}>
              {`Benzinli: ${monthlyReport!.fossilEquivCost != null ? formatTL(monthlyReport!.fossilEquivCost) : '—'}`}
            </Text>
          </View>
        </View>
      )}

      {/* ── KULLANIM PROFİLİ ───────────────────────────────────────────── */}
      {showUsage && (
        <View style={styles.karneCard}>
          <View style={styles.karneCardHeader}>
            <Text style={styles.karneCardTitle}>KULLANIM PROFİLİ</Text>
            <Text style={styles.karneAccentLabel}>{usageProfileConfidenceLabel(usageProfile)}</Text>
          </View>
          <View style={styles.karneDataGrid}>
            <KarneDataItem label="ŞEHİR İÇİ" value={formatKm(usageProfile!.avgDailyKm ?? null)} />
            <KarneDataItem label="OTOBAN" value={formatKm(usageProfile!.avgWeeklyKm ?? null)} />
            <KarneDataItem label="REJENERASYON" value={formatRatio(usageProfile!.homeChargeRatio ?? null)} />
            <KarneDataItem label="VERİMLİLİK" value={formatSoc(usageProfile!.avgStartSoc ?? null, usageProfile!.avgEndSoc ?? null)} accent />
          </View>
          <View style={styles.signalBars}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.signalBar, i < usageProfileSignalLevel(usageProfile) ? styles.signalBarActive : null]} />
            ))}
          </View>
        </View>
      )}

      {/* ── BATARYA YAŞAM SİNYALİ ─────────────────────────────────────── */}
      {showBattery && (
        <View style={styles.karneCard}>
          <View style={styles.karneCardHeader}>
            <Text style={styles.karneCardTitle}>BATARYA YAŞAM SİNYALİ</Text>
            <View style={styles.karneCyanPill}>
              <Text style={styles.karneCyanPillText}>{batteryUsageGradeLabel(batteryLifecycle!.batteryUsageGrade, language)}</Text>
            </View>
          </View>
          <View style={styles.karneDataGrid}>
            <KarneDataItem label="EFC (DÖNGÜ)" value={formatDecimal(batteryLifecycle!.totalEfc, 2)} />
            <KarneDataItem label="STRES SKORU" value={formatDecimal(batteryLifecycle!.totalStressAdjustedCycles, 2)} />
            <KarneDataItem label="DC ŞARJ ORANI" value={formatRatio(batteryLifecycle!.dcChargeRatio ?? null)} />
            <KarneDataItem label="GÜVEN ENDEKSİ" value={formatConfidence(batteryLifecycle!.confidenceScore)} accent />
          </View>
        </View>
      )}

      {/* ── ROTA ÖĞRENMESİ ────────────────────────────────────────────── */}
      {showRoute && (
        <View style={styles.karneCard}>
          <View style={styles.karneCardHeader}>
            <Text style={styles.karneCardTitle}>ROTA ÖĞRENMESİ</Text>
            <View style={styles.karneObservedBadge}>
              <View style={styles.karnePulseDot} />
              <Text style={styles.karneAccentLabel}>GÖZLEMLENDİ</Text>
            </View>
          </View>
          <View style={styles.karneDataGrid}>
            <KarneDataItem label="TOPLAM ROTA" value={String(routeSummary!.routeCount)} />
            <KarneDataItem label="ÖĞRENİLEN" value={String(routeSummary!.learnedRouteCount)} />
            <KarneDataItem label="VERİ GİRİŞİ" value={String(routeSummary!.totalObservedTripCount)} unit="trips" />
            <KarneDataItem label="GÜVENLİ TAHMİN" value={formatConfidence(routeSummary!.topRoute?.confidenceScore ?? null)} accent />
          </View>
        </View>
      )}

      {/* ── TOPLULUK ──────────────────────────────────────────────────── */}
      {showCommunity && (
        <View style={styles.karneCard}>
          <View style={styles.karneCardHeader}>
            <Text style={styles.karneCardTitle}>{translate('mobile.community.title')}</Text>
            <Text style={styles.karneAccentLabel}>{translate('mobile.community.ready')}</Text>
          </View>
          <View style={styles.karneDataGrid}>
            <KarneDataItem label={translate('mobile.community.metric.sample')} value={String(communityBenchmark!.topBenchmark?.matchedTripCount ?? 0)} />
            <KarneDataItem label={translate('mobile.community.metric.ready')} value={String(communityBenchmark!.readyBenchmarkCount ?? 0)} />
            <KarneDataItem label={translate('mobile.community.metric.speed')} value={formatSpeed(communityBenchmark!.topBenchmark?.communityAvgSpeedKmh ?? null)} />
            <KarneDataItem label={translate('mobile.community.metric.confidence')} value={formatConfidence(communityBenchmark!.topBenchmark?.matchQualityScore ?? null)} accent />
          </View>
        </View>
      )}

      </View>
      )}

    </ScrollView>
  );
}

function KarneDataItem({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <View style={styles.karneDataItem}>
      <Text style={styles.karneDataLabel}>{label}</Text>
      <Text style={[styles.karneDataValue, accent ? styles.karneDataValueAccent : null]}>
        {value}
        {unit ? <Text style={styles.karneDataUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

// ─── AracScreen ──────────────────────────────────────────────────────────────

type AracScreenProps = {
  annualReport: ApiAnnualReport | null;
  batteryLifecycle: ApiBatteryLifecycle | null;
  canManageDrivers: boolean;
  language: Locale;
  latestAssessment: ApiAssessment | null;
  onAddExternalReport: (provider: string, reportUrl?: string, sohPercent?: number) => void;
  onAddServiceVisit: () => void;
  onGeneratePremiumReport: () => void;
  onGeneratePublicReport: () => void;
  onManageLocations: () => void;
  onLogout: () => void;
  onOpenAssessmentModal: () => void;
  onOpenDrivers: () => void;
  onOpenProfile: () => void;
  premiumReport: ApiPremiumReport | null;
  publicReport: ApiPublicReport | null;
  registrySummary: ApiRegistrySummary | null;
  serviceCompliance: ApiServiceCompliance | null;
  serviceVisits: ApiServiceVisit[];
  user: ApiUser | null;
  vehicle: VehicleCatalogItem | null;
  vehicleRoutes: ApiRouteFingerprint[];
};

function AracScreen({
  batteryLifecycle,
  canManageDrivers,
  language,
  latestAssessment,
  onAddExternalReport,
  onAddServiceVisit,
  onGeneratePremiumReport,
  onGeneratePublicReport,
  onManageLocations,
  onLogout,
  onOpenAssessmentModal,
  onOpenDrivers,
  onOpenProfile,
  premiumReport,
  publicReport,
  registrySummary,
  serviceCompliance,
  serviceVisits,
  user,
  vehicle,
  vehicleRoutes,
}: AracScreenProps) {
  const translate = createTranslator(language);
  const vehicleImage = vehicle?.imageUrl ?? vehicle?.brandImageUrl ?? HERO_IMAGE;

  const serviceTiles = [
    { label: translate('mobile.service.metric.total'),    value: serviceCompliance ? String(serviceCompliance.total) : '—', br: true,  bb: true  },
    { label: translate('mobile.service.metric.onTime'),   value: serviceCompliance?.rate !== null && serviceCompliance !== null ? `%${serviceCompliance.rate}` : '—', br: false, bb: true  },
    { label: translate('mobile.service.metric.next'),     value: serviceCompliance?.nextServiceKm !== null && serviceCompliance !== null ? `${(serviceCompliance.nextServiceKm ?? 0).toLocaleString('tr-TR')} km` : '—', br: true,  bb: false },
    { label: translate('mobile.service.metric.interval'), value: serviceCompliance ? `${serviceCompliance.serviceIntervalKm.toLocaleString('tr-TR')} km` : '—', br: false, bb: false },
  ];

  const karneTiles = [
    { label: 'YOLCULUK', value: String(publicReport?.snapshotData.tripCount ?? 0),   br: true,  bb: true  },
    { label: 'ŞARJ',     value: String(publicReport?.snapshotData.chargeCount ?? 0),  br: false, bb: true  },
    { label: 'MENZİL',   value: publicReport?.snapshotData.distanceBand ?? '—',       br: true,  bb: false },
    { label: 'BATARYA',  value: batteryUsageGradeLabel(publicReport?.snapshotData.batteryUsageGrade ?? 'unknown', language), br: false, bb: false },
  ];

  return (
    <ScrollView contentContainerStyle={styles.aracScroll}>

      {/* ── KİMLİK ─────────────────────────────────────────────────────── */}
      <View style={styles.aracIdentity}>
        <Text style={styles.aracIdentityLabel}>ARAÇ</Text>
        <Text style={styles.aracIdentityTitle}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Aracın'}</Text>
        <Text style={styles.aracIdentitySub}>
          {user?.createdAt ? `${new Date(user.createdAt).getFullYear()}'den beri sahibi` : 'sahibi'}
        </Text>
      </View>

      {/* ── ARAÇ HERO ──────────────────────────────────────────────────── */}
      <View style={styles.aracHero}>
        <Image source={{ uri: vehicleImage }} style={styles.aracHeroImage} />
        <View style={styles.aracHeroGradient} />
        <View style={styles.aracHeroStatusWrap}>
          <Text style={styles.aracHeroStatusText}>AKTİF DURUM: İYİ</Text>
        </View>
      </View>

      {/* ── GÜN 0 DEĞERLENDİRME ───────────────────────────────────────── */}
      {latestAssessment ? (
        <View style={styles.aracCard}>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenAssessmentModal}
            style={styles.aracAssessmentHeader}
          >
            <Text style={styles.aracCardTitle}>{translate('mobile.assessment.step')}</Text>
            <Text style={[styles.aracAssessmentScenario, { color: scenarioColor(latestAssessment.scenarioId) }]}>
              {latestAssessment.scenarioTitle}  ›
            </Text>
          </Pressable>
          <View style={styles.aracDataGrid}>
            {[
              { label: translate('mobile.assessment.metric.annualKm'),      value: latestAssessment.annualKm.toLocaleString('tr-TR'), br: true,  bb: true  },
              { label: translate('mobile.assessment.metric.estimatedCycle'), value: String(latestAssessment.estimatedTotalFullCycles ?? '—'), br: false, bb: true  },
              { label: translate('mobile.assessment.metric.vehicleAge'),     value: `${latestAssessment.vehicleAgeYears} ${translate('mobile.assessment.unit.years')}`, br: true,  bb: false },
              { label: translate('mobile.assessment.metric.city'),           value: latestAssessment.city ?? '—', br: false, bb: false },
            ].map((t) => (
              <View
                key={t.label}
                style={[
                  styles.aracDataTile,
                  t.br ? styles.aracTileBorderRight  : null,
                  t.bb ? styles.aracTileBorderBottom : null,
                ]}
              >
                <Text style={styles.aracDataTileLabel}>{t.label}</Text>
                <Text style={styles.aracDataTileValue}>{t.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── BATARYA YAŞAM DÖNGÜSÜ ──────────────────────────────────────── */}
      {batteryLifecycle ? (
        <View style={styles.aracCard}>
          <View style={styles.aracCardHeader}>
            <Text style={styles.aracCardTitle}>BATARYA YAŞAM DÖNGÜSÜ</Text>
            <View style={[styles.aracPill, { backgroundColor: '#0d1515' }]}>
              <Text style={[styles.aracPillText, { color: colors.cyan }]}>
                {batteryUsageGradeLabel(batteryLifecycle.batteryUsageGrade, language)}
              </Text>
            </View>
          </View>
          <View style={styles.aracDataGrid}>
            {([
              { label: 'TOPLAM EFC',    value: batteryLifecycle.totalEfc.toFixed(2),                                                                                  tooltipKey: 'efc'         as TooltipKey, br: true,  bb: true,  accent: true  },
              { label: 'STRES DÖNGÜ',   value: batteryLifecycle.totalStressAdjustedCycles.toFixed(2),                                                                  tooltipKey: 'stressScore' as TooltipKey, br: false, bb: true,  accent: false },
              { label: 'DC ŞARJ ORANI', value: batteryLifecycle.dcChargeRatio !== null ? `%${Math.round(batteryLifecycle.dcChargeRatio * 100)}` : '—',                 tooltipKey: 'dcRatio'     as TooltipKey, br: true,  bb: false, accent: false },
              { label: 'GÜVEN ENDEKSİ', value: batteryLifecycle.confidenceScore !== null ? `%${Math.round(batteryLifecycle.confidenceScore * 100)}` : '—',             tooltipKey: 'confidence'  as TooltipKey, br: false, bb: false, accent: false },
            ] as const).map((t) => (
              <View
                key={t.label}
                style={[
                  styles.aracDataTile,
                  t.br ? styles.aracTileBorderRight  : null,
                  t.bb ? styles.aracTileBorderBottom : null,
                ]}
              >
                <View style={styles.aracDataTileLabelRow}>
                  <Text style={styles.aracDataTileLabel}>{t.label}</Text>
                  <InfoBadge tooltipKey={t.tooltipKey} />
                </View>
                <Text style={[styles.aracDataTileValue, t.accent ? { color: colors.cyan } : null]}>
                  {t.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── SERVİS GEÇMİŞİ ────────────────────────────────────────────── */}
      <View style={styles.aracCard}>
        <View style={styles.aracCardHeader}>
          <Text style={styles.aracCardTitle}>SERVİS GEÇMİŞİ</Text>
          <View style={styles.aracPill}>
            <Text style={styles.aracPillText}>{serviceVisits.length} ZİYARET</Text>
          </View>
        </View>
        <View style={styles.aracDataGrid}>
          {serviceTiles.map((t) => (
            <View
              key={t.label}
              style={[
                styles.aracDataTile,
                t.br ? styles.aracTileBorderRight  : null,
                t.bb ? styles.aracTileBorderBottom : null,
              ]}
            >
              <Text style={styles.aracDataTileLabel}>{t.label}</Text>
              <Text style={styles.aracDataTileValue}>{t.value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.aracCardFooter}>
          {serviceVisits.length > 0 && (
            <Text style={styles.aracCardFooterNote} numberOfLines={1}>
              Son ziyaret: {serviceVisits[0].visitDate} · {visitTypeLabel(serviceVisits[0].visitType)}
            </Text>
          )}
          <Pressable accessibilityRole="button" onPress={onAddServiceVisit} style={styles.aracOutlineButton}>
            <Text style={styles.aracOutlineButtonText}>SERVİS EKLE</Text>
          </Pressable>
        </View>
      </View>

      {/* ── EV KARNESİ ─────────────────────────────────────────────────── */}
      <View style={styles.aracCard}>
        <View style={styles.aracCardHeader}>
          <Text style={styles.aracCardTitle}>EV KARNESİ</Text>
          <View style={styles.aracPill}>
            <Text style={styles.aracPillText}>
              {publicReport ? verificationLevelLabel(publicReport.verificationLevel).toUpperCase() : 'TEMEL'}
            </Text>
          </View>
        </View>
        <View style={styles.aracDataGrid}>
          {karneTiles.map((t) => (
            <View
              key={t.label}
              style={[
                styles.aracDataTile,
                t.br ? styles.aracTileBorderRight  : null,
                t.bb ? styles.aracTileBorderBottom : null,
              ]}
            >
              <Text style={styles.aracDataTileLabel}>{t.label}</Text>
              <Text style={styles.aracDataTileValue}>{t.value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.aracCardFooter}>
          {publicReport ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const shareUrl = `${API_BASE_URL}/public/vehicles/${publicReport.shareToken}`;
                void Share.share({ title: 'EV Karnesi', message: `Bu aracın EV Karnesi: ${shareUrl}`, url: shareUrl });
              }}
              style={styles.aracCyanButton}
            >
              <Text style={styles.aracCyanButtonText}>⬡  KARNEYİ PAYLAŞ</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={onGeneratePublicReport} style={styles.aracCyanButton}>
              <Text style={styles.aracCyanButtonText}>KARNE OLUŞTUR</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── PREMIUM RAPOR ──────────────────────────────────────────────── */}
      <View style={styles.aracCard}>
        <View style={styles.aracCardHeader}>
          <Text style={styles.aracCardTitle}>{translate('mobile.premium.report.title')}</Text>
          {premiumReport ? (
            <View style={[styles.aracPill, { backgroundColor: colors.cyan }]}>
              <Text style={[styles.aracPillText, { color: '#004f54' }]}>
                {new Date(premiumReport.createdAt).getFullYear()}
              </Text>
            </View>
          ) : null}
        </View>
        {premiumReport ? (
          <View style={styles.aracChevronList}>
            {[
              { icon: 'ℹ', label: 'Araç özeti' },
              { icon: '👤', label: 'Şoför profili' },
              { icon: '₺', label: 'Ekonomik özet' },
            ].map((item) => (
              <View key={item.label} style={styles.aracChevronRow}>
                <Text style={styles.aracChevronIcon}>{item.icon}</Text>
                <Text style={styles.aracChevronLabel}>{item.label}</Text>
                <Text style={styles.aracChevronArrow}>›</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.aracCardFooter}>
          <Pressable accessibilityRole="button" onPress={onGeneratePremiumReport} style={styles.aracOutlineButton}>
            <Text style={styles.aracOutlineButtonText}>{translate('mobile.premium.report.generate')}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── SÜRÜCÜLER ──────────────────────────────────────────────────── */}
      {canManageDrivers ? (
        <View style={styles.aracCard}>
          <View style={styles.aracCardHeader}>
            <Text style={styles.aracCardTitle}>SÜRÜCÜLER</Text>
          </View>
          <View style={styles.aracCardFooter}>
            <Pressable accessibilityRole="button" onPress={onOpenDrivers} style={styles.aracOutlineButton}>
              <Text style={styles.aracOutlineButtonText}>ERİŞİM YÖNETİMİ</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── SÜRÜCÜ KARNEM ──────────────────────────────────────────────── */}
      {(() => {
        const scoredRoutes = vehicleRoutes.filter((r) => r.behaviorEcoScore !== null);
        if (scoredRoutes.length === 0) return null;
        const avgScore = Math.round(scoredRoutes.reduce((s, r) => s + (r.behaviorEcoScore ?? 0), 0) / scoredRoutes.length);
        const scoreColor = avgScore >= 80 ? colors.cyan : avgScore >= 60 ? '#f0a500' : '#e05050';
        const factor = Math.min(1.0, Math.max(0.75, 0.60 + avgScore / 250));
        const savingsPct = Math.round((1 - factor) * 100);
        return (
          <View style={styles.aracCard}>
            <View style={styles.aracCardHeader}>
              <Text style={styles.aracCardTitle}>SÜRÜCÜ KARNEM</Text>
              <Text style={[styles.aracCardSubtitle, { color: scoreColor, fontWeight: '700' }]}>{avgScore} / 100</Text>
            </View>
            <Text style={[styles.routeMeta, { marginBottom: 4, marginLeft: 2 }]}>
              {scoredRoutes.length} hattaki ortalama sürüş skoru
            </Text>
            {savingsPct > 2 ? (
              <View style={{ backgroundColor: 'rgba(240,165,0,0.08)', borderRadius: 8, padding: 10, marginTop: 4 }}>
                <Text style={{ color: '#f0a500', fontSize: 12, lineHeight: 17 }}>
                  Daha yumuşak sürüşle mevcut rotalarında yaklaşık %{savingsPct} daha az enerji kullanabilirsin.
                </Text>
              </View>
            ) : null}
          </View>
        );
      })()}

      {/* ── HATLARIM ───────────────────────────────────────────────────── */}
      {vehicleRoutes.length > 0 ? (
        <View style={styles.aracCard}>
          <View style={styles.aracCardHeader}>
            <Text style={styles.aracCardTitle}>HATLARIM</Text>
            <Text style={styles.aracCardSubtitle}>{vehicleRoutes.length} hat</Text>
          </View>
          {vehicleRoutes.slice(0, 5).map((route) => {
            const confidence = route.confidenceScore ?? 0;
            const learned = confidence >= 0.5;
            const distKm = route.normalDistanceM ? (route.normalDistanceM / 1000).toFixed(0) : null;
            const durMin = route.normalDurationSeconds ? Math.round(route.normalDurationSeconds / 60) : null;
            const ecoScore = route.behaviorEcoScore;
            const ecoColor = ecoScore === null ? colors.muted : ecoScore >= 80 ? colors.cyan : ecoScore >= 60 ? '#f0a500' : '#e05050';
            return (
              <View key={route.id} style={styles.routeRow}>
                <View style={styles.routeRowLeft}>
                  <View style={[styles.routeDot, { backgroundColor: learned ? colors.cyan : colors.muted }]} />
                  <View>
                    <Text style={styles.routeLabel}>{formatRouteLabel(route)}</Text>
                    <Text style={styles.routeMeta}>
                      {route.observedTripCount} yolculuk
                      {distKm ? ` · ${distKm} km` : ''}
                      {durMin ? ` · ~${durMin} dk` : ''}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {ecoScore !== null ? (
                    <Text style={{ color: ecoColor, fontSize: 13, fontWeight: '700' }}>{Math.round(ecoScore)}</Text>
                  ) : null}
                  <View style={[styles.routeBadge, { backgroundColor: learned ? 'rgba(0,217,188,0.12)' : 'rgba(132,148,149,0.12)' }]}>
                    <Text style={[styles.routeBadgeText, { color: learned ? colors.cyan : colors.muted }]}>
                      {learned ? 'TANIMLANDI' : 'ÖĞRENİYOR'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── DİĞER LİSTE ────────────────────────────────────────────────── */}
      <View style={styles.aracListSection}>
        <Pressable accessibilityRole="button" onPress={onManageLocations} style={styles.aracListRow}>
          <Text style={styles.aracListIcon}>⊙</Text>
          <Text style={styles.aracListLabel}>Konumları Yönet</Text>
          <Text style={styles.aracListChevron}>›</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpenProfile} style={styles.aracListRow}>
          <Text style={styles.aracListIcon}>⚙</Text>
          <Text style={styles.aracListLabel}>Hesap & Ayarlar</Text>
          <Text style={styles.aracListChevron}>›</Text>
        </Pressable>
      </View>

      <View style={styles.aracLogoutSection}>
        <Pressable accessibilityRole="button" onPress={onLogout}>
          <Text style={styles.aracLogoutText}>Hesaptan Çıkış Yap</Text>
        </Pressable>
        <Text style={styles.aracVersionText}>v2.0</Text>
      </View>

    </ScrollView>
  );
}

type RangePlannerStepProps = {
  backendBinding: BackendBinding | null;
  destinationPredictions: ApiPlacePrediction[];
  destinationSearchStatus: PlaceSearchStatus;
  form: RoutePlanForm;
  language: Locale;
  chargeStopPois: ApiChargeStopPoiResult | null;
  geometry: ApiRouteGeometrySnapshot | null;
  premiumAccess: ApiPremiumAccess | null;
  guidance: ApiPremiumGuidance | null;
  message: string | null;
  onChange: (field: keyof RoutePlanForm, value: string) => void;
  onSave: () => void;
  onSelectPlace: (field: 'origin' | 'destination', prediction: ApiPlacePrediction) => void;
  onUseCurrentOrigin: () => void;
  originPredictions: ApiPlacePrediction[];
  originSearchStatus: PlaceSearchStatus;
  plan: ApiRoutePlan | null;
  routePreview: ApiRoutePreview | null;
  status: 'idle' | 'saving' | 'offline';
};

function RangePlannerStep({ backendBinding, chargeStopPois, destinationPredictions, destinationSearchStatus, form, geometry, premiumAccess, guidance, language, message, onChange, onSave, onSelectPlace, onUseCurrentOrigin, originPredictions, originSearchStatus, plan, routePreview, status }: RangePlannerStepProps) {
  const translate = createTranslator(language);
  const disabled = status === 'saving' || !backendBinding;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.accountPanel}>
        <Text style={styles.badge}>{translate('mobile.range.badge')}</Text>
        <Text style={styles.heading}>{translate('mobile.range.title')}</Text>
        <Text style={styles.description}>{translate('mobile.range.description')}</Text>
      </View>

      <View style={styles.bindingPanel}>
        <Text style={styles.label}>{translate('mobile.range.context')}</Text>
        <Text style={styles.bindingTitle}>{backendBinding ? backendBinding.vehicle.displayName : translate('mobile.range.noVehicle')}</Text>
        <Text style={styles.bindingText}>{translate('mobile.range.contextHint')}</Text>
      </View>

      <View style={styles.tripPanel}>
        <RoutePlanInput label={translate('mobile.range.origin')} value={form.originLabel} onChange={(value) => onChange('originLabel', value)} placeholder="İstanbul" />
        <Pressable accessibilityRole="button" onPress={onUseCurrentOrigin} style={styles.retryButton}>
          <Text style={styles.retryText}>Buradan</Text>
        </Pressable>
        <PlacePredictionList predictions={originPredictions} onSelect={(prediction) => onSelectPlace('origin', prediction)} />
        <PlaceSearchState status={originSearchStatus} />
        <RoutePlanInput label={translate('mobile.range.destination')} value={form.destinationLabel} onChange={(value) => onChange('destinationLabel', value)} placeholder="Ankara" />
        <PlacePredictionList predictions={destinationPredictions} onSelect={(prediction) => onSelectPlace('destination', prediction)} />
        <PlaceSearchState status={destinationSearchStatus} />
        {routePreview ? <RoutePreviewBanner language={language} routePreview={routePreview} /> : null}
        <RoutePlanInput label={translate('mobile.range.distance')} value={form.distanceKm} onChange={(value) => onChange('distanceKm', value)} placeholder="450" numeric />
        <View style={styles.formGrid}>
          <RoutePlanInput label={translate('mobile.range.passengers')} value={form.passengerCount} onChange={(value) => onChange('passengerCount', value)} placeholder="2" numeric compact />
          <RoutePlanInput label={translate('mobile.range.startSoc')} value={form.startSoc} onChange={(value) => onChange('startSoc', value)} placeholder="80" numeric compact />
          <RoutePlanInput label={translate('mobile.range.arrivalSoc')} value={form.targetArrivalSoc} onChange={(value) => onChange('targetArrivalSoc', value)} placeholder="15" numeric compact />
        </View>
        <SegmentedOptions label={translate('mobile.range.road')} options={['city', 'mixed', 'highway']} selected={form.roadProfile} translatePrefix="mobile.range.road" language={language} onSelect={(value) => onChange('roadProfile', value as RoutePlanForm['roadProfile'])} />
        <SegmentedOptions label={translate('mobile.range.weather')} options={['normal', 'cold', 'hot', 'rain']} selected={form.weatherProfile} translatePrefix="mobile.range.weather" language={language} onSelect={(value) => onChange('weatherProfile', value as RoutePlanForm['weatherProfile'])} />
        <SegmentedOptions label={translate('mobile.range.cargo')} options={['light', 'normal', 'heavy']} selected={form.cargoLevel} translatePrefix="mobile.range.cargo" language={language} onSelect={(value) => onChange('cargoLevel', value as RoutePlanForm['cargoLevel'])} />
      </View>

      {message ? <Text style={styles.tripMessage}>{message}</Text> : null}

      <View style={styles.tripActions}>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onSave} style={[styles.primaryButton, disabled ? styles.primaryButtonDisabled : null]}>
          <Text style={[styles.primaryButtonText, disabled ? styles.primaryButtonTextDisabled : null]}>
            {status === 'saving' ? translate('mobile.range.action.calculating') : translate('mobile.range.action.calculate')}
          </Text>
        </Pressable>
      </View>

      {plan ? <RoutePlanResult chargeStopPois={chargeStopPois} geometry={geometry} premiumAccess={premiumAccess} guidance={guidance} plan={plan} language={language} /> : null}
    </ScrollView>
  );
}

function RouteSavePrompt({ language, name, onCancel, onChangeName, onSave, onSkip }: { language: Locale; name: string; onCancel: () => void; onChangeName: (value: string) => void; onSave: () => void; onSkip: () => void }) {
  const translate = createTranslator(language);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalPanel}>
        <Text style={styles.badge}>{translate('mobile.routeSave.badge')}</Text>
        <Text style={styles.modalTitle}>{translate('mobile.routeSave.title')}</Text>
        <Text style={styles.modalText}>{translate('mobile.routeSave.description')}</Text>
        <TextInput
          onChangeText={onChangeName}
          placeholder={translate('mobile.routeSave.placeholder')}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={name}
        />
        <View style={styles.modalActions}>
          <Pressable accessibilityRole="button" onPress={onSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{translate('mobile.routeSave.save')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSkip} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{translate('mobile.routeSave.skip')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>{translate('mobile.routeSave.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RoutePlanInput({ compact, label, numeric, onChange, placeholder, value }: { compact?: boolean; label: string; numeric?: boolean; onChange: (value: string) => void; placeholder: string; value: string; }) {
  return (
    <View style={compact ? styles.chargeInputBlock : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput keyboardType={numeric ? 'numeric' : 'default'} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.searchInput} value={value} />
    </View>
  );
}

function PlaceSearchState({ status }: { status: PlaceSearchStatus }) {
  if (status === 'idle') {
    return null;
  }

  const message = status === 'searching'
    ? 'Google aranıyor...'
    : status === 'empty'
      ? 'Sonuç bulunamadı. Daha açık bir yer adı yazmayı dene.'
      : 'Google araması yapılamadı. API bağlantısını kontrol et.';

  return <Text style={styles.placeSearchStatus}>{message}</Text>;
}

const ISTANBUL = { latitude: 41.0082, longitude: 28.9784, latitudeDelta: 0.05, longitudeDelta: 0.05 };

function MapLocationPicker({
  language,
  mode,
  onClose,
  onConfirm,
  onSave,
  visible,
}: {
  language: Locale;
  mode: 'origin' | 'destination';
  onClose: () => void;
  onConfirm: (coord: { latitude: number; longitude: number }, label: string) => void;
  onSave: (saveName: string, coord: { latitude: number; longitude: number }, label: string) => void;
  visible: boolean;
}) {
  const mapRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<ApiPlacePrediction[]>([]);
  // Region center = current pin location
  const [pinRegion, setPinRegion] = useState(ISTANBUL);
  const [pinLabel, setPinLabel] = useState('');
  const [pinMoving, setPinMoving] = useState(false);
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setPredictions([]);
      setPinRegion(ISTANBUL);
      setPinLabel('');
      setPinMoving(false);
      setSaveMode(false);
      setSaveName('');
    }
  }, [visible]);

  // Autocomplete debounce
  useEffect(() => {
    if (!visible) return;
    const q = searchQuery.trim();
    if (q.length < 2) { setPredictions([]); return; }
    const t = setTimeout(() => {
      fetchPlaceAutocomplete(q, language)
        .then((r) => setPredictions(r.predictions))
        .catch(() => setPredictions([]));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, language, visible]);

  const pickPrediction = async (prediction: ApiPlacePrediction) => {
    setPredictions([]);
    setSearchQuery(prediction.description);
    try {
      const details = await fetchPlaceDetails(prediction.placeId, language);
      const place = details.place;
      if (place) {
        const region = { latitude: place.latitude, longitude: place.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
        setPinRegion(region);
        setPinLabel(prediction.description);
        mapRef.current?.animateToRegion(region, 500);
      }
    } catch {}
  };

  const handleConfirm = () => {
    const coord = { latitude: pinRegion.latitude, longitude: pinRegion.longitude };
    onConfirm(coord, pinLabel || searchQuery);
    onClose();
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    setSaving(true);
    const coord = { latitude: pinRegion.latitude, longitude: pinRegion.longitude };
    onSave(saveName.trim(), coord, pinLabel || searchQuery);
    setSaving(false);
    onClose();
  };

  const confirmLabel = mode === 'origin' ? 'NEREDEN OLARAK SEÇ' : 'NEREYE OLARAK SEÇ';
  const hasPin = pinLabel.length > 0 || searchQuery.length > 0;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" visible={visible}>
      <View style={styles.mapPickerRoot}>

        {/* MAP — native only, fills entire screen */}
        {Platform.OS !== 'web' && MapView ? (
          <MapErrorBoundary>
          <MapView
            ref={mapRef}
            initialRegion={ISTANBUL}
            onRegionChange={() => setPinMoving(true)}
            onRegionChangeComplete={(region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
              setPinMoving(false);
              setPinRegion(region);
              if (pinLabel) setPinLabel('');
            }}
            showsUserLocation={Platform.OS === 'ios'}
            showsMyLocationButton={false}
            style={styles.mapPickerMap}
          />
          </MapErrorBoundary>
        ) : (
          <View style={styles.mapPickerMapPlaceholder}>
            <Text style={styles.mapPickerPlaceholderText}>Harita telefon uygulamasında görünür</Text>
          </View>
        )}

        {/* FIXED CENTER PIN */}
        <View style={styles.mapPickerPin} pointerEvents="none">
          <Text style={[styles.mapPickerPinIcon, pinMoving && { opacity: 0.6 }]}>📍</Text>
        </View>

        {/* TOP: close + search */}
        <View style={styles.mapPickerOverlay}>
          <View style={styles.mapPickerTopRow}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.mapPickerCloseBtn}>
              <Text style={styles.mapPickerCloseBtnText}>✕</Text>
            </Pressable>
            <View style={styles.mapPickerSearchBox}>
              <TextInput
                onChangeText={setSearchQuery}
                placeholder={mode === 'origin' ? 'Başlangıç noktası ara...' : 'Hedef ara...'}
                placeholderTextColor={colors.muted}
                style={styles.mapPickerSearchInput}
                value={searchQuery}
              />
            </View>
          </View>
          {predictions.length > 0 && (
            <PlacePredictionList predictions={predictions} onSelect={pickPrediction} />
          )}
        </View>

        {/* BOTTOM SHEET */}
        <View style={styles.mapPickerBottomSheet}>
          {pinMoving ? (
            <Text style={styles.mapPickerHint}>Pini bırakın...</Text>
          ) : pinLabel ? (
            <Text style={styles.mapPickerSelectedLabel} numberOfLines={2}>{pinLabel}</Text>
          ) : (
            <Text style={styles.mapPickerHint}>Haritayı kaydırarak konumu seçin</Text>
          )}

          {saveMode ? (
            <>
              <TextInput
                autoFocus
                onChangeText={setSaveName}
                placeholder="İş Yerim, Ev, Spor Salonu..."
                placeholderTextColor={colors.muted}
                style={styles.mapPickerSaveInput}
                value={saveName}
              />
              <View style={styles.mapPickerBtnRow}>
                <Pressable accessibilityRole="button" onPress={() => setSaveMode(false)} style={styles.mapPickerSecBtn}>
                  <Text style={styles.mapPickerSecBtnText}>VAZGEÇ</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!saveName.trim() || saving}
                  onPress={handleSave}
                  style={[styles.mapPickerPriBtn, (!saveName.trim() || saving) && { opacity: 0.4 }]}
                >
                  <Text style={styles.mapPickerPriBtnText}>{saving ? 'KAYDEDİLİYOR...' : 'KAYDET'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.mapPickerBtnRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!hasPin}
                  onPress={() => setSaveMode(true)}
                  style={[styles.mapPickerSecBtn, !hasPin && { opacity: 0.4 }]}
                >
                  <Text style={styles.mapPickerSecBtnText}>İSİM VER & KAYDET</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleConfirm}
                  style={styles.mapPickerPriBtn}
                >
                  <Text style={styles.mapPickerPriBtnText}>{confirmLabel}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function PlacePredictionList({ onSelect, predictions }: { onSelect: (prediction: ApiPlacePrediction) => void; predictions: ApiPlacePrediction[] }) {
  if (predictions.length === 0) {
    return null;
  }

  return (
    <View style={styles.placePredictionList}>
      {predictions.map((prediction) => (
        <Pressable accessibilityRole="button" key={prediction.placeId} onPress={() => onSelect(prediction)} style={styles.placePredictionItem}>
          <Text style={styles.advisoryTitle}>{prediction.mainText}</Text>
          {prediction.secondaryText ? <Text style={styles.bindingText}>{prediction.secondaryText}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

function RoutePreviewBanner({ language, routePreview }: { language: Locale; routePreview: ApiRoutePreview }) {
  const translate = createTranslator(language);
  const route = routePreview.route;

  if (!route) {
    return null;
  }

  return (
    <View style={styles.routePreviewBanner}>
      <Text style={styles.label}>{translate('mobile.maps.routeFound')}</Text>
      <Text style={styles.bindingText}>{formatKm(route.distanceKm)} · {formatDuration(route.durationMinutes * 60)} · {translate(`mobile.range.road.${route.roadProfile}` as Parameters<typeof translate>[0])}</Text>
    </View>
  );
}

function SegmentedOptions({ label, language, onSelect, options, selected, translatePrefix }: { label: string; language: Locale; onSelect: (value: string) => void; options: string[]; selected: string; translatePrefix: string; }) {
  const translate = createTranslator(language);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentedRow}>
        {options.map((option) => (
          <Pressable accessibilityRole="button" key={option} onPress={() => onSelect(option)} style={[styles.segmentButton, selected === option ? styles.segmentButtonSelected : null]}>
            <Text style={[styles.segmentButtonText, selected === option ? styles.segmentButtonTextSelected : null]}>{translatedOptionLabel(translate, translatePrefix, option)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function translatedOptionLabel(translate: ReturnType<typeof createTranslator>, prefix: string, option: string) {
  const key = `${prefix}.${option}` as Parameters<typeof translate>[0];
  const label = translate(key);

  return label === (key as unknown as string) ? option : label;
}

function RoutePlanResult({ chargeStopPois, geometry, premiumAccess, guidance, plan, language }: { chargeStopPois: ApiChargeStopPoiResult | null; geometry: ApiRouteGeometrySnapshot | null; premiumAccess: ApiPremiumAccess | null; guidance: ApiPremiumGuidance | null; plan: ApiRoutePlan; language: Locale }) {
  const translate = createTranslator(language);

  return (
    <View style={styles.tripPanel}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{translate('mobile.range.result')}</Text>
        <Text style={styles.learningPill}>{routePlanStatusLabel(plan.feasibilityStatus, language)}</Text>
      </View>
      {plan.savedName ? <Text style={styles.advisorySeverity}>{plan.savedName}</Text> : null}
      <Text style={styles.bindingTitle}>{plan.originLabel} → {plan.destinationLabel}</Text>
      <View style={styles.metricGrid}>
        <MetricTile label={translate('mobile.range.metric.distance')} value={formatKm(plan.requestedDistanceKm)} />
        <MetricTile label={translate('mobile.range.metric.range')} value={formatKm(plan.scenario.expectedRangeKm)} />
        <MetricTile label={translate('mobile.range.metric.energy')} value={formatKwh(plan.scenario.estimatedEnergyKwh)} />
        <MetricTile label={translate('mobile.range.metric.margin')} value={formatKwh(plan.scenario.energyMarginKwh)} />
        <MetricTile label={translate('mobile.range.metric.consumption')} value={formatEfficiency(plan.scenario.estimatedConsumptionWhKm)} />
        <MetricTile label={translate('mobile.range.metric.confidence')} value={formatConfidence(plan.confidenceScore)} />
      </View>
      <Text style={styles.tripMessage}>{plan.strategy.summary}</Text>
      {geometry ? <RouteGeometrySection geometry={geometry} language={language} /> : null}
      <View style={styles.metricGrid}>
        <MetricTile label={translate('mobile.range.metric.startSoc')} value={`${plan.strategy.recommendedStartSoc}%`} />
        <MetricTile label={translate('mobile.range.metric.stops')} value={`${plan.strategy.estimatedChargeStops}`} />
      </View>
      {plan.chargeStopCandidates.length > 0 ? (
        <Text style={styles.bindingText}>{translate('mobile.range.chargeHint')} {formatKwh(plan.chargeStopCandidates[0]?.energyNeededKwh ?? null)} / {formatDuration((plan.chargeStopCandidates[0]?.estimatedDcMinutes ?? 0) * 60)}</Text>
      ) : null}
      {chargeStopPois ? <ChargeStopPoiSection result={chargeStopPois} language={language} /> : null}
      {guidance || premiumAccess ? <PremiumGuidanceSection access={premiumAccess} guidance={guidance} language={language} /> : null}
    </View>
  );
}

function RouteGeometrySection({ geometry, language }: { geometry: ApiRouteGeometrySnapshot; language: Locale }) {
  const translate = createTranslator(language);
  const providerLabel = geometry.provider === 'google_pending_adapter'
    ? translate('mobile.geometry.googlePending')
    : translate('mobile.geometry.manual');

  return (
    <View style={styles.premiumGuidanceBlock}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{translate('mobile.geometry.title')}</Text>
        <Text style={styles.learningPill}>{providerLabel}</Text>
      </View>
      <View style={styles.metricGrid}>
        <MetricTile label={translate('mobile.geometry.provider')} value={providerLabel} />
        <MetricTile label={translate('mobile.geometry.duration')} value={formatDuration((geometry.durationMinutes ?? 0) * 60)} />
        <MetricTile label={translate('mobile.geometry.confidence')} value={formatConfidence(geometry.confidenceScore ?? 0)} />
      </View>
    </View>
  );
}

function ChargeStopPoiSection({ result, language }: { result: ApiChargeStopPoiResult; language: Locale }) {
  const translate = createTranslator(language);
  const candidates = result.candidates.slice(0, 3);
  const emptyText = result.status === 'not_required'
    ? translate('mobile.poi.notRequired')
    : result.status === 'no_station_poi'
      ? translate('mobile.poi.noStation')
      : translate('mobile.poi.empty');
  const statusText = result.status === 'ready_google_places'
    ? translate('mobile.poi.googleReady')
    : result.status;

  return (
    <View style={styles.premiumGuidanceBlock}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{translate('mobile.poi.title')}</Text>
        <Text style={styles.learningPill}>{result.status}</Text>
      </View>
      {result.status === 'ready_google_places' ? <Text style={styles.bindingText}>{statusText}</Text> : null}
      {candidates.length > 0 ? (
        <View style={styles.advisoryList}>
          {candidates.map((candidate) => (
            <View key={candidate.id} style={styles.advisoryItem}>
              <Text style={styles.advisorySeverity}>#{candidate.rank} · {formatConfidence(candidate.matchScore ?? 0)}</Text>
              <Text style={styles.advisoryTitle}>{candidate.station.operatorName} · {candidate.station.stationName}</Text>
              <View style={styles.metricGrid}>
                <MetricTile label={translate('mobile.poi.remaining')} value={formatKm(candidate.remainingToDestinationKm)} />
                <MetricTile label={translate('mobile.poi.fromOrigin')} value={formatKm(candidate.distanceFromOriginKm)} />
                <MetricTile label={translate('mobile.poi.detour')} value={formatKm(candidate.detourKm)} />
                <MetricTile label={translate('mobile.poi.dcPower')} value={candidate.station.maxDcKw ? `${candidate.station.maxDcKw} kW` : translate('mobile.value.unknown')} />
                <MetricTile label={translate('mobile.poi.match')} value={formatConfidence(candidate.matchScore ?? 0)} />
                <MetricTile label={translate('mobile.poi.source')} value={candidate.station.evidenceStatus === 'verified' ? 'Verified' : 'Google'} />
              </View>
              {candidate.station.address ? <Text style={styles.bindingText}>{candidate.station.address}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => openChargeStopNavigation(candidate)} style={styles.navigationButton}>
                <Text style={styles.navigationButtonText}>{translate('mobile.poi.navigate')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.bindingText}>{emptyText}</Text>
      )}
    </View>
  );
}

function PremiumGuidanceSection({ access, guidance, language }: { access: ApiPremiumAccess | null; guidance: ApiPremiumGuidance | null; language: Locale }) {
  const translate = createTranslator(language);
  const advisories = guidance?.advisories.slice(0, 4) ?? [];
  const hasAccess = access?.hasAccess ?? true;
  const statusLabel = hasAccess
    ? guidance?.session?.status ?? access?.planCode ?? 'planned'
    : translate('mobile.premium.lockedBadge');

  return (
    <View style={styles.premiumGuidanceBlock}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{translate('mobile.premium.title')}</Text>
        <Text style={styles.learningPill}>{statusLabel}</Text>
      </View>
      <Text style={styles.bindingText}>{hasAccess ? translate('mobile.premium.subtitle') : translate('mobile.premium.locked')}</Text>
      {advisories.length > 0 ? (
        <View style={styles.advisoryList}>
          {advisories.map((advisory) => (
            <View key={advisory.id} style={styles.advisoryItem}>
              <Text style={styles.advisorySeverity}>{tripAdvisorySeverityLabel(advisory.severity, language)}</Text>
              <Text style={styles.advisoryTitle}>{tripAdvisoryTitle(advisory.advisoryType, language)}</Text>
              <Text style={styles.bindingText}>{tripAdvisoryAction(advisory.advisoryType, language)}</Text>
              {advisory.speechText ? <Text style={styles.speechText}>Sesli koç: {tripAdvisorySpeech(advisory.advisoryType, advisory.speechText, language)}</Text> : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.bindingText}>{hasAccess ? translate('mobile.premium.empty') : translate('mobile.premium.lockedAction')}</Text>
      )}
    </View>
  );
}

function tripAdvisoryTitle(type: string, language: Locale) {
  const translate = createTranslator(language);
  const key = `mobile.premium.advisory.${type}.title` as Parameters<typeof translate>[0];
  const label = translate(key);

  return label.startsWith('mobile.premium.advisory.') ? type : label;
}

function tripAdvisoryAction(type: string, language: Locale) {
  const translate = createTranslator(language);
  const key = `mobile.premium.advisory.${type}.action` as Parameters<typeof translate>[0];
  const label = translate(key);

  return label.startsWith('mobile.premium.advisory.')
    ? translate('mobile.premium.subtitle')
    : label;
}

function tripAdvisorySpeech(type: string, fallback: string, language: Locale) {
  const title = tripAdvisoryTitle(type, language);
  const action = tripAdvisoryAction(type, language);

  if (title === type) {
    return fallback;
  }

  return `${title}. ${action}`;
}

function tripAdvisorySeverityLabel(severity: string, language: Locale) {
  const translate = createTranslator(language);

  if (severity === 'critical') {
    return translate('mobile.premium.severity.critical');
  }

  if (severity === 'warning') {
    return translate('mobile.premium.severity.warning');
  }

  return translate('mobile.premium.severity.info');
}

function openChargeStopNavigation(candidate: ApiChargeStopPoiCandidate) {
  const sourceUrl = candidate.station.sourceUrl?.trim();
  const latitude = candidate.station.latitude;
  const longitude = candidate.station.longitude;
  const label = encodeURIComponent(`${candidate.station.operatorName} ${candidate.station.stationName}`);
  const url = sourceUrl
    || (latitude !== null && longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${candidate.station.googlePlaceId ?? ''}`
      : `https://www.google.com/maps/search/?api=1&query=${label}`);

  Linking.openURL(url).catch(() => undefined);
}

type ChargeLoggerStepProps = {
  backendBinding: BackendBinding | null;
  chargeStartedAt: Date | null;
  form: ChargeForm;
  lastChargeSession: ApiChargeSession | null;
  message: string | null;
  onChange: (field: keyof ChargeForm, value: string) => void;
  onSave: () => void;
  onStartTimer: () => void;
  savedLocations: ApiSavedLocation[];
  status: 'idle' | 'saving' | 'offline';
  summary: ApiChargeSummary | null;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function elapsedLabel(startedAt: Date) {
  const diffMs = Date.now() - startedAt.getTime();
  const totalMin = Math.max(0, Math.floor(diffMs / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
}

function ChargeLoggerStep({
  backendBinding,
  chargeStartedAt,
  form,
  lastChargeSession,
  message,
  onChange,
  onSave,
  onStartTimer,
  savedLocations,
  status,
  summary,
}: ChargeLoggerStepProps) {
  const disabled = status === 'saving' || !backendBinding;

  const [detectStatus, setDetectStatus] = useState<'idle' | 'detecting' | 'done' | 'error'>('idle');
  const [detectNote, setDetectNote] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!chargeStartedAt) { setElapsed(''); return; }
    setElapsed(elapsedLabel(chargeStartedAt));
    const id = setInterval(() => setElapsed(elapsedLabel(chargeStartedAt)), 15000);
    return () => clearInterval(id);
  }, [chargeStartedAt]);

  async function detectLocation() {
    setDetectStatus('detecting');
    setDetectNote(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setDetectStatus('error');
        setDetectNote('Konum izni verilmedi.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      // Ev kontrolü: kayıtlı 'home' konumlarına mesafe
      const homeLocation = savedLocations.find((l) => l.locationKind === 'home');
      const distToHome = homeLocation
        ? haversineKm(latitude, longitude, homeLocation.latitude, homeLocation.longitude)
        : Infinity;

      if (distToHome < 0.2) {
        onChange('locationType', 'home');
        onChange('stationName', 'Ev Şarjı');
        setDetectNote(`Ev konumuna ${Math.round(distToHome * 1000)}m yakınsın.`);
        setDetectStatus('done');
        if (!chargeStartedAt) onStartTimer();
        return;
      }

      // İstasyon arama
      const result = await fetchNearbyEvStations(latitude, longitude);
      const nearest = result.stations[0];

      if (nearest) {
        const distKm = haversineKm(latitude, longitude, nearest.latitude, nearest.longitude);
        const isDc = nearest.maxDcKw !== null && nearest.maxDcKw >= 22;
        onChange('locationType', isDc ? 'public_dc' : 'public_ac');
        onChange('stationName', nearest.stationName);
        setDetectNote(`${nearest.stationName} — ${Math.round(distKm * 1000)}m`);
      } else {
        onChange('locationType', 'public_ac');
        onChange('stationName', '');
        setDetectNote('Yakında istasyon bulunamadı, tipi manuel seç.');
      }

      setDetectStatus('done');
      if (!chargeStartedAt) onStartTimer();
    } catch {
      setDetectStatus('error');
      setDetectNote('Konum alınamadı. Tekrar dene.');
    }
  }

  // Segment state derived from form.locationType
  const locationSeg: 'home' | 'station' =
    form.locationType === 'home' ? 'home' : 'station';
  const typeSeg: 'ac' | 'dc' =
    form.locationType === 'public_dc' ? 'dc' : 'ac';

  function setLocation(seg: 'home' | 'station') {
    const t = seg === 'home' ? 'home' : (typeSeg === 'dc' ? 'public_dc' : 'public_ac');
    onChange('locationType', t);
  }

  function setType(seg: 'ac' | 'dc') {
    if (locationSeg === 'home') return;
    onChange('locationType', seg === 'dc' ? 'public_dc' : 'public_ac');
  }

  function chargeHistoryIcon(type: string) {
    if (type === 'home') return '⌂';
    if (type === 'public_dc') return '⚡';
    return '⊙';
  }

  function chargeHistoryLabel(type: string) {
    if (type === 'home') return 'Ev Şarjı';
    if (type === 'public_dc') return 'DC Hızlı Şarj';
    if (type === 'public_ac') return 'AC İstasyon';
    return 'İstasyon';
  }

  function formatChargeDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }).toUpperCase();
  }

  return (
    <ScrollView contentContainerStyle={styles.sarjScroll}>

      {/* ── ÖZET SATIRI ───────────────────────────────────────────────── */}
      <View style={styles.sarjSummaryRow}>
        <View style={styles.sarjSummaryTile}>
          <Text style={styles.sarjSummaryLabel}>BU AY</Text>
          <View style={styles.sarjSummaryValueRow}>
            <Text style={styles.sarjSummaryValue}>{summary?.chargeSessionCount ?? 0}</Text>
            <Text style={styles.sarjSummaryUnit}> şarj</Text>
          </View>
        </View>
        <View style={styles.sarjSummaryTile}>
          <Text style={styles.sarjSummaryLabel}>TOPLAM</Text>
          <View style={styles.sarjSummaryValueRow}>
            <Text style={styles.sarjSummaryValue}>{summary ? Math.round(summary.totalEnergyKwh) : 0}</Text>
            <Text style={styles.sarjSummaryUnit}> kWh</Text>
          </View>
        </View>
        <View style={styles.sarjSummaryTile}>
          <Text style={styles.sarjSummaryLabel}>ORTALAMA</Text>
          <Text style={[styles.sarjSummaryValue, { color: colors.cyan }]}>
            {summary && summary.chargeSessionCount > 0
              ? formatTL(summary.totalCostAmount / summary.chargeSessionCount)
              : '—'}
          </Text>
        </View>
      </View>

      {/* ── ŞARJ ETTİM KARTI ──────────────────────────────────────────── */}
      <View style={styles.sarjLogCard}>
        <View style={styles.sarjLogHeader}>
          <Text style={styles.sarjLogTitle}>ŞARJ ETTİM</Text>
          <Text style={styles.sarjLogIcon}>⚡</Text>
        </View>

        <View style={styles.sarjLogBody}>

          {/* GPS TESPİT BUTONU */}
          <Pressable
            disabled={detectStatus === 'detecting'}
            onPress={detectLocation}
            style={styles.sarjDetectButton}
          >
            <MaterialIcons
              color={detectStatus === 'detecting' ? colors.muted : colors.cyan}
              name="my-location"
              size={16}
            />
            <Text style={[styles.sarjDetectText, detectStatus === 'detecting' ? { color: colors.muted } : null]}>
              {detectStatus === 'detecting' ? 'ALGILANIYOR...' : 'KONUMU TESPİT ET'}
            </Text>
          </Pressable>

          {/* TESPİT NOTU */}
          {detectNote ? (
            <Text style={[styles.sarjDetectNote, detectStatus === 'error' ? { color: '#e05252' } : null]}>
              {detectNote}
            </Text>
          ) : null}

          {/* SAYAÇ — şarj başladıysa göster */}
          {chargeStartedAt ? (
            <View style={styles.sarjTimerRow}>
              <MaterialIcons color={colors.cyan} name="timer" size={14} />
              <Text style={styles.sarjTimerText}>ŞARJ SÜRÜYOR: {elapsed}</Text>
            </View>
          ) : null}

          {/* Segmented Controls */}
          <View style={styles.sarjSegGroup}>
            <View style={styles.sarjSegRow}>
              <Text style={styles.sarjSegLabel}>KONUM</Text>
              <View style={styles.sarjSegPills}>
                {(['home', 'station'] as const).map((seg) => (
                  <Pressable
                    key={seg}
                    onPress={() => setLocation(seg)}
                    style={[styles.sarjSegPill, locationSeg === seg ? styles.sarjSegPillActive : null]}
                  >
                    <Text style={[styles.sarjSegPillText, locationSeg === seg ? styles.sarjSegPillTextActive : null]}>
                      {seg === 'home' ? 'EV' : 'İSTASYON'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {locationSeg === 'station' ? (
              <View style={styles.sarjSegRow}>
                <Text style={styles.sarjSegLabel}>TİP</Text>
                <View style={styles.sarjSegPills}>
                  {(['ac', 'dc'] as const).map((seg) => (
                    <Pressable
                      key={seg}
                      onPress={() => setType(seg)}
                      style={[styles.sarjSegPill, typeSeg === seg ? styles.sarjSegPillActive : null]}
                    >
                      <Text style={[styles.sarjSegPillText, typeSeg === seg ? styles.sarjSegPillTextActive : null]}>
                        {seg.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* İSTASYON ADI */}
            {locationSeg === 'station' ? (
              <View style={styles.sarjStationRow}>
                <MaterialIcons color={colors.muted} name="ev-station" size={14} />
                <TextInput
                  onChangeText={(v) => onChange('stationName', v)}
                  placeholder="İstasyon adı (opsiyonel)"
                  placeholderTextColor={colors.muted}
                  style={styles.sarjStationInput}
                  value={form.stationName}
                />
              </View>
            ) : null}
          </View>

          {/* Input Grid */}
          <View style={styles.sarjInputGrid}>
            <SarjInput label="BAŞLANGIÇ SOC" value={form.startSoc} onChange={(v) => onChange('startSoc', v)} placeholder="%" tooltipKey="soc" />
            <SarjInput label="BİTİŞ SOC" value={form.endSoc} onChange={(v) => onChange('endSoc', v)} placeholder="%" tooltipKey="soc" />
            <SarjInput
              label={chargeStartedAt && !form.perceivedNeed ? `SÜRE (${elapsed || '0dk'})` : 'SÜRE'}
              value={form.perceivedNeed}
              onChange={(v) => onChange('perceivedNeed', v)}
              placeholder={chargeStartedAt ? 'otomatik' : '1sa 20dk'}
            />
            <SarjInput label="MALİYET" value={form.costAmount} onChange={(v) => onChange('costAmount', v)} placeholder="₺" accent />
          </View>

          {message ? <Text style={styles.sarjMessage}>{message}</Text> : null}

          {/* KAYDET */}
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onSave}
            style={[styles.sarjSaveButton, disabled ? styles.sarjSaveButtonDisabled : null]}
          >
            <Text style={[styles.sarjSaveButtonText, disabled ? styles.sarjSaveButtonTextDisabled : null]}>
              {status === 'saving' ? 'KAYDEDİLİYOR...' : 'KAYDET'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── ŞARJ GEÇMİŞİ ──────────────────────────────────────────────── */}
      <View style={styles.sarjHistorySection}>
        <Text style={styles.sarjHistoryTitle}>ŞARJ GEÇMİŞİ</Text>

        {lastChargeSession ? (
          <View style={styles.sarjHistoryRow}>
            <View style={styles.sarjHistoryAccent} />
            <View style={styles.sarjHistoryContent}>
              <View style={styles.sarjHistoryLeft}>
                <Text style={styles.sarjHistoryDate}>{formatChargeDate(lastChargeSession.startedAt)}</Text>
                <View style={styles.sarjHistoryLocationRow}>
                  <Text style={styles.sarjHistoryLocationIcon}>{chargeHistoryIcon(lastChargeSession.chargeLocationType)}</Text>
                  <Text style={styles.sarjHistoryLocationName}>{chargeHistoryLabel(lastChargeSession.chargeLocationType)}</Text>
                </View>
              </View>
              <View style={styles.sarjHistoryMid}>
                <Text style={styles.sarjHistorySoc}>
                  {formatSocValue(lastChargeSession.startSoc)} → {formatSocValue(lastChargeSession.endSoc)}
                </Text>
                {lastChargeSession.energyKwh !== null ? (
                  <Text style={styles.sarjHistoryKwh}>{lastChargeSession.energyKwh.toFixed(1)} kWh</Text>
                ) : null}
              </View>
              <View style={styles.sarjHistoryRight}>
                <Text style={styles.sarjHistoryCost}>
                  {lastChargeSession.costAmount !== null ? formatTL(lastChargeSession.costAmount) : '—'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.sarjHistoryEmpty}>Henüz şarj kaydı yok.</Text>
        )}
      </View>

    </ScrollView>
  );
}

function SarjInput({
  label,
  value,
  onChange,
  placeholder,
  accent,
  tooltipKey,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accent?: boolean;
  tooltipKey?: TooltipKey;
}) {
  return (
    <View style={styles.sarjInputBlock}>
      <View style={styles.sarjInputLabelRow}>
        <Text style={styles.sarjInputLabel}>{label}</Text>
        {tooltipKey ? <InfoBadge tooltipKey={tooltipKey} /> : null}
      </View>
      <TextInput
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.sarjInput, accent ? styles.sarjInputAccent : null]}
        value={value}
      />
    </View>
  );
}

function ChargeInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.chargeInputBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={value}
      />
    </View>
  );
}

function SavedLocationsStep({
  form,
  locations,
  message,
  onChange,
  onSaveLocation,
  onSaveRoute,
  onSelectPrediction,
  onUseCurrentLocation,
  predictions,
  routes,
  searchStatus,
  status,
}: {
  form: SavedLocationForm;
  locations: ApiSavedLocation[];
  message: string | null;
  onChange: (field: keyof SavedLocationForm, value: string) => void;
  onSaveLocation: () => void;
  onSaveRoute: () => void;
  onSelectPrediction: (prediction: ApiPlacePrediction) => void;
  onUseCurrentLocation: () => void;
  predictions: ApiPlacePrediction[];
  routes: ApiSavedRoute[];
  searchStatus: PlaceSearchStatus;
  status: 'idle' | 'saving' | 'offline';
}) {
  const disabled = status === 'saving';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.accountPanel}>
        <Text style={styles.badge}>KONUM HAFIZASI</Text>
        <Text style={styles.heading}>Konum kaydet</Text>
        <Text style={styles.description}>
          Ev, işyeri, okul gibi yerleri pinle. Sonra yolculuk başlatırken sadece hedefi seçersin.
        </Text>
      </View>

      <View style={styles.tripPanel}>
        <Text style={styles.label}>PIN ADI</Text>
        <TextInput
          onChangeText={(value) => onChange('label', value)}
          placeholder="Ev, İşyerim, Çocuk okul"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={form.label}
        />
        <SegmentedOptions
          label="KONUM TİPİ"
          language="tr"
          onSelect={(value) => onChange('locationKind', value)}
          options={['home', 'work', 'school', 'custom']}
          selected={form.locationKind}
          translatePrefix="mobile.savedLocation.kind"
        />
        <Text style={styles.label}>HARİTADAN / GOOGLE'DAN SEÇ</Text>
        <TextInput
          onChangeText={(value) => onChange('searchLabel', value)}
          placeholder="Adres veya yer ara..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={form.searchLabel}
        />
        <PlacePredictionList predictions={predictions} onSelect={onSelectPrediction} />
        <PlaceSearchState status={searchStatus} />
        <Pressable accessibilityRole="button" onPress={onUseCurrentLocation} style={styles.retryButton}>
          <Text style={styles.retryText}>Mevcut konumu pinle</Text>
        </Pressable>
        <View style={styles.metricGrid}>
          <MetricTile label="ENLEM" value={form.latitude === null ? 'Yok' : form.latitude.toFixed(5)} />
          <MetricTile label="BOYLAM" value={form.longitude === null ? 'Yok' : form.longitude.toFixed(5)} />
        </View>
        {form.address ? <Text style={styles.bindingText}>{form.address}</Text> : null}
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onSaveLocation} style={[styles.primaryButton, disabled ? styles.primaryButtonDisabled : null]}>
          <Text style={[styles.primaryButtonText, disabled ? styles.primaryButtonTextDisabled : null]}>
            {status === 'saving' ? 'KAYDEDİLİYOR' : 'KONUMU KAYDET'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.tripPanel}>
        <Text style={styles.label}>KAYITLI KONUM YAP</Text>
        {locations.length > 0 ? (
          <View style={styles.savedRouteList}>
            {locations.map((location) => (
              <View key={location.id} style={styles.savedRouteItem}>
                <Text style={styles.savedRouteTitle}>{location.label}</Text>
                <Text style={styles.bindingText}>{savedLocationKindLabel(location.locationKind)} · {location.address ?? `${location.latitude}, ${location.longitude}`}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bindingText}>Henüz kayıtlı konum yok.</Text>
        )}
      </View>

      <View style={styles.tripPanel}>
        <Text style={styles.label}>İKİ KONUM ARASINDA ROTA KAYDET</Text>
        <TextInput
          onChangeText={(value) => onChange('routeLabel', value)}
          placeholder="İş - Ev, Ev - Okul"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={form.routeLabel}
        />
        <LocationSelector label="BAŞLANGIÇ" locations={locations} selectedId={form.routeOriginId} onSelect={(id) => onChange('routeOriginId', id)} />
        <LocationSelector label="VARIŞ" locations={locations} selectedId={form.routeDestinationId} onSelect={(id) => onChange('routeDestinationId', id)} />
        <Pressable accessibilityRole="button" disabled={disabled || locations.length < 2} onPress={onSaveRoute} style={[styles.secondaryButton, disabled || locations.length < 2 ? styles.primaryButtonDisabled : null]}>
          <Text style={styles.secondaryButtonText}>ROTAYI KAYDET</Text>
        </Pressable>
      </View>

      <View style={styles.tripPanel}>
        <Text style={styles.label}>KAYITLI ROTALAR</Text>
        {routes.length > 0 ? (
          <View style={styles.savedRouteList}>
            {routes.map((route) => (
              <View key={route.id} style={styles.savedRouteItem}>
                <Text style={styles.savedRouteTitle}>{route.label}</Text>
                <Text style={styles.bindingText}>{route.originLabel} → {route.destinationLabel}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bindingText}>Henüz kayıtlı rota yok.</Text>
        )}
      </View>

      {message ? <Text style={styles.tripMessage}>{message}</Text> : null}
    </ScrollView>
  );
}

function LocationSelector({
  label,
  locations,
  onSelect,
  selectedId,
}: {
  label: string;
  locations: ApiSavedLocation[];
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.savedRouteList}>
        {locations.map((location) => (
          <Pressable
            accessibilityRole="button"
            key={location.id}
            onPress={() => onSelect(location.id)}
            style={[styles.savedRouteItem, selectedId === location.id ? styles.savedRouteItemActive : null]}
          >
            <Text style={styles.savedRouteTitle}>{location.label}</Text>
            <Text style={styles.bindingText}>{savedLocationKindLabel(location.locationKind)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type TripRecorderStepProps = {
  activeTrip: ApiTrip | null;
  autoTripEnabled: boolean;
  autoTripMessage: string | null;
  autoTripStatus: AutoTripStatus;
  backendBinding: BackendBinding | null;
  destQuery: string;
  guidance: ApiPremiumGuidance | null;
  onClearOrigin: () => void;
  onOriginPlaceSelect: (prediction: ApiPlacePrediction) => void;
  onOriginSearch: (query: string) => void;
  originPredictions: ApiPlacePrediction[];
  originQuery: string;
  lastCompletedTrip: ApiTrip | null;
  lastTripRecap: ApiTripRecap | null;
  lastTripShareCard: ApiTripShareCard | null;
  language: Locale;
  message: string | null;
  onAppendPoint: () => void;
  onCreateShareCard: () => void;
  onDestSearch: (query: string) => void;
  onFinishTrip: () => void;
  onDeleteLocation: (locationId: string) => void;
  onDeleteRoute: (routeId: string) => void;
  onManageLocations: () => void;
  onOpenMap: (mode: 'origin' | 'destination') => void;
  onUpdateLocation: (locationId: string, label: string, kind: string) => void;
  onPlaceSelect: (prediction: ApiPlacePrediction) => void;
  onStartTrip: () => void;
  onSelectDestination: (id: string) => void;
  onSelectRoute: (id: string) => void;
  onToggleAutoTrip: (enabled: boolean) => void;
  placePredictions: ApiPlacePrediction[];
  points: TripPoint[];
  routeProgress: ApiTripRouteProgress | null;
  savedLocations: ApiSavedLocation[];
  savedRoutes: ApiSavedRoute[];
  selectedDestinationLocationId: string;
  selectedSavedRouteId: string;
  status: 'idle' | 'working' | 'offline';
  summary: ApiTripSummary | null;
  vehicle: VehicleCatalogItem | null;
};

function TripRecorderStep({
  activeTrip,
  autoTripEnabled,
  autoTripMessage,
  autoTripStatus,
  backendBinding,
  destQuery,
  guidance: _guidance,
  onClearOrigin,
  onOriginPlaceSelect,
  onOriginSearch,
  originPredictions,
  originQuery,
  lastCompletedTrip: _lastCompletedTrip,
  lastTripRecap,
  lastTripShareCard: _lastTripShareCard,
  language,
  message,
  onAppendPoint: _onAppendPoint,
  onCreateShareCard: _onCreateShareCard,
  onDeleteLocation,
  onDeleteRoute,
  onDestSearch,
  onFinishTrip,
  onManageLocations: _onManageLocations,
  onOpenMap,
  onUpdateLocation,
  onPlaceSelect,
  onStartTrip,
  onSelectDestination,
  onSelectRoute,
  onToggleAutoTrip,
  placePredictions,
  points,
  routeProgress,
  savedLocations,
  savedRoutes,
  selectedDestinationLocationId,
  selectedSavedRouteId,
  status,
  summary: _summary,
  vehicle,
}: TripRecorderStepProps) {
  const disabled = status === 'working' || !backendBinding;
  const translate = createTranslator(language);

  // Elapsed timer for active trip
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!activeTrip) { setElapsed(0); return; }
    const start = new Date(activeTrip.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTrip?.startedAt]);

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  // Destination query for NEREYE input
  const filteredRoutes = destQuery.length > 0
    ? savedRoutes.filter((r) => r.label.toLowerCase().includes(destQuery.toLowerCase()))
    : savedRoutes;

  const filteredLocations = destQuery.length > 0
    ? savedLocations.filter((l) => l.label.toLowerCase().includes(destQuery.toLowerCase()))
    : savedLocations;

  const vehicleImage = vehicle?.imageUrl ?? vehicle?.brandImageUrl ?? HERO_IMAGE;
  const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : backendBinding?.vehicle.displayName ?? '—';

  return (
    <ScrollView contentContainerStyle={styles.yolculukScroll}>

      {/* ── DURUM SATIRI ──────────────────────────────────────────────── */}
      <View style={styles.yolculukStatusRow}>
        <Text style={styles.yolculukStatusLabel}>YOLCULUK</Text>
        <View style={styles.yolculukStatusPill}>
          <View style={[styles.yolculukPillDot, { backgroundColor: activeTrip ? '#ef4444' : colors.cyan }]} />
          <Text style={[styles.yolculukPillText, { color: activeTrip ? '#ef4444' : colors.cyan }]}>
            {activeTrip ? 'AKTİF' : 'Hazır'}
          </Text>
        </View>
      </View>

      {/* ── ARAÇ KARTI ────────────────────────────────────────────────── */}
      <View style={styles.yolculukVehicleCard}>
        <Image source={{ uri: vehicleImage }} style={styles.yolculukVehicleImage} />
        <View style={styles.yolculukVehicleInfo}>
          <Text style={styles.yolculukVehicleName}>{vehicleName}</Text>
          <Text style={styles.yolculukVehicleLocation}>
            {backendBinding ? backendBinding.vehicle.displayName : '—'}
          </Text>
        </View>
        <View style={styles.yolculukVehicleSoc}>
          <Text style={styles.yolculukSocValue}>{points.length > 0 ? `${points.length} pt` : '—'}</Text>
          <View style={styles.yolculukSocBar}>
            <View style={[styles.yolculukSocFill, { width: '80%' }]} />
          </View>
        </View>
      </View>

      {/* ── AKTİF YOLCULUK BANNER ─────────────────────────────────────── */}
      {activeTrip ? (
        <View style={styles.yolculukActiveBanner}>
          <View style={styles.yolculukBannerContent}>
            <View style={styles.yolculukBannerLeft}>
              <View style={styles.yolculukActivePill}>
                <View style={styles.yolculukActiveDot} />
                <Text style={styles.yolculukActivePillText}>AKTİF YOLCULUK</Text>
              </View>
              <Text style={styles.yolculukTimer}>{formatElapsed(elapsed)}</Text>
            </View>
            <View style={styles.yolculukBannerRight}>
              <Text style={styles.yolculukTripDistance}>
                {formatMeters(routeProgress?.remainingMeters ?? null)}
              </Text>
              <Text style={styles.yolculukTripSpeed}>
                {formatSpeed(routeProgress?.lastSpeedKmh ?? null)}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={status === 'working'}
            onPress={onFinishTrip}
            style={styles.yolculukFinishButton}
          >
            <Text style={styles.yolculukFinishButtonText}>
              {status === 'working' ? 'BİTİRİLİYOR...' : 'YOLCULUĞU BİTİR'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* ── ROTA PLANLAYICI ─────────────────────────────────────────── */}
          <View style={styles.yolculukPlanCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenMap('origin')}
              style={styles.yolculukInputWrap}
            >
              <Text style={styles.yolculukInputLabel}>NEREDEN</Text>
              {originQuery ? (
                <Text style={styles.yolculukInputValue}>{originQuery}</Text>
              ) : (
                <Text style={[styles.yolculukInputValue, { color: colors.muted }]}>Haritadan seç...</Text>
              )}
            </Pressable>
            {!originQuery && (
              <Pressable
                accessibilityRole="button"
                onPress={onClearOrigin}
                style={styles.yolculukBuraBtn}
              >
                <Text style={styles.yolculukBuraBtnText}>⊙  BURADAN BAŞLAT (GPS)</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenMap('destination')}
              style={styles.yolculukInputWrap}
            >
              <Text style={styles.yolculukInputLabel}>NEREYE</Text>
              {destQuery ? (
                <Text style={styles.yolculukInputValue}>{destQuery}</Text>
              ) : (
                <Text style={[styles.yolculukInputValue, { color: colors.muted }]}>Haritadan seç veya ara...</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={onStartTrip}
              style={[styles.yolculukPlanButton, disabled ? styles.yolculukPlanButtonDisabled : null]}
            >
              <Text style={styles.yolculukPlanButtonText}>
                {status === 'working' ? 'BAŞLATILIYOR...' : 'YOLCULUK BAŞLAT'}
              </Text>
            </Pressable>
          </View>

          {/* ── KAYITLI ROTALAR (yatay scroll) ──────────────────────────── */}
          {(filteredRoutes.length > 0 || filteredLocations.length > 0) && (
            <View style={styles.yolculukSavedSection}>
              <Text style={styles.yolculukSavedTitle}>KAYITLI ROTALAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yolculukPillsRow}>
                {filteredRoutes.map((route) => (
                  <Pressable
                    accessibilityRole="button"
                    key={route.id}
                    onPress={() => { onSelectRoute(route.id); onSelectDestination(''); }}
                    style={[styles.yolculukRoutePill, selectedSavedRouteId === route.id ? styles.yolculukRoutePillActive : null]}
                  >
                    <Text style={styles.yolculukRoutePillIcon}>⌁</Text>
                    <Text style={styles.yolculukRoutePillText}>{route.label}</Text>
                  </Pressable>
                ))}
                {filteredLocations.map((loc) => (
                  <Pressable
                    accessibilityRole="button"
                    key={loc.id}
                    onPress={() => { onSelectDestination(loc.id); onSelectRoute(''); }}
                    style={[styles.yolculukRoutePill, selectedDestinationLocationId === loc.id ? styles.yolculukRoutePillActive : null]}
                  >
                    <Text style={styles.yolculukRoutePillIcon}>{loc.locationKind === 'home' ? '⌂' : loc.locationKind === 'work' ? '⊡' : '⊙'}</Text>
                    <Text style={styles.yolculukRoutePillText}>{loc.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* ── SON RECAP ─────────────────────────────────────────────────── */}
      {lastTripRecap ? (
        <View style={styles.yolculukRecapCard}>
          <Text style={styles.yolculukRecapLabel}>SON YOLCULUK</Text>
          <Text style={styles.yolculukRecapSummary}>{lastTripRecap.tripSummary}</Text>
          <View style={styles.yolculukRecapGrid}>
            <View style={styles.yolculukRecapTile}>
              <Text style={styles.yolculukRecapTileLabel}>MESAFE</Text>
              <Text style={styles.yolculukRecapTileValue}>{formatKm(toDisplayNumber(lastTripRecap.distanceKm))}</Text>
            </View>
            <View style={styles.yolculukRecapTile}>
              <Text style={styles.yolculukRecapTileLabel}>SÜRE</Text>
              <Text style={styles.yolculukRecapTileValue}>{lastTripRecap.durationMinutes} dk</Text>
            </View>
          </View>
        </View>
      ) : null}

      {message ? <Text style={styles.yolculukMessage}>{message}</Text> : null}

      {/* ── OTO ALGILAMA ──────────────────────────────────────────────── */}
      <View style={styles.yolculukAutoCard}>
        <View style={styles.yolculukAutoLeft}>
          <Text style={styles.yolculukAutoTitle}>{translate('mobile.autoTrip.title')}</Text>
          <Text style={styles.yolculukAutoSub}>{translate('mobile.autoTrip.caption')}</Text>
        </View>
        <Switch
          disabled={!backendBinding}
          onValueChange={onToggleAutoTrip}
          thumbColor={autoTripEnabled ? colors.cyan : colors.muted}
          trackColor={{ false: colors.line, true: 'rgba(0, 240, 255, 0.38)' }}
          value={autoTripEnabled}
        />
      </View>

      {/* ── KAYITLI KONUMLAR YÖNETİMİ ──────────────────────────────────── */}
      {(savedLocations.length > 0 || savedRoutes.length > 0) && (
        <SavedLocationsManager
          locations={savedLocations}
          routes={savedRoutes}
          onDeleteLocation={onDeleteLocation}
          onDeleteRoute={onDeleteRoute}
          onUpdateLocation={onUpdateLocation}
        />
      )}

    </ScrollView>
  );
}

const KIND_ICONS: Record<string, string> = { home: 'home', work: 'work', school: 'school', custom: 'location-on' };
const KIND_LABELS: Record<string, string> = { home: 'Ev', work: 'İş', school: 'Okul', custom: 'Özel' };
const KIND_OPTIONS = ['home', 'work', 'school', 'custom'] as const;

class MapErrorBoundary extends Component<{ children: React.ReactNode }, { crashed: boolean; reason: string }> {
  state = { crashed: false, reason: '' };
  static getDerivedStateFromError(e: unknown) {
    return { crashed: true, reason: e instanceof Error ? e.message : String(e) };
  }
  componentDidCatch(e: unknown) {
    console.warn('[MapErrorBoundary]', e);
  }
  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a2424', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#849495', fontSize: 13, textAlign: 'center' }}>Harita bu build'de kullanılamıyor.</Text>
          {this.state.reason ? (
            <Text style={{ color: '#849495', fontSize: 10, marginTop: 6, textAlign: 'center', opacity: 0.6 }}>{this.state.reason}</Text>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}

function SavedLocationsManager({
  locations,
  routes,
  onDeleteLocation,
  onDeleteRoute,
  onUpdateLocation,
}: {
  locations: ApiSavedLocation[];
  routes: ApiSavedRoute[];
  onDeleteLocation: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  onUpdateLocation: (id: string, label: string, kind: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editKind, setEditKind] = useState('custom');

  const startEdit = (loc: ApiSavedLocation) => {
    setEditingId(loc.id);
    setEditLabel(loc.label);
    setEditKind(loc.locationKind);
  };

  const confirmEdit = () => {
    if (editingId && editLabel.trim()) {
      onUpdateLocation(editingId, editLabel.trim(), editKind);
    }
    setEditingId(null);
  };

  return (
    <View style={styles.locMgrWrap}>
      <Text style={styles.locMgrTitle}>KAYITLI KONUMLAR</Text>

      {locations.map((loc) => (
        <View key={loc.id} style={styles.locMgrCard}>
          {editingId === loc.id ? (
            <View style={styles.locMgrEditWrap}>
              <TextInput
                autoFocus
                onChangeText={setEditLabel}
                style={styles.locMgrEditInput}
                value={editLabel}
              />
              <View style={styles.locMgrKindRow}>
                {KIND_OPTIONS.map((k) => (
                  <Pressable
                    accessibilityRole="button"
                    key={k}
                    onPress={() => setEditKind(k)}
                    style={[styles.locMgrKindBtn, editKind === k && styles.locMgrKindBtnActive]}
                  >
                    <Text style={[styles.locMgrKindBtnText, editKind === k && styles.locMgrKindBtnTextActive]}>
                      {KIND_LABELS[k]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.locMgrEditActions}>
                <Pressable accessibilityRole="button" onPress={() => setEditingId(null)} style={styles.locMgrCancelBtn}>
                  <Text style={styles.locMgrCancelBtnText}>VAZGEÇ</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={confirmEdit} style={styles.locMgrSaveBtn}>
                  <Text style={styles.locMgrSaveBtnText}>KAYDET</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.locMgrRow}>
              <MaterialIcons name={(KIND_ICONS[loc.locationKind] ?? 'location-on') as any} size={20} color={colors.cyan} />
              <View style={styles.locMgrInfo}>
                <Text style={styles.locMgrLabel}>{loc.label}</Text>
                <Text style={styles.locMgrKind}>{KIND_LABELS[loc.locationKind] ?? loc.locationKind}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => startEdit(loc)} style={styles.locMgrAction}>
                <MaterialIcons name="edit" size={18} color={colors.muted} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onDeleteLocation(loc.id)} style={styles.locMgrAction}>
                <MaterialIcons name="delete-outline" size={18} color="#ff5252" />
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {routes.length > 0 && (
        <>
          <Text style={[styles.locMgrTitle, { marginTop: 16 }]}>KAYITLI ROTALAR</Text>
          {routes.map((route) => (
            <View key={route.id} style={styles.locMgrCard}>
              <View style={styles.locMgrRow}>
                <MaterialIcons name="route" size={20} color={colors.cyan} />
                <View style={styles.locMgrInfo}>
                  <Text style={styles.locMgrLabel}>{route.label}</Text>
                  <Text style={styles.locMgrKind}>{route.originLabel} → {route.destinationLabel}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => onDeleteRoute(route.id)} style={styles.locMgrAction}>
                  <MaterialIcons name="delete-outline" size={18} color="#ff5252" />
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function ListRow({
  left,
  onPress,
  selected,
  title,
}: {
  left: string;
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.listRow, selected ? styles.selectedListRow : null]}
    >
      <View style={styles.listLeft}>
        <Text style={styles.listIndex}>{left.toUpperCase()}</Text>
        <Text style={styles.listTitle}>{title}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function MiniSpec({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function InfoBadge({ tooltipKey, locale = 'tr' }: { tooltipKey: TooltipKey; locale?: 'tr' | 'en' }) {
  const [visible, setVisible] = useState(false);
  const { title, body } = getTooltip(tooltipKey, locale);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setVisible(true)}
        style={styles.infoBadge}
      >
        <Text style={styles.infoBadgeText}>?</Text>
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <Pressable onPress={() => setVisible(false)} style={styles.infoBadgeOverlay}>
          <View style={styles.infoBadgeSheet}>
            <Text style={styles.infoBadgeTitle}>{title}</Text>
            <Text style={styles.infoBadgeBody}>{body}</Text>
            <Pressable onPress={() => setVisible(false)} style={styles.infoBadgeClose}>
              <Text style={styles.infoBadgeCloseText}>TAMAM</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MetricTile({ label, value, tooltipKey, locale }: { label: string; value: string; tooltipKey?: TooltipKey; locale?: 'tr' | 'en' }) {
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricTileHeader}>
        <Text style={styles.label}>{label}</Text>
        {tooltipKey ? <InfoBadge tooltipKey={tooltipKey} locale={locale} /> : null}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function BottomAction({
  disabled,
  label,
  loading,
  onPress,
}: {
  disabled: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.bottomAction}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={onPress}
        style={[styles.primaryButton, disabled || loading ? styles.primaryButtonDisabled : null]}
      >
        <Text style={[styles.primaryButtonText, disabled || loading ? styles.primaryButtonTextDisabled : null]}>
          {loading ? 'BAĞLANIYOR' : label}
        </Text>
      </Pressable>
    </View>
  );
}

function validateRegistrationForm(form: RegistrationForm) {
  if (!form.username.trim()) {
    return 'Kullanıcı adı gerekli.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Geçerli bir eposta yaz.';
  }

  const normalizedPhone = normalizePhoneForValidation(form.phone);

  if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
    return 'Telefon numarasını ülke koduyla veya 10 haneli yaz.';
  }

  if (form.password.length < 8) {
    return 'Şifre en az 8 karakter olmalı.';
  }

  if (form.password !== form.passwordConfirmation) {
    return 'Şifre doğrulama eşleşmiyor.';
  }

  return null;
}

function normalizePhoneForValidation(value: string) {
  const trimmed = value.trim();
  const sign = trimmed.startsWith('+') ? '+' : '';
  return `${sign}${trimmed.replace(/\D/g, '')}`;
}

async function readCurrentLocationPoint(): Promise<CurrentLocationResult> {
  const browserPosition = await readBrowserPosition();

  if (browserPosition.ok) {
    return {
      accuracyM: browserPosition.position.coords.accuracy,
      latitude: browserPosition.position.coords.latitude,
      longitude: browserPosition.position.coords.longitude,
      ok: true,
    };
  }

  if (browserPosition.reason === 'denied' || browserPosition.reason === 'timeout') {
    return {
      ok: false,
      reason: browserPosition.reason,
    };
  }

  try {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return { ok: false, reason: 'denied' };
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      ok: true,
    };
  } catch {
    return { ok: false, reason: browserPosition.reason };
  }
}

function hasRouteOriginLocation(form: RoutePlanForm) {
  return form.originLatitude !== null && form.originLongitude !== null;
}

function defaultRouteSaveName(form: RoutePlanForm) {
  const origin = form.originLabel.trim();
  const destination = form.destinationLabel.trim();

  if (origin && destination) {
    return `${origin} - ${destination}`.slice(0, 80);
  }

  return 'Yeni rota';
}

function getRouteOriginLocation(form: RoutePlanForm) {
  const latitude = form.originLatitude;
  const longitude = form.originLongitude;

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

async function getCurrentTripPoint(index: number): Promise<TripPoint> {
  const position = await readBrowserPosition();

  if (position.ok) {
    return {
      accuracyM: position.position.coords.accuracy,
      latitude: position.position.coords.latitude,
      longitude: position.position.coords.longitude,
      recordedAt: new Date().toISOString(),
      speedKmh:
        typeof position.position.coords.speed === 'number' && position.position.coords.speed !== null
          ? Math.max(0, Math.round(position.position.coords.speed * 3.6))
          : undefined,
    };
  }

  return demoTripPoint(index);
}

function readBrowserPosition(): Promise<
  | { ok: true; position: GeolocationPosition }
  | { ok: false; reason: 'unsupported' | 'denied' | 'timeout' | 'unavailable' }
> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, position }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ ok: false, reason: 'denied' });
          return;
        }

        if (error.code === error.TIMEOUT) {
          resolve({ ok: false, reason: 'timeout' });
          return;
        }

        resolve({ ok: false, reason: 'unavailable' });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );
  });
}

function currentLocationErrorMessage(reason: 'unsupported' | 'denied' | 'timeout' | 'unavailable') {
  if (reason === 'denied') {
    return 'Konum izni verilmedi. Tarayıcı adres çubuğundaki izinlerden konumu açıp tekrar dene.';
  }

  if (reason === 'timeout') {
    return 'GPS yanıtı zaman aşımına uğradı. Açık alanda veya daha iyi sinyalde tekrar dene.';
  }

  if (reason === 'unsupported') {
    return 'Bu tarayıcı/ortam anlık konum vermiyor. Mobil cihazda konum izniyle tekrar dene.';
  }

  return 'Mevcut konum alınamadı. Konum servisinin açık olduğunu kontrol et.';
}

function demoTripPoint(index: number): TripPoint {
  const route = [
    { latitude: 41.015137, longitude: 28.97953, speedKmh: 0 },
    { latitude: 41.0212, longitude: 28.986, speedKmh: 32 },
    { latitude: 41.0278, longitude: 28.9952, speedKmh: 44 },
    { latitude: 41.0344, longitude: 29.0045, speedKmh: 38 },
  ];
  const point = route[Math.min(index, route.length - 1)];

  return {
    ...point,
    accuracyM: 25,
    recordedAt: new Date(Date.now() + index * 120000).toISOString(),
  };
}

function buildMockRoutePoints(): TripPoint[] {
  const startedAt = Date.now() - 24 * 60 * 1000;
  const route = [
    { latitude: 41.015137, longitude: 28.97953, speedKmh: 0 },
    { latitude: 41.02242, longitude: 28.99032, speedKmh: 34 },
    { latitude: 41.03167, longitude: 29.00866, speedKmh: 48 },
    { latitude: 41.04691, longitude: 29.03084, speedKmh: 64 },
    { latitude: 41.06752, longitude: 29.05736, speedKmh: 78 },
    { latitude: 41.0893, longitude: 29.08251, speedKmh: 82 },
    { latitude: 41.11154, longitude: 29.1049, speedKmh: 76 },
    { latitude: 41.12952, longitude: 29.1282, speedKmh: 55 },
    { latitude: 41.14268, longitude: 29.15136, speedKmh: 36 },
    { latitude: 41.14979, longitude: 29.16852, speedKmh: 0 },
  ];

  return route.map((point, index) => ({
    ...point,
    accuracyM: index === 0 || index === route.length - 1 ? 18 : 12,
    recordedAt: new Date(startedAt + index * 120000).toISOString(),
  }));
}

function isOxgurunalUser(user: ApiUser | null) {
  return user?.username?.trim().toLocaleLowerCase('tr-TR') === 'oxgurunal';
}

function filterText(items: string[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => item.toLocaleLowerCase('tr-TR').includes(normalizedQuery));
}

function buildBackendBinding(user: ApiUser, activeBinding: NonNullable<ApiActiveBinding>): BackendBinding {
  return {
    access: activeBinding.access,
    catalogKey: activeBinding.catalogKey ?? activeBinding.vehicle.vehicleSpecId,
    ownership: activeBinding.ownership,
    user,
    vehicle: activeBinding.vehicle,
  };
}

function stableVehicleKey(vehicle: VehicleCatalogItem) {
  return vehicle.catalogKey ?? vehicle.id;
}

function parseChargeForm(form: ChargeForm) {
  const startSoc = parseOptionalNumber(form.startSoc);
  const endSoc = parseOptionalNumber(form.endSoc);
  const energyKwh = parseOptionalNumber(form.energyKwh);
  const costAmount = parseOptionalNumber(form.costAmount);
  const targetSoc = parseOptionalNumber(form.targetSoc);

  return {
    costAmount,
    endSoc,
    energyKwh,
    hasDecisionData: targetSoc !== undefined || Boolean(form.perceivedNeed.trim()),
    hasManualData:
      startSoc !== undefined ||
      endSoc !== undefined ||
      energyKwh !== undefined ||
      costAmount !== undefined ||
      form.locationType.trim() !== 'unknown',
    startSoc,
    targetSoc,
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function safeJsonParse<T>(value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function safeStorageGet(key: string) {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function safeStorageSet(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Oturum açmayı cihaz depolama hatası yüzünden engelleme.
  }
}

async function safeStorageRemove(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Bellekteki oturum yine de kapatılır.
  }
}

function authErrorMessage(error: unknown, mode: 'login' | 'register') {
  const message = error instanceof Error ? error.message : '';

  if (/abort|network|fetch/i.test(message)) {
    return 'Sunucuya ulaşılamadı. Telefonun aynı ağda olduğunu ve API servisinin açık olduğunu kontrol et.';
  }

  if (mode === 'login') {
    return 'E-posta veya şifre hatalı.';
  }

  if (/already exists|duplicate|unique/i.test(message)) {
    return 'Bu e-posta, telefon veya kullanıcı adı daha önce kullanılmış.';
  }

  return 'Kullanıcı kaydı tamamlanamadı. Bilgileri kontrol edip tekrar dene.';
}

function isTrackingMode(value: string | null): value is TrackingMode {
  return value === 'basic' || value === 'advanced' || value === 'precise';
}

function isMarketCode(value: string | null): value is MarketCode {
  return value === 'TR' || value === 'GB';
}

function isLocale(value: string | null): value is Locale {
  return value === 'tr' || value === 'en';
}

function inferDeviceLanguage(): Locale {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  return locale.startsWith('en') ? 'en' : 'tr';
}

function inferMarketFromDevice(language: Locale): MarketCode {
  const resolved = Intl.DateTimeFormat().resolvedOptions();
  const locale = resolved.locale.toLowerCase();
  const timeZone = resolved.timeZone?.toLowerCase() ?? '';

  if (locale.includes('-tr') || timeZone === 'europe/istanbul') {
    return 'TR';
  }

  if (locale.includes('-gb') || timeZone === 'europe/london') {
    return 'GB';
  }

  return language === 'en' ? 'GB' : 'TR';
}

function canContinue(
  step: Step,
  selectedBrand: string | null,
  selectedModel: string | null,
  selectedVehicle: VehicleCatalogItem | null,
  trackingMode: TrackingMode | null
) {
  if (step === 'tracking') {
    return Boolean(trackingMode);
  }

  if (step === 'brand') {
    return Boolean(selectedBrand);
  }

  if (step === 'model') {
    return Boolean(selectedModel);
  }

  if (step === 'variant') {
    return Boolean(selectedVehicle);
  }

  return false;
}

function nextStep(step: Step): Step {
  if (step === 'register') {
    return 'tracking';
  }

  if (step === 'tracking') {
    return 'brand';
  }

  if (step === 'brand') {
    return 'model';
  }

  if (step === 'model') {
    return 'variant';
  }

  return 'today';
}

function isOnboardingStep(step: Step) {
  return step === 'register' || step === 'tracking' || step === 'brand' || step === 'model' || step === 'variant' || step === 'assessment';
}

function isMainTab(step: Step) {
  return step === 'today' || step === 'yolculuk' || step === 'sarj' || step === 'karne' || step === 'arac';
}

function isAppMainStep(step: Step) {
  return isMainTab(step) || step === 'range' || step === 'locations' || step === 'profile';
}

function stepIndex(step: Step) {
  if (step === 'register') {
    return 0;
  }

  if (step === 'tracking') {
    return 1;
  }

  if (step === 'brand') {
    return 2;
  }

  if (step === 'model') {
    return 3;
  }

  if (step === 'variant') {
    return 4;
  }

  if (step === 'assessment') {
    return 5;
  }

  return 6;
}

function continueLabel(step: Step, locale: Locale) {
  const translate = createTranslator(locale);

  if (step === 'register') {
    return translate('mobile.action.register');
  }

  if (step === 'tracking') {
    return translate('mobile.action.selectTracking');
  }

  if (step === 'brand') {
    return translate('mobile.action.selectBrand');
  }

  if (step === 'model') {
    return translate('mobile.action.selectModel');
  }

  if (step === 'assessment') {
    return 'Devam';
  }

  return translate('mobile.action.confirmSelection');
}

function titleForStep(step: Step, brand: string | null, model: string | null, locale: Locale) {
  const translate = createTranslator(locale);

  if (step === 'register') {
    return translate('mobile.step.register');
  }

  if (step === 'tracking') {
    return translate('mobile.step.tracking');
  }

  if (step === 'brand') {
    return translate('mobile.step.brand');
  }

  if (step === 'model') {
    return brand ?? translate('mobile.step.model');
  }

  if (step === 'variant') {
    return [brand, model].filter(Boolean).join(' ').toUpperCase();
  }

  if (step === 'assessment') {
    return translate('mobile.assessment.step');
  }

  if (step === 'yolculuk') {
    return translate('mobile.step.trip');
  }

  if (step === 'sarj') {
    return translate('mobile.step.charge');
  }

  if (step === 'range') {
    return translate('mobile.step.range');
  }

  if (step === 'locations') {
    return 'Konumlar';
  }

  if (step === 'profile') {
    return 'Profil';
  }

  return translate('mobile.step.summary');
}

function bindingStatusLabel(status: 'idle' | 'saving' | 'linked' | 'offline') {
  if (status === 'linked') {
    return t('mobile.binding.linked');
  }

  if (status === 'saving') {
    return t('mobile.binding.saving');
  }

  if (status === 'offline') {
    return t('mobile.binding.offline');
  }

  return t('mobile.binding.idle');
}

function tripPointFromLocation(position: Location.LocationObject, index: number): TripPoint {
  const speed = position.coords.speed;

  return {
    accuracyM: position.coords.accuracy ?? undefined,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    recordedAt: position.timestamp ? new Date(position.timestamp).toISOString() : new Date(Date.now() + index).toISOString(),
    speedKmh: typeof speed === 'number' && speed !== null ? Math.max(0, Math.round(speed * 3.6)) : undefined,
  };
}

function autoTripStatusLabel(status: AutoTripStatus, locale: Locale) {
  const translate = createTranslator(locale);

  if (status === 'permissionPending') {
    return translate('mobile.autoTrip.status.permissionPending');
  }

  if (status === 'watching') {
    return translate('mobile.autoTrip.status.watching');
  }

  if (status === 'moving') {
    return translate('mobile.autoTrip.status.moving');
  }

  if (status === 'active') {
    return translate('mobile.autoTrip.status.active');
  }

  if (status === 'stopping') {
    return translate('mobile.autoTrip.status.stopping');
  }

  if (status === 'permissionDenied') {
    return translate('mobile.autoTrip.status.permissionDenied');
  }

  if (status === 'unavailable') {
    return translate('mobile.autoTrip.status.unavailable');
  }

  return translate('mobile.autoTrip.status.off');
}

function routePlanStatusLabel(status: string, locale: Locale) {
  const translate = createTranslator(locale);

  if (status === 'safe') {
    return translate('mobile.range.status.safe');
  }

  if (status === 'tight') {
    return translate('mobile.range.status.tight');
  }

  return translate('mobile.range.status.chargeRequired');
}

function savedLocationKindLabel(kind: string) {
  if (kind === 'home') {
    return 'Ev';
  }

  if (kind === 'work') {
    return 'İş';
  }

  if (kind === 'school') {
    return 'Okul';
  }

  return 'Diğer';
}

function tripStateLabel(activeTrip: ApiTrip | null, status: 'idle' | 'working' | 'offline') {
  if (status === 'working') {
    return t('mobile.trip.processing');
  }

  if (status === 'offline') {
    return t('mobile.trip.needsCheck');
  }

  return activeTrip ? t('mobile.trip.active') : t('mobile.trip.ready');
}

function routeProgressStatusLabel(progress: ApiTripRouteProgress | null) {
  if (!progress?.destinationLabel) {
    return 'Hedef yok';
  }

  if (progress.stoppedNearDestination) {
    return 'Varış doğrula';
  }

  if (progress.nearDestination) {
    return 'Yaklaştı';
  }

  return 'Takipte';
}

function tripRecapProfileLabel(profile: string) {
  if (profile === 'dynamic') {
    return 'Dinamik';
  }

  if (profile === 'efficient') {
    return 'Verimli';
  }

  if (profile === 'comfort') {
    return 'Konfor';
  }

  if (profile === 'balanced') {
    return 'Dengeli';
  }

  return 'Öğreniyor';
}

function tripStartMessage(source: 'manual' | 'auto', progress: ApiTripRouteProgress | null) {
  if (progress?.destinationLabel) {
    const route = progress.savedRouteLabel ? `${progress.savedRouteLabel} · ` : '';
    const remaining = progress.remainingMeters === null ? '' : ` Kalan: ${formatMeters(progress.remainingMeters)}.`;
    return `${source === 'auto' ? 'Otomatik yolculuk başladı.' : 'Yolculuk başladı.'} ${route}Hedef: ${progress.destinationLabel}.${remaining}`;
  }

  return source === 'auto'
    ? t('mobile.autoTrip.message.started')
    : 'Yolculuk başladı. Hedef seçilmedi; sistem rota desenini öğrenmeye devam edecek.';
}

function apiStatusLabel(status: 'checking' | 'online' | 'offline') {
  if (status === 'checking') {
    return t('mobile.api.checking');
  }

  if (status === 'online') {
    return t('mobile.api.online');
  }

  return t('mobile.api.offlineFallback');
}

function formatKm(value: number | null) {
  return value === null ? t('mobile.value.unknown') : `${value} km`;
}

function formatKwh(value: number | null) {
  return value === null ? t('mobile.value.unknown') : `${value} kWh`;
}

function toDisplayNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatRouteLabel(route: ApiRouteFingerprint): string {
  const [oLat, oLng] = route.originCell.split(',').map(Number);
  const [dLat, dLng] = route.destinationCell.split(',').map(Number);
  if (!oLat || !dLat) return 'Bilinen hat';
  const fmt = (v: number) => v.toFixed(2);
  return `${fmt(oLat)},${fmt(oLng)} → ${fmt(dLat)},${fmt(dLng)}`;
}

function formatTL(value: number, decimals = 0): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatMoney(value: number | null) {
  return value === null ? t('mobile.value.unknown') : formatTL(value, 2);
}

function formatConfidence(value: number | null) {
  return value === null ? t('mobile.value.estimated') : `%${Math.round(value * 100)}`;
}

function formatDecimal(value: number | null, digits = 1) {
  return value === null ? t('mobile.value.unknown') : value.toFixed(digits);
}

function verificationLevelLabel(level: string) {
  if (level === 'confirmed') return 'Onaylı';
  if (level === 'verified') return 'Doğrulanmış';
  return 'Temel';
}

function visitTypeLabel(type: string) {
  if (type === 'periodic') return 'Periyodik bakım';
  if (type === 'repair') return 'Tamir';
  if (type === 'tire') return 'Lastik';
  if (type === 'battery_check') return 'Batarya kontrolü';
  return 'Servis';
}

const ASSESSMENT_CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'];

function AssessmentInputStep({
  odometerKm,
  purchaseYear,
  city,
  language,
  onChangeOdometerKm,
  onChangePurchaseYear,
  onChangeCity,
  vehicle,
}: {
  odometerKm: string;
  purchaseYear: string;
  city: string;
  language: Locale;
  onChangeOdometerKm: (v: string) => void;
  onChangePurchaseYear: (v: string) => void;
  onChangeCity: (v: string) => void;
  vehicle: VehicleCatalogItem | null;
}) {
  const translate = createTranslator(language);
  const [gpsStatus, setGpsStatus] = useState<'detecting' | 'detected' | 'failed'>('detecting');

  useEffect(() => {
    let cancelled = false;

    async function detectCity() {
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        if (cancelled) return;

        const results = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (cancelled) return;

        const raw = results[0]?.city ?? results[0]?.subregion ?? results[0]?.region ?? null;
        if (raw) {
          const matched =
            ASSESSMENT_CITIES.find(
              (c) =>
                raw.toLowerCase().includes(c.toLowerCase()) ||
                c.toLowerCase().includes(raw.toLowerCase()),
            ) ?? raw;

          setGpsStatus('detected');
          if (!city) onChangeCity(matched);
        } else {
          setGpsStatus('failed');
        }
      } catch {
        if (!cancelled) setGpsStatus('failed');
      }
    }

    void detectCity();
    return () => {
      cancelled = true;
    };
  }, []);

  const gpsLabel =
    gpsStatus === 'detecting'
      ? translate('mobile.assessment.gps.detecting')
      : gpsStatus === 'detected'
        ? `${translate('mobile.assessment.gps.detected')}${city ? `: ${city}` : ''}`
        : translate('mobile.assessment.gps.failed');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.successHeader}>
        <Text style={styles.heading}>{translate('mobile.assessment.title')}</Text>
        <Text style={styles.description}>
          {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Araç'}
          {' '}için mevcut durumu girebilirsin.{'\n'}
          Bu bilgiler ön değerlendirme raporu oluşturmak için kullanılır.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{translate('mobile.assessment.odometerLabel')}</Text>
        <TextInput
          style={styles.formInput}
          keyboardType="numeric"
          placeholder="örn. 45000"
          value={odometerKm}
          onChangeText={onChangeOdometerKm}
          maxLength={7}
        />

        <Text style={[styles.cardLabel, { marginTop: 16 }]}>{translate('mobile.assessment.yearLabel')}</Text>
        <TextInput
          style={styles.formInput}
          keyboardType="numeric"
          placeholder="örn. 2021"
          value={purchaseYear}
          onChangeText={onChangePurchaseYear}
          maxLength={4}
        />

        <View style={[styles.rowBetween, { marginTop: 16 }]}>
          <Text style={styles.cardLabel}>{translate('mobile.assessment.cityLabel')}</Text>
          <Text style={[styles.signalCaption, { marginBottom: 0 }]}>{gpsLabel}</Text>
        </View>
        <View style={styles.cityPills}>
          {ASSESSMENT_CITIES.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              style={[styles.cityPill, city === c && styles.cityPillActive]}
              onPress={() => onChangeCity(city === c ? '' : c)}
            >
              <Text style={[styles.cityPillText, city === c && styles.cityPillTextActive]}>{c}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            style={[styles.cityPill, city !== '' && !ASSESSMENT_CITIES.includes(city) && styles.cityPillActive]}
            onPress={() => onChangeCity('')}
          >
            <Text style={[styles.cityPillText, city !== '' && !ASSESSMENT_CITIES.includes(city) && styles.cityPillTextActive]}>{translate('mobile.assessment.city.other')}</Text>
          </Pressable>
        </View>
        <Text style={styles.signalCaption}>
          Trafik yükü çarpanı için kullanılır. Boş bırakılabilir.
        </Text>
      </View>
    </ScrollView>
  );
}

function roleLabel(role: string) {
  if (role === 'owner')   return 'Sahip';
  if (role === 'manager') return 'Yönetici';
  if (role === 'driver')  return 'Sürücü';
  if (role === 'viewer')  return 'Görüntüleyici';
  return role;
}

function roleColor(role: string) {
  if (role === 'owner')   return colors.cyan;
  if (role === 'manager') return '#84cc16';
  if (role === 'driver')  return '#f59e0b';
  return '#849495';
}

function VehicleSwitcherModal({
  visible,
  vehicles,
  activeVehicleId,
  onSwitch,
  onClose,
}: {
  visible: boolean;
  vehicles: NonNullable<ApiActiveBinding>[];
  activeVehicleId: string | null;
  onSwitch: (v: NonNullable<ApiActiveBinding>) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.welcomeModalOverlay}>
        <View style={[styles.welcomeModalSheet, { maxHeight: '70%' }]}>
          <View style={styles.welcomeModalHandle} />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.welcomeModalClose}>
            <MaterialIcons color={colors.muted} name="close" size={20} />
          </Pressable>
          <Text style={[styles.label, { marginHorizontal: 24, marginTop: 12, marginBottom: 8 }]}>ARAÇLARIM</Text>
          <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
            {vehicles.map((v) => {
              const isActive = v.vehicle.id === activeVehicleId;
              const role = v.access?.role ?? 'owner';
              return (
                <Pressable
                  key={v.vehicle.id}
                  accessibilityRole="button"
                  onPress={() => onSwitch(v)}
                  style={[
                    styles.bindingPanel,
                    { marginBottom: 8, paddingVertical: 12, paddingHorizontal: 16 },
                    isActive ? { borderColor: colors.cyan, borderWidth: 1 } : null,
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.bindingTitle} numberOfLines={1}>{v.vehicle.displayName}</Text>
                    <View style={[styles.aracPill, { backgroundColor: roleColor(role) + '22' }]}>
                      <Text style={[styles.aracPillText, { color: roleColor(role) }]}>{roleLabel(role).toUpperCase()}</Text>
                    </View>
                  </View>
                  {isActive ? (
                    <Text style={[styles.signalCaption, { color: colors.cyan, marginTop: 4, marginBottom: 0 }]}>● AKTİF</Text>
                  ) : (
                    <Text style={[styles.signalCaption, { marginTop: 4, marginBottom: 0 }]}>Geçmek için dokun</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DriversModal({
  visible,
  vehicleName,
  accessList,
  loading,
  inviteIdentifier,
  inviteLoading,
  inviteResult,
  onChangeIdentifier,
  onCreateInvite,
  onRevoke,
  onClose,
}: {
  visible: boolean;
  vehicleName: string;
  accessList: ApiVehicleAccess[];
  loading: boolean;
  inviteIdentifier: string;
  inviteLoading: boolean;
  inviteResult: ApiVehicleInvite | null;
  onChangeIdentifier: (v: string) => void;
  onCreateInvite: () => void;
  onRevoke: (accessId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.welcomeModalOverlay}>
        <View style={[styles.welcomeModalSheet, { maxHeight: '85%' }]}>
          <View style={styles.welcomeModalHandle} />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.welcomeModalClose}>
            <MaterialIcons color={colors.muted} name="close" size={20} />
          </Pressable>
          <Text style={[styles.label, { marginHorizontal: 24, marginTop: 12, marginBottom: 8 }]}>ARAÇ ERİŞİMİ</Text>
          <Text style={[styles.signalCaption, { marginHorizontal: 24, marginBottom: 12 }]}>{vehicleName}</Text>
          <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>

            {/* Mevcut erişim listesi */}
            {loading ? (
              <Text style={styles.signalCaption}>Yükleniyor...</Text>
            ) : accessList.length === 0 ? (
              <Text style={styles.signalCaption}>Erişim kaydı yok.</Text>
            ) : (
              accessList.map((a) => (
                <View key={a.accessId} style={[styles.rowBetween, { marginBottom: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e2a2a' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>{a.fullName ?? a.username ?? a.userId.slice(0, 8)}</Text>
                    <View style={[styles.aracPill, { alignSelf: 'flex-start', marginTop: 4, backgroundColor: roleColor(a.role) + '22' }]}>
                      <Text style={[styles.aracPillText, { color: roleColor(a.role) }]}>{roleLabel(a.role).toUpperCase()}</Text>
                    </View>
                  </View>
                  {a.role !== 'owner' ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onRevoke(a.accessId)}
                      style={[styles.secondaryButton, { paddingHorizontal: 12, paddingVertical: 6 }]}
                    >
                      <Text style={[styles.secondaryButtonText, { fontSize: 11 }]}>İPTAL</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}

            {/* Davet oluştur */}
            <Text style={[styles.cardLabel, { marginTop: 20, marginBottom: 8 }]}>SÜRÜCÜ DAVET ET</Text>
            {inviteResult ? (
              <View style={styles.card}>
                <Text style={[styles.signalCaption, { marginBottom: 8 }]}>Davet linki oluşturuldu. Kopyalayıp paylaş:</Text>
                <Text style={[styles.bindingText, { color: colors.cyan, fontSize: 12 }]} selectable>{inviteResult.webUrl}</Text>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.secondaryButton, { marginTop: 12 }]}
                  onPress={() => { void Share.share({ message: inviteResult.webUrl, url: inviteResult.webUrl }); }}
                >
                  <Text style={styles.secondaryButtonText}>PAYLAŞ</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.formInput}
                  placeholder="E-posta veya kullanıcı adı"
                  value={inviteIdentifier}
                  onChangeText={onChangeIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Pressable
                  accessibilityRole="button"
                  style={[styles.secondaryButton, { marginTop: 8, opacity: inviteLoading ? 0.5 : 1 }]}
                  onPress={onCreateInvite}
                  disabled={inviteLoading}
                >
                  <Text style={styles.secondaryButtonText}>{inviteLoading ? 'OLUŞTURULUYOR...' : 'DAVET OLUŞTUR'}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function scenarioColor(scenarioId: string) {
  if (scenarioId === 'UNDER_USED_CLEAN') return '#22c55e';
  if (scenarioId === 'HEAVY_USED_WORN') return '#ef4444';
  return '#f59e0b';
}

function WelcomeAssessmentModal({
  visible,
  assessment,
  isOnboarding,
  vehicle,
  onDismiss,
}: {
  visible: boolean;
  assessment: ApiAssessment | null;
  isOnboarding?: boolean;
  vehicle: VehicleCatalogItem | null;
  onDismiss: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.welcomeModalOverlay}>
        <View style={styles.welcomeModalSheet}>
          {/* Sabit: handle + X butonu */}
          <View style={styles.welcomeModalHandle} />
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.welcomeModalClose}
          >
            <MaterialIcons color={colors.muted} name="close" size={20} />
          </Pressable>

          {/* Kaydırılabilir içerik */}
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.welcomeModalScroll}
            showsVerticalScrollIndicator={false}
          >
            {assessment === null ? (
              <View style={styles.welcomeModalLoading}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.welcomeModalLoadingText}>Araç analiz ediliyor...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.welcomeModalBadge}>GÜN 0 DEĞERLENDİRME</Text>
                <Text style={styles.welcomeModalTitle}>
                  {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Aracın'}
                </Text>
                <Text style={[styles.welcomeModalScenario, { color: scenarioColor(assessment.scenarioId) }]}>
                  {assessment.scenarioTitle}
                </Text>

                <View style={styles.metricGrid}>
                  <MetricTile label="YILLIK KM" value={assessment.annualKm.toLocaleString('tr-TR')} />
                  <MetricTile
                    label="TAH. DÖNGÜ"
                    tooltipKey="efc"
                    value={assessment.estimatedTotalFullCycles !== null
                      ? String(assessment.estimatedTotalFullCycles)
                      : '—'}
                  />
                  <MetricTile label="ARAÇ YAŞI" value={`${assessment.vehicleAgeYears} yıl`} />
                  <MetricTile label="ŞEHİR" value={assessment.city ?? '—'} />
                </View>

                <Text style={styles.welcomeModalBody}>{assessment.scenarioBody}</Text>

                {isOnboarding ? (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.welcomeModalCta}
                    onPress={onDismiss}
                  >
                    <Text style={styles.welcomeModalCtaText}>KARNEYE BAŞLA</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AssessmentResultBlock({ assessment, language }: { assessment: ApiAssessment; language: Locale }) {
  const translate = createTranslator(language);
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.learningBlock}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{translate('mobile.assessment.step')}</Text>
        <Text style={[styles.learningPill, { color: scenarioColor(assessment.scenarioId) }]}>
          {assessment.scenarioTitle}
        </Text>
      </View>
      <View style={styles.metricGrid}>
        <MetricTile
          label={translate('mobile.assessment.metric.annualKm')}
          value={assessment.annualKm.toLocaleString('tr-TR')}
        />
        <MetricTile
          label={translate('mobile.assessment.metric.estimatedCycle')}
          value={assessment.estimatedTotalFullCycles !== null
            ? String(assessment.estimatedTotalFullCycles)
            : '—'}
        />
        <MetricTile
          label={translate('mobile.assessment.metric.city')}
          value={assessment.city ?? '—'}
        />
        <MetricTile
          label={translate('mobile.assessment.metric.vehicleAge')}
          value={`${assessment.vehicleAgeYears} ${translate('mobile.assessment.unit.years')}`}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.secondaryButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.secondaryButtonText}>
          {expanded ? translate('mobile.assessment.hideScenario') : translate('mobile.assessment.showScenario')}
        </Text>
      </Pressable>
      {expanded ? (
        <Text style={[styles.signalCaption, { marginTop: 8, lineHeight: 20 }]}>
          {assessment.scenarioBody}
        </Text>
      ) : null}
    </View>
  );
}

function drivingStyleColor(score: number | null) {
  if (score === null) return '#849495';
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#84cc16';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

function PremiumReportBlock({
  report,
  language,
  onGenerate,
  onAddExternalReport,
}: {
  report: ApiPremiumReport | null;
  language: Locale;
  onGenerate: () => void;
  onAddExternalReport: (provider: string, reportUrl?: string, sohPercent?: number) => void;
}) {
  const translate = createTranslator(language);
  const [driverExpanded, setDriverExpanded] = useState(false);
  const [addExtVisible, setAddExtVisible] = useState(false);
  const [extProvider, setExtProvider] = useState('');
  const [extUrl, setExtUrl] = useState('');
  const [extSoh, setExtSoh] = useState('');

  const d = report?.reportData;
  const ds = d?.driverUsageProfile.drivingStyle;
  const eco = d?.economicSummary;
  const ext = d?.externalBatteryReports ?? [];

  return (
    <View style={styles.learningBlock}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{translate('mobile.premium.report.title')}</Text>
        <Text style={styles.learningPill}>
          {report ? new Date(report.createdAt).toLocaleDateString('tr-TR') : translate('mobile.premium.report.notCreated')}
        </Text>
      </View>

      {report && d ? (
        <>
          {/* Section 1 – Araç Ön Özeti (from Day 0 assessment) */}
          {d.vehicleSummary ? (
            <View style={styles.metricGrid}>
              <MetricTile label={translate('mobile.premium.report.metric.scenario')} value={d.vehicleSummary.scenarioTitle} />
              <MetricTile label={translate('mobile.premium.report.metric.annualKm')} value={d.vehicleSummary.annualKm.toLocaleString('tr-TR')} />
              <MetricTile
                label={translate('mobile.premium.report.metric.estimatedCycle')}
                value={d.vehicleSummary.estimatedTotalFullCycles !== null
                  ? String(d.vehicleSummary.estimatedTotalFullCycles)
                  : '—'}
              />
              <MetricTile label={translate('mobile.premium.report.metric.city')} value={d.vehicleSummary.city ?? '—'} />
            </View>
          ) : null}

          {/* Section 2 – Şoför Kullanım Özeti */}
          {ds ? (
            <>
              <View style={[styles.rowBetween, { marginTop: 12 }]}>
                <Text style={[styles.cardLabel, { flex: 1 }]}>{translate('mobile.premium.report.driverProfile')}</Text>
                <Text style={[styles.learningPill, { color: drivingStyleColor(ds.score) }]}>
                  {ds.label}
                  {ds.score !== null ? ` (${ds.score}/100)` : ''}
                </Text>
              </View>
              <View style={styles.metricGrid}>
                <MetricTile
                  label={translate('mobile.premium.report.metric.dcCharge')}
                  value={ds.signals.dcFastChargeRatio !== null ? `%${ds.signals.dcFastChargeRatio}` : '—'}
                />
                <MetricTile
                  label={translate('mobile.premium.report.metric.consumptionDev')}
                  value={ds.signals.consumptionDeviationPercent !== null
                    ? `%${ds.signals.consumptionDeviationPercent > 0 ? '+' : ''}${ds.signals.consumptionDeviationPercent}`
                    : '—'}
                />
                <MetricTile
                  label={translate('mobile.premium.report.metric.chargingStyle')}
                  value={d.driverUsageProfile.chargingStyle.label}
                />
                <MetricTile
                  label={translate('mobile.premium.report.metric.battery')}
                  value={ds.signals.batteryUsageGrade ?? '—'}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => setDriverExpanded(!driverExpanded)}
              >
                <Text style={styles.secondaryButtonText}>
                  {driverExpanded ? translate('mobile.premium.report.hideDriverSummary') : translate('mobile.premium.report.showDriverSummary')}
                </Text>
              </Pressable>
              {driverExpanded ? (
                <Text style={[styles.signalCaption, { marginTop: 8, lineHeight: 20 }]}>
                  {d.driverUsageProfile.summary}
                </Text>
              ) : null}
            </>
          ) : null}

          {/* Section 3 – Ekonomik Özet */}
          {eco ? (
            <>
              <Text style={[styles.cardLabel, { marginTop: 12 }]}>{translate('mobile.premium.report.economicSummary')}</Text>
              <View style={styles.metricGrid}>
                <MetricTile
                  label={translate('mobile.premium.report.metric.totalKwh')}
                  value={eco.totalKwh !== null ? `${Math.round(eco.totalKwh)} kWh` : '—'}
                />
                <MetricTile
                  label={translate('mobile.premium.report.metric.currentCost')}
                  value={eco.currentTariffCost !== null ? `${eco.currentTariffCost.toLocaleString('tr-TR')} ₺` : '—'}
                />
                <MetricTile
                  label={translate('mobile.premium.report.metric.fossilEquiv')}
                  value={eco.fossilEquivCost !== null ? `${Math.round(eco.fossilEquivCost).toLocaleString('tr-TR')} ₺` : '—'}
                />
                <MetricTile
                  label={translate('mobile.premium.report.metric.savings')}
                  value={eco.estimatedSavingsTl !== null ? `${Math.round(eco.estimatedSavingsTl).toLocaleString('tr-TR')} ₺` : '—'}
                />
              </View>
            </>
          ) : null}

          {/* Section 4 – Dış Batarya Raporları */}
          {ext.length > 0 ? (
            <>
              <Text style={[styles.cardLabel, { marginTop: 12 }]}>{translate('mobile.premium.report.externalBattery')}</Text>
              {ext.map((r) => (
                <Text key={r.id} style={styles.signalCaption} numberOfLines={2}>
                  {r.provider}{r.reportType ? ` · ${r.reportType}` : ''}{r.reportDate ? ` · ${r.reportDate}` : ''}
                  {r.sohPercent !== null ? ` · SOH: %${r.sohPercent}` : ''}
                </Text>
              ))}
            </>
          ) : null}

          {/* Add external report inline form */}
          {addExtVisible ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <TextInput
                style={styles.formInput}
                placeholder={translate('mobile.premium.report.providerPlaceholder')}
                value={extProvider}
                onChangeText={setExtProvider}
              />
              <TextInput
                style={styles.formInput}
                placeholder={translate('mobile.premium.report.urlPlaceholder')}
                value={extUrl}
                onChangeText={setExtUrl}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.formInput}
                placeholder={translate('mobile.premium.report.sohPlaceholder')}
                value={extSoh}
                onChangeText={setExtSoh}
                keyboardType="numeric"
                maxLength={5}
              />
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => {
                  if (!extProvider.trim()) return;
                  onAddExternalReport(
                    extProvider.trim(),
                    extUrl.trim() || undefined,
                    extSoh ? parseFloat(extSoh) : undefined,
                  );
                  setExtProvider('');
                  setExtUrl('');
                  setExtSoh('');
                  setAddExtVisible(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>{translate('mobile.premium.report.linkReport')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={[styles.secondaryButton, { marginTop: 8 }]}
              onPress={() => setAddExtVisible(true)}
            >
              <Text style={styles.secondaryButtonText}>{translate('mobile.premium.report.addExternal')}</Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <Text style={styles.signalCaption}>
            {translate('mobile.premium.report.generateDescription')}
          </Text>
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={onGenerate}>
            <Text style={styles.secondaryButtonText}>{translate('mobile.premium.report.generate')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function batteryUsageGradeLabel(grade: string, locale: Locale) {
  const translate = createTranslator(locale);

  if (grade === 'balanced') {
    return translate('mobile.battery.grade.balanced');
  }

  if (grade === 'watch') {
    return translate('mobile.battery.grade.watch');
  }

  if (grade === 'high_stress') {
    return translate('mobile.battery.grade.highStress');
  }

  return translate('mobile.battery.learning');
}

function formatSocValue(value: number | null) {
  return value === null ? t('mobile.value.noSoc') : `%${value}`;
}

function formatKw(value: number | null) {
  return value === null ? t('mobile.value.none') : `${value} kW`;
}

function formatRange(min: number | null, max: number | null) {
  if (min === null || max === null) {
    return t('mobile.value.unknown');
  }

  return `${min}-${max} km`;
}

function formatSoc(min: number | null, max: number | null) {
  if (min === null || max === null) {
    return t('mobile.value.unknown');
  }

  return `%${min}-%${max}`;
}

function formatRatio(value: number | null) {
  return value === null ? t('mobile.value.unknown') : `%${Math.round(value * 100)}`;
}

function usageProfileConfidenceLabel(profile: ApiUsageProfile | null) {
  const score = profile?.confidenceScore ?? 0;

  if (score >= 0.65) {
    return t('mobile.usage.moreReliable');
  }

  if (score >= 0.35) {
    return t('mobile.value.estimated');
  }

  if (score > 0) {
    return t('mobile.usage.learning');
  }

  return t('mobile.usage.waitingSignal');
}

function usageProfileSignalLevel(profile: ApiUsageProfile | null) {
  const score = profile?.confidenceScore ?? 0;

  if (score >= 0.75) return 4;
  if (score >= 0.50) return 3;
  if (score > 0) return 2;
  return 1;
}

function usageProfileCaption(profile: ApiUsageProfile | null) {
  if (!profile || profile.profileType === 'unknown') {
    return t('mobile.usage.waitingTripCharge');
  }

  if (profile.profileType === 'observed') {
    return t('mobile.usage.observed');
  }

  return t('mobile.usage.learningStage');
}

function formatEfficiency(value: number | null) {
  return value === null ? t('mobile.value.unknown') : `${value} Wh/km`;
}

function formatKg(value: number | null) {
  return value === null ? t('mobile.value.unknown') : `${value} kg`;
}

function formatSeats(value: number | null) {
  return value === null ? t('mobile.value.unknown') : `${value} koltuk`;
}

function formatMeters(value: number | null) {
  if (value === null) {
    return t('mobile.value.unknown');
  }

  if (value < 1000) {
    return `${value} m`;
  }

  return `${(value / 1000).toFixed(1)} km`;
}

function formatDuration(value: number | null) {
  if (value === null) {
    return t('mobile.value.unknown');
  }

  const minutes = Math.round(value / 60);

  if (minutes < 60) {
    return `${minutes} dk`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} sa ${remainingMinutes} dk`;
}

function formatSpeed(value: number | null) {
  return value === null ? t('mobile.value.unknown') : `${Math.round(value)} km/s`;
}

function heatPumpLabel(vehicle: VehicleCatalogItem) {
  if (vehicle.heatPumpStandard) {
    return t('mobile.heatPump.standard');
  }

  if (vehicle.heatPumpAvailable) {
    return t('mobile.heatPump.optional');
  }

  if (vehicle.heatPumpAvailable === false) {
    return t('mobile.heatPump.none');
  }

  return t('mobile.value.unknown');
}

const colors = {
  background: '#111317',
  cyan: '#00f0ff',
  cyanSoft: '#7df4ff',
  line: '#3b494b',
  muted: '#849495',
  panel: '#1a1c1f',
  panelHigh: '#282a2e',
  panelLow: '#121417',
  text: '#e2e2e7',
};

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loginContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  languageFlags: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  languageFlagButton: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  languageFlagButtonActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: colors.cyan,
    borderWidth: 2,
  },
  languageFlagEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  loginLogo: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: colors.cyan,
    borderRadius: 8,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: 24,
    width: 56,
  },
  loginLogoText: {
    color: colors.cyan,
    fontSize: 26,
    fontWeight: '900',
  },
  loginHeading: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 330,
    textAlign: 'center',
  },
  loginForm: {
    alignSelf: 'center',
    maxWidth: 400,
    width: '100%',
  },
  loginInput: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 18,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  passwordInputWrap: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 18,
    minHeight: 52,
  },
  passwordInput: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  passwordToggle: {
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  passwordToggleText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
  },
  loginFooter: {
    alignItems: 'center',
    alignSelf: 'center',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 32,
    maxWidth: 400,
    paddingTop: 20,
    width: '100%',
  },
  inlineAuthLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 20,
  },
  loginFooterText: {
    color: colors.muted,
    fontSize: 14,
  },
  loginRegisterText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '800',
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 19, 23, 0.92)',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  stepBar: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: 'rgba(59, 73, 75, 0.55)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  stepDot: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  stepDotActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
  },
  stepDotText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  stepDotTextActive: {
    color: '#002022',
  },
  stepLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  stepLabelActive: {
    color: colors.text,
  },
  topIconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topIconText: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 38,
  },
  invisible: {
    opacity: 0,
  },
  topTitle: {
    color: colors.cyan,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  skipButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 56,
  },
  skipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    minWidth: 56,
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: colors.cyan,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  profileButtonText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    padding: 20,
    paddingBottom: 160,
  },
  contentWithBottomAction: {
    padding: 20,
    paddingBottom: 180,
  },
  accountPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    padding: 18,
  },
  trackingStack: {
    gap: 14,
  },
  trackingCard: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  marketButton: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '46%',
    padding: 14,
  },
  trackingTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  trackingDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  trackingDetailRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 14,
  },
  trackingPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.cyanSoft,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginLeft: 14,
    width: 24,
  },
  radioOuterSelected: {
    borderColor: colors.cyan,
  },
  radioInner: {
    backgroundColor: colors.cyan,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  errorText: {
    backgroundColor: 'rgba(255, 86, 86, 0.1)',
    borderColor: 'rgba(255, 86, 86, 0.32)',
    borderRadius: 8,
    borderWidth: 1,
    color: '#ff9b9b',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginBottom: 16,
    padding: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchInput: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sourceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  sourceText: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  retryButton: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  retryText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 8,
  },
  heading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 8,
  },
  countText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 34,
  },
  featuredBrandCard: {
    backgroundColor: '#101113',
    borderColor: '#262626',
    borderRadius: 8,
    borderWidth: 1,
    height: 160,
    overflow: 'hidden',
    width: '100%',
  },
  featuredImage: {
    height: '100%',
    opacity: 0.52,
    position: 'absolute',
    width: '100%',
  },
  imageShade: {
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  featuredContent: {
    bottom: 20,
    left: 20,
    position: 'absolute',
  },
  featuredBrandTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  brandCard: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 12,
    minHeight: 112,
    minWidth: '46%',
    padding: 18,
  },
  brandContent: {
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    borderColor: 'rgba(0, 240, 255, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.cyan,
    fontSize: 20,
    fontWeight: '800',
    height: 48,
    lineHeight: 47,
    textAlign: 'center',
    width: 48,
  },
  brandThumb: {
    borderColor: 'rgba(0, 240, 255, 0.22)',
    borderRadius: 8,
    borderWidth: 1,
    height: 52,
    width: 86,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  selectedCard: {
    backgroundColor: colors.panelHigh,
    borderColor: colors.cyan,
  },
  listPanel: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  listRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingVertical: 14,
  },
  selectedListRow: {
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
  },
  listLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  listIndex: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '800',
    width: 18,
  },
  listTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  chevron: {
    color: colors.muted,
    fontSize: 26,
  },
  heroPanel: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.panelLow,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroImage: {
    height: '100%',
    opacity: 0.84,
    width: '100%',
  },
  heroShade: {
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTextBlock: {
    bottom: 16,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 240, 255, 0.14)',
    borderColor: 'rgba(0, 240, 255, 0.32)',
    borderRadius: 4,
    borderWidth: 1,
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  variantStack: {
    gap: 14,
  },
  variantCard: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  variantTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  variantThumb: {
    backgroundColor: colors.panelLow,
    borderRadius: 8,
    height: 64,
    width: 94,
  },
  flexOne: {
    flex: 1,
  },
  variantTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  metricPrimary: {
    color: colors.cyan,
    fontSize: 17,
    fontWeight: '900',
  },
  metricTiny: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  specGrid: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  miniLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  miniValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: '#262626',
    borderRadius: 999,
    height: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.cyan,
    height: '100%',
  },

  bottomNav: {
    alignItems: 'center',
    backgroundColor: '#080f10',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    minHeight: 64,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
  },
  bottomNavItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    paddingTop: 4,
  },
  bottomNavActiveBar: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.cyan,
  },
  bottomNavItemActive: {},
  bottomNavIconActive: {},
  bottomNavLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  bottomNavLabelActive: {
    color: colors.cyan,
  },
  bottomAction: {
    backgroundColor: 'rgba(17, 19, 23, 0.94)',
    borderTopColor: 'rgba(59, 73, 75, 0.7)',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    position: 'absolute',
    right: 0,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.cyan,
    borderRadius: 6,
    height: 54,
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.panelHigh,
  },
  primaryButtonText: {
    color: '#002022',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  primaryButtonTextDisabled: {
    color: colors.muted,
  },
  logoutButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 6,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  logoutButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 26,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    marginBottom: 14,
    width: 64,
  },
  successIconText: {
    color: colors.cyan,
    fontSize: 34,
    fontWeight: '900',
  },
  vehicleDashboard: {
    backgroundColor: '#121212',
    borderColor: '#262626',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    overflow: 'hidden',
  },
  bindingPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 16,
  },
  bindingTitle: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  bindingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  placePredictionList: {
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 1,
    marginTop: -8,
    overflow: 'hidden',
  },
  placePredictionItem: {
    backgroundColor: colors.panelHigh,
    padding: 12,
  },
  placeSearchStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: -4,
  },
  routePreviewBanner: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.26)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  tripPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginBottom: 18,
    padding: 16,
  },
  autoTripCaption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 210,
  },
  tripMessage: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.24)',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.cyanSoft,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginBottom: 16,
    padding: 12,
  },
  tripActions: {
    gap: 12,
    marginBottom: 18,
  },
  savedRouteList: {
    gap: 10,
  },
  savedRouteItem: {
    backgroundColor: colors.panelHigh,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  savedRouteItemActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: colors.cyan,
  },
  savedRouteTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    maxWidth: 440,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  modalText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  modalActions: {
    gap: 10,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chargeInputBlock: {
    width: '47%',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.panelHigh,
    borderColor: colors.line,
    borderRadius: 6,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dashboardImageWrap: {
    height: 192,
    overflow: 'hidden',
  },
  dashboardImage: {
    height: '100%',
    width: '100%',
  },
  dashboardTitleBlock: {
    bottom: 16,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  dashboardTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  dashboardBody: {
    gap: 16,
    padding: 18,
  },
  highlightMetric: {
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderColor: 'rgba(0, 240, 255, 0.32)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightLabel: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '900',
  },
  bolt: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: '900',
  },
  highlightValue: {
    color: colors.cyan,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 6,
  },
  highlightHint: {
    color: colors.cyanSoft,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    marginTop: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricTile: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 92,
    padding: 14,
    width: '47%',
  },
  metricTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  // InfoBadge
  infoBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2e3637',
    borderColor: colors.muted,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBadgeText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  infoBadgeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  infoBadgeSheet: {
    backgroundColor: '#1e2d2e',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  infoBadgeTitle: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoBadgeBody: {
    color: '#c0cbcb',
    fontSize: 13,
    lineHeight: 20,
  },
  infoBadgeClose: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderColor: colors.line,
    borderWidth: 1,
    marginTop: 4,
  },
  infoBadgeCloseText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  chargeRecommendation: {
    gap: 2,
  },
  primaryData: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: '900',
  },
  dailyChargeFill: {
    marginLeft: '20%',
    width: '60%',
  },
  learningBlock: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  premiumGuidanceBlock: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 16,
  },
  advisoryList: {
    gap: 10,
  },
  advisoryItem: {
    backgroundColor: colors.panelHigh,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  advisorySeverity: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
  },
  advisoryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  speechText: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    color: colors.cyanSoft,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
    paddingTop: 8,
  },
  navigationButton: {
    alignItems: 'center',
    borderColor: colors.cyan,
    borderRadius: 6,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    marginTop: 8,
  },
  navigationButtonText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentButton: {
    alignItems: 'center',
    backgroundColor: colors.panelHigh,
    borderColor: colors.line,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  segmentButtonSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: colors.cyan,
  },
  segmentButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentButtonTextSelected: {
    color: colors.cyan,
  },
  learningPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderRadius: 999,
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  signalBars: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  signalBar: {
    backgroundColor: colors.line,
    borderRadius: 999,
    flex: 1,
    height: 5,
  },
  signalBarActive: {
    backgroundColor: colors.cyan,
  },
  signalCaption: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  footerQuote: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
    marginBottom: 18,
    textAlign: 'center',
  },
  sectionDivider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    marginHorizontal: 20,
    marginTop: 28,
  },
  sectionDividerText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 8,
  },
  welcomeModalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  welcomeModalSheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 12,
  },
  welcomeModalScroll: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  welcomeModalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.muted,
    borderRadius: 2,
    height: 4,
    marginBottom: 24,
    width: 40,
  },
  welcomeModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    zIndex: 1,
  },
  welcomeModalLoading: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  welcomeModalLoadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  welcomeModalBadge: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  welcomeModalTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeModalScenario: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },
  welcomeModalBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
    marginTop: 12,
  },
  welcomeModalCta: {
    alignItems: 'center',
    backgroundColor: colors.cyan,
    borderRadius: 10,
    paddingVertical: 14,
  },
  welcomeModalCtaText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  contextCardOverlay: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    position: 'absolute',
    right: 0,
    zIndex: 100,
  },
  contextCard: {
    backgroundColor: '#0e1620',
    borderColor: 'rgba(0,240,255,0.18)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  contextQuestion: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 8,
  },
  contextOptions: {
    gap: 8,
  },
  contextOptionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderColor: 'rgba(0,240,255,0.25)',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
  },
  contextOptionText: {
    color: '#00f0ff',
    fontSize: 14,
    fontWeight: '600',
  },
  contextSkip: {
    color: '#666e7a',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: colors.panelLow,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cityPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  cityPill: {
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cityPillActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
  },
  cityPillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  cityPillTextActive: {
    color: colors.panelLow,
  },

  // ── Yolculuk ─────────────────────────────────────────────────────────
  yolculukScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 140,
    gap: 16,
  },
  // Status row
  yolculukStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yolculukStatusLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // "Hazır" pill: bg-surface-container-low border rounded-full
  yolculukStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#151d1e',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  yolculukPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  yolculukPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Vehicle mini card: bg-surface-container border p-md rounded-lg flex row
  yolculukVehicleCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  yolculukVehicleImage: {
    width: 96,
    height: 64,
    resizeMode: 'contain',
    flexShrink: 0,
  },
  yolculukVehicleInfo: {
    flex: 1,
    gap: 4,
  },
  yolculukVehicleName: {
    color: '#dce4e5',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  yolculukVehicleLocation: {
    color: colors.muted,
    fontSize: 14,
  },
  yolculukVehicleSoc: {
    alignItems: 'flex-end',
    gap: 4,
  },
  yolculukSocValue: {
    color: colors.cyan,
    fontSize: 20,
    fontWeight: '600',
  },
  yolculukSocBar: {
    width: 64,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 999,
    overflow: 'hidden',
  },
  yolculukSocFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 999,
  },
  // Active trip banner: border-l-4 cyan, rounded-r-lg
  yolculukActiveBanner: {
    backgroundColor: '#232b2c',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    borderRightColor: colors.line,
    borderRightWidth: 1,
    borderLeftColor: colors.cyan,
    borderLeftWidth: 4,
    borderRadius: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 16,
    gap: 16,
  },
  yolculukBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  yolculukBannerLeft: {
    gap: 8,
  },
  // AKTİF YOLCULUK badge: bg-primary-container/10 border rounded-full
  yolculukActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderColor: 'rgba(0,240,255,0.2)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  yolculukActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
  },
  yolculukActivePillText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Timer: font-headline-lg 24px
  yolculukTimer: {
    color: '#dce4e5',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  yolculukBannerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  yolculukTripDistance: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
  yolculukTripSpeed: {
    color: colors.muted,
    fontSize: 14,
  },
  // YOLCULUĞU BİTİR: border-error text-error flat
  yolculukFinishButton: {
    borderColor: '#ffb4ab',
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  yolculukFinishButtonText: {
    color: '#ffb4ab',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Route planner card
  yolculukPlanCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    gap: 12,
  },
  // Floating-label input: bg-background border rounded-lg
  yolculukInputWrap: {
    backgroundColor: '#0d1515',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 2,
  },
  yolculukInputLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  yolculukInputValue: {
    color: '#dce4e5',
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 4,
  },
  yolculukDestInput: {
    color: '#dce4e5',
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 4,
  },
  // MENZİL PLANLA / YOLCULUK BAŞLAT: flat border button
  yolculukPlanButton: {
    borderColor: colors.line,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yolculukPlanButtonDisabled: {
    opacity: 0.4,
  },
  yolculukPlanButtonText: {
    color: '#dce4e5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Saved routes
  yolculukSavedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yolculukManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  yolculukManageBtnText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  yolculukSavedSection: {
    gap: 8,
  },
  yolculukSavedTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  yolculukPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  // Route pill: bg-surface-container border rounded-full
  yolculukRoutePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexShrink: 0,
  },
  yolculukRoutePillActive: {
    borderColor: colors.cyan,
  },
  yolculukRoutePillIcon: {
    color: colors.muted,
    fontSize: 16,
  },
  yolculukRoutePillText: {
    color: '#dce4e5',
    fontSize: 14,
  },
  // Recap card
  yolculukRecapCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    gap: 8,
  },
  yolculukRecapLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  yolculukRecapSummary: {
    color: '#dce4e5',
    fontSize: 14,
    lineHeight: 20,
  },
  yolculukRecapGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  yolculukRecapTile: {
    flex: 1,
    gap: 4,
    borderLeftColor: colors.line,
    borderLeftWidth: 1,
    paddingLeft: 12,
  },
  yolculukRecapTileLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  yolculukRecapTileValue: {
    color: colors.cyan,
    fontSize: 20,
    fontWeight: '600',
  },
  yolculukMessage: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  // Auto trip card: bg-surface-container border rounded-lg flex row
  yolculukAutoCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  yolculukAutoLeft: {
    flex: 1,
    gap: 4,
  },
  yolculukAutoTitle: {
    color: '#dce4e5',
    fontSize: 16,
    lineHeight: 24,
  },
  yolculukAutoSub: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Kayıtlı Konumlar Yönetimi ─────────────────────────────────────────
  locMgrWrap: {
    gap: 8,
    paddingTop: 8,
  },
  locMgrTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  locMgrCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
  },
  locMgrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locMgrInfo: {
    flex: 1,
    gap: 2,
  },
  locMgrLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  locMgrKind: {
    color: colors.muted,
    fontSize: 11,
  },
  locMgrAction: {
    padding: 4,
  },
  locMgrEditWrap: {
    gap: 10,
  },
  locMgrEditInput: {
    backgroundColor: colors.background,
    borderColor: colors.cyan,
    borderWidth: 1,
    borderRadius: 4,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locMgrKindRow: {
    flexDirection: 'row',
    gap: 6,
  },
  locMgrKindBtn: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  locMgrKindBtnActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0,240,255,0.08)',
  },
  locMgrKindBtnText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  locMgrKindBtnTextActive: {
    color: colors.cyan,
  },
  locMgrEditActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  locMgrCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
  },
  locMgrCancelBtnText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  locMgrSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.cyan,
    borderRadius: 4,
  },
  locMgrSaveBtnText: {
    color: '#002022',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Şarj ─────────────────────────────────────────────────────────────
  sarjScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 140,
    gap: 24,
  },
  // Summary Row: grid grid-cols-3 gap-xs (no radius)
  sarjSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sarjSummaryTile: {
    flex: 1,
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    padding: 12,
  },
  sarjSummaryLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sarjSummaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  sarjSummaryValue: {
    color: '#dce4e5',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  sarjSummaryUnit: {
    color: colors.muted,
    fontSize: 12,
  },
  // Log Card: bg-surface-container border (no radius)
  sarjLogCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Header: bg-surface-container-high border-b
  sarjLogHeader: {
    backgroundColor: '#232b2c',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sarjLogTitle: {
    color: '#dce4e5',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  sarjLogIcon: {
    color: colors.cyan,
    fontSize: 20,
  },
  sarjLogBody: {
    padding: 16,
    gap: 16,
  },
  sarjDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1515',
    borderColor: colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  sarjDetectText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sarjDetectNote: {
    color: colors.muted,
    fontSize: 12,
    marginTop: -8,
  },
  sarjTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a1e1e',
    borderColor: colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sarjTimerText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sarjStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1515',
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  sarjStationInput: {
    flex: 1,
    color: '#dce4e5',
    fontSize: 13,
    padding: 0,
  },
  // Segmented controls
  sarjSegGroup: {
    gap: 12,
  },
  sarjSegRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sarjSegLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sarjSegPills: {
    flexDirection: 'row',
    backgroundColor: '#0d1515',
    borderColor: colors.line,
    borderWidth: 1,
    padding: 2,
    borderRadius: 4,
  },
  sarjSegPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sarjSegPillActive: {
    backgroundColor: colors.cyan,
  },
  sarjSegPillText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sarjSegPillTextActive: {
    color: '#004f54',
  },
  // Input grid: 2-col gap-sm
  sarjInputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sarjInputBlock: {
    gap: 4,
    width: '47%',
    flexGrow: 1,
  },
  sarjInputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  sarjInputLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Input: bg-background border (no radius) px-md py-3
  sarjInput: {
    backgroundColor: '#0d1515',
    borderColor: colors.line,
    borderWidth: 1,
    color: '#dce4e5',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sarjInputAccent: {
    color: colors.cyan,
  },
  sarjMessage: {
    color: colors.muted,
    fontSize: 12,
  },
  // KAYDET: flat, h-12 (48px), bg-primary-container
  sarjSaveButton: {
    height: 48,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sarjSaveButtonDisabled: {
    opacity: 0.4,
  },
  sarjSaveButtonText: {
    color: '#004f54',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sarjSaveButtonTextDisabled: {
    color: '#004f54',
  },
  // History section
  sarjHistorySection: {
    gap: 8,
  },
  sarjHistoryTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  // History row: h-16 bg-surface-container border relative overflow-hidden
  sarjHistoryRow: {
    height: 64,
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  // Left accent bar: w-1 absolute
  sarjHistoryAccent: {
    width: 4,
    backgroundColor: colors.cyan,
  },
  sarjHistoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  sarjHistoryLeft: {
    flex: 1,
    gap: 2,
  },
  sarjHistoryDate: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sarjHistoryLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sarjHistoryLocationIcon: {
    color: colors.muted,
    fontSize: 14,
  },
  sarjHistoryLocationName: {
    color: '#dce4e5',
    fontSize: 14,
  },
  sarjHistoryMid: {
    alignItems: 'flex-end',
    minWidth: 80,
    gap: 2,
  },
  sarjHistorySoc: {
    color: '#dce4e5',
    fontSize: 14,
    fontWeight: '700',
  },
  sarjHistoryKwh: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sarjHistoryRight: {
    minWidth: 56,
    alignItems: 'flex-end',
  },
  sarjHistoryCost: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
  sarjHistoryEmpty: {
    color: colors.muted,
    fontSize: 14,
    paddingVertical: 24,
    textAlign: 'center',
  },

  // ── Karne — pt-20 pb-24 px-edge-margin space-y-md ───────────────────
  karneScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 16,
  },
  // Inner card stack: space-y-sm (12px gap)
  karneDataStack: {
    gap: 12,
  },
  karneLearnCard: {
    backgroundColor: 'rgba(26,28,31,0.8)',
    borderColor: colors.line,
    borderWidth: 1,
    borderLeftColor: colors.cyan,
    borderLeftWidth: 4,
    borderRadius: 4,
    padding: 24,
  },
  karneLearnBody: {
    alignItems: 'center',
    gap: 12,
  },
  karneLearnWave: {
    color: colors.cyan,
    fontSize: 40,
    marginBottom: 4,
  },
  karneLearnTitle: {
    color: '#dbfcff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  karneLearnSub: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  karneLearnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    width: '100%',
    opacity: 0.6,
  },
  karneLearnGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  karneLearnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  karneLearnItemText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  karneCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    gap: 16,
  },
  karneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  karneCardTitle: {
    color: '#b9cacb',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  karneBadge: {
    backgroundColor: '#2e3637',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  karneBadgeText: {
    color: '#dbfcff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  karneDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  karneDataItem: {
    borderLeftColor: colors.line,
    borderLeftWidth: 1,
    paddingLeft: 12,
    width: '50%',
    gap: 4,
  },
  karneDataLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  karneDataValue: {
    color: '#dce4e5',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  karneDataValueAccent: {
    color: colors.cyan,
  },
  karneDataUnit: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '400',
  },
  karneCardFooter: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: -4,
  },
  karneFooterLeft: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  karneFooterRight: {
    color: '#ff6b6b',
    fontSize: 14,
    lineHeight: 20,
  },
  karneAccentLabel: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  karneCyanPill: {
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderColor: 'rgba(0,240,255,0.3)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  karneCyanPillText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  karneObservedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  karnePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },

  // ── MainTopBar — h-16 bg-background/80 border-b border-outline-variant
  mainTopBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(13,21,21,0.85)',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56 + STATUS_BAR_HEIGHT,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  // Left group: DMyC brand + vehicle title (gap-xs = 8px)
  mainTopBarLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  // "DMyC" replacing menu icon — text-primary-container color (cyan)
  mainTopBarBrand: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Vehicle name — font-label-caps text-primary (#dbfcff)
  mainTopBarTitle: {
    color: '#dbfcff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    flexShrink: 1,
  },
  mainTopBarAvatar: {
    alignItems: 'center',
    backgroundColor: colors.panelHigh,
    borderColor: 'rgba(0,240,255,0.2)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  mainTopBarAvatarText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Araç ─────────────────────────────────────────────────────────────
  aracScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 140,
    gap: 24,
  },
  // Identity section: label + h1 + subtitle
  aracIdentity: {
    gap: 4,
  },
  aracIdentityLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  aracIdentityTitle: {
    color: '#dce4e5',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  aracIdentitySub: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  // Hero: h-48 (192px) rounded-xl (8px) border overflow-hidden
  aracHero: {
    height: 192,
    borderRadius: 8,
    overflow: 'hidden',
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: '#192122',
  },
  aracHeroImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    resizeMode: 'cover',
    opacity: 0.6,
  },
  // gradient-to-t overlay
  aracHeroGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '20%',
    backgroundColor: 'rgba(13,21,21,0.85)',
  },
  // Status pill at bottom-left
  aracHeroStatusWrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#2e3637',
    borderColor: 'rgba(0,240,255,0.3)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  aracHeroStatusText: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Main cards: bg-surface-container border rounded-xl (8px)
  aracCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  aracCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  aracCardTitle: {
    color: '#dce4e5',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  aracCardSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  routeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  routeMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  routeBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  routeSaveModal: {
    backgroundColor: '#192122',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 24,
    marginHorizontal: 24,
    gap: 16,
  },
  routeSaveTitle: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  routeSaveDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  routeSaveInput: {
    backgroundColor: '#0D1515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 15,
    padding: 12,
  },
  routeSaveActions: {
    flexDirection: 'row',
    gap: 12,
  },
  routeSaveCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  routeSaveCancelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  routeSaveSaveBtn: {
    flex: 2,
    backgroundColor: colors.cyan,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  routeSaveSaveText: {
    color: '#0D1515',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  aracAssessmentHeader: {
    padding: 16,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: 4,
  },
  aracAssessmentScenario: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Pill: bg-surface-container-highest text-outline rounded-full
  aracPill: {
    backgroundColor: '#2e3637',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  aracPillText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Data grid: 2x2, border right+bottom (nth-child style)
  aracDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  aracDataTile: {
    width: '50%',
    padding: 16,
    gap: 4,
  },
  aracTileBorderRight: {
    borderRightColor: colors.line,
    borderRightWidth: 1,
  },
  aracTileBorderBottom: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  aracDataTileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aracDataTileLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  aracDataTileValue: {
    color: colors.cyan,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  // Card footer: p-md with optional note and button
  aracCardFooter: {
    padding: 16,
    gap: 12,
  },
  aracCardFooterNote: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Outline button: border border-outline-variant, rounded-lg (4px)
  aracOutlineButton: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aracOutlineButtonText: {
    color: '#dce4e5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Cyan border button: border border-primary-container text-primary-container rounded-lg
  aracCyanButton: {
    borderColor: colors.cyan,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aracCyanButtonText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Premium report chevron list
  aracChevronList: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  aracChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: 16,
  },
  aracChevronIcon: {
    color: colors.muted,
    fontSize: 18,
  },
  aracChevronLabel: {
    color: '#dce4e5',
    fontSize: 14,
    flex: 1,
  },
  aracChevronArrow: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: '300',
  },
  // Settings list: rounded-lg rows with border
  aracListSection: {
    gap: 4,
  },
  aracListRow: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  aracListIcon: {
    color: colors.muted,
    fontSize: 20,
  },
  aracListLabel: {
    color: '#dce4e5',
    fontSize: 14,
    flex: 1,
  },
  aracListChevron: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: '300',
  },
  // Logout + version
  aracLogoutSection: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
  },
  aracLogoutText: {
    color: '#ffb4ab',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  aracVersionText: {
    color: colors.muted,
    fontSize: 10,
    opacity: 0.4,
  },

  // ── Bugün (SummaryStep) — HTML token'larına birebir ─────────────────
  todayRoot: {
    flex: 1,
    backgroundColor: '#0d1515',
  },
  todayScroll: {
    paddingBottom: 140,
  },
  // Hero: h-[335px] — hero section below top bar
  todayHero: {
    height: 335,
    overflow: 'hidden',
  },
  todayHeroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // hero-gradient: linear 0deg bottom→top fade
  todayHeroShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: 'rgba(13,21,21,0.9)',
  },
  // Badge: bg-primary-container, rounded-sm (2px), font-label-caps 9px
  todayHeroBadgeWrap: {
    position: 'absolute',
    top: 16,
    left: 20,
    backgroundColor: colors.cyan,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  todayHeroBadgeText: {
    color: '#004f54',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Hero title: font-headline-lg 28px bold
  todayHeroTitleWrap: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
  },
  todayHeroName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  // Content: px-edge-margin (20px) space-y-md (16px gap) mt-sm (12px top)
  todayBody: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 12,
  },
  // Main metric card: bg-surface-container border rounded-lg (4px) p-md
  todayCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    gap: 8,
  },
  todayCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Label: font-label-caps text-primary-container (cyan)
  todayCardLabel: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Value: font-display-value 38px
  todayMainValue: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -1,
  },
  todayCardHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  // Spec grid: grid-cols-2 gap-sm (12px) — separate cards with gap
  todaySpecGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Each spec tile: bg-surface-container border p-md h-24 (96px) flex-col justify-between
  todaySpecTile: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    flexBasis: '47%',
    flexGrow: 1,
    height: 96,
    justifyContent: 'space-between',
    padding: 16,
  },
  todaySpecTileBorderRight: {},
  todaySpecTileBorderBottom: {},
  todayTileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Tile label: font-label-caps 10px text-outline
  todayTileLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  // Tile value: font-headline-md (20px 600) text-white
  todayTileValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  // SoC row: bg-surface-container-low
  todaySocValue: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Progress: h-1.5 (6px) bg-outline-variant rounded-full
  todaySocTrack: {
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 16,
    position: 'relative',
  },
  todaySocFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.cyan,
    borderRadius: 999,
  },
  // Assessment card: bg-surface-container border rounded-lg overflow-hidden
  todayAssessmentCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  todayAssessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  // Header title: font-label-caps text-white
  todayAssessmentTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Pill: bg-[#FFAB00] text-[#111317] rounded-full px-xs py-0.5 9px
  todayScenarioPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayScenarioPillText: {
    color: '#111317',
    fontSize: 9,
    fontWeight: '700',
  },
  todayAssessmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  todayAssessmentTile: {
    width: '50%',
    padding: 16,
    gap: 4,
  },
  todayTileBorderRight: {
    borderRightColor: colors.line,
    borderRightWidth: 1,
  },
  todayTileBorderBottom: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  // Buttons: gap-sm (12px) pt-sm (12px)
  todayActions: {
    gap: 12,
    paddingTop: 12,
  },
  // Primary: w-full h-14 (56px) bg-primary-container NO borderRadius
  todayPrimaryButton: {
    height: 56,
    backgroundColor: colors.cyan,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  // Button text: text-on-primary-fixed-variant (#004f54) font-label-caps sm
  todayPrimaryButtonText: {
    color: '#004f54',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // Secondary: w-full h-14 border border-outline-variant NO borderRadius
  todaySecondaryButton: {
    height: 56,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  todaySecondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // BURADAN chip
  yolculukBuraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.cyan,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  yolculukBuraBtnText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── Trip Welcome Modal ────────────────────────────────────────────────
  tripWelcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tripWelcomeCard: {
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    gap: 16,
    width: '100%',
    maxWidth: 400,
  },
  tripWelcomeTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  tripWelcomeBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  tripWelcomeBtn: {
    backgroundColor: colors.cyan,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  tripWelcomeBtnText: {
    color: '#004f54',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── MapLocationPicker ─────────────────────────────────────────────────
  mapPickerRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapPickerMap: {
    flex: 1,
  },
  // Fixed center pin — stays on screen while map scrolls underneath
  mapPickerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -44,
    zIndex: 10,
    pointerEvents: 'none',
  },
  mapPickerPinIcon: {
    fontSize: 36,
  },
  mapPickerMapPlaceholder: {
    flex: 1,
    backgroundColor: '#1a2424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerPlaceholderText: {
    color: colors.muted,
    fontSize: 14,
  },
  mapPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: 16,
    gap: 8,
  },
  mapPickerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mapPickerCloseBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mapPickerCloseBtnText: {
    color: colors.text,
    fontSize: 16,
  },
  mapPickerSearchBox: {
    flex: 1,
    backgroundColor: '#192122',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
  },
  mapPickerSearchInput: {
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  mapPickerBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#192122',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  mapPickerSelectedLabel: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  mapPickerHint: {
    color: colors.muted,
    fontSize: 14,
  },
  mapPickerSaveInput: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 4,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  mapPickerBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mapPickerSecBtn: {
    flex: 1,
    borderColor: colors.line,
    borderWidth: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerSecBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  mapPickerPriBtn: {
    flex: 1,
    backgroundColor: colors.cyan,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerPriBtnText: {
    color: '#004f54',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
