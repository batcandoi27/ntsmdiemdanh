import { DbAdapter } from "./db-adapter";
import { FirebaseAdapter } from "./firebase-adapter";
import { SupabaseAdapter } from "./supabase-adapter";

// Logic switch: Ưu tiên Supabase nếu được cấu hình
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
const HAS_FIREBASE_CONFIG = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let dbInstance: DbAdapter;

if (USE_SUPABASE) {
    console.log("⚡ Using Supabase PostgreSQL Adapter (Lazy Loaded)");
    
    // Khởi tạo một đối tượng rỗng và sẽ được nạp instance thực tế khi cần
    let instance: DbAdapter | null = null;
    const getSupabaseInstance = () => {
        if (!instance) {
            const { SupabaseAdapter } = require("./supabase-adapter");
            instance = new SupabaseAdapter();
        }
        return instance;
    };

    // Tạo Proxy bao quanh instance để lazy load
    dbInstance = new Proxy({} as DbAdapter, {
        get: (target, prop) => {
            const actual = getSupabaseInstance() as any;
            const value = actual[prop];
            // Quan trọng: Bind lại context 'this' nếu prop là một function
            if (typeof value === 'function') {
                return value.bind(actual);
            }
            return value;
        }
    });
} else if (HAS_FIREBASE_CONFIG) {
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
        console.warn("⚠️ No DB config and running on client. DB operations will fail.");
        dbInstance = new FirebaseAdapter();
    }
}

export const db = dbInstance;
