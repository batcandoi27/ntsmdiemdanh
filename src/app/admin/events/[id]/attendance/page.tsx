import { getEventAttendanceReport } from '@/services/teacher-attendance-service';
import AttendanceReportList from '@/components/events/attendance-report-list';
import { ChevronLeft, Calendar as CalendarIcon, Users } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

import { createClient } from '@/lib/supabase-server';

export default async function EventAttendancePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return <div className="p-20 text-center font-bold text-gray-500">Vui lòng đăng nhập.</div>;

  const date = new Date().toISOString().split('T')[0];
  const attendance = await getEventAttendanceReport(params.id, date);
  
  // Kiểm tra quyền hạn của người đang xem
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const isGlobalAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
  
  // Nếu không phải admin, lấy danh sách ID giáo viên mà người này quản lý
  let manageableTeacherIds: string[] = [];
  if (!isGlobalAdmin) {
    const { data: managedGroups } = await supabase
      .from('teacher_group_members')
      .select('group_id')
      .eq('teacher_id', session.user.id)
      .eq('is_manager', true);
    
    if (managedGroups && managedGroups.length > 0) {
      const gIds = managedGroups.map(g => g.group_id);
      const { data: members } = await supabase
        .from('teacher_group_members')
        .select('teacher_id')
        .in('group_id', gIds);
      manageableTeacherIds = members?.map(m => m.teacher_id) || [];
    }
  }

  // Lấy thông tin sự kiện
  const { data: event } = await supabase
    .from('teacher_events')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!event) return <div className="p-20 text-center font-bold text-gray-500">Không tìm thấy sự kiện.</div>;

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const totalCount = attendance.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pb-12 pt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Link href="/admin/events" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-orange-500 transition-colors mb-6">
            <ChevronLeft className="w-4 h-4" />
            Quay lại Lịch họp
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-800 tracking-tight leading-none">Chi tiết Điểm danh</h1>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">{event.title}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
               <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Có mặt</p>
                  <p className="text-2xl font-black text-emerald-700">{presentCount}</p>
               </div>
               <div className="bg-red-50 border border-red-100 px-5 py-3 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Vắng</p>
                  <p className="text-2xl font-black text-red-700">{totalCount - presentCount}</p>
               </div>
               <div className="bg-gray-50 border border-gray-100 px-5 py-3 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tổng số</p>
                  <p className="text-2xl font-black text-gray-700">{totalCount}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-8">
        <AttendanceReportList 
          initialData={attendance} 
          eventId={params.id} 
          date={date} 
          event={event}
          manageableTeacherIds={manageableTeacherIds}
        />
      </div>
    </div>
  );
}
