import { SupabaseAdapter } from "./supabase-adapter";

// Supabase-only adapter
console.log("⚡ Using Supabase PostgreSQL Adapter");

export const db = new SupabaseAdapter();
