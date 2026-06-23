const fs = require('fs');

function write(path, text) {
  fs.writeFileSync(path, text, 'utf8');
}

{
  const path = 'apps/mobile/src/lib/apiClient.ts';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes('export type ApiCommunityBenchmark')) {
    s = s.replace(`export type ApiBatteryLifecycle = {
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
};`, `export type ApiBatteryLifecycle = {
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
};`);
  }

  if (!s.includes('fetchCommunityBenchmark')) {
    s = s.replace(`export async function fetchBatteryLifecycle(vehicleId: string) {
  return fetchJson<ApiBatteryLifecycle>(\`/vehicles/\${vehicleId}/battery-lifecycle\`);
}`, `export async function fetchBatteryLifecycle(vehicleId: string) {
  return fetchJson<ApiBatteryLifecycle>(\`/vehicles/\${vehicleId}/battery-lifecycle\`);
}

export async function fetchCommunityBenchmark(vehicleId: string) {
  return fetchJson<ApiCommunityBenchmark>(\`/vehicles/\${vehicleId}/community-benchmark\`);
}`);
  }

  write(path, s);
}

{
  const path = 'apps/mobile/App.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = s.replace('  fetchChargeSummary,\n  fetchRouteSummary,', '  fetchChargeSummary,\n  fetchCommunityBenchmark,\n  fetchRouteSummary,');
  s = s.replace('  type ApiChargeSummary,\n  type ApiOwnership,', '  type ApiChargeSummary,\n  type ApiCommunityBenchmark,\n  type ApiOwnership,');
  s = s.replace('  const [batteryLifecycle, setBatteryLifecycle] = useState<ApiBatteryLifecycle | null>(null);', '  const [batteryLifecycle, setBatteryLifecycle] = useState<ApiBatteryLifecycle | null>(null);\n  const [communityBenchmark, setCommunityBenchmark] = useState<ApiCommunityBenchmark | null>(null);');
  s = s.replace(`      setRouteSummary(null);
      setBatteryLifecycle(null);
      return;`, `      setRouteSummary(null);
      setBatteryLifecycle(null);
      setCommunityBenchmark(null);
      return;`);
  s = s.replace(`    refreshRouteSummary(backendBinding.vehicle.id);
    refreshBatteryLifecycle(backendBinding.vehicle.id);`, `    refreshRouteSummary(backendBinding.vehicle.id);
    refreshBatteryLifecycle(backendBinding.vehicle.id);
    refreshCommunityBenchmark(backendBinding.vehicle.id);`);

  if (!s.includes('const refreshCommunityBenchmark = async')) {
    s = s.replace(`  const refreshBatteryLifecycle = async (vehicleId: string) => {
    try {
      const lifecycle = await fetchBatteryLifecycle(vehicleId);
      setBatteryLifecycle(lifecycle);
    } catch {
      setBatteryLifecycle(null);
    }
  };`, `  const refreshBatteryLifecycle = async (vehicleId: string) => {
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
  };`);
  }

  s = s.replace(`      await refreshUsageProfile(backendBinding.vehicle.id);
      await refreshRouteSummary(backendBinding.vehicle.id);`, `      await refreshUsageProfile(backendBinding.vehicle.id);
      await refreshRouteSummary(backendBinding.vehicle.id);
      await refreshCommunityBenchmark(backendBinding.vehicle.id);`);

  s = s.replace('          batteryLifecycle={batteryLifecycle}\n          onLogCharge=', '          batteryLifecycle={batteryLifecycle}\n          communityBenchmark={communityBenchmark}\n          onLogCharge=');

  s = s.replace(`function SummaryStep({
  backendBinding,
  bindingStatus,
  batteryLifecycle,
  onLogCharge,`, `function SummaryStep({
  backendBinding,
  bindingStatus,
  batteryLifecycle,
  communityBenchmark,
  onLogCharge,`);
  s = s.replace(`  batteryLifecycle: ApiBatteryLifecycle | null;
  onLogCharge: () => void;`, `  batteryLifecycle: ApiBatteryLifecycle | null;
  communityBenchmark: ApiCommunityBenchmark | null;
  onLogCharge: () => void;`);

  s = s.replace(`  const batteryLifecycleStatus = batteryLifecycle && batteryLifecycle.lastCalculatedAt
    ? batteryUsageGradeLabel(batteryLifecycle.batteryUsageGrade, language)
    : translate('mobile.battery.learning');`, `  const batteryLifecycleStatus = batteryLifecycle && batteryLifecycle.lastCalculatedAt
    ? batteryUsageGradeLabel(batteryLifecycle.batteryUsageGrade, language)
    : translate('mobile.battery.learning');
  const communityBenchmarkStatus = communityBenchmark?.status === 'ready'
    ? translate('mobile.community.ready')
    : translate('mobile.community.learning');`);

  if (!s.includes("translate('mobile.community.title')")) {
    s = s.replace(`          <View style={styles.learningBlock}>
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
          </View>`, `          <View style={styles.learningBlock}>
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
          </View>

          <View style={styles.learningBlock}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{translate('mobile.community.title')}</Text>
              <Text style={styles.learningPill}>{communityBenchmarkStatus}</Text>
            </View>
            <View style={styles.metricGrid}>
              <MetricTile label={translate('mobile.community.metric.sample')} value={String(communityBenchmark?.topBenchmark?.matchedTripCount ?? 0)} />
              <MetricTile label={translate('mobile.community.metric.ready')} value={String(communityBenchmark?.readyBenchmarkCount ?? 0)} />
              <MetricTile label={translate('mobile.community.metric.speed')} value={formatSpeed(communityBenchmark?.topBenchmark?.communityAvgSpeedKmh ?? null)} />
              <MetricTile label={translate('mobile.community.metric.confidence')} value={formatConfidence(communityBenchmark?.topBenchmark?.matchQualityScore ?? null)} />
            </View>
            <Text style={styles.signalCaption}>
              {communityBenchmark?.status === 'ready'
                ? translate('mobile.community.caption.ready')
                : translate('mobile.community.caption.learning')}
            </Text>
          </View>`);
  }

  if (!s.includes('function formatSpeed')) {
    s = s.replace(`function formatDecimal(value: number | null, digits = 1) {
  return value === null ? t('mobile.value.unknown') : value.toFixed(digits);
}`, `function formatDecimal(value: number | null, digits = 1) {
  return value === null ? t('mobile.value.unknown') : value.toFixed(digits);
}

function formatSpeed(value: number | null) {
  return value === null ? t('mobile.value.unknown') : \`${Math.round(value)} km/h\`;
}`);
  }

  write(path, s);
}

