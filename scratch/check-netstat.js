const { execSync } = require('child_process');

try {
  const output = execSync('netstat -ano | findstr LISTENING', { encoding: 'utf8' });
  console.log('--- ALL LISTENING PORTS ON LOCALHOST ---');
  const lines = output.split('\n').filter(l => l.includes('127.0.0.1') || l.includes('0.0.0.0'));
  console.log(lines.slice(0, 20).join('\n'));
} catch (e) {
  console.error('Error running netstat:', e.message);
}
