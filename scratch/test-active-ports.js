const http = require('http');

async function testHttp(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 1000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ port, status: res.statusCode, body: data.slice(0, 200) }));
    });
    req.on('error', (err) => resolve({ port, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ port, timeout: true }); });
  });
}

async function main() {
  const ports = [9222, 19206, 3871, 8080, 8090, 17841];
  for (const p of ports) {
    const res = await testHttp(p, '/json/version');
    console.log(`Port ${p} /json/version:`, res);
    const resRoot = await testHttp(p, '/');
    console.log(`Port ${p} /:`, resRoot);
  }
}

main();
