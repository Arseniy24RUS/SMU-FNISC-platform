import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromUpload } from '@/lib/documents/extractText';
import { generatePressReleaseDraft } from '@/lib/llm';
import { isAllowedImage, persistUpload } from '@/lib/upload';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const program = form.get('program');
    if (!(program instanceof File)) return NextResponse.json({ error: 'Не приложен PDF/DOCX файл программы.' }, { status: 400 });
    const programText = await extractTextFromUpload(program);
    const photos = form.getAll('photos').filter((x): x is File => x instanceof File && x.size > 0);
    const savedPhotos = [];
    for (const photo of photos) {
      if (!isAllowedImage(photo)) continue;
      savedPhotos.push(await persistUpload(photo, 'press-release-photos'));
    }
    const draft = await generatePressReleaseDraft({
      eventTitle: String(form.get('eventTitle') || ''),
      eventMeta: String(form.get('eventMeta') || ''),
      editorialNote: String(form.get('editorialNote') || ''),
      photoFileNames: savedPhotos.map((p) => p.fileName),
      programText
    });
    return NextResponse.json({ draft, photos: savedPhotos, source: { fileName: program.name, chars: programText.length } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
