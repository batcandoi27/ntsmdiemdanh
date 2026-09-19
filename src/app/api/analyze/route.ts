
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { getCurrentUser, getAppUser } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // 1. Tuyệt đối chặn endpoint này trên môi trường Production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. Trong môi trường Development, yêu cầu phiên đăng nhập Admin
    const sessionUser = await getCurrentUser();
    const appUser = sessionUser ? await getAppUser(sessionUser.id, sessionUser.email) : null;
    if (!appUser || appUser.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized: Endpoint phân tích chỉ dành cho Admin ở môi trường dev.' }, { status: 401 });
    }

    try {
        const filePath = path.resolve(process.cwd(), 'In So Diem Ca Nhan_T9_2025-2026.xlsx');
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found at ' + filePath }, { status: 404 });
        }

        const buffer = fs.readFileSync(filePath);
        const wb = XLSX.read(buffer, { type: 'buffer' });

        const result: any = {
            sheets: wb.SheetNames,
            analysis: {}
        };

        for (const sheetName of wb.SheetNames) {
            const sheet = wb.Sheets[sheetName];
            const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            result.analysis[sheetName] = {
                totalRows: raw.length,
                preview: raw.slice(0, 6)
            };
        }

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

