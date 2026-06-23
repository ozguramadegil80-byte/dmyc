const API_BASE_URL = process.env.NEXT_PUBLIC_DMYC_API_URL ?? 'http://localhost:4311';

export type EvidenceStatus = 'applied' | 'applied_partial' | 'archived_reference' | 'pending_review';

export type ReviewEvidence = {
  id: string;
  vehicleSpecId: string | null;
  evidenceKey: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  sourceRetrievedAt: string;
  brand: string | null;
  model: string | null;
  variant: string | null;
  fieldValues: Record<string, unknown>;
  conflictFields: string[];
  evidenceStatus: EvidenceStatus | string;
  confidenceScore: number | null;
  notes: string | null;
  vehicle: {
    brand: string | null;
    model: string | null;
    variant: string | null;
    officialSalesStatus: string | null;
    verificationLevel: string | null;
  } | null;
};

export type ReviewDecision = {
  id: string;
  vehicleSpecId: string | null;
  evidenceId: string | null;
  decisionType: string;
  decisionStatus: string;
  decidedBy: string | null;
  decidedAt: string | null;
  fieldDecisions: Record<string, unknown>;
  resultingVerificationLevel: string | null;
  rationale: string | null;
  evidenceKey: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  brand: string | null;
  model: string | null;
  variant: string | null;
};

export type AdminVehicleSpec = {
  id: string;
  displayName: string;
  brand: string;
  model: string;
  variant: string;
  modelFamily: string | null;
  variantDisplayName: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  officialSalesStatus: string | null;
  batteryGrossKwh: number | null;
  batteryNetKwh: number | null;
  wltpRangeKm: number | null;
  acMaxKw: number | null;
  dcMaxKw: number | null;
  driveType: string | null;
  vehicleClass: string | null;
  curbWeightKg: number | null;
  officialEfficiencyWhKm: number | null;
  recommendedDailySocMin: number | null;
  recommendedDailySocMax: number | null;
  heatPumpAvailable: boolean | null;
  heatPumpStandard: boolean | null;
  batteryChemistry: string | null;
  chargingPortType: string | null;
  towingCapacityKg: number | null;
  seats: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  brandImageUrl: string | null;
  verificationLevel: string | null;
  marketCode: string;
  localDisplayName: string | null;
  localSalesStatus: string | null;
  marketSourceName: string | null;
  marketSourceUrl: string | null;
  marketVerificationLevel: string | null;
  updatedAt: string;
};

export type AdminVehicleSpecUpdate = Partial<Omit<AdminVehicleSpec, 'id' | 'displayName' | 'updatedAt'>>;

export type VehicleBrandAsset = {
  brand: string;
  imageUrl: string | null;
  notes: string | null;
  vehicleCount: number;
  updatedAt: string | null;
};

export type AdminUser = {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  createdAt: string;
  vehicleCount: number;
  vehicles: Array<{ id: string; displayName: string; ownershipStatus: string }>;
  lastTripAt: string | null;
};

export type AdminUserPayload = {
  username?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  password?: string;
  passwordConfirmation?: string;
};

export async function fetchAdminUsers() {
  return fetchJson<AdminUser[]>('/admin/users');
}

export async function createAdminUser(payload: AdminUserPayload) {
  return fetchJson<AdminUser>('/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(id: string, payload: AdminUserPayload) {
  return fetchJson<AdminUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(id: string) {
  return fetchJson<{ deleted: number; id: string }>(`/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchReviewEvidence() {
  return fetchJson<ReviewEvidence[]>('/admin/vehicle-review/evidence');
}

export async function fetchReviewDecisions() {
  return fetchJson<ReviewDecision[]>('/admin/vehicle-review/decisions');
}

export async function fetchAdminVehicleSpecs(q?: string, market = 'TR') {
  const params = new URLSearchParams();
  params.set('market', market);

  if (q?.trim()) {
    params.set('q', q.trim());
  }

  const query = `?${params.toString()}`;
  return fetchJson<AdminVehicleSpec[]>(`/admin/vehicle-review/specs${query}`);
}

export async function fetchVehicleBrandAssets() {
  return fetchJson<VehicleBrandAsset[]>('/admin/vehicle-brand-assets');
}

export async function updateVehicleBrandAsset(
  brand: string,
  payload: { imageUrl?: string | null; notes?: string | null },
) {
  return fetchJson<VehicleBrandAsset>(`/admin/vehicle-brand-assets/${encodeURIComponent(brand)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminVehicleSpec(id: string, payload: AdminVehicleSpecUpdate) {
  return fetchJson<AdminVehicleSpec>(`/admin/vehicle-review/specs/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function uploadVehicleImage(file: File, vehicleName: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('vehicleName', vehicleName);

  const response = await fetch('/api/admin-review/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<{ url: string }>;
}

export async function createReviewDecision(payload: {
  evidenceId: string;
  vehicleSpecId?: string | null;
  decisionType: string;
  decisionStatus: string;
  decidedBy: string;
  fieldDecisions: Record<string, string>;
  resultingVerificationLevel?: string;
  rationale: string;
}) {
  return fetchJson<ReviewDecision>('/admin/vehicle-review/decisions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function updateReviewEvidence(
  id: string,
  payload: {
    evidenceStatus?: string;
    notes?: string;
    confidenceScore?: number | null;
  },
) {
  return fetchJson<ReviewEvidence>(`/admin/vehicle-review/evidence/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteReviewEvidence(id: string) {
  return fetchJson<{ deleted: number; id: string }>(`/admin/vehicle-review/evidence/${id}`, {
    method: 'DELETE',
  });
}

export async function updateReviewDecision(
  id: string,
  payload: {
    decisionType?: string;
    decisionStatus?: string;
    decidedBy?: string;
    fieldDecisions?: Record<string, string>;
    resultingVerificationLevel?: string | null;
    rationale?: string | null;
  },
) {
  return fetchJson<ReviewDecision>(`/admin/vehicle-review/decisions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteReviewDecision(id: string) {
  return fetchJson<{ deleted: number; id: string }>(`/admin/vehicle-review/decisions/${id}`, {
    method: 'DELETE',
  });
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const isBrowser = typeof window !== 'undefined';
  const url = isBrowser ? `/api/admin-review/proxy${path}` : `${API_BASE_URL}${path}`;
  const headers = new Headers(init?.headers);

  if (!isBrowser) {
    headers.set('x-dmyc-admin-key', process.env.DMYC_ADMIN_API_KEY ?? 'dmyc-local-admin-api-key-change-me');
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}
