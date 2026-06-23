import { NextResponse } from 'next/server';
import { fetchReviewEvidence } from '../../../../src/lib/adminReviewApi';
import { getAdminSession } from '../../../../src/lib/adminSession';

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Admin oturumu gerekli.' }, { status: 401 });
  }
  return NextResponse.json(await fetchReviewEvidence());
}
