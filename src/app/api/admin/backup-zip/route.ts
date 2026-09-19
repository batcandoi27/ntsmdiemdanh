import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser, getAppUser } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/api-middleware';

const TABLES = [
  'academic_years',
  'classes',
  'students',
  'student_classes',
  'attendance',
  'attendance_statuses',
  'attendance_types',
  'class_timetables',
  'daily_homework_reports',
  'class_reporters',
  'student_parents_zalo',
  'zalo_interactive_sessions',
  'zalo_message_logs',
  'settings'
];

async function fetchAllFromTable(tableName: string) {
  let allRows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) return null;

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Kiểm tra xác thực qua Cookie Session (Browser Admin UI)
    let isAuthorized = false;
    let actorEmail = '';

    const sessionUser = await getCurrentUser();
    if (sessionUser) {
      const appUser = await getAppUser(sessionUser.id, sessionUser.email);
      if (appUser && (appUser.role === 'admin' || appUser.permissions?.canExportData)) {
        isAuthorized = true;
        actorEmail = appUser.email || sessionUser.email || 'admin-session';
      }
    }

    // 2. Fallback: Kiểm tra qua Authorization Bearer / X-API-Key Header (CLI / Script)
    if (!isAuthorized) {
      const { user: apiUser } = await authenticateRequest(req);
      if (apiUser && (apiUser.role === 'admin' || apiUser.permissions?.canExportData)) {
        isAuthorized = true;
        actorEmail = apiUser.email || 'admin-api-key';
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Yêu cầu quyền Quản trị viên (Admin) hoặc quyền canExportData để xuất toàn bộ cơ sở dữ liệu.' },
        { status: 403 }
      );
    }

    const backupData: Record<string, any> = {
      school_name: 'THCS TRẦN BỘI CƠ',
      exported_at: new Date().toISOString(),
      exported_by: actorEmail,
      tables: {}
    };

    for (const table of TABLES) {
      const rows = await fetchAllFromTable(table);
      if (rows !== null) {
        backupData.tables[table] = rows;
      }
    }

    const jsonString = JSON.stringify(backupData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_database_thcstbc_${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
