import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '../../../../src/lib/adminSession';

export async function POST(request: Request) {
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  const response = wantsJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL('/admin/login', request.url), 303);

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
