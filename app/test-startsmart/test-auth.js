// Simple test script to verify authentication configuration
const http = require('http');
const url = require('url');

// Test if we can reach the authentication endpoint
const testUrl = 'https://startsmart.nextax.ai/api/login';

console.log('Testing authentication endpoint:', testUrl);

const options = {
  hostname: 'startsmart.nextax.ai',
  port: 443,
  path: '/api/login',
  method: 'GET',
  headers: {
    'User-Agent': 'Test-Client/1.0'
  }
};

const https = require('https');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();