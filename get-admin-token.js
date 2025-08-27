// Simple script to get admin Google access token
// Run this once to get the token for vishal@shitfertech.com

const CLIENT_ID = '239406178361-0kac8nb8ut8fkmfk9tkohnac22502ep0.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline`;

console.log('1. Sign in with vishal@shitfertech.com at this URL:');
console.log(authUrl);
console.log('\n2. Copy the authorization code and run:');
console.log('curl -X POST https://oauth2.googleapis.com/token \\');
console.log(`  -d "client_id=${CLIENT_ID}" \\`);
console.log(`  -d "client_secret=${CLIENT_SECRET}" \\`);
console.log(`  -d "redirect_uri=${REDIRECT_URI}" \\`);
console.log('  -d "grant_type=authorization_code" \\');
console.log('  -d "code=YOUR_CODE_HERE"');
console.log('\n3. Copy the access_token from response to .env.local as ADMIN_GOOGLE_ACCESS_TOKEN');