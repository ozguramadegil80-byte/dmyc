import { NextResponse } from 'next/server';
import { getAdminApiKey, getAdminSession } from '../../../../../src/lib/adminSession';

const API_BASE_URL = process.env.DMYC_API_URL ?? process.env.NEXT_PUBLIC_DMYC_API_URL ?? 'http://localhost:4311';

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Admin oturumu gerekli.' }, { status: 401 });
  }

  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const target = new URL(`/${path.join('/')}${incomingUrl.search}`, API_BASE_URL);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-dmyc-admin-key', getAdminApiKey());

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
