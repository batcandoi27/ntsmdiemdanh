/**
 * GET /api/v1/attendance/[date]/[classId]
 * Điểm danh 1 lớp 1 ngày (exception-only records)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiSuccess, apiError } from '@/lib/api-middleware';
import dbClient from '@/lib/supabase-server';

export async function GET(
    req: NextRequest,
    { params }: { params: { date: string; classId: string } }
) {
    const { user, error } = await authenticateRequest(req);
    if (!user) return apiError(error || 'Unauthorized', 401);

    const { date, classId } = params;

    // Check access
    if (!user.permissions.canViewAllClasses && !user.assignedClassIds.includes(classId)) {
        return apiError('Không có quyền truy cập lớp này.', 403);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return apiError('Date phải có format YYYY-MM-DD', 400);
    }

    try {
        const { data, error: dbError } = await dbClient
            .from('attendance_records')
            .select('*')
            .eq('class_id', classId)
            .eq('date', date);
            
        if (dbError) throw dbError;

        const records = data.map((d: any) => ({
            id: d.id,
            studentId: d.student_id,
            status: d.status,
            notes: d.notes,
            timestamp: d.created_at
        }));

        return apiSuccess({
            date,
            classId,
            recordCount: records.length,
            note: 'Chỉ hiện records ngoại lệ (vắng/trễ/phép). HS không có record = có mặt.',
            records: records,
        });
    } catch (err) {
        return apiError('Lỗi khi lấy dữ liệu điểm danh.', 500);
    }
}
