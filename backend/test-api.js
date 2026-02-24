const http = require('http');
const fs = require('fs');
const path = require('path');

// Test the health endpoint
function testHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Health Check Status:', res.statusCode);
        console.log('Response:', data);
        resolve(res.statusCode === 200);
      });
    });
    req.on('error', reject);
  });
}

// Test the process-mask endpoint
function testProcessMask() {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart form data
    const imagePath = path.join(__dirname, 'uploads', 'image-1771517038955-904621523.png');
    let body = '';
    
    // Add image field
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="image"; filename="test.png"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;
    
    const imageBuffer = fs.readFileSync(imagePath);
    const endBoundary = `\r\n--${boundary}--\r\n`;
    
    // Add other fields
    const fields = [
      { name: 'landmarks', value: JSON.stringify([{x: 0.5, y: 0.5}]) },
      { name: 'prompt', value: 'camo' },
      { name: 'maskType', value: 'full-face' }
    ];
    
    let fieldsBody = '';
    fields.forEach(field => {
      fieldsBody += `--${boundary}\r\n`;
      fieldsBody += `Content-Disposition: form-data; name="${field.name}"\r\n\r\n`;
      fieldsBody += `${field.value}\r\n`;
    });
    
    const finalBody = Buffer.concat([
      Buffer.from(body),
      imageBuffer,
      Buffer.from('\r\n' + fieldsBody),
      Buffer.from(endBoundary)
    ]);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/process-mask',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': finalBody.length
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\nProcess Mask Status:', res.statusCode);
        console.log('Response:', data);
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });
    
    req.write(finalBody);
    req.end();
  });
}

async function runTests() {
  console.log('Testing API endpoints...\n');
  
  try {
    await testHealth();
    console.log('\n✅ Health check passed\n');
    
    console.log('Testing /api/process-mask (this may take a while due to AI processing)...');
    await testProcessMask();
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();
