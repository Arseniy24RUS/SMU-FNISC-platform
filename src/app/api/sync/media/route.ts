import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { searchGoogleNewsRss } from '@/lib/harvest/media';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.nextUrl.searchParams.get('token');
  if (env.CRON_SECRET && token !== env.CRON_SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName || '');
  if (!fullName) return NextResponse.json({ error: 'fullName is required' }, { status: 400 });
  const contextTerms = Array.isArray(body.contextTerms) ? body.contextTerms.map(String) : ['фнисц', 'ран', 'социолог', 'демограф', 'исследование'];
  const mentions = await searchGoogleNewsRss(fullName, contextTerms);
  return NextResponse.json({ fullName, mentions });
}
