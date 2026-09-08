import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// CHỈ đọc SUPABASE_SERVICE_ROLE_KEY ở Server runtime, TUYỆT ĐỐI không hardcode fallback token
const supabaseServiceKey = typeof window === 'undefined' ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') : '';

// Client này chỉ khởi tạo và hoạt động khi đang chạy ở Server (SSR, Server Actions, Route Handlers)
// Phía Browser (client-side) luôn luôn là null để bảo vệ an ninh tuyệt đối (Zero-Leak)
export const supabaseAdmin = (typeof window === 'undefined' && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any;
