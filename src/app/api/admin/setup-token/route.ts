import { NextRequest, NextResponse } from 'next/server';
import { AdminTokenManager } from '@/lib/admin-token-manager';

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token, expires_in } = await request.json();
    
    if (!access_token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    // Save tokens to database
    await AdminTokenManager.saveInitialTokens(
      access_token,
      refresh_token || 'none',
      expires_in || 3600
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Admin tokens saved successfully' 
    });

  } catch (error) {
    console.error('Token setup error:', error);
    return NextResponse.json({ error: 'Failed to setup tokens' }, { status: 500 });
  }
}