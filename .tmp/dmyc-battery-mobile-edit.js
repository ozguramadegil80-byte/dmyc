const fs = require('fs');

function write(path, text) {
  fs.writeFileSync(path, text, 'utf8');
}

{
  const path = 'apps/mobile/src/lib/apiClient.ts';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes('export type ApiBatteryLifecycle')) {
    s = s.replace(`export type ApiRouteSummary = {
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
};`, `export type ApiRouteSummary = {
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
};`);
  }

  if (!s.includes('fetchBatteryLifecycle')) {
    s = s.replace(`export async function fetchRouteSummary(vehicleId: string) {
  return fetchJson<ApiRouteSummary>(\`/vehicles/\${vehicleId}/route-summary\`);
}`, `export async function fetchRouteSummary(vehicleId: string) {
  return fetchJson<ApiRouteSummary>(\`/vehicles/\${vehicleId}/route-summary\`);
}

export async function fetchBatteryLifecycle(vehicleId: string) {
  return fetchJson<ApiBatteryLifecycle>(\`/vehicles/\${vehicleId}/battery-lifecycle\`);
}`);
  }

  write(path, s);
}

{
  const path = 'apps/mobile/App.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = s.replace('  fetchChargeSummary,\n  fetchRouteSummary,', '  fetchBatteryLifecycle,\n  fetchChargeSummary,\n  fetchRouteSummary,');
  s = s.replace('  type ApiChargeSession,\n  type ApiChargeSummary,', '  type ApiBatteryLifecycle,\n  type ApiChargeSession,\n  type ApiChargeSummary,');
  s = s.replace('  const [usageProfile, setUsageProfile] = useState<ApiUsageProfile | null>(null);\n  const [routeSummary, setRouteSummary] = useState<ApiRouteSummary | null>(null);', '  const [usageProfile, setUsageProfile] = useState<ApiUsageProfile | null>(null);\n  const [routeSummary, setRouteSummary] = useState<ApiRouteSummary | null>(null);\n  const [batteryLifecycle, setBatteryLifecycle] = useState<ApiBatteryLifecycle | null>(null);');
  s = s.replace(`      setUsageProfile(null);
      setRouteSummary(null);
      return;`, `      setUsageProfile(null);
      setRouteSummary(null);
      setBatteryLifecycle(null);
      return;`);
  s = s.replace(`    refreshUsageProfile(backendBinding.vehicle.id);
    refreshRouteSummary(backendBinding.vehicle.id);`, `    refreshUsageProfile(backendBinding.vehicle.id);
    refreshRouteSummary(backendBinding.vehicle.id);
    refreshBatteryLifecycle(backendBinding.vehicle.id);`);

  if (!s.includes('const refreshBatteryLifecycle = async')) {
    s = s.replace(`  const refreshRouteSummary = async (vehicleId: string) => {
    try {
      const summary = await fetchRouteSummary(vehicleId);
      setRouteSummary(summary);
    } catch {
      setRouteSummary(null);
    }
  };`, `  const refreshRouteSummary = async (vehicleId: string) => {
    try {
      const summary = await fetchRouteSummary(vehicleId);
      setRouteSummary(summary);
    } catch {
      setRouteSummary(null);
    }
  };

  const refreshBatteryLifecycle = async (vehicleId: string) => {
    try {
      const lifecycle = await fetchBatteryLifecycle(vehicleId);
      setBatteryLifecycle(lifecycle);
    } catch {
      setBatteryLifecycle(null);
    }
  };`);
  }

  s = s.replace(`      const summary = await fetchChargeSummary(backendBinding.vehicle.id);
      await refreshUsageProfile(backendBinding.vehicle.id);`, `      const summary = await fetchChargeSummary(backendBinding.vehicle.id);
      await refreshUsageProfile(backendBinding.vehicle.id);
      await refreshBatteryLifecycle(backendBinding.vehicle.id);`);

  s = s.replace('          bindingStatus={bindingStatus}\n          onLogCharge=', '          bindingStatus={bindingStatus}\n          batteryLifecycle={batteryLifecycle}\n          onLogCharge=');

  s = s.replace(`function SummaryStep({
  backendBinding,
  bindingStatus,
  onLogCharge,`, `function SummaryStep({
  backendBinding,
  bindingStatus,
  batteryLifecycle,
  onLogCharge,`);
  s = s.replace(`  backendBinding: BackendBinding | null;
  bindingStatus: 'idle' | 'saving' | 'linked' | 'offline';`, `  backendBinding: BackendBinding | null;
  bindingStatus: 'idle' | 'saving' | 'linked' | 'offline';
  batteryLifecycle: ApiBatteryLifecycle | null;`);

  s = s.replace(`  const routeLearningStatus = routeSummary?.status === 'observed'
    ? translate('mobile.route.observed')
    : translate('mobile.route.learning');`, `  const routeLearningStatus = routeSummary?.status === 'observed'
    ? translate('mobile.route.observed')
    : translate('mobile.route.learning');
  const batteryLifecycleStatus = batteryLifecycle && batteryLifecycle.lastCalculatedAt
    ? batteryUsageGradeLabel(batteryLifecycle.batteryUsageGrade, language)
    : translate('mobile.battery.learning');`);

  if (!s.includes("translate('mobile.battery.title')")) {
    s = s.replace(`          <View style={styles.learningBlock}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{translate('mobile.route.title')}</Text>
              <Text style={styles.learningPill}>{routeLearningStatus}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label={translate('mobile.route.metric.routes')} value={String(routeSummary?.routeCount ?? 0)} />
              <MetricTile label={translate('mobile.route.metric.learned')} value={String(routeSummary?.learnedRouteCount ?? 0)} />
              <MetricTile label={translate('mobile.route.metric.trips')} value={String(routeSummary?.totalObservedTripCount ?? 0)} />
              <MetricTile label={translate('mobile.route.metric.confidence')} value={formatConfidence(routeSummary?.topRoute?.confidenceScore ?? null)} />
            </View>
            <Text style={styles.signalCaption}>
              {routeSummary?.topRoute
                ? translate('mobile.route.caption.observed')
                : translate('mobile.route.caption.learning')}
            </Text>
          </View>`, `          <View style={styles.learningBlock}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{translate('mobile.route.title')}</Text>
              <Text style={styles.learningPill}>{routeLearningStatus}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label={translate('mobile.route.metric.routes')} value={String(routeSummary?.routeCount ?? 0)} />
              <MetricTile label={translate('mobile.route.metric.learned')} value={String(routeSummary?.learnedRouteCount ?? 0)} />
              <MetricTile label={translate('mobile.route.metric.trips')} value={String(routeSummary?.totalObservedTripCount ?? 0)} />
              <MetricTile label={translate('mobile.route.metric.confidence')} value={formatConfidence(routeSummary?.topRoute?.confidenceScore ?? null)} />
            </View>
            <Text style={styles.signalCaption}>
              {routeSummary?.topRoute
                ? translate('mobile.route.caption.observed')
                : translate('mobile.route.caption.learning')}
            </Text>
          </View>

          <View style={styles.learningBlock}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{translate('mobile.battery.title')}</Text>
              <Text style={styles.learningPill}>{batteryLifecycleStatus}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label={translate('mobile.battery.metric.efc')} value={formatDecimal(batteryLifecycle?.totalEfc ?? null, 2)} />
              <MetricTile label={translate('mobile.battery.metric.stressCycle')} value={formatDecimal(batteryLifecycle?.totalStressAdjustedCycles ?? null, 2)} />
              <MetricTile label={translate('mobile.battery.metric.dcRatio')} value={formatRatio(batteryLifecycle?.dcChargeRatio ?? null)} />
              <MetricTile label={translate('mobile.battery.metric.confidence')} value={formatConfidence(batteryLifecycle?.confidenceScore ?? null)} />
            </View>
            <Text style={styles.signalCaption}>
              {batteryLifecycle && batteryLifecycle.lastCalculatedAt
                ? translate('mobile.battery.caption.observed')
                : translate('mobile.battery.caption.learning')}
            </Text>
          </View>`);
  }

  if (!s.includes('function batteryUsageGradeLabel')) {
    s = s.replace(`function formatConfidence(value: number | null) {
  return value === null ? t('mobile.value.estimated') : \`%\${Math.round(value * 100)}\`;
}`, `function formatConfidence(value: number | null) {
  return value === null ? t('mobile.value.estimated') : \`%\${Math.round(value * 100)}\`;
}

function formatDecimal(value: number | null, digits = 1) {
  return value === null ? t('mobile.value.unknown') : value.toFixed(digits);
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
}`);
  }

  write(path, s);
}

