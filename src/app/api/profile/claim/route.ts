import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractScientometricIdentifiers } from '@/lib/harvest/fniscProfile';

const schema = z.object({
  fullName: z.string().min(3),
  elibraryAuthorId: z.string().regex(/^\d{4,}$/).optional(),
  fniscProfileTextOrHtml: z.string().optional()
});

export async function POST(req: NextRequest) {
  const input = schema.parse(await req.json());
  const extracted = input.fniscProfileTextOrHtml ? extractScientometricIdentifiers(input.fniscProfileTextOrHtml) : {};
  return NextResponse.json({
    status: 'needs_admin_review',
    message: 'Заявка на привязку профиля сформирована. В production нужно отправить код подтверждения на allowlisted e-mail или передать администратору.',
    candidate: { ...input, extracted }
  });
}
