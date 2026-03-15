import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const isSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (Singleton pattern) - Only if not using Supabase or config is valid
const shouldInitFirebase = !isSupabase && firebaseConfig.apiKey;

const app = shouldInitFirebase 
    ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
    : null;

// Initialize Services with null checks and Safe Mocks
// Chúng ta trả về Mock object thay vì null để tránh crash doc(db, ...) ở Client-side
const mockFirestore = { type: 'firestore', _databaseId: { projectId: 'mock' } } as any;
const mockAuth = { currentUser: null, onAuthStateChanged: () => () => {} } as any;
const mockStorage = { type: 'storage' } as any;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

// Đảm bảo phiên đăng nhập được lưu cục bộ (tối đa/vĩnh viễn cho đến khi logout)
if (app && auth && typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence)
        .catch((error) => console.error("Firebase persistence error:", error));
}

export const signInAnon = () => {
    if (!app || !auth || isSupabase) return Promise.reject("Firebase not initialized or using Supabase");
    return signInAnonymously(auth);
};

// Analytics (Client-side only)
if (app && typeof window !== 'undefined') {
    isSupported().then(yes => {
        if (yes) {
            try {
                getAnalytics(app);
            } catch (e) {
                console.warn('Analytics blocked by client');
            }
        }
    }).catch(() => { });
}

export default app;
