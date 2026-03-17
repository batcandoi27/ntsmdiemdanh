import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (typeof window === 'undefined' && (!supabaseUrl || !supabaseServiceKey)) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing Supabase Admin environment variables');
  } else {
    console.warn('⚠️ Missing Supabase Admin environment variables (Service Role Key)');
  }
}

// Client này chỉ dùng ở SERVER (Server Actions, API Routes)
// Bỏ qua RLS, được quyền admin hoàn toàn
export const supabaseAdmin = (typeof window === 'undefined' && supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any; // Trả về null trên client để tránh lỗi bundle
