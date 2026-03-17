
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testRaw() {
    console.log('--- RAW INSERT TEST ---');
    
    // 1. Check Year ID
    const { data: year } = await supabase.from('academic_years').select('id').limit(1).single();
    if (!year) {
        console.log('No academic year found!');
        return;
    }

    // 2. Try raw insert
    const testClass = {
        name: 'TEST_CLASS',
        grade: 1,
        year_id: year.id,
        class_type: 'test'
    };

    console.log('Attempting to insert:', testClass);
    const { data, error } = await supabase.from('classes').insert(testClass).select();
    
    if (error) {
        console.error('❌ INSERT FAILED:', error.message);
        console.error('Full error:', error);
    } else {
        console.log('✅ INSERT SUCCESS:', data);
    }
}

testRaw();
