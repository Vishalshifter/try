import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error || !code) {
      console.log('OAuth error or no code:', error);
      return NextResponse.redirect('http://localhost:3000/?error=auth_failed');
    }

    console.log('Exchanging code for token...');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/api/auth/google/callback',
      }),
    });

    const tokens = await response.json();
    console.log('Token response:', tokens);

    // If this is admin setup, save tokens to Firebase
    if (state === 'admin_setup' && tokens.access_token) {
      try {
        const setupResponse = await fetch('http://localhost:3000/api/admin/setup-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || 'none',
            expires_in: tokens.expires_in
          })
        });
        
        if (setupResponse.ok) {
          return NextResponse.redirect('http://localhost:3000/?admin_setup=success');
        }
      } catch (error) {
        console.error('Admin setup failed:', error);
      }
    }

    if (tokens.access_token) {
      return NextResponse.redirect(`http://localhost:3000/?token=${tokens.access_token}`);
    } else {
      console.log('No access token received');
      return NextResponse.redirect('http://localhost:3000/?error=no_token');
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect('http://localhost:3000/?error=server_error');
  }
}