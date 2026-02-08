'use server';

import { db } from '@/services/db';
import { Class } from '@/types/models';
import { revalidatePath } from 'next/cache';

export async function createClass(data: Class) {
    try {
        await db.createClass(data);
        revalidatePath('/classes');
        return { success: true, message: 'Tạo lớp thành công!' };
    } catch (error) {
        return { success: false, message: (error as Error).message };
    }
}

export async function updateClass(data: Class) {
    try {
        await db.updateClass(data);
        revalidatePath('/classes');
        return { success: true, message: 'Cập nhật thành công!' };
    } catch (error) {
        return { success: false, message: (error as Error).message };
    }
}

export async function deleteClass(id: string) {
    try {
        await db.deleteClass(id);
        revalidatePath('/classes');
        return { success: true, message: 'Xóa lớp thành công!' };
    } catch (error) {
        return { success: false, message: (error as Error).message };
    }
}
