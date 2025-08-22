import { NextResponse } from 'next/server';
import { notesStore } from '../fireflies-webhook/route';

export async function GET() {
  return NextResponse.json({ notes: notesStore });
}
