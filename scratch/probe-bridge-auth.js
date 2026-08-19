const http = require('http');

async function testBearer(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const options = {
            hostname: '127.0.0.1',
            port: 17841,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ path, status: res.statusCode, headers: res.headers, body: data });
            });
        });

        req.on('error', (err) => {
            resolve({ path, error: err.message });
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    const endpoints = [
        ['/v1/models', 'GET'],
        ['/v1/responses', 'POST', { model: 'gpt-4o', input: 'Hello' }],
        ['/v1/chat/completions', 'POST', {
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'hello' }]
        }]
    ];

    for (const [p, m, b] of endpoints) {
        const res = await testBearer(p, m, b);
        console.log(`[${m}] ${p} => Status: ${res.status || 'ERR'} | Body: ${res.body?.substring(0, 150) || res.error}`);
    }
}

run();
