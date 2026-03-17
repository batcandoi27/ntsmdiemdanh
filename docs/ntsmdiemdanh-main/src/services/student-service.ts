import { db } from '@/services/db';
import { Student } from '@/types/models';

export async function getStudents(classId: string): Promise<Student[]> {
    return await db.getStudentsByClass(classId);
}
