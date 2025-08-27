// Use the existing redirect URI from your Google OAuth setup
const CLIENT_ID = '239406178361-0kac8nb8ut8fkmfk9tkohnac22502ep0.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline`;

console.log('1. Sign in with vishal@shitfertech.com at this URL:');
console.log(authUrl);
console.log('\n2. After redirect, copy the "code" parameter from the URL');
console.log('3. Give me that code and I\'ll help you get the token');