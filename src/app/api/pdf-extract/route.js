import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('PDF Parse Error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF.' }, { status: 500 });
  }
}
