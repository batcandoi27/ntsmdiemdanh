
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateRLS() {
    console.log('🚀 Updating RLS Policies...');

    const sqlCommands = [
        // 1. Profiles: Cho phép mọi user đăng nhập xem profiles (để lấy tên GV), chỉ bản thân/admin sửa
        `drop policy if exists "Public profiles are viewable by everyone" on profiles;`,
        `drop policy if exists "Users can update own profile" on profiles;`,
        `drop policy if exists "Admin full access" on profiles;`,
        `create policy "Public profiles are viewable by authenticated" on profiles for select using (auth.role() = 'authenticated');`,
        `create policy "Users can update own profile" on profiles for update using (auth.uid() = id);`,
        `create policy "Admin full access" on profiles for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));`,

        // 2. Classes: Cho phép mọi user đăng nhập xem tất cả lớp, chỉ admin sửa
        `drop policy if exists "Classes viewable by everyone" on classes;`,
        `drop policy if exists "Admin manage classes" on classes;`,
        `alter table classes enable row level security;`,
        `create policy "Classes viewable by authenticated" on classes for select using (auth.role() = 'authenticated');`,
        `create policy "Admin manage classes" on classes for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));`,

        // 3. Teacher Classes: Cho phép xem toàn bộ phân công, Admin quản lý
        `alter table teacher_classes enable row level security;`,
        `drop policy if exists "Teacher classes viewable by authenticated" on teacher_classes;`,
        `create policy "Teacher classes viewable by authenticated" on teacher_classes for select using (auth.role() = 'authenticated');`,
        `create policy "Admin manage teacher assignments" on teacher_classes for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));`,

        // 4. Students: Xem toàn bộ, Admin quản lý
        `alter table students enable row level security;`,
        `drop policy if exists "Students viewable by authenticated" on students;`,
        `create policy "Students viewable by authenticated" on students for select using (auth.role() = 'authenticated');`,
        `create policy "Admin manage students" on students for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));`,

        // 5. Attendance: Xem toàn bộ, Chỉnh sửa có điều kiện (Admin OR Assignee)
        `alter table attendance enable row level security;`,
        `drop policy if exists "Attendance viewable by authenticated" on attendance;`,
        `create policy "Attendance viewable by authenticated" on attendance for select using (auth.role() = 'authenticated');`,
        `create policy "Admin/Teacher manage attendance" on attendance for all 
         using (
            exists (select 1 from profiles where id = auth.uid() and role = 'admin')
            or 
            exists (select 1 from teacher_classes where teacher_id = auth.uid() and class_id = attendance.class_id)
         );`
    ];

    for (const sql of sqlCommands) {
        console.log(`Executing: ${sql.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        // Nếu rpc('exec_sql') chưa được setup, ta sẽ báo người dùng dùng SQL Editor
        if (error) {
            console.error('❌ SQL Error (Có thể do thiếu RPC exec_sql. Vui lòng copy vào SQL Editor):', error);
            console.log('\n--- TO EXECUTE IN SQL EDITOR ---\n');
            console.log(sqlCommands.join('\n'));
            process.exit(1);
        }
    }

    console.log('✅ RLS Updated Successfully!');
}

updateRLS();
