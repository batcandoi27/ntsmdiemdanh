'use server';

import { getStudents as getStudentsService } from '@/services/student-service';
import { Student } from '@/types/models';

export async function getStudentsAction(classId: string): Promise<Student[]> {
    return await getStudentsService(classId);
}
