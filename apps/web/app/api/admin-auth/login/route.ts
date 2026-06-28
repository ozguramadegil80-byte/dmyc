import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  credentialsAreValid,
  type AdminContentLocale,
  type AdminMarketCode,
} from '../../../../src/lib/adminSession';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    marketCode?: string;
    contentLocale?: string;
  };
  const username = body.username?.trim() ?? '';
  const password = body.password ?? '';
  const marketCode = normalizeMarket(body.marketCode);
  const contentLocale = normalizeContentLocale(body.contentLocale, marketCode);

  if (!(await credentialsAreValid(username, password))) {
    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, marketCode, contentLocale });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSession({ username, marketCode, contentLocale }),
    {
      httpOnly: true,
      maxAge: 12 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  );
  return response;
}

function normalizeMarket(value: string | undefined): AdminMarketCode {
  return value === 'GB' ? 'GB' : 'TR';
}

function normalizeContentLocale(value: string | undefined, marketCode: AdminMarketCode): AdminContentLocale {
  if (value === 'tr' || value === 'en') {
    return value;
  }
  return marketCode === 'GB' ? 'en' : 'tr';
}
