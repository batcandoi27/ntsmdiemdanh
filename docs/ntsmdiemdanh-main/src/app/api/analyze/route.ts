
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const filePath = 'c:\\AI APP\\app-diemdanh\\In So Diem Ca Nhan_T9_2025-2026.xlsx';
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
            // Get first 5 rows raw
            const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            result.analysis[sheetName] = {
                totalRows: raw.length,
                preview: raw.slice(0, 6) // Get top 6 rows to see headers
            };
        }

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
