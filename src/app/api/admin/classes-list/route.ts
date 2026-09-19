import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser, getAppUser } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Verify token (Fail-Closed: bắt buộc token từ biến môi trường hoặc session admin hợp lệ)
    const masterKey = process.env.GOOGLE_WEBHOOK_SECRET || process.env.ADMIN_SETUP_SECRET;
    const isTokenValid = Boolean(token && masterKey && token === masterKey);

    if (!isTokenValid) {
      const sessionUser = await getCurrentUser();
      const appUser = sessionUser ? await getAppUser(sessionUser.id, sessionUser.email) : null;
      if (!appUser || (appUser.role !== 'admin' && appUser.role !== 'principal')) {
        return NextResponse.json({ error: 'Unauthorized: Yêu cầu Admin Key hoặc phiên đăng nhập Quản trị viên' }, { status: 401 });
      }
    }

    const client = supabaseAdmin;
    if (!client) {
      return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });
    }

    const { data: classes, error } = await client
      .from('classes')
      .select('id, name, grade, year_id, actual_student_count')
      .order('name', { ascending: true });

    if (error || !classes || classes.length === 0) {
      // Fallback danh sách lớp THCS tiêu chuẩn nếu chưa có trong DB
      const fallbackClasses = [
        { id: 'cls-6a1', name: '6A1', grade: 6 },
        { id: 'cls-6a2', name: '6A2', grade: 6 },
        { id: 'cls-7a1', name: '7A1', grade: 7 },
        { id: 'cls-8a13', name: '8A13', grade: 8 },
        { id: 'cls-9a1', name: '9A1', grade: 9 }
      ];
      return NextResponse.json({ data: fallbackClasses, total: fallbackClasses.length });
    }

    return NextResponse.json({ data: classes, total: classes.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

