/**
 * GET /api/v1/classes/[id]/students
 * Danh sách học sinh của lớp
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiSuccess, apiError } from '@/lib/api-middleware';
import { db } from '@/services/db';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { user, error } = await authenticateRequest(req);
    if (!user) return apiError(error || 'Unauthorized', 401);

    const classId = params.id;

    // Check access
    if (!user.permissions.canViewAllClasses && !user.assignedClassIds.includes(classId)) {
        return apiError('Không có quyền truy cập lớp này.', 403);
    }

    try {
        const students = await db.getStudentsByClass(classId);
        students.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        return apiSuccess(students);
    } catch (err) {
        return apiError('Lỗi khi lấy danh sách học sinh.', 500);
    }
}
