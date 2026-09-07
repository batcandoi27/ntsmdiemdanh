import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/supabase-server';

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

export async function GET() {
  try {
    const backupData: Record<string, any> = {
      school_name: 'THCS TRẦN BỘI CƠ',
      exported_at: new Date().toISOString(),
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