{
  const path = 'apps/mobile/src/i18n/dictionaries.ts';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes("'mobile.community.title'")) {
    s = s.replace(`    'mobile.battery.caption.observed': 'Bu veri batarya sağlığı teşhisi değil, şarj davranışından üretilen yaşam sinyalidir.',`, `    'mobile.battery.caption.observed': 'Bu veri batarya sağlığı teşhisi değil, şarj davranışından üretilen yaşam sinyalidir.',
    'mobile.community.title': 'TOPLULUK BENCHMARK',
    'mobile.community.learning': 'Öğreniyor',
    'mobile.community.ready': 'Hazır',
    'mobile.community.metric.sample': 'ÖRNEKLEM',
    'mobile.community.metric.ready': 'HAZIR',
    'mobile.community.metric.speed': 'ORT. HIZ',
    'mobile.community.metric.confidence': 'GÜVEN',
    'mobile.community.caption.learning': 'Benzer araç ve rota örneklemi arttıkça topluluk karşılaştırması açılacak.',
    'mobile.community.caption.ready': 'Karşılaştırma anonim ve toplulaştırılmış trip verisinden üretilir.',`);
    s = s.replace(`    'mobile.battery.caption.observed': 'This is not a battery health diagnosis; it is a lifecycle signal from charging behavior.',`, `    'mobile.battery.caption.observed': 'This is not a battery health diagnosis; it is a lifecycle signal from charging behavior.',
    'mobile.community.title': 'COMMUNITY BENCHMARK',
    'mobile.community.learning': 'Learning',
    'mobile.community.ready': 'Ready',
    'mobile.community.metric.sample': 'SAMPLE',
    'mobile.community.metric.ready': 'READY',
    'mobile.community.metric.speed': 'AVG SPEED',
    'mobile.community.metric.confidence': 'CONFIDENCE',
    'mobile.community.caption.learning': 'Community comparison will unlock as similar vehicle and route samples grow.',
    'mobile.community.caption.ready': 'Comparison is generated from anonymous aggregated trip data.',`);
  }

  write(path, s);
}