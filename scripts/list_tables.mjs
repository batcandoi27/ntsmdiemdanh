import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
  const { data, error } = await sb.from('classes').select('*').limit(1);
  // Using postgres view if possible or query through REST
  console.log('Class test:', !error);
  
  // Let's test tables by checking known names
  const candidateTables = [
    'classes', 'students', 'student_classes', 'teacher_classes', 'academic_years',
    'attendance', 'attendance_v3', 'attendance_records', 'homework', 'timetables',
    'columns', 'column_data', 'custom_columns', 'custom_column_data',
    'events', 'student_portal', 'settings', 'profiles', 'leave_requests'
  ];

  for (const t of candidateTables) {
    const { error: err, count } = await sb.from(t).select('*', { count: 'exact', head: true });
    if (!err) {
      console.log(`✅ Table '${t}': exists (count: ${count})`);
    }
  }
}

listTables().catch(console.error);
