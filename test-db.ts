import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching constraints...');
    // Lấy constraints
    const { data: constraints, error: cErr } = await supabase.rpc('get_table_info', { table_name_param: 'attendance' }).catch((e:any) => ({data: null, error: e}));
    console.log('Constraints RPC:', constraints, cErr?.message);

    // Lấy loại attendance types
    console.log('Fetching types...');
    const { data: types, error: tErr } = await supabase.from('attendance_types').select('*');
    console.log('Types:', types);

    // Lấy statuses
    console.log('Fetching statuses...');
    const { data: statuses, error: sErr } = await supabase.from('attendance_statuses').select('*');
    console.log('Statuses:', statuses);
}

main();
