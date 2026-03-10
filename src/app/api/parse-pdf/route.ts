import { NextRequest, NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const doc = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(doc, { mergePages: true });

    console.log('[parse-pdf] pages:', doc.numPages, '| text length:', text?.length, '| first 200 chars:', JSON.stringify(text?.slice(0, 200)));

    return NextResponse.json({ text });
  } catch (e) {
    console.error('[parse-pdf]', e);
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
  }
}
