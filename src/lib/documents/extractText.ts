import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export async function extractTextFromUpload(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (file.type.includes('wordprocessingml') || file.name.toLowerCase().endsWith('.docx')) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }
  throw new Error('Поддерживаются только PDF и DOCX.');
}
