
import { readFileSync } from 'fs';
const sa = JSON.parse(readFileSync('c:\\AI APP\\app-diemdanh\\service-account.json', 'utf8'));
const key = sa.private_key;
const buffer = Buffer.from(key.substring(0, 50), 'utf8');
console.log('Hex representation of first 50 chars:');
console.log(buffer.toString('hex').match(/.{1,2}/g)?.join(' '));
console.log('Raw substring:', JSON.stringify(key.substring(0, 50)));
