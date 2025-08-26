import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { meetingNumber, role } = await request.json();
    
    if (!process.env.ZOOM_SDK_KEY || !process.env.ZOOM_SDK_SECRET) {
      return NextResponse.json(
        { error: 'Zoom SDK credentials not configured' },
        { status: 500 }
      );
    }

    const payload = {
      iss: process.env.ZOOM_SDK_KEY,
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      alg: 'HS256',
      aud: 'zoom',
      appKey: process.env.ZOOM_SDK_KEY,
      tokenExp: Math.floor(Date.now() / 1000) + (60 * 60),
      meetingNumber: meetingNumber.toString(),
      role: role || 0
    };

    const signature = jwt.sign(payload, process.env.ZOOM_SDK_SECRET);

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error generating Zoom signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
}