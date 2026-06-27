import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getAdminSession } from '../../../../src/lib/adminSession';

export const runtime = 'nodejs';

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Admin oturumu gerekli.' }, { status: 401 });
  }
  const formData = await request.formData();
  const file = formData.get('file');
  const vehicleName = String(formData.get('vehicleName') ?? 'vehicle');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file alanı zorunlu' }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);

  if (!extension) {
    return NextResponse.json({ error: 'Sadece jpg, png, webp veya gif yüklenebilir' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'vehicles');
  const safeName = vehicleName
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'vehicle';
  const fileName = `${safeName}-${randomUUID()}.${extension}`;

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, fileName), bytes);

  const publicPath = `/uploads/vehicles/${fileName}`;
  const baseUrl = process.env.DMYC_WEB_URL ?? new URL(request.url).origin;
  const absoluteUrl = `${baseUrl}${publicPath}`;

  return NextResponse.json({ url: absoluteUrl });
}
