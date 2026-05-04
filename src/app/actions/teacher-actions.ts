'use server';

import { revalidatePath } from 'next/cache';
import * as TeacherService from '@/services/teacher-service';
import * as ImportService from '@/services/teacher-import-service';
import { Teacher, TeacherGroup } from '@/types/teacher';

/**
 * ACTIONS CHO GIÁO VIÊN
 */

export async function createTeacherAction(formData: FormData) {
  const teacher = {
    full_name: formData.get('full_name') as string,
    cccd: formData.get('cccd') as string || undefined,
    email: formData.get('email') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    position: formData.get('position') as string || undefined,
    is_active: true
  };

  const result = await TeacherService.createTeacher(teacher);
  if (result) revalidatePath('/admin/teachers');
  return result;
}

export async function updateTeacherAction(id: string, formData: FormData) {
  const teacher = {
    full_name: formData.get('full_name') as string,
    cccd: formData.get('cccd') as string || undefined,
    email: formData.get('email') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    position: formData.get('position') as string || undefined,
    extra_info: {
      don_vi_cong_tac: formData.get('don_vi_cong_tac') as string || ''
    }
  };

  const result = await TeacherService.updateTeacher(id, teacher);
  if (result) revalidatePath('/admin/teachers');
  return result;
}

export async function importTeachersAction(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) return { success: 0, created: 0, updated: 0, failed: 0, errors: ['Không tìm thấy file'] };

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await ImportService.importTeachersFromExcel(buffer);
  revalidatePath('/admin/teachers');
  return result;
}

/**
 * ACTIONS CHO NHÓM
 */

export async function createGroupAction(name: string, type: any, level: any = 'all', category: any = 'department') {
  const result = await TeacherService.createGroup({ 
    name, 
    type, 
    level, 
    category,
    is_system: false,
    is_active: true
  } as any);
  if (result) {
    revalidatePath('/admin/settings');
    revalidatePath('/admin/teachers');
  }
  return result;
}

export async function updateGroupAction(id: string, updates: any) {
  const result = await TeacherService.updateGroup(id, updates);
  if (result) {
    revalidatePath('/admin/settings');
    revalidatePath('/admin/teachers');
  }
  return result;
}

export async function deleteGroupAction(id: string) {
  const result = await TeacherService.deleteGroup(id);
  if (result) {
    revalidatePath('/admin/settings');
    revalidatePath('/admin/teachers');
  }
  return result;
}

export async function addTeacherToGroupAction(teacherId: string, groupId: string) {
  const result = await TeacherService.addTeacherToGroup(teacherId, groupId);
  if (result) revalidatePath('/admin/teachers');
  return result;
}

export async function removeTeacherFromGroupAction(teacherId: string, groupId: string) {
  const result = await TeacherService.removeTeacherFromGroup(teacherId, groupId);
  if (result) revalidatePath('/admin/teachers');
  return result;
}

export async function deleteTeacherAction(id: string) {
  const result = await TeacherService.deleteTeacher(id);
  if (result) revalidatePath('/admin/teachers');
  return result;
}

export async function deleteMultipleTeachersAction(ids: string[]) {
  // Thực hiện tuần tự hoặc Promise.all. 
  // Vì deleteTeacher đã xử lý xóa liên kết (FK) nên an toàn.
  const results = await Promise.all(ids.map(id => TeacherService.deleteTeacher(id)));
  const allSuccess = results.every(res => res === true);
  if (allSuccess) revalidatePath('/admin/teachers');
  return allSuccess;
}

export async function addMultipleTeachersToGroupAction(teacherIds: string[], groupId: string) {
  const results = await Promise.all(teacherIds.map(id => TeacherService.addTeacherToGroup(id, groupId)));
  const allSuccess = results.every(res => res === true);
  if (allSuccess) revalidatePath('/admin/teachers');
  return allSuccess;
}

export async function previewImportAction(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) return { items: [], error: 'Không tìm thấy file' };
  const buffer = Buffer.from(await file.arrayBuffer());
  return ImportService.previewTeachersFromExcel(buffer);
}
