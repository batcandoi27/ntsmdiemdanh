'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TeacherAttendance, TeacherAttendanceStatus } from '@/types/teacher';

const dbClient = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;

/**
 * Đánh dấu điểm danh giáo viên (Exception-only)
 * Nếu status là 'present' -> Xoá record khỏi DB.
 */
export async function markTeacherAttendance(
  userId: string, // ID người thực hiện (admin/organizer)
  data: {
    teacherId: string;
    eventId: string;
    date: string;
    status: TeacherAttendanceStatus;
    note?: string;
    isVerified?: boolean;
  }
): Promise<boolean> {
  try {
    // Luôn Upsert record (Vì không có record = Vắng)
    const { error } = await dbClient
      .from('teacher_attendance')
      .upsert({
        teacher_id: data.teacherId,
        event_id: data.eventId,
        check_in_date: data.date,
        status: data.status,
        note: data.note || '',
        is_verified: data.isVerified || false,
        marked_by: userId
      }, { onConflict: 'teacher_id, event_id, check_in_date' });
      
    if (error) throw error;
    return true;

  } catch (err) {
    console.error('Lỗi markTeacherAttendance:', err);
    return false;
  }
}

/**
 * Lấy danh sách điểm danh của một sự kiện
 */
export async function getEventAttendance(eventId: string, date: string): Promise<TeacherAttendance[]> {
  const { data, error } = await dbClient
    .from('teacher_attendance')
    .select('*, teachers(*)')
    .eq('event_id', eventId)
    .eq('check_in_date', date);

  if (error) {
    console.error('Lỗi getEventAttendance:', error);
    return [];
  }
  return data || [];
}

/**
 * Xử lý quét mã QR (Self Check-in)
 */
export async function selfCheckIn(
  teacherId: string,
  eventId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  // 1. Lấy thông tin sự kiện và secret
  const { data: event, error: eventError } = await dbClient
    .from('teacher_events')
    .select('qr_secret')
    .eq('id', eventId)
    .single();

  if (eventError || !event) return { success: false, message: 'Không tìm thấy sự kiện.' };

  // 2. Verify Token
  const { verifyQRToken } = await import('./event-service');
  const { isValid } = await verifyQRToken(token, event.qr_secret);

  if (!isValid) return { success: false, message: 'Mã QR không hợp lệ hoặc đã hết hạn.' };

  // 3. Mark Present
  const date = new Date().toISOString().split('T')[0];
  const success = await markTeacherAttendance(teacherId, {
    teacherId,
    eventId,
    date,
    status: 'present',
    isVerified: true
  });

  return success 
    ? { success: true, message: 'Điểm danh thành công!' }
    : { success: false, message: 'Có lỗi xảy ra khi điểm danh.' };
}

/**
 * Lấy báo cáo điểm danh chi tiết cho một sự kiện (Merged với danh sách giáo viên)
 */
export async function getEventAttendanceReport(eventId: string, date: string): Promise<TeacherAttendance[]> {
  // 1. Lấy tất cả giáo viên (hoặc có thể filter theo group nếu cần, nhưng tạm thời lấy hết)
  const { data: teachers, error: tError } = await dbClient
    .from('teachers')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (tError) return [];

  // 2. Lấy record điểm danh thực tế
  const { data: attendance, error: aError } = await dbClient
    .from('teacher_attendance')
    .select('*')
    .eq('event_id', eventId)
    .eq('check_in_date', date) as { data: any[], error: any };

  if (aError) return [];

  // 3. Merge dữ liệu
  const attendanceMap = new Map(attendance.map(a => [a.teacher_id, a]));

  return teachers.map(t => {
    const record = attendanceMap.get(t.id);
    return {
      id: record?.id || `temp-${t.id}`,
      teacher_id: t.id,
      event_id: eventId,
      check_in_date: date,
      status: record?.status || 'absent', // MẶC ĐỊNH LÀ VẮNG
      note: record?.note || '',
      is_verified: record?.is_verified || false,
      teacher: t
    } as TeacherAttendance;
  });
}

/**
 * Giáo viên gửi yêu cầu xác nhận tham gia (khi không quét được QR hoặc xin phép)
 */
export async function requestAttendanceConfirmation(teacherId: string, eventId: string, note?: string): Promise<{ success: boolean; message: string }> {
  const date = new Date().toISOString().split('T')[0];
  
  // Kiểm tra xem đã có record chưa
  const { data: existing } = await dbClient
    .from('teacher_attendance')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('event_id', eventId)
    .eq('check_in_date', date)
    .maybeSingle();

  if (existing && existing.is_verified) {
    return { success: false, message: 'Bạn đã được điểm danh xác thực rồi.' };
  }

  const { error } = await dbClient
    .from('teacher_attendance')
    .upsert({
      teacher_id: teacherId,
      event_id: eventId,
      check_in_date: date,
      status: 'present',
      is_verified: false, // CHỜ DUYỆT
      note: note || 'Yêu cầu xác nhận tham gia'
    });

  if (error) return { success: false, message: 'Không thể gửi yêu cầu.' };
  return { success: true, message: 'Đã gửi yêu cầu xác nhận thành công!' };
}

/**
 * Kiểm tra xem người dùng A có quyền duyệt điểm danh cho giáo viên B hay không
 * (Dựa trên việc quản lý nhóm chung)
 */
export async function canUserApproveAttendance(approverId: string, targetTeacherId: string): Promise<boolean> {
  // 1. Lấy các nhóm mà người duyệt làm Manager
  const { data: managedGroups } = await dbClient
    .from('teacher_group_members')
    .select('group_id')
    .eq('teacher_id', approverId)
    .eq('is_manager', true);

  if (!managedGroups || managedGroups.length === 0) return false;
  
  const managedGroupIds = managedGroups.map(g => g.group_id);

  // 2. Kiểm tra xem giáo viên mục tiêu có thuộc bất kỳ nhóm nào trong số đó không
  const { data: targetGroups } = await dbClient
    .from('teacher_group_members')
    .select('group_id')
    .eq('teacher_id', targetTeacherId)
    .in('group_id', managedGroupIds);

  return (targetGroups && targetGroups.length > 0) || false;
}
