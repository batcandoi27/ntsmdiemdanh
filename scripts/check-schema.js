// Script kiểm tra schema DB Supabase - lấy tất cả cột hiện có của các bảng quan trọng
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lczrqxqohgskwewkcsur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjenJxeHFvaGdza3dld2tjc3VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MzMyOCwiZXhwIjoyMDg4OTQ5MzI4fQ.XV07NFjPPHBsh_yLxb1oDWtvU2nPzFhWwGbDqpPbcBA'
);

const TABLES = ['profiles', 'attendance', 'classes', 'students', 'student_classes', 'attendance_types', 'attendance_statuses', 'report_presets', 'teacher_classes', 'columns', 'column_records', 'timetables', 'api_keys', 'settings', 'chat_threads', 'chat_messages'];

async function checkTable(name) {
  const { data, error, status } = await supabase.from(name).select('*').limit(1);
  if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
    return { table: name, exists: false, columns: [] };
  }
  if (error) {
    return { table: name, exists: '?', error: error.message, columns: [] };
  }
  const cols = data && data.length > 0 ? Object.keys(data[0]) : [];
  return { table: name, exists: true, columns: cols, sampleRow: data && data[0] ? data[0] : null };
}

async function main() {
  console.log('=== SUPABASE SCHEMA AUDIT ===\n');
  for (const t of TABLES) {
    const result = await checkTable(t);
    if (!result.exists) {
      console.log(`❌ TABLE "${t}" -> DOES NOT EXIST`);
    } else if (result.exists === '?') {
      console.log(`⚠️  TABLE "${t}" -> ERROR: ${result.error}`);
    } else {
      console.log(`✅ TABLE "${t}" -> COLUMNS: [${result.columns.join(', ')}]`);
    }
  }
}

main().catch(console.error);
