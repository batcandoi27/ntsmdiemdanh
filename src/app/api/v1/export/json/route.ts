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
import dbClient from '@/lib/supabase-server';

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

    try {
        const result: Record<string, unknown> = {
            meta: {
                schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME || '',
                schoolCode: process.env.NEXT_PUBLIC_SCHOOL_CODE || '',
                year: '2025-2026',
                exportDate: new Date().toISOString(),
                exportedBy: user.displayName,
                version: '4.0',
            },
        };

        if (includeClasses) {
            const { data } = await dbClient.from('classes').select('*');
            result.classes = data || [];
        }

        if (includeStudents) {
            const { data } = await dbClient.from('students').select('*');
            result.students = data || [];
        }

        if (includeTimetables) {
            const { data } = await dbClient.from('timetables').select('*');
            result.timetables = data || [];
        }

        if (includeAttendance) {
            // Note: This can be heavy - consider pagination for production
            result.attendance = { note: 'Use /api/v1/attendance/{date}/{classId} for specific queries' };
        }

        return apiSuccess(result);
    } catch (err) {
        return apiError('Lỗi khi export dữ liệu.', 500);
    }
}
