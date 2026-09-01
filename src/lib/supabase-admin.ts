import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lczrqxqohgskwewkcsur.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjenJxeHFvaGdza3dld2tjc3VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MzMyOCwiZXhwIjoyMDg4OTQ5MzI4fQ.XV07NFjPPHBsh_yLxb1oDWtvU2nPzFhWwGbDqpPbcBA';

// Client này chỉ dùng ở SERVER (Server Actions, API Routes, Scripts)
// Bỏ qua RLS, được quyền admin hoàn toàn
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

