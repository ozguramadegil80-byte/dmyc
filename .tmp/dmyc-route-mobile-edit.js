const fs = require('fs');

function write(path, text) {
  fs.writeFileSync(path, text, 'utf8');
}

{
  const path = 'apps/mobile/src/lib/apiClient.ts';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes('export type ApiRouteSummary')) {
    s = s.replace(`export type ApiUsageProfile = {
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
};`, `export type ApiUsageProfile = {
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
};`);
  }

  if (!s.includes('fetchRouteSummary')) {
    s = s.replace(`export async function fetchUsageProfile(vehicleId: string) {
  return fetchJson<ApiUsageProfile>(\`/vehicles/\${vehicleId}/usage-profile\`);
}`, `export async function fetchUsageProfile(vehicleId: string) {
  return fetchJson<ApiUsageProfile>(\`/vehicles/\${vehicleId}/usage-profile\`);
}

export async function fetchRouteSummary(vehicleId: string) {
  return fetchJson<ApiRouteSummary>(\`/vehicles/\${vehicleId}/route-summary\`);
}`);
  }

  write(path, s);
}

{
  const path = 'apps/mobile/App.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = s.replace('  fetchChargeSummary,\n  fetchTripSummary,', '  fetchChargeSummary,\n  fetchRouteSummary,\n  fetchTripSummary,');
  s = s.replace('  type ApiOwnership,\n  type ApiTrip,', '  type ApiOwnership,\n  type ApiRouteSummary,\n  type ApiTrip,');
  s = s.replace('  const [usageProfile, setUsageProfile] = useState<ApiUsageProfile | null>(null);', '  const [usageProfile, setUsageProfile] = useState<ApiUsageProfile | null>(null);\n  const [routeSummary, setRouteSummary] = useState<ApiRouteSummary | null>(null);');
  s = s.replace(`    if (!backendBinding) {
      setUsageProfile(null);
      return;
    }

    refreshUsageProfile(backendBinding.vehicle.id);`, `    if (!backendBinding) {
      setUsageProfile(null);
      setRouteSummary(null);
      return;
    }

    refreshUsageProfile(backendBinding.vehicle.id);
    refreshRouteSummary(backendBinding.vehicle.id);`);

  if (!s.includes('const refreshRouteSummary = async')) {
    s = s.replace(`  const refreshUsageProfile = async (vehicleId: string) => {
    try {
      const profile = await fetchUsageProfile(vehicleId);
      setUsageProfile(profile);
    } catch {
      setUsageProfile(null);
    }
  };`, `  const refreshUsageProfile = async (vehicleId: string) => {
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
  };`);
  }

  s = s.replace(`      const summary = await fetchTripSummary(backendBinding.vehicle.id);
      await refreshUsageProfile(backendBinding.vehicle.id);`, `      const summary = await fetchTripSummary(backendBinding.vehicle.id);
      await refreshUsageProfile(backendBinding.vehicle.id);
      await refreshRouteSummary(backendBinding.vehicle.id);`);

  s = s.replace('          onLogout={logout}\n          usageProfile={usageProfile}', '          onLogout={logout}\n          routeSummary={routeSummary}\n          language={language}\n          usageProfile={usageProfile}');

  s = s.replace(`function SummaryStep({
  backendBinding,
  bindingStatus,
  onLogCharge,
  onLogout,
  onStartDriving,
  usageProfile,
  vehicle,
}: {
  backendBinding: BackendBinding | null;
  bindingStatus: 'idle' | 'saving' | 'linked' | 'offline';
  onLogCharge: () => void;
  onLogout: () => void;
  onStartDriving: () => void;
  usageProfile: ApiUsageProfile | null;
  vehicle: VehicleCatalogItem | null;
}) {`, `function SummaryStep({
  backendBinding,
  bindingStatus,
  onLogCharge,
  onLogout,
  onStartDriving,
  routeSummary,
  language,
  usageProfile,
  vehicle,
}: {
  backendBinding: BackendBinding | null;
  bindingStatus: 'idle' | 'saving' | 'linked' | 'offline';
  onLogCharge: () => void;
  onLogout: () => void;
  onStartDriving: () => void;
  routeSummary: ApiRouteSummary | null;
  language: Locale;
  usageProfile: ApiUsageProfile | null;
  vehicle: VehicleCatalogItem | null;
}) {`);

  s = s.replace(`  const firstCard = buildFirstCard(vehicle);
  const vehicleImage = vehicle.imageUrl ?? vehicle.brandImageUrl ?? HERO_IMAGE;
  const usageConfidenceLabel = usageProfileConfidenceLabel(usageProfile);`, `  const firstCard = buildFirstCard(vehicle);
  const vehicleImage = vehicle.imageUrl ?? vehicle.brandImageUrl ?? HERO_IMAGE;
  const usageConfidenceLabel = usageProfileConfidenceLabel(usageProfile);
  const translate = createTranslator(language);
  const routeLearningStatus = routeSummary?.status === 'observed'
    ? translate('mobile.route.observed')
    : translate('mobile.route.learning');`);

  if (!s.includes("translate('mobile.route.title')")) {
    s = s.replace(`          <View style={styles.learningBlock}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>SENİN KULLANIMINDAN ÖĞRENİLENLER</Text>
              <Text style={styles.learningPill}>{usageConfidenceLabel}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label="GÜNLÜK KM" value={formatKm(usageProfile?.avgDailyKm ?? null)} />
              <MetricTile label="HAFTALIK KM" value={formatKm(usageProfile?.avgWeeklyKm ?? null)} />
              <MetricTile label="EV ŞARJI" value={formatRatio(usageProfile?.homeChargeRatio ?? null)} />
              <MetricTile label="SOC ORT." value={formatSoc(usageProfile?.avgStartSoc ?? null, usageProfile?.avgEndSoc ?? null)} />
            </View>
            <View style={styles.signalBars}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.signalBar,
                    index < usageProfileSignalLevel(usageProfile) ? styles.signalBarActive : null,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.signalCaption}>{usageProfileCaption(usageProfile)}</Text>
          </View>`, `          <View style={styles.learningBlock}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>SENİN KULLANIMINDAN ÖĞRENİLENLER</Text>
              <Text style={styles.learningPill}>{usageConfidenceLabel}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label="GÜNLÜK KM" value={formatKm(usageProfile?.avgDailyKm ?? null)} />
              <MetricTile label="HAFTALIK KM" value={formatKm(usageProfile?.avgWeeklyKm ?? null)} />
              <MetricTile label="EV ŞARJI" value={formatRatio(usageProfile?.homeChargeRatio ?? null)} />
              <MetricTile label="SOC ORT." value={formatSoc(usageProfile?.avgStartSoc ?? null, usageProfile?.avgEndSoc ?? null)} />
            </View>
            <View style={styles.signalBars}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.signalBar,
                    index < usageProfileSignalLevel(usageProfile) ? styles.signalBarActive : null,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.signalCaption}>{usageProfileCaption(usageProfile)}</Text>
          </View>

          <View style={styles.learningBlock}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{translate('mobile.route.title')}</Text>
              <Text style={styles.learningPill}>{routeLearningStatus}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label={translate('mobile.route.metric.routes')} value={\`${routeSummary?.routeCount ?? 0}\`} />
              <MetricTile label={translate('mobile.route.metric.learned')} value={\`${routeSummary?.learnedRouteCount ?? 0}\`} />
              <MetricTile label={translate('mobile.route.metric.trips')} value={\`${routeSummary?.totalObservedTripCount ?? 0}\`} />
              <MetricTile label={translate('mobile.route.metric.confidence')} value={formatConfidence(routeSummary?.topRoute?.confidenceScore ?? null)} />
            </View>
            <Text style={styles.signalCaption}>
              {routeSummary?.topRoute
                ? translate('mobile.route.caption.observed')
                : translate('mobile.route.caption.learning')}
            </Text>
          </View>`);
  }

  write(path, s);
}

