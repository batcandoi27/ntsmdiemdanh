/**
 * GET /api/v1/classes
 * Danh sách lớp (theo quyền user)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiSuccess, apiError } from '@/lib/api-middleware';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
    const { user, error } = await authenticateRequest(req);
    if (!user) return apiError(error || 'Unauthorized', 401);

    try {
        const yearPath = 'years/2025-2026';
        const classesRef = collection(db, `${yearPath}/classes`);
        const snap = await getDocs(classesRef);

        let classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filter by access: admin/principal see all, others see assigned only
        if (!user.permissions.canViewAllClasses) {
            classes = classes.filter(c => user.assignedClassIds.includes(c.id));
        }

        return apiSuccess(classes);
    } catch (err) {
        return apiError('Lỗi khi lấy danh sách lớp.', 500);
    }
}
