/**
 * GET /api/v1/classes
 * Danh sách lớp (theo quyền user)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiSuccess, apiError } from '@/lib/api-middleware';
import { db } from '@/services/db';

export async function GET(req: NextRequest) {
    const { user, error } = await authenticateRequest(req);
    if (!user) return apiError(error || 'Unauthorized', 401);

    try {
        let classes = await db.getClasses();

        // Filter by access: admin/principal see all, others see assigned only
        if (!user.permissions.canViewAllClasses) {
            classes = classes.filter((c: any) => user.assignedClassIds.includes(c.id));
        }

        return apiSuccess(classes);
    } catch (err) {
        return apiError('Lỗi khi lấy danh sách lớp.', 500);
    }
}
