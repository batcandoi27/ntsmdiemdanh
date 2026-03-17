
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Khởi tạo Firebase Client
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function dumpData() {
    console.log('--- START DATA DUMP ---');
    try {
        const classesSnap = await getDocs(collection(firestore, 'classes'));
        const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('CLASSES_DATA:', JSON.stringify(classes));

        const usersSnap = await getDocs(collection(firestore, 'users'));
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('USERS_DATA:', JSON.stringify(users));
        
        console.log('--- END DATA DUMP ---');
    } catch (e) {
        console.error('DUMP_ERROR:', e);
    }
}

dumpData();
