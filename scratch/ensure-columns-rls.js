require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensurePolicies() {
    const sql = `
        -- Đảm bảo RLS cho columns cho phép read & write
        ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'columns' AND policyname = 'Allow Public Read Columns'
          ) THEN
            CREATE POLICY "Allow Public Read Columns" ON columns FOR SELECT USING (true);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'columns' AND policyname = 'Allow All Write Columns'
          ) THEN
            CREATE POLICY "Allow All Write Columns" ON columns FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;

        -- Đảm bảo RLS cho column_records cho phép read & write
        ALTER TABLE column_records ENABLE ROW LEVEL SECURITY;

        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'column_records' AND policyname = 'Allow Public Read Column Records'
          ) THEN
            CREATE POLICY "Allow Public Read Column Records" ON column_records FOR SELECT USING (true);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'column_records' AND policyname = 'Allow All Write Column Records'
          ) THEN
            CREATE POLICY "Allow All Write Column Records" ON column_records FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
    `;
    console.log('🚀 Ensuring Columns & Column Records RLS Policies...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) console.error('Error:', error);
    else console.log('✅ RLS Policies Applied Successfully!');
}

ensurePolicies();
