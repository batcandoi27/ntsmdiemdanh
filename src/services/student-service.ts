import { db } from '@/services/db';
import { Student } from '@/types/models';

export async function getStudents(classId: string, onlyActive: boolean = false): Promise<Student[]> {
    return await db.getStudentsByClass(classId, { onlyActive });
}

export async function getActiveStudents(classId: string): Promise<Student[]> {
    return await db.getStudentsByClass(classId, { onlyActive: true });
}

export async function getReportStudents(classId: string, startDate: string, endDate: string): Promise<Student[]> {
    return await db.getStudentsByClass(classId, { onlyActive: false, startDate, endDate });
}
