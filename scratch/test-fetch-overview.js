require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFetchOverview() {
    const studentId = '1803b277-1f77-404d-9e54-0dbe8fe709e9'; // 8A13_3 Đặng Hoàng Bi

    const { data: statuses } = await supabase.from('attendance_statuses').select('*');
    const statusMap = new Map((statuses || []).map(s => [s.id, s]));

    const { data: rows } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

    let pCount = 0, kCount = 0, tCount = 0, vpCount = 0, khCount = 0, vCount = 0;
    const history = (rows || []).map(r => {
        const st = statusMap.get(r.status_id);
        const code = st?.code || '';
        if (code === 'P') pCount++;
        else if (code === 'K') kCount++;
        else if (code === 'T') tCount++;
        else if (code === 'VP') vpCount++;
        else if (code === 'KH') khCount++;
        else vCount++;

        return {
            date: r.date,
            period: r.period ? `Tiết ${r.period}` : (r.session === 'morning' ? 'Buổi sáng' : 'Buổi chiều'),
            code,
            label: st?.label || 'Vắng',
            color: st?.color,
            note: r.note
        };
    });

    console.log(`Summary: P=${pCount}, K=${kCount}, T=${tCount}, VP=${vpCount}, KH=${khCount}, V=${vCount}`);
    console.log('Sample history (5 rows):', history.slice(0, 5));
}

testFetchOverview();
