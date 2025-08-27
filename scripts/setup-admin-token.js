const { google } = require('googleapis');
const readline = require('readline');

// Add these to your .env file
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // For installed apps

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

async function getAdminToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('1. Go to this URL and authorize the admin account (vishal@shitfertech.com):');
  console.log(authUrl);
  console.log('\n2. Copy the authorization code and paste it here:');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code: ', async (code) => {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('\n✅ Success! Add this to your .env file:');
      console.log(`ADMIN_GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
      
      if (tokens.refresh_token) {
        console.log(`ADMIN_GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      }
      
    } catch (error) {
      console.error('Error getting tokens:', error);
    }
    rl.close();
  });
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file');
  process.exit(1);
}

getAdminToken();