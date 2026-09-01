// Service for managing Zalo connections, multi-child mappings, and message outbox logs

import { supabaseAdmin } from '@/lib/supabase-admin';
import { StudentParentZaloMapping, ClassZaloGroup, ZaloMessageLog } from '@/types/zalo';
import { zaloGateway } from '@/lib/zalo-gateway-client';

export class ZaloService {
    /**
     * Bind Parent Zalo ID to a Student via /ketnoi or #KETNOI command
     */
    static async bindParentZalo(options: {
        studentCode: string;
        parentZaloId: string;
        parentName?: string;
        parentPhone?: string;
    }): Promise<{
        ok: boolean;
        message: string;
        student?: { id: string; name: string; class_name: string; student_code: string };
    }> {
        try {
            const cleanCode = options.studentCode.trim().toUpperCase();

            // 1. Look up student in Supabase database
            const { data: student, error: studentError } = await supabaseAdmin
                .from('students')
                .select('id, full_name, class_id, classes(name)')
                .or(`student_code.ilike.${cleanCode},id.eq.${cleanCode}`)
                .maybeSingle();

            if (studentError || !student) {
                // If not found by exact code, search by full_name or id fallback
                return {
                    ok: false,
                    message: `Không tìm thấy học sinh có mã "${cleanCode}". Vui lòng kiểm tra lại mã số in trên Thẻ học sinh hoặc Sổ liên lạc của cháu.`
                };
            }

            const studentName = student.full_name || 'Học sinh';
            const className = (student as any).classes?.name || 'Lớp';

            // 2. Upsert mapping into student_parents_zalo
            const { error: upsertError } = await supabaseAdmin
                .from('student_parents_zalo')
                .upsert(
                    {
                        student_id: student.id,
                        student_code: cleanCode,
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

            // 3. Call Zalo Gateway to automatically set friend alias
            const alias = `[${className}] - Phụ huynh ${studentName}`;
            await zaloGateway.changeFriendAlias({
                user_id: options.parentZaloId,
                alias: alias
            });

            return {
                ok: true,
                message: `Dạ chào anh/chị! Trợ lý đã kết nối thành công với hồ sơ của cháu **${studentName}** (${className}). Kể từ hôm nay, thông báo điểm danh và học tập của cháu sẽ được gửi trực tiếp cho anh/chị tại đây ạ!`,
                student: {
                    id: student.id,
                    name: studentName,
                    class_name: className,
                    student_code: cleanCode
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
}
