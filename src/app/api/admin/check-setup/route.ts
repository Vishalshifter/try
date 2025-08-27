import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const tokenDoc = await adminDb.collection('system').doc('admin_google_token').get();
    return NextResponse.json({ isSetup: tokenDoc.exists });
  } catch (error) {
    return NextResponse.json({ isSetup: false });
  }
}