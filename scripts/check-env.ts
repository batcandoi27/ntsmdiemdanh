
import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('--- Firebase Config Check ---');
console.log('NEXT_PUBLIC_USE_SUPABASE:', process.env.NEXT_PUBLIC_USE_SUPABASE);
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'FOUND (Length: ' + process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length + ')' : 'NOT FOUND');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('-----------------------------');

if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes(' ')) {
    console.error('ERROR: API Key contains spaces!');
}
