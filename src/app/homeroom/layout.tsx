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
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

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

  // Load danh sách học sinh của lớp đang chọn
  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId) return;
      setLoadingStudents(true);
      try {
        const stList = await db.getStudentsByClass(selectedClassId);
        setStudents(stList || []);
      } catch (err) {
        console.error('Error loading students for sidebar:', err);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, [selectedClassId]);

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    localStorage.setItem('homeroom_active_class_id', classId);
    setIsClassDropdownOpen(false);
    window.dispatchEvent(new Event('homeroom_class_changed'));
  };

  const activeClass = classes.find(c => c.id === selectedClassId);

  // Lọc học sinh theo ô tìm kiếm
  const filteredStudents = students.filter(st => {
    const name = (st as any).full_name || (st as any).name || '';
    const code = st.code || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100/70 text-slate-900 flex flex-col">
      
      {/* 1. TOP SUB-NAVBAR GVCN (Bố cục tự nhiên, không đè lấn SiteHeader) */}
      <div className="bg-white border-b border-slate-200 shadow-sm transition-all shrink-0">
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

        {/* Thanh Tabs Phân Hệ (Chuẩn hóa độ tương phản cao WCAG AA) */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-none border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. TWO-PANE WORKSPACE LAYOUT (GIAO DIỆN 2 CỬA SỔ) */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* CỬA SỔ TRÁI: MASTER LIST (Danh sách học sinh & Tác vụ nhanh) */}
        <aside className="w-full lg:w-80 shrink-0 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col h-auto lg:h-[calc(100vh-13rem)] lg:sticky lg:top-4 overflow-hidden">
          
          {/* Header Cửa Sổ Trái */}
          <div className="space-y-3 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 tracking-tight">
                  Danh Sách Lớp {activeClass ? `Lớp ${activeClass.name}` : ''}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Sĩ số: <span className="font-bold text-slate-800">{students.length} học sinh</span>
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                2025-2026
              </span>
            </div>

            {/* Ô tìm kiếm nhanh học sinh */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên hoặc mã HS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          {/* Danh sách học sinh cuộn độc lập (Scrollable Master List) */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pt-3 pr-1">
            {loadingStudents ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                Đang tải danh sách học sinh...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                Không tìm thấy học sinh phù hợp.
              </div>
            ) : (
              filteredStudents.map((st, idx) => {
                const studentName = (st as any).full_name || (st as any).name || 'Học sinh';
                const isFemale = (st as any).gender === 'female' || (st as any).gender === 'F' || (st as any).gender === 'Nữ';
                return (
                  <Link
                    key={st.id}
                    href={`/homeroom/students`}
                    className="w-full text-left p-2.5 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-slate-50/60 hover:bg-indigo-50/60 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center shrink-0">
                        {studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 truncate">
                          {studentName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {st.code || `STT ${idx + 1}`}
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border",
                      isFemale ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {isFemale ? 'Nữ' : 'Nam'}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          {/* Quick Actions Footer của Cửa Sổ Trái */}
          <div className="pt-3 border-t border-slate-100 shrink-0 flex items-center justify-between text-xs">
            <Link
              href="/quick-attendance"
              className="text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1"
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Điểm danh ngay</span>
            </Link>
            <Link
              href="/homeroom/print-center"
              className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In biểu mẫu</span>
            </Link>
          </div>
        </aside>

        {/* CỬA SỔ PHẢI: DETAIL WORKSPACE (Không gian làm việc chính, min-w-0) */}
        <main className="flex-1 min-w-0 space-y-6">
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
