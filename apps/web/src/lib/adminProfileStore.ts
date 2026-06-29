export type PublicAdminProfile = {
  avatarUrl: string;
  email: string;
  fullName: string;
  updatedAt: string;
  username: string;
};

type RawAdminProfile = {
  avatarUrl?: string | null;
  email?: string | null;
  fullName?: string | null;
  updatedAt?: string | null;
  username?: string | null;
};

type VerifyAdminProfileResponse = {
  ok: boolean;
  source: 'database' | 'environment';
};

export async function getAdminProfile(): Promise<PublicAdminProfile> {
  return normalizeAdminProfile(await adminApiFetch<RawAdminProfile>('/admin/profile'));
}

export async function updateAdminProfile(input: {
  avatarUrl?: string;
  email?: string;
  fullName?: string;
  password?: string;
  passwordConfirmation?: string;
  username?: string;
}) {
  return normalizeAdminProfile(await adminApiFetch<RawAdminProfile>('/admin/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }));
}

export async function verifyStoredAdminCredentials(username: string, password: string) {
  const result = await adminApiFetch<VerifyAdminProfileResponse>('/admin/profile/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  return result.ok;
}

function normalizeAdminProfile(profile: RawAdminProfile): PublicAdminProfile {
  return {
    avatarUrl: profile.avatarUrl ?? '',
    email: profile.email ?? '',
    fullName: profile.fullName?.trim() ? profile.fullName : 'Panel Yöneticisi',
    updatedAt: profile.updatedAt ?? new Date(0).toISOString(),
    username: profile.username?.trim() ? profile.username : 'admin',
  };
}

async function adminApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('x-dmyc-admin-key', process.env.DMYC_ADMIN_API_KEY ?? 'dmyc-local-admin-api-key-change-me');

  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Admin API ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

function getAdminApiBaseUrl() {
  return (
    process.env.DMYC_API_URL ??
    process.env.DMYC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_DMYC_API_URL ??
    process.env.NEXT_PUBLIC_DMYC_API_BASE_URL ??
    'http://localhost:4311'
  ).replace(/\/$/, '');
}
