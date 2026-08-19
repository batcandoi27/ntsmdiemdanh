const http = require('http');

async function testRoute(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: 3871,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 1500
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ path, status: res.statusCode, body: data }));
    });
    req.on('error', (err) => resolve({ path, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ path, timeout: true }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('Testing Launcher Control Server routes on port 3871...');
  const routes = ['/api/status', '/status', '/api/state', '/api/runtime/start', '/v1/models', '/v1/responses', '/healthz'];
  for (const r of routes) {
    const res = await testRoute(r);
    console.log(`[GET] ${r} => Status: ${res.status} | Body: ${res.body?.slice(0, 150)}`);
  }
}

main();
