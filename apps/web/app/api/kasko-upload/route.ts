import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

// Fotoğraf başına max 10 MB
const MAX_SIZE = 10 * 1024 * 1024;

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'kasko-reports');
const PUBLIC_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://192.168.1.21:4310';

export async function POST(req: NextRequest) {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const form = await req.formData();
    const urls: string[] = [];

    for (const label of ['front', 'rear', 'left', 'right']) {
      const file = form.get(label);
      if (!file || typeof file === 'string') continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.byteLength > MAX_SIZE) {
        return NextResponse.json({ error: `${label} dosyası 10 MB sınırını aşıyor` }, { status: 413 });
      }

      // EXIF/GPS metadata sharp re-encode ile siliniyor
      const stripped = await sharp(buffer)
        .rotate()             // EXIF orientation uygula, sonra metadata at
        .jpeg({ quality: 82 })
        .toBuffer();

      const filename = `${randomUUID()}-${label}.jpg`;
      await writeFile(join(UPLOAD_DIR, filename), stripped);
      urls.push(`${PUBLIC_BASE}/uploads/kasko-reports/${filename}`);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('[kasko-upload]', err);
    return NextResponse.json({ error: 'Upload başarısız' }, { status: 500 });
  }
}
