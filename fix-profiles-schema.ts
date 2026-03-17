
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProfileTable() {
    console.log('🔧 Adjusting profiles table to allow migration...');
    
    // 1. Gỡ bỏ ràng buộc FK và NOT NULL tạm thời trên cột ID
    // 2. Cho phép ID tự sinh nếu không có Auth User gắn kèm
    const sql = `
        ALTER TABLE profiles ALTER COLUMN id DROP NOT NULL;
        ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
    `;
    
    console.log('--- VUI LÒNG CHẠY CÂU LỆNH NÀY TRONG SUPABASE SQL EDITOR ---\n');
    console.log(sql);
    console.log('\n-----------------------------------------------------------\n');
}

fixProfileTable();
