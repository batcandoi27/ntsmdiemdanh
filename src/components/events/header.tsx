'use client';

import { useState } from 'react';
import { Calendar, Plus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import CreateEventModal from './create-event-modal';

interface HeaderProps {
  totalCount: number;
}

export default function EventManagementHeader({ totalCount }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="bg-orange-500 pt-12 pb-24 px-4 md:px-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400 rounded-full -mr-20 -mt-20 opacity-20 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-600 rounded-full -ml-10 -mb-10 opacity-30 blur-2xl" />

      <div className="max-w-7xl mx-auto relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-5">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-orange-50 hover:text-white transition-colors text-sm font-black uppercase tracking-widest group"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </div>
              Dashboard
            </Link>
            
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/30 shadow-2xl">
                <Calendar className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Hội Họp & Sự Kiện</h1>
                <p className="text-orange-50 font-bold text-lg mt-1 opacity-90">Hiện có <span className="text-white underline decoration-wavy decoration-white/40">{totalCount}</span> sự kiện trong hệ thống</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-white hover:bg-orange-50 text-orange-600 rounded-[24px] font-black shadow-2xl shadow-orange-950/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-6 h-6" />
            TẠO SỰ KIỆN MỚI
          </button>
        </div>
      </div>

      <CreateEventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        organizerId="system" // Thực tế sẽ lấy từ session
      />
    </div>
  );
}
