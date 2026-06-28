'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Archive,
  CheckCircle2,
  Eraser,
  FileSearch,
  Plus,
  RotateCw,
  Save,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { t } from '../i18n';
import {
  approveReviewEvidenceBatch,
  createReviewDecision,
  fetchAdminVehicleSpecs,
  fetchVehicleBrandAssets,
  fetchReviewDecisions,
  fetchReviewEvidence,
  updateVehicleBrandAsset,
  updateAdminVehicleSpec,
  uploadVehicleImage,
  type AdminVehicleSpec,
  type AdminVehicleSpecUpdate,
  type ReviewDecision,
  type ReviewEvidence,
  type VehicleBrandAsset,
} from '../lib/adminReviewApi';

type Props = {
  initialVehicleSpecs: AdminVehicleSpec[];
  initialEvidence: ReviewEvidence[];
  initialDecisions: ReviewDecision[];
  initialView?: AdminView;
  initialMarket: MarketCode;
  contentLocale: 'tr' | 'en';
  adminUsername: string;
  apiError?: boolean;
};

type SpecFieldKind = 'text' | 'number' | 'boolean' | 'image';
type SpecFieldGroup = 'identity' | 'media' | 'battery' | 'charging' | 'hardware' | 'source';

type SpecField = {
  key: keyof AdminVehicleSpecUpdate;
  jsonKey: string;
  label: string;
  kind: SpecFieldKind;
  group: SpecFieldGroup;
  requiredForFirstCard?: boolean;
};

type SpecDraft = Record<string, string>;
type BrandAssetDraft = { imageUrl: string; notes: string };
type BrandAssetDraftMap = Record<string, BrandAssetDraft>;
type AdminView = 'vehicles' | 'review';
type QualityFilter = 'active_catalog' | 'background_backlog' | 'missing_images' | 'needs_research' | 'weak_source';
type MarketCode = 'TR' | 'GB';

const decisionTypes = [
  'mark_needs_more_evidence',
  'keep_existing_spec',
  'update_existing_spec',
  'create_new_variant',
  'archive_legacy_spec',
];

const decisionTypeLabels: Record<string, string> = {
  archive_legacy_spec: 'Eski kaydı arşivle',
  create_new_variant: 'Yeni varyant oluştur',
  keep_existing_spec: 'Mevcut bilgiyi koru',
  mark_needs_more_evidence: 'Daha fazla kanıt iste',
  update_existing_spec: 'Mevcut araç bilgisini güncelle',
};

const decisionStatusLabels: Record<string, string> = {
  approved: 'Onaylandı',
  pending: 'Bekliyor',
  rejected: 'Reddedildi',
};

const evidenceStatusLabels: Record<string, string> = {
  applied: 'Uygulandı',
  applied_partial: 'Kısmen uygulandı',
  archived_reference: 'Arşiv referansı',
  pending_review: 'İnceleme bekliyor',
};

const verificationLevelLabels: Record<string, string> = {
  inferred: 'Tahmini',
  official: 'Resmi kaynak',
  official_source: 'Resmi kaynak',
  research_needed: 'Araştırma gerekli',
  seed: 'İlk veri',
  verified: 'Doğrulandı',
};

const fieldLabelOverrides: Record<string, string> = {
  battery_gross_kwh: 'Batarya brüt kapasite (kWh)',
  battery_net_kwh: 'Kullanılabilir batarya (kWh)',
  battery_chemistry: 'Batarya kimyası',
  ac_max_kw: 'AC şarj gücü (kW)',
  charging_port_type: 'Şarj port tipi',
  curb_weight_kg: 'Boş ağırlık (kg)',
  dc_max_kw: 'DC hızlı şarj gücü (kW)',
  drive_type: 'Çekiş tipi',
  heat_pump_available: 'Isı pompası mevcut mu?',
  heat_pump_standard: 'Isı pompası standart mı?',
  known_issues: 'Bilinen veri sorunları',
  official_efficiency_wh_km: 'Resmi tüketim (Wh/km)',
  range_type: 'Menzil tipi',
  recommended_daily_soc_max: 'Önerilen günlük şarj üst sınırı (%)',
  recommended_daily_soc_min: 'Önerilen günlük şarj alt sınırı (%)',
  seats: 'Koltuk sayısı',
  source_name: 'Kaynak adı',
  source_url: 'Kaynak bağlantısı',
  stats: 'Veri durumu',
  towing_capacity_kg: 'Çekme kapasitesi (kg)',
  trim: 'Donanım paketi',
  vehicle_class: 'Araç sınıfı',
  verification_level: 'Doğrulama seviyesi',
  wltp_range_km: 'WLTP menzil (km)',
};

const qualityFilters: Array<{ key: QualityFilter; label: string; description: string }> = [
  {
    key: 'active_catalog',
    label: t('admin.catalog.quality.activeCatalog'),
    description: t('admin.catalog.quality.activeCatalogDescription'),
  },
  {
    key: 'background_backlog',
    label: t('admin.catalog.quality.backgroundBacklog'),
    description: t('admin.catalog.quality.backgroundBacklogDescription'),
  },
  {
    key: 'missing_images',
    label: t('admin.catalog.quality.missingImages'),
    description: t('admin.catalog.quality.missingImagesDescription'),
  },
  {
    key: 'needs_research',
    label: t('admin.catalog.quality.needsResearch'),
    description: t('admin.catalog.quality.needsResearchDescription'),
  },
  {
    key: 'weak_source',
    label: t('admin.catalog.quality.weakSource'),
    description: t('admin.catalog.quality.weakSourceDescription'),
  },
];

const specFieldGroups: Array<{ key: SpecFieldGroup; label: string }> = [
  { key: 'identity', label: 'Kimlik' },
  { key: 'media', label: 'Görsel' },
  { key: 'battery', label: 'Batarya' },
  { key: 'charging', label: 'Şarj' },
  { key: 'hardware', label: 'Donanım' },
  { key: 'source', label: 'Kaynak' },
];

