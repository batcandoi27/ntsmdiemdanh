const http = require('http');

const req = http.request('http://127.0.0.1:17841', { method: 'GET', timeout: 5000 }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        console.log(`BODY: ${data}`);
    });
});

req.on('error', (err) => {
    console.error(`ERROR: ${err.message}`);
});

req.end();
