'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, Send, Users, ChevronRight, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { requestAttendanceAction } from '@/app/actions/event-actions';
import { toast } from 'react-hot-toast';

interface TeacherEventListProps {
  initialEvents: any[];
  teacherId: string;
}

export default function TeacherEventList({ initialEvents, teacherId }: TeacherEventListProps) {
  const [events, setEvents] = useState(initialEvents);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handleRequest = async (eventId: string) => {
    setIsSubmitting(eventId);
    try {
      const res = await requestAttendanceAction(teacherId, eventId, 'Xác nhận tham gia qua dashboard');
      if (res.success) {
        toast.success(res.message);
        // Cập nhật UI local
        setEvents(prev => prev.map(e => 
          e.id === eventId ? { ...e, myAttendance: { status: 'present', is_verified: false } } : e
        ));
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error('Lỗi khi gửi yêu cầu.');
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const attendance = event.myAttendance;
        const startTime = new Date(event.start_time);
        
        let statusConfig = {
          label: 'Chưa điểm danh',
          color: 'text-red-500',
          bg: 'bg-red-50',
          icon: AlertCircle
        };

        if (attendance) {
          if (attendance.is_verified) {
            statusConfig = {
              label: 'Đã điểm danh',
              color: 'text-emerald-500',
              bg: 'bg-emerald-50',
              icon: CheckCircle2
            };
          } else {
            statusConfig = {
              label: 'Chờ xác nhận',
              color: 'text-amber-500',
              bg: 'bg-amber-50',
              icon: Clock
            };
          }
        }

        const StatusIcon = statusConfig.icon;

        return (
          <div 
            key={event.id}
            className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
               <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <Clock className="w-3 h-3" />
                     {format(startTime, 'HH:mm - dd/MM/yyyy', { locale: vi })}
                  </div>
                  <h4 className="text-lg font-black text-slate-800 leading-tight">{event.title}</h4>
               </div>
               <div className={cn(
                 "px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight",
                 statusConfig.bg, statusConfig.color
               )}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
               </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
               <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                     {[1,2,3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                           <User className="w-3 h-3" />
                        </div>
                     ))}
                     <div className="w-7 h-7 rounded-full border-2 border-white bg-orange-100 flex items-center justify-center text-[10px] font-black text-orange-600">
                        +
                     </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Đã tham gia đông đủ</p>
               </div>

               {!attendance && (
                  <button 
                    onClick={() => handleRequest(event.id)}
                    disabled={isSubmitting === event.id}
                    className="h-10 px-4 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    XÁC NHẬN
                  </button>
               )}
            </div>
          </div>
        );
      })}

      {events.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
           <p className="text-slate-400 font-bold">Không có sự kiện nào sắp tới.</p>
        </div>
      )}
    </div>
  );
}
