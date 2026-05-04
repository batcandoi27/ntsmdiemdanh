'use client';

import { TeacherEvent } from '@/types/teacher';
import Link from 'next/link';
import { Calendar, MapPin, Users, Clock, QrCode, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useState } from 'react';
import QRDisplayModal from './qr-display-modal';

interface EventListProps {
  events: TeacherEvent[];
}

export default function EventList({ events }: EventListProps) {
  const [selectedEvent, setSelectedEvent] = useState<TeacherEvent | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {events.map((event) => (
        <div 
          key={event.id}
          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group flex flex-col"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-wider">
                  {event.recurrence === 'once' ? 'Sự kiện 1 lần' : 'Định kỳ'}
                </span>
                {new Date(event.start_time) < new Date() && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                    Đã diễn ra
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black text-gray-800 leading-tight group-hover:text-orange-600 transition-colors">
                {event.title}
              </h3>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3 mb-8 flex-1">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold">
                {format(new Date(event.start_time), 'EEEE, dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold">
                {format(new Date(event.start_time), 'HH:mm')}
                {event.end_time && ` - ${format(new Date(event.end_time), 'HH:mm')}`}
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex flex-wrap gap-1">
                {event.groups?.map(g => (
                  <span key={g.id} className="text-xs px-2 py-0.5 bg-gray-100 rounded-md font-medium text-gray-600">
                    {g.name}
                  </span>
                )) || <span className="text-sm">Tất cả giáo viên</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedEvent(event)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
            >
              <QrCode className="w-5 h-5" />
              Mở QR Điểm Danh
            </button>
            <Link 
              href={`/admin/events/${event.id}/attendance`}
              className="px-4 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-orange-500 rounded-2xl transition-all border border-gray-100"
            >
              <CheckCircle2 className="w-5 h-5" />
            </Link>
          </div>
        </div>
      ))}

      {events.length === 0 && (
        <div className="col-span-full text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-orange-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có sự kiện nào</h3>
          <p className="text-gray-400 font-medium">Bấm "Tạo sự kiện mới" để bắt đầu thiết lập lịch họp.</p>
        </div>
      )}
      {selectedEvent && (
        <QRDisplayModal 
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
        />
      )}
    </div>
  );
}