{
  const path = 'apps/mobile/src/i18n/dictionaries.ts';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes("'mobile.battery.title'")) {
    s = s.replace(`    'mobile.route.caption.observed': 'Benzer yolculuklar aynı privacy-safe rota altında toplanıyor.',`, `    'mobile.route.caption.observed': 'Benzer yolculuklar aynı privacy-safe rota altında toplanıyor.',
    'mobile.battery.title': 'BATARYA YAŞAM SİNYALİ',
    'mobile.battery.learning': 'Öğreniyor',
    'mobile.battery.metric.efc': 'EFC',
    'mobile.battery.metric.stressCycle': 'STRES DÖNGÜSÜ',
    'mobile.battery.metric.dcRatio': 'DC ORANI',
    'mobile.battery.metric.confidence': 'GÜVEN',
    'mobile.battery.grade.balanced': 'Dengeli',
    'mobile.battery.grade.watch': 'İzleniyor',
    'mobile.battery.grade.highStress': 'Yüksek stres',
    'mobile.battery.caption.learning': 'SOC doğrulamalı şarjlar arttıkça batarya kullanım profili oluşacak.',
    'mobile.battery.caption.observed': 'Bu veri batarya sağlığı teşhisi değil, şarj davranışından üretilen yaşam sinyalidir.',`);
    s = s.replace(`    'mobile.route.caption.observed': 'Similar trips are grouped under the same privacy-safe route.',`, `    'mobile.route.caption.observed': 'Similar trips are grouped under the same privacy-safe route.',
    'mobile.battery.title': 'BATTERY LIFECYCLE SIGNAL',
    'mobile.battery.learning': 'Learning',
    'mobile.battery.metric.efc': 'EFC',
    'mobile.battery.metric.stressCycle': 'STRESS CYCLE',
    'mobile.battery.metric.dcRatio': 'DC RATIO',
    'mobile.battery.metric.confidence': 'CONFIDENCE',
    'mobile.battery.grade.balanced': 'Balanced',
    'mobile.battery.grade.watch': 'Watching',
    'mobile.battery.grade.highStress': 'High stress',
    'mobile.battery.caption.learning': 'Battery usage profile will form as SOC-verified charge logs increase.',
    'mobile.battery.caption.observed': 'This is not a battery health diagnosis; it is a lifecycle signal from charging behavior.',`);
  }

  write(path, s);
}