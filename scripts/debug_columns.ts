
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

const SCHOOL_ID = 'default';
const CURRENT_YEAR = '2025-2026';

async function main() {
    console.log('--- Fetching Classes ---');
    const classesRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'classes');
    const classesSnap = await getDocs(classesRef);
    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Found ${classes.length} classes.`);

    if (classes.length === 0) return;

    // Pick the first class to inspect
    const targetClass = classes[0];
    console.log(`\nInspecting Class: ${targetClass.name} (${targetClass.id})`);

    const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'columns');
    const q = query(colRef, where('classId', '==', targetClass.id));
    const snap = await getDocs(q);
    const columns = snap.docs.map(d => d.data());

    console.log(`Found ${columns.length} columns for this class.`);
    columns.forEach(c => {
        console.log(`- [${c.scope}] ${c.name} (ID: ${c.id})`);
        console.log(`  Frequency: ${c.frequency}`);
        console.log(`  Suggestions: ${c.suggestions?.length || 0} items`);
    });

    console.log('\n--- Checking for FIXED columns specifically ---');
    const fixed = columns.filter(c => c.scope === 'fixed');
    console.log(`Fixed columns count: ${fixed.length}`);
}

main().catch(console.error);
