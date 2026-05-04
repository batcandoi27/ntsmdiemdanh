'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Teacher, TeacherGroup, TeacherGroupType } from '@/types/teacher';

const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

/**
 * Lấy danh sách tất cả giáo viên
 */
export async function getAllTeachers(): Promise<Teacher[]> {
  const { data, error } = await dbClient
    .from('teachers')
    .select('*, teacher_group_members(teacher_groups(*))')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Lỗi getAllTeachers:', error);
    return [];
  }

  return (data || []).map((t: any) => ({
    ...t,
    groups: t.teacher_group_members?.map((m: any) => m.teacher_groups).filter(Boolean) || []
  }));
}

/**
 * Lấy giáo viên theo ID
 */
export async function getTeacherById(id: string): Promise<Teacher | null> {
  const { data, error } = await dbClient
    .from('teachers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Lỗi getTeacherById:', error);
    return null;
  }
  return data;
}

export async function getTeacherByProfileId(profileId: string): Promise<Teacher | null> {
  const { data, error } = await dbClient
    .from('teachers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.error('Lỗi getTeacherByProfileId:', error);
    return null;
  }
  return data;
}

/**
 * Tạo mới hoặc cập nhật giáo viên (dựa trên CCCD)
 */
export async function createTeacher(teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Teacher | null; action: 'created' | 'updated' }> {
  // Nếu có CCCD, kiểm tra xem đã tồn tại chưa
  if (teacher.cccd) {
    const { data: existing } = await dbClient
      .from('teachers')
      .select('id')
      .eq('cccd', teacher.cccd)
      .maybeSingle();
    
    if (existing) {
      const { data, error } = await dbClient
        .from('teachers')
        .update(teacher)
        .eq('id', existing.id)
        .select()
        .single();
      
      return { data, action: 'updated' };
    }
  }

  // Nếu không trùng CCCD hoặc không có CCCD -> Insert mới
  const { data, error } = await dbClient
    .from('teachers')
    .insert(teacher)
    .select()
    .single();

  if (error) {
    console.error('Lỗi createTeacher:', error);
    return { data: null, action: 'created' };
  }
  return { data, action: 'created' };
}

/**
 * Cập nhật giáo viên
 */
export async function updateTeacher(id: string, teacher: Partial<Teacher>): Promise<Teacher | null> {
  const { data, error } = await dbClient
    .from('teachers')
    .update(teacher)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Lỗi updateTeacher:', error);
    return null;
  }
  return data;
}

/**
 * Quản lý Nhóm
 */

export async function getAllGroups(): Promise<TeacherGroup[]> {
  const { data, error } = await dbClient
    .from('teacher_groups')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Lỗi getAllGroups:', error);
    return [];
  }
  return data || [];
}

export async function createGroup(group: Omit<TeacherGroup, 'id' | 'created_at' | 'updated_at'>): Promise<TeacherGroup | null> {
  const { data, error } = await dbClient
    .from('teacher_groups')
    .insert(group)
    .select()
    .single();

  if (error) {
    console.error('Lỗi createGroup:', error);
    return null;
  }
  return data;
}

export async function updateGroup(id: string, updates: Partial<TeacherGroup>): Promise<TeacherGroup | null> {
  const { data, error } = await dbClient
    .from('teacher_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Lỗi updateGroup:', error);
    return null;
  }
  return data;
}

export async function deleteGroup(id: string): Promise<boolean> {
  // Check is_system first? We can do it here or let UI prevent it. UI is better.
  const { error } = await dbClient
    .from('teacher_groups')
    .delete()
    .eq('id', id)
    .eq('is_system', false); // Xóa an toàn, chỉ xóa nhóm custom

  if (error) {
    console.error('Lỗi deleteGroup:', error);
    return false;
  }
  return true;
}

/**
 * Quản lý thành viên nhóm
 */

export async function addTeacherToGroup(teacherId: string, groupId: string): Promise<boolean> {
  const { error } = await dbClient
    .from('teacher_group_members')
    .upsert({ teacher_id: teacherId, group_id: groupId });

  if (error) {
    console.error('Lỗi addTeacherToGroup:', error);
    return false;
  }
  return true;
}

export async function removeTeacherFromGroup(teacherId: string, groupId: string): Promise<boolean> {
  const { error } = await dbClient
    .from('teacher_group_members')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('group_id', groupId);

  if (error) {
    console.error('Lỗi removeTeacherFromGroup:', error);
    return false;
  }
  return true;
}

export async function getTeachersByGroup(groupId: string): Promise<Teacher[]> {
  const { data, error } = await dbClient
    .from('teacher_group_members')
    .select('teachers(*)')
    .eq('group_id', groupId);

  if (error) {
    console.error('Lỗi getTeachersByGroup:', error);
    return [];
  }
  return (data || []).map((item: any) => item.teachers);
}

export async function getGroupsByTeacher(teacherId: string): Promise<TeacherGroup[]> {
  const { data, error } = await dbClient
    .from('teacher_group_members')
    .select('teacher_groups(*)')
    .eq('teacher_id', teacherId);

  if (error) {
    console.error('Lỗi getGroupsByTeacher:', error);
    return [];
  }
  return (data || []).map((item: any) => item.teacher_groups);
}

/**
 * Lấy danh sách ID giáo viên là Manager của các nhóm cụ thể
 */
export async function getManagersOfGroups(groupIds: string[]): Promise<string[]> {
  if (groupIds.length === 0) return [];
  
  const { data, error } = await dbClient
    .from('teacher_group_members')
    .select('teacher_id')
    .in('group_id', groupIds)
    .eq('is_manager', true);

  if (error) return [];
  return Array.from(new Set(data.map(m => m.teacher_id)));
}

/**
 * Xóa giáo viên (dọn dẹp dữ liệu liên quan trước)
 */
export async function deleteTeacher(id: string): Promise<boolean> {
  try {
    // 1. Xóa liên kết nhóm
    await dbClient.from('teacher_group_members').delete().eq('teacher_id', id);
    // 2. Xóa dữ liệu điểm danh
    await dbClient.from('teacher_attendance').delete().eq('teacher_id', id);
    // 3. Xóa giáo viên
    const { error } = await dbClient.from('teachers').delete().eq('id', id);
    if (error) { console.error('Lỗi xóa GV:', error); return false; }
    return true;
  } catch (err) {
    console.error('Lỗi deleteTeacher:', err);
    return false;
  }
}
