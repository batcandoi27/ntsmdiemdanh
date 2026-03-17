import { DbAdapter } from "./db-adapter";
// Loại bỏ import tĩnh ở đầu file để tránh lỗi biên dịch trên client/server và vòng lặp phụ thuộc

// Logic switch: Ưu tiên Supabase nếu được cấu hình
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
const HAS_FIREBASE_CONFIG = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let dbInstance: DbAdapter;

if (USE_SUPABASE) {
    console.log("⚡ Using Supabase PostgreSQL Adapter");
    const { SupabaseAdapter } = require("./supabase-adapter");
    dbInstance = new SupabaseAdapter();
} else if (HAS_FIREBASE_CONFIG) {
    console.log("🔥 Using Firebase Firestore Adapter");
    const { FirebaseAdapter } = require("./firebase-adapter");
    dbInstance = new FirebaseAdapter();
} else {
    // Only load LocalCsvAdapter on server
    if (typeof window === 'undefined') {
        console.log("📂 Using Local CSV Adapter");
        const { LocalCsvAdapter } = require("./local-adapter");
        dbInstance = new LocalCsvAdapter();
    } else {
        console.warn("⚠️ No DB config and running on client. DB operations will fail.");
        const { FirebaseAdapter } = require("./firebase-adapter");
        dbInstance = new FirebaseAdapter();
    }
}

export const db = dbInstance;