const rawSpecFields: SpecField[] = [
  { key: 'brand', jsonKey: 'brand', label: 'Marka', kind: 'text', group: 'identity', requiredForFirstCard: true },
  { key: 'model', jsonKey: 'model', label: 'Model', kind: 'text', group: 'identity', requiredForFirstCard: true },
  { key: 'variant', jsonKey: 'variant', label: 'Varyant', kind: 'text', group: 'identity', requiredForFirstCard: true },
  { key: 'modelFamily', jsonKey: 'model_family', label: 'Model ailesi', kind: 'text', group: 'identity' },
  {
    key: 'variantDisplayName',
    jsonKey: 'variant_display_name',
    label: 'Kullanıcıya gösterilecek varyant adı',
    kind: 'text',
    group: 'identity',
  },
  { key: 'yearFrom', jsonKey: 'year_from', label: 'Başlangıç yılı', kind: 'number', group: 'identity' },
  { key: 'yearTo', jsonKey: 'year_to', label: 'Bitiş yılı', kind: 'number', group: 'identity' },
  { key: 'officialSalesStatus', jsonKey: 'official_sales_status', label: 'Satış durumu', kind: 'text', group: 'identity' },
  { key: 'localDisplayName', jsonKey: 'local_display_name', label: 'Market görünür adı', kind: 'text', group: 'identity' },
  { key: 'localSalesStatus', jsonKey: 'local_sales_status', label: 'Market satış durumu', kind: 'text', group: 'identity' },
  { key: 'imageUrl', jsonKey: 'image_url', label: 'Varyant fotoğrafı', kind: 'image', group: 'media' },
  { key: 'batteryGrossKwh', jsonKey: 'battery_gross_kwh', label: 'Batarya gross kWh', kind: 'number', group: 'battery' },
  { key: 'batteryNetKwh', jsonKey: 'battery_net_kwh', label: 'Batarya net kWh', kind: 'number', group: 'battery', requiredForFirstCard: true },
  { key: 'wltpRangeKm', jsonKey: 'wltp_range_km', label: 'WLTP menzil km', kind: 'number', group: 'battery', requiredForFirstCard: true },
  { key: 'officialEfficiencyWhKm', jsonKey: 'official_efficiency_wh_km', label: 'Resmi tüketim Wh/km', kind: 'number', group: 'battery' },
  { key: 'recommendedDailySocMin', jsonKey: 'recommended_daily_soc_min', label: 'Önerilen günlük SOC min', kind: 'number', group: 'battery' },
  { key: 'recommendedDailySocMax', jsonKey: 'recommended_daily_soc_max', label: 'Önerilen günlük SOC max', kind: 'number', group: 'battery' },
  { key: 'acMaxKw', jsonKey: 'ac_max_kw', label: 'AC max kW', kind: 'number', group: 'charging', requiredForFirstCard: true },
  { key: 'dcMaxKw', jsonKey: 'dc_max_kw', label: 'DC max kW', kind: 'number', group: 'charging', requiredForFirstCard: true },
  { key: 'chargingPortType', jsonKey: 'charging_port_type', label: 'Şarj port tipi', kind: 'text', group: 'charging' },
  { key: 'driveType', jsonKey: 'drive_type', label: 'Çekiş tipi', kind: 'text', group: 'hardware' },
  { key: 'vehicleClass', jsonKey: 'vehicle_class', label: 'Araç sınıfı', kind: 'text', group: 'hardware' },
  { key: 'curbWeightKg', jsonKey: 'curb_weight_kg', label: 'Boş ağırlık kg', kind: 'number', group: 'hardware' },
  {
    key: 'heatPumpAvailable',
    jsonKey: 'heat_pump_available',
    label: 'Isı pompası var mı?',
    kind: 'boolean',
    group: 'hardware',
  },
  { key: 'heatPumpStandard', jsonKey: 'heat_pump_standard', label: 'Isı pompası standart mı?', kind: 'boolean', group: 'hardware' },
  { key: 'batteryChemistry', jsonKey: 'battery_chemistry', label: 'Batarya kimyası', kind: 'text', group: 'hardware' },
  { key: 'towingCapacityKg', jsonKey: 'towing_capacity_kg', label: 'Çekme kapasitesi kg', kind: 'number', group: 'hardware' },
  { key: 'seats', jsonKey: 'seats', label: 'Koltuk sayısı', kind: 'number', group: 'hardware' },
  { key: 'sourceName', jsonKey: 'source_name', label: 'Kaynak adı', kind: 'text', group: 'source' },
  { key: 'sourceUrl', jsonKey: 'source_url', label: 'Kaynak URL', kind: 'text', group: 'source' },
  { key: 'verificationLevel', jsonKey: 'verification_level', label: 'Doğrulama seviyesi', kind: 'text', group: 'source' },
  { key: 'marketSourceName', jsonKey: 'market_source_name', label: 'Market kaynak adı', kind: 'text', group: 'source' },
  { key: 'marketSourceUrl', jsonKey: 'market_source_url', label: 'Market kaynak URL', kind: 'text', group: 'source' },
  { key: 'marketVerificationLevel', jsonKey: 'market_verification_level', label: 'Market doğrulama seviyesi', kind: 'text', group: 'source' },
];

const specFields = uniqueSpecFields(rawSpecFields);

