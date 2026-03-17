
import { readFileSync } from 'fs';
const sa = JSON.parse(readFileSync('c:\\AI APP\\app-diemdanh\\service-account.json', 'utf8'));
const key = sa.private_key;
console.log('Key start:', key.substring(0, 30));
console.log('Key end:', key.substring(key.length - 30));
console.log('Contains \\n literal:', key.includes('\\n'));
console.log('Contains actual newline:', key.includes('\n'));
