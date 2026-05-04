'use server';

import { revalidatePath } from 'next/cache';
import * as EventService from '@/services/event-service';
import * as AttendanceService from '@/services/teacher-attendance-service';
import { TeacherAttendanceStatus } from '@/types/teacher';

export async function createEventAction(data: any, groupIds: string[]) {
  const result = await EventService.createEvent(data, groupIds);
  if (result) revalidatePath('/admin/events');
  return result;
}

export async function markAttendanceAction(
  userId: string,
  teacherId: string,
  eventId: string,
  status: TeacherAttendanceStatus,
  note?: string
) {
  // 1. Kiểm tra quyền hạn (Admin toàn cục hoặc Quản lý nhóm)
  const { supabaseAdmin } = await import('@/lib/supabase-admin');
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isGlobalAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
  
  if (!isGlobalAdmin) {
    const canApprove = await AttendanceService.canUserApproveAttendance(userId, teacherId);
    if (!canApprove) {
      return { success: false, message: 'Bạn không có quyền duyệt điểm danh cho giáo viên này.' };
    }
  }

  // 2. Thực hiện điểm danh
  const date = new Date().toISOString().split('T')[0];
  const success = await AttendanceService.markTeacherAttendance(userId, {
    teacherId,
    eventId,
    date,
    status,
    note,
    isVerified: true
  });
  
  if (success) revalidatePath(`/admin/events/${eventId}/attendance`);
  return { success: !!success, message: success ? 'Cập nhật thành công' : 'Lỗi cập nhật' };
}

export async function generateQRTokenAction(eventId: string, secret: string) {
  return await EventService.generateEventQRToken(eventId, secret);
}

export async function teacherCheckInAction(teacherId: string, eventId: string, token: string) {
  // Thực tế cần verify token ở đây trước khi check-in
  const result = await AttendanceService.selfCheckIn(teacherId, eventId, token);
  if (result.success) revalidatePath(`/events/${eventId}`);
  return result;
}
export async function requestAttendanceAction(teacherId: string, eventId: string, note?: string) {
  const result = await AttendanceService.requestAttendanceConfirmation(teacherId, eventId, note);
  if (result.success) revalidatePath('/teacher/dashboard');
  return result;
}