export function AdminReviewConsole({
  initialVehicleSpecs,
  initialEvidence,
  initialDecisions,
  initialView = 'vehicles',
  initialMarket,
  contentLocale,
  adminUsername,
  apiError = false,
}: Props) {
  const searchParams = useSearchParams();
  const preferredSpecId =
    initialVehicleSpecs.find(
      (item) =>
        item.brand === 'Togg' &&
        item.model === 'T10X' &&
        item.variant === 'V1 RWD Standard Range',
    )?.id ??
    initialVehicleSpecs[0]?.id ??
    '';

  const [vehicleSpecs, setVehicleSpecs] = useState(initialVehicleSpecs);
  const [brandAssets, setBrandAssets] = useState<VehicleBrandAsset[]>([]);
  const [brandAssetDrafts, setBrandAssetDrafts] = useState<BrandAssetDraftMap>({});
  const [selectedBrand, setSelectedBrand] = useState(
    initialVehicleSpecs.find((item) => item.id === preferredSpecId)?.brand ?? initialVehicleSpecs[0]?.brand ?? '',
  );
  const [evidence, setEvidence] = useState(initialEvidence);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [selectedSpecId, setSelectedSpecId] = useState(preferredSpecId);
  const selectedMarket = initialMarket;
  const [query, setQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('active_catalog');
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [activeSpecGroup, setActiveSpecGroup] = useState<SpecFieldGroup>('identity');
  const [specDraft, setSpecDraft] = useState<SpecDraft>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [busyBrand, setBusyBrand] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(initialEvidence[0]?.id ?? '');
  const activeView = initialView;
  const [decisionType, setDecisionType] = useState(decisionTypes[0]);
  const [decidedBy, setDecidedBy] = useState('admin');
  const [fieldKey, setFieldKey] = useState('verification_level');
  const [fieldValue, setFieldValue] = useState('research_needed');
  const [resultingVerificationLevel, setResultingVerificationLevel] = useState('');
  const [rationale, setRationale] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [isApprovingEvidence, setIsApprovingEvidence] = useState(false);
  const [selectedApprovalEvidenceIds, setSelectedApprovalEvidenceIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const requestedSpecId = searchParams.get('specId');

  const selectedSpec = vehicleSpecs.find((item) => item.id === selectedSpecId) ?? vehicleSpecs[0] ?? null;
  const brands = useMemo(() => {
    return Array.from(new Set(vehicleSpecs.map((item) => item.brand))).sort((a, b) => a.localeCompare(b));
  }, [vehicleSpecs]);
  const selectedBrandAsset =
    brandAssets.find((asset) => asset.brand === selectedBrand) ??
    {
      brand: selectedBrand,
      imageUrl: null,
      notes: null,
      vehicleCount: vehicleSpecs.filter((item) => item.brand === selectedBrand).length,
      updatedAt: null,
    };
  const selectedBrandDraft = brandAssetDrafts[selectedBrand] ?? { imageUrl: '', notes: '' };
  const selectedEvidence = evidence.find((item) => item.id === selectedEvidenceId) ?? evidence[0] ?? null;
  const relatedDecisions = selectedEvidence
    ? decisions.filter((decision) => decision.evidenceId === selectedEvidence.id)
    : [];
  const approvableEvidence = useMemo(() => evidence.filter(canApproveEvidence), [evidence]);
  const selectedApprovalCount = selectedApprovalEvidenceIds.filter((id) =>
    approvableEvidence.some((item) => item.id === id),
  ).length;
  const selectedTrust = useMemo(
    () => (selectedSpec ? calculateDataTrust(selectedSpec) : null),
    [selectedSpec],
  );

  const qualityStats = useMemo(
    () => ({
      activeCatalog: vehicleSpecs.filter(isActiveCatalogSpec).length,
      backgroundBacklog: vehicleSpecs.filter(isBackgroundBacklogSpec).length,
      missingImages: vehicleSpecs.filter(isMissingImage).length,
      needsResearch: vehicleSpecs.filter(isNeedsResearch).length,
      weakSource: vehicleSpecs.filter(isWeakSource).length,
    }),
    [vehicleSpecs],
  );

  const filteredSpecs = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr-TR');
    const brandSpecs = vehicleSpecs
      .filter((item) => item.brand === selectedBrand)
      .filter((item) => matchesQualityFilter(item, qualityFilter));

    if (!term) {
      return brandSpecs;
    }

    return brandSpecs.filter((item) =>
      [item.model, item.variant, item.officialSalesStatus, item.verificationLevel]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(term),
    );
  }, [qualityFilter, query, selectedBrand, vehicleSpecs]);

  const categoryStats = useMemo(() => {
    return Object.fromEntries(
      brands.map((brand) => {
        const brandSpecs = vehicleSpecs.filter((item) => item.brand === brand);
        const missingImageCount = brandSpecs.filter((item) => !item.imageUrl).length;
        const brandAsset = brandAssets.find((asset) => asset.brand === brand);

        return [
          brand,
          {
            activeCount: brandSpecs.filter(isActiveCatalogSpec).length,
            backlogCount: brandSpecs.filter(isBackgroundBacklogSpec).length,
            hasImage: Boolean(brandAsset?.imageUrl),
            missingImageCount,
            vehicleCount: brandSpecs.length,
          },
        ];
      }),
    );
  }, [brandAssets, brands, vehicleSpecs]);

  const missingFields = useMemo(() => {
    if (!selectedSpec) {
      return [];
    }

    return specFields.filter((field) => isFieldEmpty(field, selectedSpec[field.key]));
  }, [selectedSpec]);

  const visibleFields = useMemo(() => {
    const groupFields = specFields.filter((field) => field.group === activeSpecGroup);

    if (!showOnlyMissing || !selectedSpec) {
      return groupFields;
    }

    return groupFields.filter((field) => isFieldEmpty(field, selectedSpec[field.key]));
  }, [activeSpecGroup, showOnlyMissing, selectedSpec]);

  const activeGroupSummary = useMemo(() => {
    if (!selectedSpec) {
      return null;
    }

    const groupFields = specFields.filter((field) => field.group === activeSpecGroup);
    const missingCount = groupFields.filter((field) => isFieldEmpty(field, selectedSpec[field.key])).length;

    return {
      filledCount: groupFields.length - missingCount,
      totalCount: groupFields.length,
    };
  }, [activeSpecGroup, selectedSpec]);

  const hasUnsavedSpecChanges = useMemo(() => {
    if (!selectedSpec) {
      return false;
    }

    const savedDraft = createDraft(selectedSpec);
    return specFields.some((field) => (specDraft[field.key] ?? '') !== (savedDraft[field.key] ?? ''));
  }, [selectedSpec, specDraft]);

  const stats = useMemo(() => {
    return {
      specs: vehicleSpecs.length,
      activeCatalog: qualityStats.activeCatalog,
      backgroundBacklog: qualityStats.backgroundBacklog,
      missingImages: qualityStats.missingImages,
      selectedMissing: missingFields.length,
      selectedCompleteness: selectedTrust?.filledPercent ?? 0,
      evidence: evidence.length,
      applied: evidence.filter((item) => item.evidenceStatus === 'applied').length,
    };
  }, [vehicleSpecs.length, qualityStats, missingFields.length, selectedTrust, evidence]);

  useEffect(() => {
    loadBrandAssets();
  }, []);

  useEffect(() => {
    if (!brands.length) {
      return;
    }

    if (!brands.includes(selectedBrand)) {
      setSelectedBrand(brands[0]);
    }
  }, [brands, selectedBrand]);

  useEffect(() => {
    if (!selectedBrand || !filteredSpecs.length) {
      return;
    }

    if (!filteredSpecs.some((item) => item.id === selectedSpecId)) {
      setSelectedSpecId(filteredSpecs[0].id);
    }
  }, [filteredSpecs, selectedBrand, selectedSpecId]);

  useEffect(() => {
    if (activeView !== 'vehicles' || !requestedSpecId) {
      return;
    }

    const requestedSpec = vehicleSpecs.find((item) => item.id === requestedSpecId);
    if (!requestedSpec) {
      return;
    }

    setSelectedBrand(requestedSpec.brand);
    setQualityFilter(bestQualityFilterForSpec(requestedSpec));
    setSelectedSpecId(requestedSpec.id);
  }, [activeView, requestedSpecId, vehicleSpecs]);

  useEffect(() => {
    if (!selectedSpec) {
      setSpecDraft({});
      return;
    }

    setSpecDraft(createDraft(selectedSpec));
  }, [selectedSpec]);

  useEffect(() => {
    if (!selectedEvidence) {
      return;
    }

    const defaultField = selectedEvidence.conflictFields[0] ?? Object.keys(selectedEvidence.fieldValues)[0] ?? 'verification_level';
    setFieldKey(defaultField);
    setFieldValue(formatEditableFieldValue(selectedEvidence.fieldValues[defaultField]));
    setDecisionType(defaultDecisionType(selectedEvidence));
    setResultingVerificationLevel(selectedEvidence.vehicle?.verificationLevel ?? '');
    setRationale(defaultRationale(selectedEvidence));
  }, [selectedEvidence]);

  useEffect(() => {
    const approvableIds = new Set(approvableEvidence.map((item) => item.id));
    setSelectedApprovalEvidenceIds((current) => current.filter((id) => approvableIds.has(id)));
  }, [approvableEvidence]);

  function chooseDecisionField(nextField: string) {
    setFieldKey(nextField);
    if (selectedEvidence) {
      setFieldValue(formatEditableFieldValue(selectedEvidence.fieldValues[nextField]));
    }
  }

  function toggleApprovalSelection(id: string) {
    setSelectedApprovalEvidenceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllApprovalSelection() {
    const approvableIds = approvableEvidence.map((item) => item.id);

    setSelectedApprovalEvidenceIds((current) =>
      current.length === approvableIds.length ? [] : approvableIds,
    );
  }

  async function approveEvidence(ids?: string[]) {
    const idsToApprove = ids?.filter(Boolean) ?? [];
    const approvingAllPending = idsToApprove.length === 0;
    const confirmationText = approvingAllPending
      ? `${approvableEvidence.length} bekleyen kanıt onaylanıp araç kataloguna işlenecek. Devam edelim mi?`
      : `${idsToApprove.length} seçili kanıt onaylanıp araç kataloguna işlenecek. Devam edelim mi?`;

    if ((approvingAllPending && approvableEvidence.length === 0) || (!approvingAllPending && idsToApprove.length === 0)) {
      setMessage('Onaylanacak kanıt seçilmedi.');
      return;
    }

    if (!window.confirm(confirmationText)) {
      return;
    }

    setIsApprovingEvidence(true);
    setMessage(null);

    try {
      const result = await approveReviewEvidenceBatch({
        evidenceIds: approvingAllPending ? undefined : idsToApprove,
        marketCode: selectedMarket,
        decidedBy,
        publishToCatalog: true,
        resultingVerificationLevel: 'verified',
      });

      setDecisions((current) => [...result.decisions, ...current]);
      setSelectedApprovalEvidenceIds([]);
      await refresh();
      setMessage(`${result.approved} kanıt onaylandı, ${result.skipped} kayıt atlandı.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kanıtlar onaylanamadı.');
    } finally {
      setIsApprovingEvidence(false);
    }
  }

  async function loadBrandAssets() {
    try {
      const freshAssets = await fetchVehicleBrandAssets();
      setBrandAssets(freshAssets);
      setBrandAssetDrafts(createBrandAssetDrafts(freshAssets));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Marka görselleri yüklenemedi.');
    }
  }

  async function refresh() {
    setMessage('Yenileniyor...');
    const [freshSpecs, freshEvidence, freshDecisions, freshBrandAssets] = await Promise.all([
      fetchAdminVehicleSpecs(undefined, selectedMarket),
      fetch('/api/admin-review/evidence').then((response) => response.json()) as Promise<ReviewEvidence[]>,
      fetch('/api/admin-review/decisions').then((response) => response.json()) as Promise<ReviewDecision[]>,
      fetchVehicleBrandAssets(),
    ]);
    setVehicleSpecs(freshSpecs);
    setEvidence(freshEvidence);
    setDecisions(freshDecisions);
    setBrandAssets(freshBrandAssets);
    setBrandAssetDrafts(createBrandAssetDrafts(freshBrandAssets));
    setMessage('Veri yenilendi.');
  }

  useEffect(() => {
    searchOnServer();
  }, [selectedMarket]);

  async function searchOnServer() {
    setMessage('Araç listesi yenileniyor...');
    const freshSpecs = await fetchAdminVehicleSpecs(undefined, selectedMarket);
    setVehicleSpecs(freshSpecs);
    setSelectedSpecId((current) => freshSpecs.find((item) => item.id === current)?.id ?? freshSpecs[0]?.id ?? '');
    setMessage('Kategori araç listesi güncellendi.');
  }

  function updateDraft(key: keyof AdminVehicleSpecUpdate, value: string) {
    setMessage(null);
    setSpecDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearDraftField(key: keyof AdminVehicleSpecUpdate) {
    setMessage(null);
    setSpecDraft((current) => ({
      ...current,
      [key]: '',
    }));
  }

  function chooseBrand(brand: string) {
    setSelectedBrand(brand);
    setQuery('');
    const firstSpec = vehicleSpecs.find((item) => item.brand === brand);

    if (firstSpec) {
      setSelectedSpecId(firstSpec.id);
    }
  }

  function updateBrandAssetDraft(field: keyof BrandAssetDraft, value: string) {
    setMessage(null);
    setBrandAssetDrafts((current) => ({
      ...current,
      [selectedBrand]: {
        imageUrl: current[selectedBrand]?.imageUrl ?? '',
        notes: current[selectedBrand]?.notes ?? '',
        [field]: value,
      },
    }));
  }

  async function saveSelectedBrandAsset() {
    if (!selectedBrand) {
      return;
    }

    setBusyBrand(selectedBrand);
    setMessage(null);

    try {
      const updated = await updateVehicleBrandAsset(selectedBrand, {
        imageUrl: selectedBrandDraft.imageUrl,
        notes: selectedBrandDraft.notes,
      });
      setBrandAssets((current) => {
        const exists = current.some((item) => item.brand === updated.brand);
        return exists
          ? current.map((item) => (item.brand === updated.brand ? updated : item))
          : [...current, updated].sort((a, b) => a.brand.localeCompare(b.brand));
      });
      setBrandAssetDrafts((current) => ({
        ...current,
        [updated.brand]: {
          imageUrl: updated.imageUrl ?? '',
          notes: updated.notes ?? '',
        },
      }));
      setMessage(`${updated.brand} kategori görseli kaydedildi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kategori görseli kaydedilemedi.');
    } finally {
      setBusyBrand(null);
    }
  }

  async function uploadSelectedBrandImage(file: File) {
    if (!selectedBrand) {
      return;
    }

    setBusyBrand(selectedBrand);
    setMessage(null);

    try {
      const uploaded = await uploadVehicleImage(file, `${selectedBrand} kategori`);
      setBrandAssetDrafts((current) => ({
        ...current,
        [selectedBrand]: {
          imageUrl: uploaded.url,
          notes: current[selectedBrand]?.notes ?? '',
        },
      }));
      setMessage(`${selectedBrand} kategori görseli yüklendi. Kalıcı yapmak için Kaydet.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kategori görseli yüklenemedi.');
    } finally {
      setBusyBrand(null);
    }
  }

  async function saveVehicleSpec() {
    if (!selectedSpec) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...buildPayload(specDraft),
        marketCode: selectedMarket,
      };
      const updated = await updateAdminVehicleSpec(selectedSpec.id, payload);
      setVehicleSpecs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage('Araç kaydı güncellendi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Araç kaydı güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadSelectedVehicleImage(file: File) {
    if (!selectedSpec) {
      return;
    }

    setIsUploadingImage(true);
    setMessage(null);

    try {
      const uploaded = await uploadVehicleImage(file, selectedSpec.displayName);
      setSpecDraft((current) => ({
        ...current,
        imageUrl: uploaded.url,
      }));
      setMessage('Fotoğraf yüklendi. Kayda işlemek için Kaydet butonuna bas.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.');
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function saveReviewDecision() {
    if (!selectedEvidence) {
      return;
    }

    setIsSavingDecision(true);
    setMessage(null);

    try {
      const created = await createReviewDecision({
        evidenceId: selectedEvidence.id,
        vehicleSpecId: selectedEvidence.vehicleSpecId,
        decisionType,
        decisionStatus: 'pending',
        decidedBy,
        fieldDecisions: fieldKey.trim() ? { [fieldKey.trim()]: fieldValue.trim() } : {},
        resultingVerificationLevel: resultingVerificationLevel.trim() || undefined,
        rationale,
      });
      setDecisions((current) => [created, ...current]);
      setMessage('Review kararı oluşturuldu.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Review kararı oluşturulamadı.');
    } finally {
      setIsSavingDecision(false);
    }
  }

  return (
    <main className="admin-shell">
      {apiError && (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 20px', fontSize: 13, fontWeight: 600 }}>
          ⚠️ API sunucusuna bağlanılamıyor (port 4311). Lütfen <code>npm run api:start</code> ile API'yi başlatın, ardından sayfayı yenileyin.
        </div>
      )}
      <header className="topbar">
        <div>
          <p className="eyebrow">DMyC Admin</p>
          <h1>{t('admin.catalog.title')}</h1>
        </div>
        <div className="topbar-actions">
          <div className="admin-context" aria-label="Aktif çalışma alanı">
            <strong>{selectedMarket === 'GB' ? 'Birleşik Krallık' : 'Türkiye'}</strong>
            <span>İçerik: {contentLocale === 'en' ? 'English' : 'Türkçe'} · {adminUsername}</span>
          </div>
          <button className="icon-button text-button" type="button" onClick={refresh} title="Veriyi yenile">
            <RotateCw size={18} />
            Yenile
          </button>
          <form action="/api/admin-auth/logout" method="post">
            <button className="icon-button text-button" type="submit" title="Oturumu kapat">Çıkış</button>
          </form>
        </div>
      </header>

      <section className="metric-strip" aria-label="Review metrikleri">
        <Metric icon={<FileSearch size={18} />} label={t('admin.catalog.metric.mobileActive')} value={stats.activeCatalog} />
        <Metric icon={<Archive size={18} />} label={t('admin.catalog.metric.backlog')} value={stats.backgroundBacklog} />
        <Metric icon={<ShieldAlert size={18} />} label={t('admin.catalog.metric.missingImage')} value={stats.missingImages} />
        <Metric icon={<CheckCircle2 size={18} />} label={t('admin.catalog.metric.completeness')} value={stats.selectedCompleteness} />
        <Metric icon={<CheckCircle2 size={18} />} label={t('admin.catalog.metric.applied')} value={stats.applied} />
      </section>

      <nav className="admin-view-tabs" aria-label="Admin görünümü">
        <Link
          className={activeView === 'vehicles' ? 'active' : ''}
          href="/admin/vehicles"
        >
          Katalog
        </Link>
        <Link
          className={activeView === 'review' ? 'active' : ''}
          href="/admin/review"
        >
          Kanıt / Karar
        </Link>
      </nav>

      {activeView === 'vehicles' ? (
      <>
      <section className="spec-shell">
        <aside className="spec-list-pane">
          <div className="pane-header category-header">
            <div>
              <p className="eyebrow">Kategori</p>
              <h2>Marka ve Araçlar</h2>
            </div>
            <span>{brands.length} marka</span>
          </div>

          <div className="category-select-block">
            <div className="locked-market-context">
              <span>Aktif ülke</span>
              <strong>{selectedMarket === 'GB' ? 'Birleşik Krallık (GB)' : 'Türkiye (TR)'}</strong>
              <small>Ülke ve içerik dili giriş sırasında belirlenir.</small>
            </div>
            <label>
              Marka seç
              <select value={selectedBrand} onChange={(event) => chooseBrand(event.target.value)}>
                {brands.map((brand) => {
                  const stats = categoryStats[brand];

                  return (
                    <option key={brand} value={brand}>
                      {brand} ({stats?.vehicleCount ?? 0} araç)
                    </option>
                  );
                })}
              </select>
            </label>
            <p>
              {categoryStats[selectedBrand]?.hasImage ? 'Kategori kapağı var' : 'Kategori kapağı yok'} ·{' '}
              {categoryStats[selectedBrand]?.activeCount ?? 0} mobil aktif ·{' '}
              {categoryStats[selectedBrand]?.backlogCount ?? 0} backlog ·{' '}
              {categoryStats[selectedBrand]?.missingImageCount ?? 0} varyant fotoğrafı eksik
            </p>
          </div>

          <div className="category-asset-editor">
            <div className="category-preview">
              {selectedBrandDraft.imageUrl ? (
                <img src={selectedBrandDraft.imageUrl} alt={`${selectedBrand} kategori görseli`} />
              ) : (
                <span>{selectedBrand ? `${selectedBrand} kapak yok` : 'Kategori yok'}</span>
              )}
            </div>
            <label>
              Kategori görsel URL
              <input
                value={selectedBrandDraft.imageUrl}
                onChange={(event) => updateBrandAssetDraft('imageUrl', event.target.value)}
                placeholder="https:// veya upload"
              />
            </label>
            <label>
              Admin notu
              <input
                value={selectedBrandDraft.notes}
                onChange={(event) => updateBrandAssetDraft('notes', event.target.value)}
                placeholder="Seçim ekranı kapak görseli"
              />
            </label>
            <div className="category-actions">
              <label className="upload-button">
                {busyBrand === selectedBrand ? 'Yükleniyor' : 'Dosya seç'}
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={busyBrand === selectedBrand}
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      uploadSelectedBrandImage(file);
                    }
                    event.target.value = '';
                  }}
                />
              </label>
              <button
                className="primary-button category-save-button"
                disabled={busyBrand === selectedBrand}
                type="button"
                onClick={saveSelectedBrandAsset}
              >
                Kaydet
              </button>
            </div>
            <p className="category-help">
              {selectedBrandAsset.vehicleCount} varyant · {categoryStats[selectedBrand]?.missingImageCount ?? 0} varyant fotoğrafı eksik
            </p>
          </div>

          <div className="quality-filter-block">
            <div className="quality-filter-head">
              <strong>{t('admin.catalog.quality.filterTitle')}</strong>
              <span>{qualityFilterLabel(qualityFilter)}</span>
            </div>
            <div className="quality-filter-grid">
              {qualityFilters.map((filter) => (
                <button
                  className={`quality-filter-button ${qualityFilter === filter.key ? 'active' : ''}`}
                  key={filter.key}
                  type="button"
                  title={filter.description}
                  onClick={() => setQualityFilter(filter.key)}
                >
                  <span>{filter.label}</span>
                  <strong>{qualityFilterCount(filter.key, qualityStats)}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="spec-search">
            <label>
              Bu kategoride ara
              <div className="input-with-button">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Model veya varyant" />
                <button className="icon-button compact-button" type="button" onClick={searchOnServer} title="Sunucuda ara">
                  <Search size={16} />
                </button>
              </div>
            </label>
          </div>

          <div className="pane-header compact category-vehicles-head">
            <h3>{selectedBrand || 'Kategori'} varyantları</h3>
            <span>{filteredSpecs.length} kayıt</span>
          </div>

          <div className="spec-list">
            {filteredSpecs.map((item) => {
              const missingCount = specFields.filter((field) => isFieldEmpty(field, item[field.key])).length;
              const quality = describeQualityState(item);

              return (
                <button
                  className={`spec-list-row ${selectedSpec?.id === item.id ? 'selected' : ''}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSpecId(item.id)}
                >
                  <span>
                      <strong>{item.displayName}</strong>
                      <small>
                      {formatSalesStatus(item.officialSalesStatus)} · {item.verificationLevel ?? 'verification yok'}
                    </small>
                    <small className={`quality-inline ${quality.tone}`}>{quality.label}</small>
                  </span>
                  <span className={missingCount > 0 ? 'missing-count' : 'filled-count'}>
                    {missingCount > 0 ? `${missingCount} boş` : 'tamam'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="spec-editor-pane">
          {selectedSpec ? (
            <>
              <div className="spec-editor-header">
                <div>
                  <p className="eyebrow">Seçili araç</p>
                  <h2>{selectedSpec.displayName}</h2>
                  <p className="muted">
                    Varyant alanlarını gruplar halinde düzenle. Marka kapakları seçim ekranını, varyant fotoğrafı karne ve varyant kartını besler.
                  </p>
                </div>
                <div className="spec-actions">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={showOnlyMissing}
                      onChange={(event) => setShowOnlyMissing(event.target.checked)}
                    />
                    Sadece boşları göster
                  </label>
                  <button className="primary-button save-spec-button" type="button" onClick={saveVehicleSpec} disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? 'Kaydediliyor' : 'Kaydet'}
                  </button>
                  {hasUnsavedSpecChanges ? <span className="unsaved-note">Kaydedilmemiş değişiklik var</span> : null}
                </div>
              </div>

              <div className="spec-summary-grid">
                <InfoBlock label="Doğrulama" value={selectedSpec.verificationLevel ?? 'boş'} />
                <InfoBlock label="Market" value={selectedSpec.marketCode ?? selectedMarket} />
                <InfoBlock label="Market status" value={formatSalesStatus(selectedSpec.localSalesStatus ?? selectedSpec.officialSalesStatus)} />
                <InfoBlock label="Veri Güveni" value={selectedTrust?.label ?? 'boş'} />
                <InfoBlock label="Doluluk" value={selectedTrust?.summary ?? 'boş'} />
                <InfoBlock label="Kaynak" value={selectedSpec.sourceName ?? 'boş'} />
                <InfoBlock label="Son güncelleme" value={formatDate(selectedSpec.updatedAt)} />
              </div>

              <div className="quality-context">
                <div>
                  <strong>{describeQualityState(selectedSpec).label}</strong>
                  <span>{describeQualityState(selectedSpec).description}</span>
                </div>
                <div className="quality-badge-row">
                  {isMissingImage(selectedSpec) ? <span className="quality-badge warn">{t('admin.catalog.quality.badgeMissingImage')}</span> : null}
                  {isNeedsResearch(selectedSpec) ? <span className="quality-badge danger">{t('admin.catalog.quality.badgeNeedsResearch')}</span> : null}
                  {isWeakSource(selectedSpec) ? <span className="quality-badge archive">{t('admin.catalog.quality.badgeWeakSource')}</span> : null}
                  {isActiveCatalogSpec(selectedSpec) ? <span className="quality-badge ok">{t('admin.catalog.quality.badgeMobileActive')}</span> : null}
                </div>
              </div>

              <div className="field-group-tabs" aria-label="Varyant alan grupları">
                {specFieldGroups.map((group) => {
                  const groupFields = specFields.filter((field) => field.group === group.key);
                  const missingCount = selectedSpec
                    ? groupFields.filter((field) => isFieldEmpty(field, selectedSpec[field.key])).length
                    : 0;

                  return (
                    <button
                      className={activeSpecGroup === group.key ? 'active' : ''}
                      key={group.key}
                      type="button"
                      onClick={() => setActiveSpecGroup(group.key)}
                    >
                      <span>{group.label}</span>
                      <small>{missingCount > 0 ? `${missingCount} boş` : 'tamam'}</small>
                    </button>
                  );
                })}
              </div>

              <div className="field-group-context">
                <strong>{specFieldGroups.find((group) => group.key === activeSpecGroup)?.label}</strong>
                <span>
                  {activeGroupSummary
                    ? `${activeGroupSummary.filledCount}/${activeGroupSummary.totalCount} alan dolu`
                    : 'Alan yok'}
                </span>
              </div>

              <div className="spec-field-table" role="table" aria-label="Araç spec alanları">
                <div className="spec-field-head" role="row">
                  <span>JSON field</span>
                  <span>Değer</span>
                  <span>Durum</span>
                  <span>Aksiyon</span>
                </div>

                {visibleFields.map((field) => {
                  const value = specDraft[field.key] ?? '';
                  const empty = isFieldEmpty(field, value);

                  return (
                    <div className={`spec-field-row ${empty ? 'is-empty' : ''}`} role="row" key={field.key}>
                      <div>
                        <strong>{field.jsonKey}</strong>
                        <small>
                          {field.label}
                          {field.requiredForFirstCard ? ' · ilk karne için kritik' : ''}
                        </small>
                      </div>

                      {field.kind === 'image' ? (
                        <VehicleImageInput
                          value={value}
                          uploading={isUploadingImage}
                          onChange={(nextValue) => updateDraft(field.key, nextValue)}
                          onUpload={uploadSelectedVehicleImage}
                        />
                      ) : (
                        <SpecInput field={field} value={value} onChange={(nextValue) => updateDraft(field.key, nextValue)} />
                      )}

                      <span className={`field-status ${empty ? 'empty' : 'filled'}`}>
                        {formatFieldStatus(field, value, empty)}
                      </span>

                      <button
                        className="icon-button compact-button"
                        type="button"
                        onClick={() => clearDraftField(field.key)}
                        title="Alanı boşalt"
                      >
                        <Eraser size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="muted">Araç kaydı bulunamadı.</p>
          )}
        </section>
      </section>
      </>
      ) : (

      <section className="review-backlog">
        <div className="pane-header compact">
          <h2>Kanıt ve Karar Operasyonu</h2>
          <span>Evidence seç, alan kararını yaz, geçmişi izle</span>
        </div>
        <div className="workspace review-workspace">
          <aside className="evidence-pane">
            <div className="pane-header">
              <h3>Evidence</h3>
              <span>{evidence.length} kayıt</span>
            </div>
            <div className="bulk-approval-bar">
              <button
                className="icon-button text-button"
                type="button"
                onClick={toggleAllApprovalSelection}
                disabled={isApprovingEvidence || approvableEvidence.length === 0}
              >
                {selectedApprovalCount === approvableEvidence.length && approvableEvidence.length > 0
                  ? 'Seçimi temizle'
                  : 'Bekleyenleri seç'}
              </button>
              <button
                className="icon-button text-button"
                type="button"
                onClick={() => approveEvidence(selectedApprovalEvidenceIds)}
                disabled={isApprovingEvidence || selectedApprovalCount === 0}
              >
                <CheckCircle2 size={16} />
                Seçiliyi onayla ({selectedApprovalCount})
              </button>
              <button
                className="primary-button compact-button"
                type="button"
                onClick={() => approveEvidence()}
                disabled={isApprovingEvidence || approvableEvidence.length === 0}
              >
                <CheckCircle2 size={16} />
                {isApprovingEvidence ? 'Onaylanıyor' : `Tüm bekleyenleri onayla (${approvableEvidence.length})`}
              </button>
            </div>
            <div className="evidence-list">
              {evidence.map((item) => (
                <button
                  className={`evidence-row ${selectedEvidence?.id === item.id ? 'selected' : ''}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEvidenceId(item.id)}
                >
                  <input
                    aria-label={`${formatEvidenceName(item)} onay seçimi`}
                    checked={selectedApprovalEvidenceIds.includes(item.id)}
                    disabled={!canApproveEvidence(item) || isApprovingEvidence}
                    type="checkbox"
                    onChange={() => toggleApprovalSelection(item.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span>
                    <strong>{formatEvidenceName(item)}</strong>
                    <small>{item.sourceName}</small>
                  </span>
                  <span className={`status-badge ${statusTone(item.evidenceStatus)}`}>{formatEvidenceStatus(item.evidenceStatus)}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="detail-pane">
            {selectedEvidence ? (
              <>
                <div className="detail-header">
                  <div>
                    <p className="eyebrow">Seçili kanıt</p>
                    <h2>{formatEvidenceName(selectedEvidence)}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {selectedEvidence.vehicleSpecId ? (
                      <Link
                        className="icon-button text-button"
                        href={`/admin/vehicles?specId=${encodeURIComponent(selectedEvidence.vehicleSpecId)}`}
                      >
                        Katalogda düzenle
                      </Link>
                    ) : null}
                    <a className="icon-button text-button" href={selectedEvidence.sourceUrl} target="_blank" rel="noreferrer">
                      Kaynağı aç
                    </a>
                  </div>
                </div>

                <div className="detail-grid">
                  <InfoBlock label="Durum" value={formatEvidenceStatus(selectedEvidence.evidenceStatus)} />
                  <InfoBlock label="Kaynak" value={selectedEvidence.sourceName} />
                  <InfoBlock label="Güven" value={selectedEvidence.confidenceScore?.toString() ?? 'boş'} />
                  <InfoBlock label="Bağlı araç" value={selectedEvidence.vehicle ? formatEvidenceVehicle(selectedEvidence) : 'eşleşme yok'} />
                </div>

                <div className="review-work">
                  <div>
                    <h3>Kontrol alanları</h3>
                    {selectedEvidence.conflictFields.length > 0 ? (
                      <ul className="missing-list">
                        {selectedEvidence.conflictFields.map((field) => (
                          <li key={field}>{formatFieldLabel(field)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Bu evidence için açık conflict alanı yok. Kaynak değerleri yine de karar formunda işlenebilir.</p>
                    )}
                  </div>
                  <div>
                    <h3>Kaynak değerleri</h3>
                    <div className="chips">
                      {Object.entries(selectedEvidence.fieldValues).slice(0, 8).map(([key, value]) => (
                        <span className="chip" key={key}>
                          {formatFieldLabel(key)}: {formatFieldDisplayValue(key, value)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3>Not</h3>
                    <p>{selectedEvidence.notes ?? 'Bu kayıt için operasyon notu yok.'}</p>
                  </div>
                </div>

                <div className="decision-layout">
                  <div>
                    <h3>Karar geçmişi</h3>
                    <div className="decision-list">
                      {relatedDecisions.length > 0 ? (
                        relatedDecisions.map((decision) => (
                          <article className="decision-item" key={decision.id}>
                            <div className="decision-head">
                              <strong>{formatDecisionType(decision.decisionType)}</strong>
                              <span>{formatDecisionStatus(decision.decisionStatus)}</span>
                            </div>
                            <p>{decision.rationale ?? 'Gerekçe yok.'}</p>
                          </article>
                        ))
                      ) : (
                        <p className="muted">Bu evidence için henüz karar yok.</p>
                      )}
                    </div>
                  </div>

                  <div className="decision-form">
                    <h3>Yeni karar</h3>
                    <label>
                      Karar tipi
                      <select value={decisionType} onChange={(event) => setDecisionType(event.target.value)}>
                        {decisionTypes.map((item) => (
                          <option key={item} value={item}>
                            {formatDecisionType(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Karar veren
                      <input value={decidedBy} onChange={(event) => setDecidedBy(event.target.value)} />
                    </label>
                    <div className="form-pair">
                      <label>
                        Alan
                        <select value={fieldKey} onChange={(event) => chooseDecisionField(event.target.value)}>
                          {decisionFieldOptions(selectedEvidence).map((field) => (
                            <option key={field} value={field}>
                              {formatFieldLabel(field)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Değer
                        <input value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} />
                      </label>
                    </div>
                    <label>
                      Son doğrulama seviyesi
                      <select value={resultingVerificationLevel} onChange={(event) => setResultingVerificationLevel(event.target.value)}>
                        <option value="">Boş bırak</option>
                        {['official_source', 'verified', 'inferred', 'research_needed'].map((level) => (
                          <option key={level} value={level}>
                            {formatVerificationLevel(level)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Gerekçe
                      <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} />
                    </label>
                    <button className="primary-button" type="button" onClick={saveReviewDecision} disabled={isSavingDecision}>
                      <Plus size={18} />
                      {isSavingDecision ? 'Kaydediliyor' : 'Karar oluştur'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="muted">Evidence kaydı bulunamadı.</p>
            )}
          </section>
        </div>
      </section>
      )}

      {message ? <div className="toast">{message}</div> : null}
    </main>
  );
}

function VehicleImageInput({
  value,
  uploading,
  onChange,
  onUpload,
}: {
  value: string;
  uploading: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="vehicle-image-input">
      {value ? (
        <img className="vehicle-image-preview" src={value} alt="Araç fotoğrafı önizleme" />
      ) : (
        <div className="vehicle-image-placeholder">Fotoğraf yok</div>
      )}
      <div className="vehicle-image-controls">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="https:// veya upload" />
        <label className="upload-button">
          {uploading ? 'Yükleniyor' : 'Dosya seç'}
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUpload(file);
              }
              event.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}

function SpecInput({
  field,
  value,
  onChange,
}: {
  field: SpecField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.key === 'officialSalesStatus' || field.key === 'localSalesStatus') {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Boş</option>
        <option value="active">Üretiliyor</option>
        <option value="discontinued">Üretimi bitti</option>
        <option value="unknown">Bilinmiyor</option>
        <option value="legacy_reference">Arşiv kayıt</option>
        <option value="needs_review">İnceleme gerekli</option>
      </select>
    );
  }

  if (field.kind === 'boolean') {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Boş</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  return (
    <input
      inputMode={field.kind === 'number' ? 'decimal' : 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.key === 'yearTo' ? 'Devam ediyor' : field.kind === 'number' ? 'null' : 'boş'}
    />
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function createDraft(spec: AdminVehicleSpec): SpecDraft {
  return specFields.reduce<SpecDraft>((draft, field) => {
    const value = spec[field.key];
    const defaultValue = defaultDraftValue(field, value);
    draft[field.key] = defaultValue === null || defaultValue === undefined ? '' : String(defaultValue);
    return draft;
  }, {});
}

function createBrandAssetDrafts(assets: VehicleBrandAsset[]) {
  return Object.fromEntries(
    assets.map((asset) => [
      asset.brand,
      {
        imageUrl: asset.imageUrl ?? '',
        notes: asset.notes ?? '',
      },
    ]),
  );
}

function defaultDraftValue(field: SpecField, value: unknown) {
  if (isEmptyValue(value) && field.key === 'recommendedDailySocMin') {
    return 20;
  }

  if (isEmptyValue(value) && field.key === 'recommendedDailySocMax') {
    return 80;
  }

  return value;
}

function buildPayload(draft: SpecDraft): AdminVehicleSpecUpdate {
  return specFields.reduce<AdminVehicleSpecUpdate>((payload, field) => {
    const rawValue = draft[field.key];

    if (rawValue === undefined || rawValue === '') {
      payload[field.key] = null as never;
      return payload;
    }

    if (field.kind === 'boolean') {
      payload[field.key] = (rawValue === 'true') as never;
      return payload;
    }

    if (field.kind === 'number') {
      const parsed = Number(rawValue);
      payload[field.key] = (Number.isFinite(parsed) ? parsed : null) as never;
      return payload;
    }

    payload[field.key] = rawValue as never;
    return payload;
  }, {});
}

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || value === '';
}

function uniqueSpecFields(fields: SpecField[]) {
  const seen = new Set<string>();

  return fields.filter((field) => {
    if (seen.has(field.jsonKey)) {
      return false;
    }

    seen.add(field.jsonKey);
    return true;
  });
}

function isFieldEmpty(field: SpecField, value: unknown) {
  if (field.key === 'yearTo' && isEmptyValue(value)) {
    return false;
  }

  return isEmptyValue(value);
}

function formatFieldStatus(field: SpecField, value: unknown, empty: boolean) {
  if (field.key === 'yearTo' && isEmptyValue(value)) {
    return t('common.continues');
  }

  return empty ? t('common.empty') : t('common.filled');
}

function formatSalesStatus(value: string | null) {
  switch (value) {
    case 'active':
      return t('vehicle.salesStatus.active');
    case 'discontinued':
      return t('vehicle.salesStatus.discontinued');
    case 'legacy_reference':
      return t('vehicle.salesStatus.legacyReference');
    case 'needs_review':
      return t('vehicle.salesStatus.needsReview');
    case 'unknown':
      return t('common.unknown');
    default:
      return value ?? t('common.statusMissing');
  }
}

function isActiveCatalogSpec(spec: AdminVehicleSpec) {
  return !isBackgroundBacklogSpec(spec);
}

function isBackgroundBacklogSpec(spec: AdminVehicleSpec) {
  const salesStatus = spec.localSalesStatus ?? spec.officialSalesStatus;

  return (
    salesStatus === null ||
    salesStatus === 'legacy_reference' ||
    salesStatus === 'needs_review' ||
    salesStatus === 'unknown' ||
    (spec.marketVerificationLevel ?? spec.verificationLevel) === 'research_needed'
  );
}

function isMissingImage(spec: AdminVehicleSpec) {
  return !spec.imageUrl;
}

function isNeedsResearch(spec: AdminVehicleSpec) {
  const salesStatus = spec.localSalesStatus ?? spec.officialSalesStatus;

  return (
    (spec.marketVerificationLevel ?? spec.verificationLevel) === 'research_needed' ||
    salesStatus === null ||
    salesStatus === 'unknown' ||
    salesStatus === 'needs_review'
  );
}

function isWeakSource(spec: AdminVehicleSpec) {
  const sourceName = spec.marketSourceName ?? spec.sourceName;
  const sourceUrl = spec.marketSourceUrl ?? spec.sourceUrl;
  const verificationLevel = spec.marketVerificationLevel ?? spec.verificationLevel;

  return !sourceName || !sourceUrl || !verificationLevel || verificationLevel === 'research_needed';
}

function matchesQualityFilter(spec: AdminVehicleSpec, filter: QualityFilter) {
  switch (filter) {
    case 'active_catalog':
      return isActiveCatalogSpec(spec);
    case 'background_backlog':
      return isBackgroundBacklogSpec(spec);
    case 'missing_images':
      return isMissingImage(spec);
    case 'needs_research':
      return isNeedsResearch(spec);
    case 'weak_source':
      return isWeakSource(spec);
    default:
      return true;
  }
}

function bestQualityFilterForSpec(spec: AdminVehicleSpec): QualityFilter {
  if (isBackgroundBacklogSpec(spec)) {
    return 'background_backlog';
  }

  if (isNeedsResearch(spec)) {
    return 'needs_research';
  }

  if (isMissingImage(spec)) {
    return 'missing_images';
  }

  if (isWeakSource(spec)) {
    return 'weak_source';
  }

  return 'active_catalog';
}

function qualityFilterLabel(filter: QualityFilter) {
  return qualityFilters.find((item) => item.key === filter)?.label ?? 'Filtre';
}

function qualityFilterCount(filter: QualityFilter, stats: {
  activeCatalog: number;
  backgroundBacklog: number;
  missingImages: number;
  needsResearch: number;
  weakSource: number;
}) {
  switch (filter) {
    case 'active_catalog':
      return stats.activeCatalog;
    case 'background_backlog':
      return stats.backgroundBacklog;
    case 'missing_images':
      return stats.missingImages;
    case 'needs_research':
      return stats.needsResearch;
    case 'weak_source':
      return stats.weakSource;
    default:
      return 0;
  }
}

function describeQualityState(spec: AdminVehicleSpec) {
  if (isBackgroundBacklogSpec(spec)) {
    return {
      label: t('admin.catalog.quality.backgroundLabel'),
      description: t('admin.catalog.quality.backgroundDescription'),
      tone: 'archive',
    };
  }

  if (isMissingImage(spec) || isWeakSource(spec)) {
    return {
      label: t('admin.catalog.quality.activeGapLabel'),
      description: t('admin.catalog.quality.activeGapDescription'),
      tone: 'warn',
    };
  }

  return {
    label: t('admin.catalog.quality.readyLabel'),
    description: t('admin.catalog.quality.readyDescription'),
    tone: 'ok',
  };
}

function calculateDataTrust(spec: AdminVehicleSpec) {
  const filledCount = specFields.filter((field) => !isFieldEmpty(field, spec[field.key])).length;
  const totalCount = specFields.length;
  const filledPercent = Math.round((filledCount / totalCount) * 100);
  const sourceClass = classifySource(spec);

  let label = t('vehicle.dataTrust.waitingUserData');

  if (filledPercent >= 50 && sourceClass === 'factory') {
    label = t('vehicle.dataTrust.factory');
  } else if (filledPercent >= 50 && sourceClass === 'community') {
    label = t('vehicle.dataTrust.community');
  } else if (filledPercent >= 50) {
    label = t('vehicle.dataTrust.catalog');
  }

  return {
    label,
    filledCount,
    totalCount,
    filledPercent,
    sourceClass,
    summary: `${filledCount}/${totalCount} alan · %${filledPercent}`,
  };
}

function classifySource(spec: AdminVehicleSpec) {
  const sourceText = [spec.sourceName, spec.sourceUrl, spec.verificationLevel]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr-TR');

  if (
    sourceText.includes('official') ||
    sourceText.includes('catalogue') ||
    sourceText.includes('catalog') ||
    sourceText.includes('resmi') ||
    sourceText.includes('togg.com') ||
    sourceText.includes('tesla.com') ||
    sourceText.includes('bmw.com') ||
    sourceText.includes('mercedes-benz')
  ) {
    return 'factory';
  }

  if (
    sourceText.includes('community') ||
    sourceText.includes('forum') ||
    sourceText.includes('review') ||
    sourceText.includes('yorum') ||
    sourceText.includes('ev-database') ||
    sourceText.includes('epey')
  ) {
    return 'community';
  }

  return 'unknown';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === 'applied') {
    return 'ok';
  }

  if (status === 'applied_partial') {
    return 'warn';
  }

  if (status === 'archived_reference') {
    return 'archive';
  }

  return 'pending';
}

function canApproveEvidence(item: ReviewEvidence) {
  return item.evidenceStatus === 'pending_review' && Boolean(item.vehicleSpecId);
}

function defaultDecisionType(item: ReviewEvidence) {
  if (item.evidenceStatus === 'archived_reference') {
    return 'archive_legacy_spec';
  }

  if (item.conflictFields.length > 0) {
    return 'update_existing_spec';
  }

  return 'mark_needs_more_evidence';
}

function defaultRationale(item: ReviewEvidence) {
  const fields = item.conflictFields.length > 0 ? item.conflictFields.map(formatFieldLabel).join(', ') : 'kaynak değerleri';
  return `${formatEvidenceName(item)} için ${fields} kontrol edildi.`;
}

function formatUnknownValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatFieldDisplayValue(key: string, value: unknown) {
  if (key === 'verification_level' || key === 'market_verification_level') {
    return formatVerificationLevel(String(value ?? ''));
  }

  if (key === 'source_url' || key === 'market_source_url') {
    return value ? 'Kaynak bağlantısı' : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Evet' : 'Hayır';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '';
  }

  return formatUnknownValue(value);
}

function formatEditableFieldValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatUnknownValue(item)).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => `${formatFieldLabel(key)}: ${formatUnknownValue(nestedValue)}`)
      .join(', ');
  }

  return formatUnknownValue(value);
}

function formatDecisionStatus(value: string) {
  return decisionStatusLabels[value] ?? humanizeCode(value);
}

function formatDecisionType(value: string) {
  return decisionTypeLabels[value] ?? humanizeCode(value);
}

function formatEvidenceStatus(value: string) {
  return evidenceStatusLabels[value] ?? humanizeCode(value);
}

function formatFieldLabel(value: string) {
  const specField = specFields.find((field) => field.jsonKey === value || field.key === value);
  return specField?.label ?? fieldLabelOverrides[value] ?? humanizeCode(value);
}

function formatVerificationLevel(value: string) {
  if (!value) {
    return 'Boş bırak';
  }

  return verificationLevelLabels[value] ?? humanizeCode(value);
}

function decisionFieldOptions(item: ReviewEvidence) {
  const fields = [...item.conflictFields, ...Object.keys(item.fieldValues)];
  const unique = Array.from(new Set(fields.filter(Boolean)));
  return unique.length > 0 ? unique : ['verification_level'];
}

function humanizeCode(value: string) {
  if (!value) {
    return '';
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toLocaleUpperCase('tr-TR'));
}

function formatEvidenceVehicle(item: ReviewEvidence) {
  if (!item.vehicle) {
    return 'eşleşme yok';
  }

  return [item.vehicle.brand, item.vehicle.model, item.vehicle.variant].filter(Boolean).join(' ') || 'eşleşme var';
}

function formatEvidenceName(item: ReviewEvidence) {
  return [item.brand, item.model, item.variant].filter(Boolean).join(' ') || item.evidenceKey;
}