{
  const path = 'apps/mobile/src/i18n/dictionaries.ts';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes("'mobile.route.title'")) {
    s = s.replace(`    'mobile.usage.learningStage': 'ÖĞRENME AŞAMASI',`, `    'mobile.usage.learningStage': 'ÖĞRENME AŞAMASI',
    'mobile.route.title': 'ROTA ÖĞRENME',
    'mobile.route.learning': 'Öğreniyor',
    'mobile.route.observed': 'Rota bulundu',
    'mobile.route.metric.routes': 'ROTA',
    'mobile.route.metric.learned': 'ÖĞRENİLEN',
    'mobile.route.metric.trips': 'TRIP',
    'mobile.route.metric.confidence': 'GÜVEN',
    'mobile.route.caption.learning': 'Tekrarlayan rota oluştuğunda normal süre ve mesafe profili görünür olacak.',
    'mobile.route.caption.observed': 'Benzer yolculuklar aynı privacy-safe rota altında toplanıyor.',`);
    s = s.replace(`    'mobile.usage.learningStage': 'LEARNING STAGE',`, `    'mobile.usage.learningStage': 'LEARNING STAGE',
    'mobile.route.title': 'ROUTE LEARNING',
    'mobile.route.learning': 'Learning',
    'mobile.route.observed': 'Route found',
    'mobile.route.metric.routes': 'ROUTES',
    'mobile.route.metric.learned': 'LEARNED',
    'mobile.route.metric.trips': 'TRIPS',
    'mobile.route.metric.confidence': 'CONFIDENCE',
    'mobile.route.caption.learning': 'Normal duration and distance will appear after repeated routes are observed.',
    'mobile.route.caption.observed': 'Similar trips are grouped under the same privacy-safe route.',`);
  }

  write(path, s);
}