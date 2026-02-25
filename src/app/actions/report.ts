'use server';

import { db } from '@/services/db';
import { AttendanceRecord, AttendanceStatus } from '@/types/models';
import { getCustomColumns } from '@/services/column-service';
import { getPeriodRecords, getOneTimeRecords } from '@/services/record-service';
import { TermReportData } from '@/lib/export-utils';

export interface ReportCriteria {
    startDate: string;
    endDate: string;
    classIds?: string[];
    grade?: number; // Optional filter by grade
}

export interface AbsenceDetail {
    id: string; // unique key
    studentName: string;
    studentCode: string;
    className: string;
    classId: string;
    stt: number; // Student's index in class
    date: string;
    status: AttendanceStatus;
    notes?: string;
}

export interface ReportResult {
    totalP: number;
    totalK: number;
    totalV: number;
    totalT: number;
    totalVP: number;
    totalKH: number;
    absences: AbsenceDetail[];
}

export async function getReports(criteria: ReportCriteria): Promise<ReportResult> {

    // 1. Get raw attendance records
    const records = await db.getReportData(criteria.startDate, criteria.endDate, criteria.classIds);

    // 2. Fetch Class Info if needed (to map Class ID -> Name)
    // Optimization: Fetch all classes once and cache map
    const classes = await db.getClasses();
    const classMap = new Map(classes.map(c => [c.id, c.name]));

    // 3. Process Data
    const absences: AbsenceDetail[] = [];
    let totalP = 0;
    let totalK = 0;
    let totalV = 0;
    let totalT = 0;
    let totalVP = 0;
    let totalKH = 0;

    const recordsByClass: Record<string, AttendanceRecord[]> = {};
    records.forEach(r => {
        if (!recordsByClass[r.classId]) recordsByClass[r.classId] = [];
        recordsByClass[r.classId].push(r);
    });

    for (const [classId, classRecords] of Object.entries(recordsByClass)) {
        // Fetch students for this class
        const students = await db.getStudentsByClass(classId);
        // Map Code -> { Name, STT }
        const studentInfoMap = new Map(students.map((s, index) => [
            s.code,
            { name: s.fullName, stt: index + 1 }
        ]));

        classRecords.forEach(record => {
            Object.entries(record.absences).forEach(([code, status]) => {
                // Ignore 'C' (Present) or empty
                if (status && status !== 'C' && status !== '') {
                    if (status === 'P') totalP++;
                    if (status === 'K') totalK++;
                    if (status === 'V') totalV++;
                    if (status === 'T') totalT++;
                    if (status === 'VP') totalVP++;
                    if (status === 'KH') totalKH++;

                    const info = studentInfoMap.get(code) || { name: code, stt: 0 };

                    absences.push({
                        id: `${record.date}_${code}`,
                        date: record.date,
                        classId: classId,
                        className: classMap.get(classId) || classId,
                        studentCode: code,
                        studentName: info.name,
                        stt: info.stt,
                        status: status,
                        notes: record.notes ? record.notes[code] : undefined
                    });
                }
            });
        });
    }

    // Sort by Date DESC
    absences.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { totalP, totalK, totalV, totalT, totalVP, totalKH, absences };
}

export async function getMonthlyReportData(classId: string, month: number, year: number) {
    // 1. Get Class Info
    const classes = await db.getClasses();
    const cls = classes.find(c => c.id === classId);
    if (!cls) throw new Error('Class not found');

    // 2. Get Students
    // Sorting by Name (or default DB order which is usually STT)
    const students = await db.getStudentsByClass(classId);

    // 3. Get Attendance Records for Month
    const records = await db.getMonthlyAttendance(classId, month, year);

    // 4. Map to Export Format
    // Format: date "YYYY-MM-DD" -> status
    const studentData = students.map((s, idx) => {
        const absences: Record<string, string> = {};
        records.forEach(r => {
            const status = r.absences[s.code];
            if (status) {
                absences[r.date] = status;
            }
        });
        return {
            stt: idx + 1, // Export STT as well if needed
            code: s.code,
            name: s.fullName,
            absences
        };
    });

    return {
        className: cls.name,
        year,
        month,
        students: studentData
    };
}


export async function getAdvancedReportData(startDate: string, endDate: string, classIds: string[]): Promise<TermReportData[]> {
    // 1. Get Classes
    const allClasses = await db.getClasses();
    const targetClasses = classIds.length > 0
        ? allClasses.filter(c => classIds.includes(c.id))
        : allClasses;

    const reports: TermReportData[] = [];

    for (const cls of targetClasses) {
        // 2. Get Students
        const students = await db.getStudentsByClass(cls.id);

        // 3. Get Custom Columns
        const columns = await getCustomColumns(cls.id);
        const reportColumns = columns.filter(c => !c.archived && (c.frequency === 'period' || c.frequency === 'one_time'))
            .map(c => ({
                id: c.id,
                name: c.name,
                frequency: c.frequency,
                subPeriods: c.subPeriods?.map(sp => sp.label)
            }));

        // 4. Get Data
        const data: Record<string, { stats: Record<string, number>; custom: Record<string, string> }> = {};

        // Initialize Data
        students.forEach(s => {
            data[s.id] = { stats: {}, custom: {} };
        });

        // 4a. Get Basic Stats (P, K, T...)
        // We reuse getReportData from DB service which returns raw records
        const attendanceRecords = await db.getReportData(startDate, endDate, [cls.id]);

        attendanceRecords.forEach(record => {
            Object.entries(record.absences).forEach(([studentCode, status]) => {
                const student = students.find(s => s.code === studentCode);
                if (student && status && status !== 'C') {
                    if (!data[student.id].stats[status]) data[student.id].stats[status] = 0;
                    data[student.id].stats[status]++;
                }
            });
        });

        // 4b. Get Custom Records
        for (const col of columns) {
            if (col.archived) continue;

            if (col.frequency === 'period') {
                const records = await getPeriodRecords(col.id);
                records.forEach(r => {
                    const student = students.find(s => s.code === r.studentCode); // periods use Code
                    if (student) {
                        // For Multi-Period, we might want to allow formatting
                        // But for Excel single cell, maybe join them? 
                        // Or if spreadsheet expects multiple columns?
                        // capture: "Sub1: Val, Sub2: Val"
                        const existing = data[student.id].custom[col.id] || '';
                        // Helper to append?
                        // Actually, let's just store Last Value or specialized formatter
                        // For simplicity in this version:
                        // If subPeriods exist, format as "Label: Value\nLabel2: Value"
                        // Or just "Value" if single.

                        let val = r.value;
                        if (col.subPeriods && col.subPeriods.length > 0) {
                            const sub = col.subPeriods.find(sp => sp.id === r.subPeriodId);
                            if (sub) {
                                val = `${sub.label}: ${r.value}`;
                                // Append if multiple
                                if (existing) val = `${existing}\n${val}`;
                            }
                        }

                        data[student.id].custom[col.id] = val;
                    }
                });
            } else if (col.frequency === 'one_time') {
                const records = await getOneTimeRecords(col.id);
                records.forEach(r => {
                    const student = students.find(s => s.code === r.studentCode);
                    if (student) {
                        const status = r.completed ? (r.value || 'Hoàn thành') : '';
                        data[student.id].custom[col.id] = status;
                    }
                });
            }
        }

        reports.push({
            className: cls.name,
            students: students.map(s => ({ id: s.id, code: s.code, name: s.fullName })),
            columns: reportColumns,
            data,
            timeRange: `${startDate} - ${endDate}`
        });
    }

    return reports;
}
