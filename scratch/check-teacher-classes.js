require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTeacherClasses() {
    const { data, error } = await supabase.from('teacher_classes').select('*').limit(5);
    console.log('teacher_classes query result:', { data, error });
}

checkTeacherClasses();
