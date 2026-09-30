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

async function exec(sql, desc) {
  console.log(`[SQL] ${desc}...`);
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error(`Error in ${desc}:`, error);
    throw error;
  }
  console.log(`  -> OK`);
}

async function run() {
  console.log('=================================================================');
  console.log(' TRIỂN KHAI KIẾN TRÚC HẬU TỐ HỌC SINH TRÙNG TÊN CÙNG LỚP (A, B, C)');
  console.log('=================================================================\n');

  // 1. Thêm cột name_suffix vào student_classes nếu chưa có
  await exec(
    `ALTER TABLE IF EXISTS public.student_classes ADD COLUMN IF NOT EXISTS name_suffix VARCHAR(10) DEFAULT NULL;`,
    '1. Thêm cột name_suffix vào bảng student_classes'
  );

  // 2. Cập nhật view v_student_list (giữ nguyên thứ tự 12 cột cũ, bổ sung cột mới vào cuối)
  await exec(
    `CREATE OR REPLACE VIEW v_student_list WITH (security_invoker = true) AS
     SELECT 
         s.id,
         s.student_code,
         CASE 
             WHEN sc.name_suffix IS NOT NULL AND sc.name_suffix != '' 
             THEN s.full_name || ' (' || sc.name_suffix || ')'
             ELSE s.full_name 
         END as full_name,
         s.gender,
         s.birthday,
         s.status,
         s.ethnicity,
         CASE 
             WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' THEN s.gov_id 
             ELSE '********' || RIGHT(s.gov_id, 4) 
         END as gov_id,
         sc.class_id,
         sc.order_index as "order",
         s.is_deleted,
         s.deleted_at,
         s.full_name as raw_full_name,
         sc.name_suffix
     FROM students s
     JOIN student_classes sc ON s.id = sc.student_id;`,
    '2. Cập nhật View v_student_list để tự động hiển thị hậu tố'
  );

  // 3. Reload schema cache của PostgREST
  await exec(`NOTIFY pgrst, 'reload schema';`, '3. Reload PostgREST schema cache');

  // 4. Tạo function trigger tự động cấp hậu tố monotonic (A -> B -> C...) bất biến
  await exec(
    `CREATE OR REPLACE FUNCTION trg_fn_assign_student_name_suffix()
     RETURNS TRIGGER AS $$
     DECLARE
       v_full_name TEXT;
       v_max_suffix CHAR(1);
       v_next_suffix CHAR(1);
       v_other_sc_id UUID;
       v_other_student_id UUID;
       v_other_dob DATE;
       v_new_dob DATE;
     BEGIN
       -- Nếu đã có suffix rồi thì giữ nguyên tuyệt đối, không đổi!
       IF NEW.name_suffix IS NOT NULL AND NEW.name_suffix != '' THEN
         RETURN NEW;
       END IF;

       -- Lấy tên học sinh mới được thêm vào lớp
       SELECT full_name, birthday INTO v_full_name, v_new_dob 
       FROM students WHERE id = NEW.student_id;
       
       IF v_full_name IS NULL THEN
         RETURN NEW;
       END IF;

       -- 4.1: Kiểm tra xem trong lớp đã có học sinh nào trùng tên và ĐÃ CÓ suffix chưa
       SELECT MAX(sc.name_suffix) INTO v_max_suffix
       FROM student_classes sc
       JOIN students s ON sc.student_id = s.id
       WHERE sc.class_id = NEW.class_id
         AND s.full_name = v_full_name
         AND sc.student_id != NEW.student_id
         AND sc.name_suffix IS NOT NULL AND sc.name_suffix != '';

       IF v_max_suffix IS NOT NULL THEN
         -- Đã có A, B... thì học sinh mới vào nhận ký tự tiếp theo (A -> B, B -> C, C -> D...)
         v_next_suffix := CHR(ASCII(v_max_suffix) + 1);
         NEW.name_suffix := v_next_suffix;
         RETURN NEW;
       END IF;

       -- 4.2: Nếu trong lớp có học sinh trùng tên nhưng CHƯA AI CÓ suffix (đây là học sinh thứ 2 gia nhập)
       SELECT sc.id, sc.student_id, s.birthday 
       INTO v_other_sc_id, v_other_student_id, v_other_dob
       FROM student_classes sc
       JOIN students s ON sc.student_id = s.id
       WHERE sc.class_id = NEW.class_id
         AND s.full_name = v_full_name
         AND sc.student_id != NEW.student_id
       LIMIT 1;

       IF v_other_sc_id IS NOT NULL THEN
         -- So sánh ngày sinh: ai sinh trước nhận 'A', sinh sau nhận 'B'
         IF v_other_dob <= v_new_dob THEN
           UPDATE student_classes SET name_suffix = 'A' WHERE id = v_other_sc_id;
           NEW.name_suffix := 'B';
         ELSE
           UPDATE student_classes SET name_suffix = 'B' WHERE id = v_other_sc_id;
           NEW.name_suffix := 'A';
         END IF;
       END IF;

       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;`,
    '4. Tạo hàm Trigger cấp hậu tố tự động'
  );

  // 5. Gắn trigger vào bảng student_classes
  await exec(
    `DROP TRIGGER IF EXISTS trg_student_classes_name_suffix ON public.student_classes;
     CREATE TRIGGER trg_student_classes_name_suffix
     BEFORE INSERT ON public.student_classes
     FOR EACH ROW
     EXECUTE FUNCTION trg_fn_assign_student_name_suffix();`,
    '5. Kích hoạt Trigger trg_student_classes_name_suffix'
  );

  // 6. Cập nhật dữ liệu thực tế cho 4 cặp học sinh trùng tên hiện có trong DB
  console.log('\n[DATA] Cập nhật hậu tố cho các học sinh trùng tên hiện tại...');

  const knownPairs = [
    // Lớp 9A8 (Hiện tại) - Lý Gia Hỷ (Mã bộ: 4250 là A - STT 1723; 4251 là B - STT 1724)
    { student_id: '12a00182-b6b3-481e-bcc2-5acb79b7c8f0', class_id: 'a556ec34-95fa-4adc-9dbf-a699c810515a', suffix: 'A', order_index: 1723, desc: '9A8 - Lý Gia Hỷ (A) sinh 27/05/2012 (Mã 4250)' },
    { student_id: 'c2b7adc5-a78b-4caf-9113-86b50f019ca9', class_id: 'a556ec34-95fa-4adc-9dbf-a699c810515a', suffix: 'B', order_index: 1724, desc: '9A8 - Lý Gia Hỷ (B) sinh 14/10/2012 (Mã 4251)' },
    
    // Lớp 9A8 (Hiện tại) - Tăng Bảo Nghi
    { student_id: '25261c10-5a6b-4081-8e85-d50ae6fad597', class_id: 'a556ec34-95fa-4adc-9dbf-a699c810515a', suffix: 'A', order_index: 1733, desc: '9A8 - Tăng Bảo Nghi (A) sinh 14/03/2012 (Mã 4259)' },
    { student_id: '994982a8-cf93-469a-a76d-155a56637513', class_id: 'a556ec34-95fa-4adc-9dbf-a699c810515a', suffix: 'B', order_index: 1734, desc: '9A8 - Tăng Bảo Nghi (B) sinh 27/11/2012 (Mã 4260)' },

    // Lớp 8A8 (Cũ) - Lý Gia Hỷ
    { student_id: 'dc9da850-9dd3-4824-ac6e-17c71ba5a7d6', class_id: '777ac7c8-be9b-492c-a208-a1fceb309638', suffix: 'A', desc: '8A8 - Lý Gia Hỷ (A) sinh 27/05/2012' },
    { student_id: '7256e76a-93ef-44c4-9315-3b1355470059', class_id: '777ac7c8-be9b-492c-a208-a1fceb309638', suffix: 'B', desc: '8A8 - Lý Gia Hỷ (B) sinh 14/10/2012' },

    // Lớp 8A8 (Cũ) - Tăng Bảo Nghi
    { student_id: '2cf4ed43-be66-425a-8a86-a5af98898a2a', class_id: '777ac7c8-be9b-492c-a208-a1fceb309638', suffix: 'A', desc: '8A8 - Tăng Bảo Nghi (A) sinh 14/03/2012' },
    { student_id: '50b1ba94-6042-49f7-95b3-d83a4a690b9f', class_id: '777ac7c8-be9b-492c-a208-a1fceb309638', suffix: 'B', desc: '8A8 - Tăng Bảo Nghi (B) sinh 27/11/2012' }
  ];

  for (const pair of knownPairs) {
    const updatePayload = { name_suffix: pair.suffix };
    if (pair.order_index !== undefined) {
      updatePayload.order_index = pair.order_index;
    }
    const { error } = await supabase
      .from('student_classes')
      .update(updatePayload)
      .eq('student_id', pair.student_id)
      .eq('class_id', pair.class_id);
    if (error) {
      console.error(`Error updating suffix for ${pair.desc}:`, error);
    } else {
      console.log(`  [+] Đã cập nhật: ${pair.desc} -> (${pair.suffix}) [order: ${pair.order_index ?? 'N/A'}]`);
    }
  }

  console.log('\n✅ TRIỂN KHAI HOÀN TẤT THÀNH CÔNG!');
}

run().catch(console.error);
