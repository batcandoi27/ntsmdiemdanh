/**
 * GET /api/v1/export/json
 * Export full JSON data (Admin only)
 *
 * Query params:
 *   ?classes=true     Include classes
 *   ?students=true    Include students
 *   ?attendance=true  Include attendance (can be heavy)
 *   ?timetables=true  Include timetables
 *   ?from=YYYY-MM-DD  Attendance date range start
 *   ?to=YYYY-MM-DD    Attendance date range end
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, apiSuccess, apiError } from '@/lib/api-middleware';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AttendanceRecordV3 } from '@/types/attendance-v3';

export async function GET(req: NextRequest) {
    const { user, error } = await authenticateRequest(req);
    if (!user) return apiError(error || 'Unauthorized', 401);

    // Only admin can export full data
    if (!user.permissions.canExportData) {
        return apiError('Không có quyền export dữ liệu.', 403);
    }

    const params = req.nextUrl.searchParams;
    const includeClasses = params.get('classes') !== 'false';
    const includeStudents = params.get('students') !== 'false';
    const includeAttendance = params.get('attendance') === 'true';
    const includeTimetables = params.get('timetables') === 'true';

    const yearPath = 'years/2025-2026';

    try {
        const result: Record<string, unknown> = {
            meta: {
                schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME || '',
                schoolCode: process.env.NEXT_PUBLIC_SCHOOL_CODE || '',
                year: '2025-2026',
                exportDate: new Date().toISOString(),
                exportedBy: user.displayName,
                version: '3.0',
            },
        };

        if (includeClasses) {
            const snap = await getDocs(collection(db, `${yearPath}/classes`));
            result.classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (includeStudents) {
            const snap = await getDocs(collection(db, `${yearPath}/students`));
            result.students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (includeTimetables) {
            const snap = await getDocs(collection(db, `${yearPath}/timetables`));
            result.timetables = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (includeAttendance) {
            // Note: This can be heavy - consider pagination for production
            const dateFrom = params.get('from') || '2025-01-01';
            const dateTo = params.get('to') || '2026-12-31';
            result.attendance = { note: 'Use /api/v1/attendance/{date}/{classId} for specific queries' };
        }

        return apiSuccess(result);
    } catch (err) {
        return apiError('Lỗi khi export dữ liệu.', 500);
    }
}
