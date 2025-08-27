// One-time setup script for dynamic admin tokens
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=239406178361-0kac8nb8ut8fkmfk9tkohnac22502ep0.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline`;

console.log('🚀 Dynamic Admin Token Setup');
console.log('1. Go to this URL (sign in with vishal@shitfertech.com):');
console.log(authUrl);
console.log('\n2. After redirect, copy the "code" parameter from URL');
console.log('3. Run this command:');
console.log('curl -X POST http://localhost:3000/api/admin/setup-token -H "Content-Type: application/json" -d "{\\"code\\": \\"YOUR_CODE_HERE\\"}"');
console.log('\n✅ After setup, tokens will auto-refresh forever!');