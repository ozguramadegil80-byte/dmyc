import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getAdminSession,
} from '../../../../src/lib/adminSession';
import {
  getAdminProfile,
  updateAdminProfile,
  verifyStoredAdminCredentials,
} from '../../../../src/lib/adminProfileStore';

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
    const passwordWasChanged = Boolean(body.password || body.passwordConfirmation);

    if (passwordWasChanged) {
      const nextUsername = profile.username || body.username || session.username;
      const nextPasswordWorks = body.password
        ? await verifyStoredAdminCredentials(nextUsername, body.password)
        : false;

      if (!nextPasswordWorks) {
        return NextResponse.json(
          { error: 'Admin şifresi kaydedildi ama yeni şifre doğrulanamadı. Lütfen tekrar deneyin.' },
          { status: 500 },
        );
      }
    }

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
        secure: isSecureRequest(request),
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

function isSecureRequest(request: Request) {
  return new URL(request.url).protocol === 'https:';
}
