import { getEventsForTeacher } from '@/services/event-service';
import { getTeacherByProfileId } from '@/services/teacher-service';
import TeacherEventList from '@/components/teachers/teacher-event-list';
import { Calendar, User, Bell, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase-server';

export default async function TeacherDashboard() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return <div className="p-20 text-center">Vui lòng đăng nhập.</div>;

  const teacher = await getTeacherByProfileId(session.user.id);
  if (!teacher) return <div className="p-20 text-center">Tài khoản chưa được liên kết hồ sơ giáo viên.</div>;

  const events = await getEventsForTeacher(teacher.id);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-100">
                <Calendar className="w-5 h-5" />
             </div>
             <div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">Điểm Danh GV</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Hệ thống v2.0</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
             </button>
             <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
                <User className="w-5 h-5" />
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Welcome */}
        <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative">
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Chào mừng thầy/cô,</p>
            <h2 className="text-2xl font-black tracking-tight mb-4">{teacher.full_name}</h2>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold backdrop-blur-md">
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
               Hôm nay có {events.length} sự kiện
            </div>
          </div>
        </div>

        {/* Action Quick Link */}
        <Link 
          href="/checkin"
          className="block w-full p-6 bg-white border-2 border-orange-500 rounded-[32px] shadow-xl shadow-orange-100 active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
                  <Calendar className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-black text-slate-800 text-lg">QUÉT MÃ NGAY</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Điểm danh bằng QR Code</p>
               </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
               <ChevronLeft className="w-5 h-5 rotate-180" />
            </div>
          </div>
        </Link>

        {/* Quick Portals Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <Link
            href="/homeroom"
            className="p-3 bg-white rounded-2xl border border-slate-200 text-center hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👨‍🏫</div>
            <div className="font-bold text-xs text-slate-800">Trợ Lý GVCN</div>
            <div className="text-[10px] text-slate-400">Hồ sơ & SYLL</div>
          </Link>

          <Link
            href="/portal"
            target="_blank"
            className="p-3 bg-white rounded-2xl border border-slate-200 text-center hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👨‍👩‍👧</div>
            <div className="font-bold text-xs text-slate-800">Cổng Phụ Huynh</div>
            <div className="text-[10px] text-slate-400">Tra cứu & Nộp đơn</div>
          </Link>

          <Link
            href="/student"
            target="_blank"
            className="p-3 bg-white rounded-2xl border border-slate-200 text-center hover:border-emerald-300 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎮</div>
            <div className="font-bold text-xs text-slate-800">Cổng Học Sinh</div>
            <div className="text-[10px] text-slate-400">Thú ảo & Điểm thưởng</div>
          </Link>
        </div>

        {/* Meeting List */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Cuộc họp gần đây</h3>
           </div>
           
           <TeacherEventList initialEvents={events} teacherId={teacher.id} />
        </div>
      </div>
    </div>
  );
}
