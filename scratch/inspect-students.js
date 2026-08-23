require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectStudents() {
    const { data: s, error } = await supabase.from('students').select('*').limit(5);
    console.log('Students sample:', s, 'error:', error);
}

inspectStudents();
