'use server';

import { db } from '@/services/db';

export async function getClassAndStudents(classId: string) {
    const [cls, students] = await Promise.all([
        db.getClass(classId),
        db.getStudentsByClass(classId)
    ]);
    return { cls, students };
}

export async function getAllClasses() {
    return await db.getClasses();
}
