import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getAdminSession,
} from '../../../../src/lib/adminSession';
import { getAdminProfile, updateAdminProfile } from '../../../../src/lib/adminProfileStore';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Admin oturumu gerekli.' }, { status: 401 });
  }

  return NextResponse.json(await getAdminProfile());
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Admin oturumu gerekli.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    avatarUrl?: string;
    email?: string;
    fullName?: string;
    password?: string;
    passwordConfirmation?: string;
    username?: string;
  };

  try {
    const profile = await updateAdminProfile(body);
    const response = NextResponse.json(profile);
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSession({
        username: profile.username || session.username,
        marketCode: session.marketCode,
        contentLocale: session.contentLocale,
      }),
      {
        httpOnly: true,
        maxAge: 12 * 60 * 60,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin profili güncellenemedi.' },
      { status: 400 },
    );
  }
}
