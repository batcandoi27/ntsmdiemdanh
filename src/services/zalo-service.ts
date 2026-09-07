// Service for managing Zalo connections, multi-child mappings, and message outbox logs

import { supabaseAdmin } from '@/lib/supabase-admin';
import { StudentParentZaloMapping, ClassZaloGroup, ZaloMessageLog } from '@/types/zalo';
import { zaloGateway } from '@/lib/zalo-gateway-client';

export class ZaloService {
    /**
     * Bind Parent Zalo ID to a Student via /ketnoi or #KETNOI command
     * Supports optional Birthday / CCCD 2-Factor Verification for maximum privacy
     */
    static async bindParentZalo(options: {
        studentCode: string;
        verifyKey?: string;
        parentZaloId: string;
        parentName?: string;
        parentPhone?: string;
    }): Promise<{
        ok: boolean;
        message: string;
        student?: { id: string; name: string; class_name: string; student_code: string };
    }> {
        try {
            let cleanCode = options.studentCode.trim().toUpperCase();

            // Strip school prefix if present (e.g. TBC-6A5_22 or TBC_6A5_22 -> 6A5_22)
            const prefixMatch = cleanCode.match(/^(?:[A-Z0-9]{2,5})[-_](.+)$/i);
            const rawLookupCode = prefixMatch ? prefixMatch[1] : cleanCode;

            // 1. Look up student in Supabase database
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawLookupCode);
            let query = supabaseAdmin.from('students').select('id, full_name, student_code, birthday, gov_id');
            if (isUuid) {
                query = query.or(`student_code.ilike.${rawLookupCode},id.eq.${rawLookupCode},student_code.ilike.${cleanCode}`);
            } else {
                query = query.or(`student_code.ilike.${rawLookupCode},student_code.ilike.${cleanCode}`);
            }
            const { data: student, error: studentError } = await query.maybeSingle();

            if (studentError || !student) {
                return {
                    ok: false,
                    message: `Không tìm thấy học sinh có mã "${cleanCode}". Vui lòng kiểm tra lại mã số in trên Thẻ học sinh hoặc Sổ liên lạc của cháu.`
                };
            }

            // 2. Bảo mật 2 lớp: Kiểm tra Ngày sinh (hoặc CCCD / Mã định danh)
            if (options.verifyKey && student.birthday) {
                const inputDigits = options.verifyKey.replace(/\D/g, '');
                const dbDigits = (student.birthday || '').replace(/\D/g, ''); // YYYYMMDD e.g. 20141219
                const dbDayMonthYear = dbDigits.length === 8 ? `${dbDigits.slice(6, 8)}${dbDigits.slice(4, 6)}${dbDigits.slice(0, 4)}` : ''; // DDMMYYYY e.g. 19122014
                const dbDayMonth = dbDigits.length === 8 ? `${dbDigits.slice(6, 8)}${dbDigits.slice(4, 6)}` : ''; // DDMM e.g. 1912
                const govDigits = (student.gov_id || '').replace(/\D/g, '');

                const isBirthdayMatch = Boolean(
                    (inputDigits && dbDigits.includes(inputDigits)) ||
                    (inputDigits && dbDayMonthYear.includes(inputDigits)) ||
                    (inputDigits && dbDayMonth === inputDigits) ||
                    (govDigits && inputDigits && govDigits.endsWith(inputDigits))
                );

                if (!isBirthdayMatch) {
                    return {
                        ok: false,
                        message: `🔒 XÁC THỰC BẢO MẬT KHÔNG TRÙNG KHỚP\n━━━━━━━━━━━━━━━━━━━━━━\nThông tin ngày sinh / xác thực "${options.verifyKey}" không khớp với hồ sơ của em ${student.full_name}.\n\n💡 Vui lòng nhập đúng cú pháp:\n/ketnoi ${cleanCode} [NGÀY_SINH]\n(Ví dụ: /ketnoi ${cleanCode} 19/12/2014)`
                    };
                }
            }

            // Get Class Name from student_classes
            const { data: stClass } = await supabaseAdmin
                .from('student_classes')
                .select('class_id, classes(name)')
                .eq('student_id', student.id)
                .eq('is_active', true)
                .maybeSingle();

            const studentName = student.full_name || 'Học sinh';
            const className = (stClass as any)?.classes?.name || '9A1';

            // 3. Upsert mapping into student_parents_zalo
            const { error: upsertError } = await supabaseAdmin
                .from('student_parents_zalo')
                .upsert(
                    {
                        student_id: student.id,
                        student_code: student.student_code || cleanCode,
                        student_name: studentName,
                        class_name: className,
                        parent_zalo_id: options.parentZaloId,
                        parent_name: options.parentName || null,
                        parent_phone: options.parentPhone || null,
                        is_friend: true,
                        alias_set: `[${className}] - Phụ huynh ${studentName}`,
                        status: 'CONNECTED',
                        connected_at: new Date().toISOString(),
                        last_interacted_at: new Date().toISOString()
                    },
                    { onConflict: 'student_id,parent_zalo_id' }
                );

            if (upsertError) {
                console.error('[ZaloService] upsert mapping error:', upsertError);
            }

            // 4. Call Zalo Gateway to automatically set friend alias
            const alias = `[${className}] - Phụ huynh ${studentName}`;
            await zaloGateway.changeFriendAlias({
                user_id: options.parentZaloId,
                alias: alias
            });

            // 5. Query all connected children for this parent
            const allChildren = await this.getStudentsByParentZaloId(options.parentZaloId);

            let welcomeMsg = '';
            if (allChildren.length > 1) {
                welcomeMsg = `🎉 ĐÃ KẾT NỐI THÊM CON THÀNH CÔNG!
━━━━━━━━━━━━━━━━━━━━━━
Dạ kính chào Quý Phụ Huynh! Anh/chị hiện đang liên kết với ${allChildren.length} học sinh:
${allChildren.map((c, i) => `${i + 1}️⃣ Em: **${c.student_name}** (${c.class_name}) - Mã: ${c.student_code}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━
💡 Mẹo: Khi tra cứu, anh/chị có thể nhắn **#1**, **#2**... để chuyển đổi giữa các con bất cứ lúc nào!
Nhắn các phím 1️⃣ ➔ 8️⃣ để xem Báo bài, TKB, Điểm danh, Học phí của cháu ${studentName} ạ! ✨`;
            } else {
                welcomeMsg = `🎉 KẾT NỐI THÀNH CÔNG SỔ LIÊN LẠC ĐIỆN TỬ
━━━━━━━━━━━━━━━━━━━━━━
Dạ kính chào Quý Phụ Huynh! Trợ lý đã liên kết thành công với hồ sơ của cháu:
👨‍🎓 Học sinh: **${studentName}**
🆔 Mã định danh: ${student.student_code || cleanCode}
🏫 Lớp: ${className}
━━━━━━━━━━━━━━━━━━━━━━
📲 KỂ TỪ HÔM NAY, ANH/CHỊ CÓ THỂ BẤM 1️⃣ ➔ 8️⃣ ĐỂ TRA CỨU NHANH:

1️⃣ /baobai       : Xem dặn dò & bài tập ngày mai
2️⃣ /thoikhoabieu : Xem lịch học & phòng học hôm nay
3️⃣ /diemdanh     : Xem lịch sử chuyên cần & điểm danh
4️⃣ /bangdiem     : Xem bảng điểm & kết quả rèn luyện
5️⃣ /hocphi       : Xem học phí & mã VietQR thanh toán
6️⃣ /xinnghi      : Nộp đơn xin nghỉ học cho con
7️⃣ /hoso         : Xem thông tin hồ sơ học sinh
8️⃣ /lienhe       : Số điện thoại BGH & GVCN
━━━━━━━━━━━━━━━━━━━━━━
💡 Mẹo: Anh/chị chỉ cần nhắn số 1, 2, 3... là xem được ngay thông tin của con ạ! ✨`;
            }

            return {
                ok: true,
                message: welcomeMsg,
                student: {
                    id: student.id,
                    name: studentName,
                    class_name: className,
                    student_code: student.student_code || cleanCode
                }
            };
        } catch (err: any) {
            console.error('[ZaloService] bindParentZalo unexpected error:', err);
            return {
                ok: false,
                message: 'Có lỗi xảy ra trong quá trình ghép nối hồ sơ. Vui lòng thử lại sau.'
            };
        }
    }

    /**
     * Get all connected students for a parent Zalo ID (Supports Multi-Child families)
     */
    static async getStudentsByParentZaloId(parentZaloId: string): Promise<StudentParentZaloMapping[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('student_parents_zalo')
                .select('*')
                .eq('parent_zalo_id', parentZaloId)
                .eq('status', 'CONNECTED');

            if (error || !data) return [];
            return data as StudentParentZaloMapping[];
        } catch {
            return [];
        }
    }

    /**
     * Get all connected parents for a class
     */
    static async getParentsByClassId(classId: string): Promise<StudentParentZaloMapping[]> {
        try {
            const { data: students } = await supabaseAdmin
                .from('students')
                .select('id')
                .eq('class_id', classId);

            if (!students || students.length === 0) return [];
            const studentIds = students.map(s => s.id);

            const { data: mappings } = await supabaseAdmin
                .from('student_parents_zalo')
                .select('*')
                .in('student_id', studentIds)
                .eq('status', 'CONNECTED');

            return (mappings || []) as StudentParentZaloMapping[];
        } catch {
            return [];
        }
    }

    /**
     * Log an outbound Zalo message with Idempotency Key
     */
    static async logOutboundMessage(log: Omit<ZaloMessageLog, 'id' | 'created_at'>): Promise<void> {
        try {
            await supabaseAdmin.from('zalo_message_logs').upsert(
                {
                    ...log,
                    created_at: new Date().toISOString()
                },
                { onConflict: 'idempotency_key' }
            );
        } catch (err) {
            console.error('[ZaloService] logOutboundMessage error:', err);
        }
    }

    /**
     * Look up a Class by flexible user inputs (e.g. "6A5", "6a5", "6 a 5", "lớp 6A5", "khối 6 6A5")
     */
    static async findClassByInput(input: string): Promise<{ id: string; name: string } | null> {
        try {
            let cleaned = (input || '')
                .replace(/^(?:lớp|lop|khối|khoi|class)\s*/i, '')
                .replace(/\s+/g, '')
                .toUpperCase();

            // Match pattern like 6A5, 9A1, 10C2, 8/13...
            const match = cleaned.match(/([0-9]{1,2}[A-ZÀ-Ỹ0-9\/_-]+)/i);
            const targetName = match ? match[1] : cleaned;

            if (!targetName) return null;

            // Query database
            const { data: cls } = await supabaseAdmin
                .from('classes')
                .select('id, name')
                .or(`name.ilike.${targetName},name.ilike.%${targetName}%`)
                .limit(1)
                .maybeSingle();

            return cls || null;
        } catch (err) {
            console.error('[ZaloService] findClassByInput error:', err);
            return null;
        }
    }

    /**
     * Look up students in a class by STT or Name
     */
    static async findStudentsInClass(
        classId: string,
        input: string
    ): Promise<Array<{ id: string; full_name: string; student_code: string; birthday?: string }>> {
        try {
            const raw = (input || '').trim();
            if (!raw) return [];

            // Query all students in this class
            const { data: studentList, error } = await supabaseAdmin
                .from('student_classes')
                .select('order_index, students(id, full_name, student_code, birthday, gov_id)')
                .eq('class_id', classId)
                .eq('is_active', true);

            if (error || !studentList) return [];

            const students = studentList
                .map((item: any) => ({
                    ...item.students,
                    order_index: item.order_index
                }))
                .filter((s: any) => s && s.id);

            const isNumber = /^\d+$/.test(raw);
            const numVal = isNumber ? parseInt(raw, 10) : null;

            if (isNumber && numVal !== null) {
                // Match by STT (e.g. 22 or 05 in 6A5_22)
                const matched = students.filter((s: any) => {
                    const code = s.student_code || '';
                    const parts = code.split('_');
                    const lastPart = parts.length > 1 ? parts[parts.length - 1] : '';
                    const sttInCode = parseInt(lastPart, 10);
                    return sttInCode === numVal || s.order_index === numVal;
                });
                if (matched.length > 0) return matched;
            }

            // Match by name (case-insensitive substring)
            const lowerInput = raw.toLowerCase();
            const matchedByName = students.filter((s: any) => {
                const name = (s.full_name || '').toLowerCase();
                return name.includes(lowerInput);
            });

            return matchedByName;
        } catch (err) {
            console.error('[ZaloService] findStudentsInClass error:', err);
            return [];
        }
    }
}

