import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import crypto from 'node:crypto';
import { env } from './env';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function persistUpload(file: File, subdir: string): Promise<{ fileName: string; path: string; publicUrl: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const rawName = file.name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '_');
  const extension = extname(rawName) || guessExtension(file.type);
  const fileName = `${Date.now()}_${hash}${extension}`;
  const dir = join(env.UPLOAD_DIR, subdir);
  await mkdir(dir, { recursive: true });
  const path = join(dir, fileName);
  await writeFile(path, bytes);
  return { fileName, path, publicUrl: `/uploads/${subdir}/${fileName}` };
}

export function isAllowedImage(file: File): boolean {
  return allowedImageTypes.has(file.type);
}

function guessExtension(type: string): string {
  if (type === 'application/pdf') return '.pdf';
  if (type.includes('wordprocessingml')) return '.docx';
  if (type === 'image/jpeg') return '.jpg';
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  return '.bin';
}
