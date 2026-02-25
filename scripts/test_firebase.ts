
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, collectionGroup } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function main() {
    console.log('--- Testing Firebase Connectivity ---');
    try {
        const schoolsRef = collection(db, 'schools');
        const snap = await getDocs(schoolsRef);
        console.log(`Successfully connected. Found ${snap.size} schools.`);
        snap.forEach(d => console.log(`- School ID: ${d.id}`));
    } catch (e) {
        console.error('Error connecting to schools collection:', e);
    }
}

main().catch(console.error);
