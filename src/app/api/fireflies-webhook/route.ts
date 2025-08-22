import { NextRequest, NextResponse } from 'next/server';

// In-memory store for notes (replace with DB in production)
export const notesStore: Array<{
  id: string;
  transcript: string;
  notes: string;
  createdAt: string;
}> = [];

// Replace with your OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript = body.transcript;
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript missing' }, { status: 400 });
    }

    // Call OpenAI to generate notes
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Replace with 'gpt-5' when available
        messages: [
          { role: 'system', content: 'You are an assistant that summarizes meeting transcripts into structured notes (summary, action items, decisions).' },
          { role: 'user', content: transcript },
        ],
        max_tokens: 512,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return NextResponse.json({ error: 'OpenAI error', details: err }, { status: 500 });
    }
    const openaiData = await openaiRes.json();
    const notes = openaiData.choices?.[0]?.message?.content || 'No notes generated.';

    // Store in memory
    const note = {
      id: Date.now().toString(),
      transcript,
      notes,
      createdAt: new Date().toISOString(),
    };
    notesStore.unshift(note);

    return NextResponse.json({ success: true, note });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
