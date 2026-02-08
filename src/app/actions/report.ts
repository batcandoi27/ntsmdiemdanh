'use server';

import { db } from '@/services/db';
import { AttendanceRecord, AttendanceStatus } from '@/types/models';

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

    return { totalP, totalK, totalV, totalT, totalVP, absences };
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
