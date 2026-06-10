import { NextRequest, NextResponse } from 'next/server';
import { evaluateCareer, type CareerInput } from '@/lib/career/evaluate';
import { loadCareerRules } from '@/lib/career/rules';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as CareerInput;
    const rules = await loadCareerRules();
    return NextResponse.json(evaluateCareer(input, rules));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
