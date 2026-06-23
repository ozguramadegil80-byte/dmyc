import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '../../../../src/lib/adminSession';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { expires: new Date(0), path: '/' });
  return response;
}
