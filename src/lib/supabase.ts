import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lczrqxqohgskwewkcsur.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjenJxeHFvaGdza3dld2tjc3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzMzMjgsImV4cCI6MjA4ODk0OTMyOH0.w46uvdPVgp_JQoVqYluleLrIzOH4rfSST9ZTIzoWVw0';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
