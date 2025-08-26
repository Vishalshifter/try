const axios = require('axios');
require('dotenv').config();

async function setupZoomWebhooks() {
  try {
    console.log('🔧 Setting up Zoom webhooks...');
    
    // Get access token
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Got Zoom access token');
    
    // Create webhook subscription
    const webhookData = {
      url: 'https://your-domain.ngrok.io/api/zoom/webhook', // Replace with your ngrok URL
      auth_user: '',
      auth_password: '',
      events: [
        'meeting.started',
        'meeting.ended', 
        'recording.completed'
      ]
    };
    
    const webhookResponse = await axios.post(
      'https://api.zoom.us/v2/webhooks',
      webhookData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Webhook created:', webhookResponse.data.webhook_id);
    console.log('📋 Webhook URL:', webhookData.url);
    console.log('🎯 Events subscribed:', webhookData.events.join(', '));
    
  } catch (error) {
    console.error('❌ Failed to setup webhooks:', error.response?.data || error.message);
  }
}

setupZoomWebhooks();