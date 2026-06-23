import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'dmyc_admin_session';

export type AdminMarketCode = 'TR' | 'GB';
export type AdminContentLocale = 'tr' | 'en';

export type AdminSession = {
  username: string;
  marketCode: AdminMarketCode;
  contentLocale: AdminContentLocale;
  expiresAt: number;
};

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

loadEnvFile();

export function createAdminSession(input: Omit<AdminSession, 'expiresAt'>) {
  const payload: AdminSession = {
    ...input,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminSession(value: string | undefined | null): AdminSession | null {
  if (!value) {
    return null;
  }

  const [encodedPayload, providedSignature] = value.split('.');
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AdminSession;
    if (session.expiresAt <= Date.now()) {
      return null;
    }
    if (!['TR', 'GB'].includes(session.marketCode) || !['tr', 'en'].includes(session.contentLocale)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function getAdminApiKey() {
  return process.env.DMYC_ADMIN_API_KEY ?? 'dmyc-local-admin-api-key-change-me';
}

export function credentialsAreValid(username: string, password: string) {
  const expectedUsername = process.env.DMYC_ADMIN_USERNAME ?? 'admin';
  const expectedPassword = process.env.DMYC_ADMIN_PASSWORD ?? 'DMyC-admin-2026';
  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
}

function sign(payload: string) {
  const secret = process.env.DMYC_ADMIN_SESSION_SECRET ?? 'dmyc-local-session-secret-change-me';
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function loadEnvFile() {
  const envPath = findEnvPath();

  if (!envPath) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(line.slice(separatorIndex + 1).trim());

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function findEnvPath() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(__dirname, '..', '..', '..', '.env'),
    resolve(__dirname, '..', '..', '..', '..', '.env'),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

function normalizeEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
