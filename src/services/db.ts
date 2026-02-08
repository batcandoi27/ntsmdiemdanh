import { DbAdapter } from "./db-adapter";
import { LocalCsvAdapter } from "./local-adapter";
import { FirebaseAdapter } from "./firebase-adapter";

// Logic switch: Ưu tiên Firebase nếu có cấu hình
const HAS_FIREBASE_CONFIG = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let dbInstance: DbAdapter;

if (HAS_FIREBASE_CONFIG) {
    console.log("🔥 Using Firebase Firestore Adapter");
    dbInstance = new FirebaseAdapter();
} else {
    console.log("📂 Using Local CSV Adapter");
    dbInstance = new LocalCsvAdapter();
}

export const db = dbInstance;
