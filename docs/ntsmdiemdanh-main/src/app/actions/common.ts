'use server';

import { db } from '@/services/db';

export async function getClassAndStudents(classId: string) {
    const cls = await db.getClass(classId);
    const students = await db.getStudentsByClass(classId);
    return { cls, students };
}

export async function getAllClasses() {
    return await db.getClasses();
}
