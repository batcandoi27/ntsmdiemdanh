require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureTeacherClassesPolicies() {
    const sql = `
        ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;

        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'teacher_classes' AND policyname = 'Allow Public Read Teacher Classes'
          ) THEN
            CREATE POLICY "Allow Public Read Teacher Classes" ON teacher_classes FOR SELECT USING (true);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'teacher_classes' AND policyname = 'Allow All Write Teacher Classes'
          ) THEN
            CREATE POLICY "Allow All Write Teacher Classes" ON teacher_classes FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
    `;
    console.log('🚀 Ensuring Teacher Classes RLS Policies...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) console.error('Error:', error);
    else console.log('✅ Teacher Classes RLS Policies Applied Successfully!');
}

ensureTeacherClassesPolicies();
