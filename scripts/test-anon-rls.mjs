import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// DÙNG ANON KEY THƯỜNG - KHÔNG DÙNG SERVICE_ROLE_KEY
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAnon() {
  console.log('🧪 Testing purely ANONYMOUS query (No Service Role, No Auth session)...');
  
  const { data, error } = await anonClient
    .from('classes')
    .select(`
      id, name, grade,
      teacher_classes(teacher_id, is_homeroom, profiles:profiles(full_name))
    `)
    .limit(10);

  if (error) {
    console.error('❌ Anon test error:', error);
    process.exit(1);
  }

  console.log('✅ Success! Classes fetched via ANON client:');
  let hasTeacherNameCount = 0;
  data.forEach(c => {
    const hr = c.teacher_classes?.find(t => t.is_homeroom);
    const teacherName = Array.isArray(hr?.profiles) ? hr.profiles[0]?.full_name : hr?.profiles?.full_name;
    if (teacherName) hasTeacherNameCount++;
    console.log(` - Lớp: ${c.name} | GVCN: ${teacherName || '(trống)'}`);
  });

  console.log(`\n📊 Thống kê: ${hasTeacherNameCount}/${data.length} lớp có đầy đủ họ tên GVCN hoàn toàn qua RLS & Anon key!`);
}

testAnon().catch(console.error);
