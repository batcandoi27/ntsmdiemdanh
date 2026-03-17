'use server';

import { db } from '@/services/db';
import { Student } from '@/types/models';
import { revalidatePath } from 'next/cache';

export async function createStudent(data: Student) {
    try {
        await db.createStudent(data);
        revalidatePath(`/classes/${data.classId}`);
        return { success: true, message: 'Thêm học sinh thành công!' };
    } catch (error) {
        return { success: false, message: (error as Error).message };
    }
}

export async function updateStudent(data: Student) {
    try {
        await db.updateStudent(data);
        revalidatePath(`/classes/${data.classId}`);
        return { success: true, message: 'Cập nhật thành công!' };
    } catch (error) {
        return { success: false, message: (error as Error).message };
    }
}

export async function deleteStudent(id: string, classId: string) {
    try {
        await db.deleteStudent(id);
        revalidatePath(`/classes/${classId}`);
        return { success: true, message: 'Xóa học sinh thành công!' };
    } catch (error) {
        return { success: false, message: (error as Error).message };
    }
}
