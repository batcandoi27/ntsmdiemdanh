import { DbAdapter } from "./db-adapter";
import { FirebaseAdapter } from "./firebase-adapter";

// Logic switch: Ưu tiên Firebase nếu có cấu hình
const HAS_FIREBASE_CONFIG = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let dbInstance: DbAdapter;

if (HAS_FIREBASE_CONFIG) {
    console.log("🔥 Using Firebase Firestore Adapter");
    dbInstance = new FirebaseAdapter();
} else {
    // Only load LocalCsvAdapter on server
    if (typeof window === 'undefined') {
        console.log("📂 Using Local CSV Adapter");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { LocalCsvAdapter } = require("./local-adapter");
        dbInstance = new LocalCsvAdapter();
    } else {
        console.warn("⚠️ No Firebase config and running on client. DB operations will fail.");
        dbInstance = new FirebaseAdapter();
    }
}

export const db = dbInstance;
