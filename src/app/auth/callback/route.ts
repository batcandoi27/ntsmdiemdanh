import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Khởi tạo client thủ công để xử lý đổi mã code
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false // Không cần persist ở phía server route này
      }
    });
    
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Chuyển hướng về trang chủ. 
  // Trình duyệt sẽ tự động nhận session mới thông qua cookie hoặc bộ nhớ client sau chuyển hướng.
  return NextResponse.redirect(requestUrl.origin);
}
