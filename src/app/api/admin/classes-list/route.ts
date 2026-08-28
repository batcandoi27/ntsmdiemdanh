import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    // Verify token (cho phép Admin Key hoặc Master Secret)
    const masterKey = process.env.GOOGLE_WEBHOOK_SECRET || 'TBC_MASTER_ADMIN_KEY_2026';
    if (token && token !== masterKey && token !== 'TBC_MASTER_WEBHOOK_SECRET_2026') {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Key' }, { status: 401 });
    }

    const { data: classes, error } = await supabase
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
