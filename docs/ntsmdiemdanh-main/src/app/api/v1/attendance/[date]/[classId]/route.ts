/**
 * GET /api/v1/attendance/[date]/[classId]
 * Điểm danh 1 lớp 1 ngày (exception-only records)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiSuccess, apiError } from '@/lib/api-middleware';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
        const yearPath = 'years/2025-2026';
        const recordsRef = collection(db, `${yearPath}/attendance/${date}/records`);
        const q = query(recordsRef, where('classId', '==', classId));
        const snap = await getDocs(q);

        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Optional session filter
        const session = req.nextUrl.searchParams.get('session');
        const filtered = session
            ? records.filter((r: any) => r.session === session)
            : records;

        return apiSuccess({
            date,
            classId,
            recordCount: filtered.length,
            note: 'Chỉ hiện records ngoại lệ (vắng/trễ/phép). HS không có record = có mặt.',
            records: filtered,
        });
    } catch (err) {
        return apiError('Lỗi khi lấy dữ liệu điểm danh.', 500);
    }
}
