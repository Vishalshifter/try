const axios = require('axios');

async function testBot() {
  const meetingId = '123456789';
  
  console.log('🧪 Testing bot with meeting ID:', meetingId);
  
  // Simulate webhook call
  try {
    const response = await axios.post('http://localhost:3000/api/zoom/webhook', {
      event: 'meeting.started',
      payload: {
        object: {
          id: meetingId,
          topic: 'Test Meeting - Bot Demo'
        }
      }
    }, {
      headers: {
        'Authorization': process.env.ZOOM_VERIFICATION_TOKEN || 'test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Webhook triggered successfully');
    console.log('🤖 Bot should now be joining the meeting...');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBot();