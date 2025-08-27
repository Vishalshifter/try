import { adminDb } from './firebase-admin';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class AdminTokenManager {
  private static readonly ADMIN_EMAIL = 'vishal@shitfertech.com';
  private static readonly TOKEN_DOC = 'admin_google_token';

  static async getValidToken(): Promise<string> {
    const tokenDoc = await adminDb.collection('system').doc(this.TOKEN_DOC).get();
    
    if (!tokenDoc.exists) {
      throw new Error('Admin token not configured. Run setup first.');
    }

    const tokenData = tokenDoc.data() as TokenData;
    const now = Date.now();

    // If token expires in next 5 minutes, try to refresh it
    if (tokenData.expires_at < now + 5 * 60 * 1000) {
      if (tokenData.refresh_token && tokenData.refresh_token !== 'none') {
        try {
          const newToken = await this.refreshToken(tokenData.refresh_token);
          return newToken;
        } catch (error) {
          console.log('Token refresh failed, using current token');
        }
      }
    }

    return tokenData.access_token;
  }

  static async refreshToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${data.error}`);
    }

    // Save new token to database
    await adminDb.collection('system').doc(this.TOKEN_DOC).update({
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    });

    return data.access_token;
  }

  static async saveInitialTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    await adminDb.collection('system').doc(this.TOKEN_DOC).set({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (expiresIn * 1000),
      admin_email: this.ADMIN_EMAIL,
      created_at: new Date()
    });
  }
}