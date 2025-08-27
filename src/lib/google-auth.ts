export const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: 'http://localhost:3000/api/auth/google/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const getStoredAccessToken = () => {
  return localStorage.getItem('google_access_token');
};

export const storeAccessToken = (token: string) => {
  localStorage.setItem('google_access_token', token);
};