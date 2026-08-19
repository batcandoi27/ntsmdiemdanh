const net = require('net');

async function scanPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function run() {
  const commonPorts = [17841, 17840, 17842, 17843, 8888, 3000, 3015, 8080, 8000, 9000, 11434, 5000];
  console.log('Scanning common ports on 127.0.0.1...');
  for (const p of commonPorts) {
    const open = await scanPort(p);
    if (open) console.log(`👉 Port ${p} is OPEN / LISTENING`);
  }
}

run();
