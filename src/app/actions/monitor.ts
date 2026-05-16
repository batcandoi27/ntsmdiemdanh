'use server';

import { db } from '@/services/db';
import { Column, Student, PeriodRecord, OneTimeRecord } from '@/types/models';
import { supabaseAdmin } from '@/lib/supabase-server'; // Using admin client to ensure we can get data for export

export interface MonitorExportData {
    classId: string;
    className: string;
    columnId: string;
    columnName: string;
    frequency: 'period' | 'one_time' | 'daily';
    subPeriods?: { id: string; label: string }[];
    students: {
        id: string;
        code: string;
        name: string;
        records: Record<string, any>; // periodKey -> value OR 'status' -> 'done'
    }[];
}

/**
 * Gathers data for monitoring books across all classes that have a column with the same name.
 */
export async function getMonitorExportData(columnId: string): Promise<MonitorExportData[]> {
    try {
        if (!supabaseAdmin) throw new Error("Hệ thống chưa cấu hình quyền Admin.");

        // 1. Get the target column to use as a template (Using Admin to bypass RLS)
        const { data: targetColRow, error: colError } = await supabaseAdmin
            .from('columns')
            .select('*')
            .eq('id', columnId)
            .maybeSingle();
            
        if (colError || !targetColRow) {
            console.error("getColumn Error:", colError);
            throw new Error("Không tìm thấy cột theo dõi này.");
        }

        const columnName = targetColRow.name;
        const frequency = targetColRow.frequency;

        // 2. Get all classes
        const allClasses = await db.getClasses();
        const exportData: MonitorExportData[] = [];

        // 3. For each class, find a column with the same name
        for (const cls of allClasses) {
            // Fetch columns for this class using Admin
            const { data: classCols } = await supabaseAdmin
                .from('columns')
                .select('*')
                .eq('class_id', cls.id)
                .eq('name', columnName)
                .eq('frequency', frequency)
                .eq('archived', false);

            if (classCols && classCols.length > 0) {
                const matchedCol = classCols[0];
                
                // Fetch students for this class
                const students = await db.getStudentsByClass(cls.id, { onlyActive: true });
                
                // Fetch records for this column using Admin
                const { data: recordsData } = await supabaseAdmin
                    .from('column_records')
                    .select('*')
                    .eq('column_id', matchedCol.id);

                if (!recordsData) continue;

                // Map records to students
                const studentsMap = students.map(s => {
                    const studentRecords: Record<string, any> = {};
                    const sRecords = recordsData.filter((r: any) => r.student_code === s.code);
                    
                    if (frequency === 'period') {
                        sRecords.forEach((r: any) => {
                            if (r.record_type === 'period') {
                                studentRecords[r.period_key] = r.value;
                            }
                        });
                    } else if (frequency === 'one_time') {
                        const done = sRecords.some((r: any) => r.record_type === 'one_time' && r.status === 'done');
                        if (done) studentRecords['status'] = 'done';
                        
                        // Also check for any generic value
                        const withVal = sRecords.find((r: any) => r.value !== null);
                        if (withVal) studentRecords['value'] = withVal.value;
                    }

                    return {
                        id: s.id,
                        code: s.code || s.id,
                        name: (s.fullName || "Học sinh").trim(),
                        records: studentRecords
                    };
                });

                exportData.push({
                    classId: cls.id,
                    className: cls.name,
                    columnId: matchedCol.id,
                    columnName: matchedCol.name,
                    frequency: matchedCol.frequency as any,
                    subPeriods: matchedCol.sub_periods as any,
                    students: studentsMap
                });
            }
        }

        return exportData;
    } catch (error: any) {
        console.error("getMonitorExportData Error:", error);
        throw error;
    }
}
