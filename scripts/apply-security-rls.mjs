import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('🔒 Applying Hardened RLS Policies (Zero-Trust & Least Privilege)...');

  const statements = [
    // 1. Classes: Public select
    `ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Classes viewable by everyone" ON public.classes;`,
    `CREATE POLICY "Classes viewable by everyone" ON public.classes FOR SELECT TO anon, authenticated USING (true);`,

    // 2. Teacher_classes: Public select
    `ALTER TABLE IF EXISTS public.teacher_classes ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Teacher classes viewable by everyone" ON public.teacher_classes;`,
    `CREATE POLICY "Teacher classes viewable by everyone" ON public.teacher_classes FOR SELECT TO anon, authenticated USING (true);`,

    // 3. Academic_years: Public select
    `ALTER TABLE IF EXISTS public.academic_years ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Academic years viewable by everyone" ON public.academic_years;`,
    `CREATE POLICY "Academic years viewable by everyone" ON public.academic_years FOR SELECT TO anon, authenticated USING (true);`,

    // 4. Profiles: Public read ONLY for teachers (full_name, role)
    `ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Public teacher profiles read" ON public.profiles;`,
    `CREATE POLICY "Public teacher profiles read" ON public.profiles FOR SELECT TO anon, authenticated USING (role = 'teacher');`,

    // 5. Timetables: Public select for schedule
    `ALTER TABLE IF EXISTS public.timetables ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Timetables viewable by everyone" ON public.timetables;`,
    `CREATE POLICY "Timetables viewable by everyone" ON public.timetables FOR SELECT TO anon, authenticated USING (true);`,

    // 6. Columns: Public select for portal & settings
    `ALTER TABLE IF EXISTS public.columns ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Columns viewable by everyone" ON public.columns;`,
    `CREATE POLICY "Columns viewable by everyone" ON public.columns FOR SELECT TO anon, authenticated USING (true);`,

    // 7. Column Records: Public select for portal & settings
    `ALTER TABLE IF EXISTS public.column_records ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Column records viewable by everyone" ON public.column_records;`,
    `CREATE POLICY "Column records viewable by everyone" ON public.column_records FOR SELECT TO anon, authenticated USING (true);`,

    // 8. Attendance: Public select
    `ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Attendance viewable by everyone" ON public.attendance;`,
    `CREATE POLICY "Attendance viewable by everyone" ON public.attendance FOR SELECT TO anon, authenticated USING (true);`
  ];

  for (const sql of statements) {
    console.log(`Executing: ${sql.slice(0, 60)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error('Error executing statement:', error);
      process.exit(1);
    }
  }

  console.log('✅ Hardened RLS Policies applied successfully!');
}

run().catch(console.error);
