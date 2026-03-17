
import { readFileSync, existsSync } from 'fs';
const path = 'c:\\AI APP\\app-diemdanh\\service-account.json';
console.log('Checking existence:', existsSync(path));
try {
    const content = readFileSync(path, 'utf8');
    console.log('Content length:', content.length);
    const json = JSON.parse(content);
    console.log('Project ID from JSON:', json.project_id);
} catch (e) {
    console.error('Error reading/parsing:', e.message);
}
