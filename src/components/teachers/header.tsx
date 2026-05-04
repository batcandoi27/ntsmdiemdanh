'use client';

import { useState } from 'react';
import { Users, FileSpreadsheet, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import ImportTeacherModal from './import-teacher-modal';

interface HeaderProps {
  totalCount: number;
}

export default function TeacherManagementHeader({ totalCount }: HeaderProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="bg-blue-600 pt-12 pb-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-blue-100 hover:text-white transition-colors text-sm font-semibold group"
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </div>
              Quay lại Dashboard
            </Link>
            
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Users className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Hồ Sơ Giáo Viên</h1>
                <p className="text-blue-100 font-medium">Tổng số: <span className="text-white font-bold">{totalCount}</span> nhân sự</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-blue-50 text-blue-600 rounded-2xl font-black shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98]"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Import Dữ Liệu
            </button>
          </div>
        </div>
      </div>

      <ImportTeacherModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />
    </div>
  );
}
