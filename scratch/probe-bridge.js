const http = require('http');

async function testEndpoint(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const options = {
            hostname: '127.0.0.1',
            port: 17841,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
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
        ['/health', 'GET'],
        ['/status', 'GET'],
        ['/api/status', 'GET'],
        ['/v1/models', 'GET'],
        ['/v1/chat/completions', 'POST', {
            model: 'chatgpt-web',
            messages: [{ role: 'user', content: 'ping' }]
        }],
        ['/api/review', 'POST', { taskId: 'TASK-GVCN-001' }]
    ];

    for (const [p, m, b] of endpoints) {
        const res = await testEndpoint(p, m, b);
        console.log(`[${m}] ${p} => Status: ${res.status || 'ERR'} | Body: ${res.body?.substring(0, 100) || res.error}`);
    }
}

run();
