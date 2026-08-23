"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  CalendarCheck2,
  Printer,
  ChevronDown,
  School,
  ExternalLink,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Search,
  CheckCircle2,
  Clock,
  UserX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/services/db';
import { supabase } from '@/lib/supabase';
import { Class, Student } from '@/types/models';
import { useAuth } from '@/context/auth-context';
import { HelpGuideModal } from '@/components/homeroom/help-guide-modal';
import { getThemedTabClass } from '@/design-system';

const navItems = [
  { href: '/homeroom', label: '1. Tổng quan lớp', icon: LayoutDashboard },
  { href: '/homeroom/students', label: '2. Học sinh & Hồ sơ', icon: Users },
  { href: '/homeroom/organization', label: '3. Cơ cấu & Sơ đồ', icon: Award },
  { href: '/homeroom/events', label: '4. Sự việc & Nề nếp', icon: CalendarCheck2 },
  { href: '/homeroom/cooperation', label: '5. Phối hợp GD', icon: MessageSquare },
  { href: '/homeroom/handbook', label: '6. Sổ chủ nhiệm số', icon: BookOpen },
  { href: '/homeroom/print-center', label: '7. Trung tâm in ấn', icon: Printer },
];

export default function HomeroomLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser } = useAuth();

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Load danh sách lớp
  useEffect(() => {
    async function loadClasses() {
      try {
        const list = await db.getClasses();
        if (list && list.length > 0) {
          setClasses(list);
          const savedClassId = localStorage.getItem('homeroom_active_class_id');
          if (savedClassId && list.some(c => c.id === savedClassId)) {
            setSelectedClassId(savedClassId);
          } else {
            setSelectedClassId(list[0].id);
            localStorage.setItem('homeroom_active_class_id', list[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading classes for homeroom:', err);
      }
    }
    loadClasses();
  }, []);

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    localStorage.setItem('homeroom_active_class_id', classId);
    setIsClassDropdownOpen(false);
    window.dispatchEvent(new Event('homeroom_class_changed'));
  };

  const activeClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-app text-text-primary flex flex-col">
      
      {/* 1. TOP SUB-NAVBAR GVCN (Bố cục tự nhiên, không đè lấn SiteHeader) */}
      <div className="bg-surface-card border-b border-border-default shadow-xs transition-all shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Trái: Badge GVCN & Chọn lớp với Dropdown tường minh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <School className="w-4 h-4" />
              </div>
              <span className="font-black text-sm tracking-tight text-slate-900 hidden sm:inline whitespace-nowrap">
                GVCN TRỢ LÝ
              </span>
            </div>

            {/* Dropdown Selector chọn lớp (Tường minh nền trắng, chữ đen đậm, không trùng nền) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold transition-all shadow-sm"
              >
                <span>Lớp: {activeClass ? `Lớp ${activeClass.name}` : 'Đang tải...'}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-600 transition-transform", isClassDropdownOpen && "rotate-180")} />
              </button>

              {isClassDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-52 rounded-2xl bg-white border border-slate-300 shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    Chọn lớp chủ nhiệm:
                  </div>
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => handleSelectClass(cls.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between",
                        cls.id === selectedClassId
                          ? "bg-indigo-50 text-indigo-900 border border-indigo-200"
                          : "text-slate-800 hover:bg-slate-100 hover:text-slate-950"
                      )}
                    >
                      <span>Lớp {cls.name}</span>
                      {cls.id === selectedClassId && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Phải: Nút Hướng dẫn (?) & Link Cổng phụ huynh */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200 transition-colors shadow-sm"
              title="Xem hướng dẫn sử dụng"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Hướng dẫn (?)</span>
            </button>

            <Link
              href="/portal"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cổng Phụ Huynh</span>
            </Link>
          </div>
        </div>

        {/* Thanh Tabs Phân Hệ (Tự động tạo màu nền pastel khi Inactive & màu đậm rực rỡ khi Active) */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto pb-2.5 pt-1.5 scrollbar-none border-t border-slate-100">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs whitespace-nowrap transition-all duration-200",
                  getThemedTabClass(idx, isActive)
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. KHÔNG GIAN LÀM VIỆC CHÍNH (FULL WIDTH) */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6">
        <main className="w-full space-y-6">
          {children}
        </main>
      </div>

      {/* Modal Hướng Dẫn Toàn Diện */}
      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
