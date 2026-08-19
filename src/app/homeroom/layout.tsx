"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Grid,
  FileSpreadsheet,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Printer,
  ChevronLeft,
  School,
  ExternalLink,
  ShieldAlert,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/services/db';
import { Class } from '@/types/models';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: '1. Tổng quan lớp', href: '/homeroom', icon: LayoutDashboard },
  { name: '2. Học sinh & Hồ sơ', href: '/homeroom/students', icon: Users },
  { name: '3. Cơ cấu & Sơ đồ lớp', href: '/homeroom/organization', icon: Grid },
  { name: '4. Sự việc & Can thiệp', href: '/homeroom/events', icon: AlertCircle },
  { name: '5. Phối hợp giáo dục', href: '/homeroom/cooperation', icon: MessageSquare },
  { name: '6. Sổ chủ nhiệm số', href: '/homeroom/handbook', icon: BookOpen },
  { name: '7. Trung tâm in ấn', href: '/homeroom/print-center', icon: Printer, badge: 'HOT' },
];

export default function HomeroomLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser } = useAuth();

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tải danh sách lớp
  useEffect(() => {
    async function loadClasses() {
      try {
        setLoading(true);
        const list = await db.getClasses();
        setClasses(list || []);

        // Xác định lớp chủ nhiệm mặc định của user
        if (list && list.length > 0) {
          const savedClass = localStorage.getItem('homeroom_selected_class');
          if (savedClass && list.some(c => c.id === savedClass)) {
            setSelectedClassId(savedClass);
          } else {
            // Ưu tiên lớp mà user là GVCN
            const myClass = list.find(c => c.teacherId === appUser?.uid || (appUser?.assignedClassIds && appUser.assignedClassIds.includes(c.id)));
            const chosen = myClass ? myClass.id : list[0].id;
            setSelectedClassId(chosen);
            localStorage.setItem('homeroom_selected_class', chosen);
          }
        }
      } catch (err) {
        console.error('Error loading classes for homeroom:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, [appUser]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    localStorage.setItem('homeroom_selected_class', classId);
    window.dispatchEvent(new CustomEvent('homeroom:class_changed', { detail: { classId } }));
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-950/80 border-r border-slate-800/80 backdrop-blur-xl p-4 shrink-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 py-3 mb-4 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-white">GVCN TRỢ LÝ</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">v1.0</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">THCS Trần Bội Cơ</p>
            </div>
          </Link>
        </div>

        {/* Chọn Lớp Học */}
        <div className="mb-6 px-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Lớp chủ nhiệm đang chọn
          </label>
          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-slate-900 text-white">
                  Lớp {cls.name} ({cls.totalStudents || 0} HS) {cls.teacherName ? `— GV: ${cls.teacherName}` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400")} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Shortcut to Parent Portal */}
        <div className="pt-4 mt-auto border-t border-slate-800/80 space-y-2">
          <Link
            href="/portal"
            target="_blank"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xem Cổng Phụ Huynh</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Về Trang chủ chung</span>
          </Link>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <School className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">GVCN: Lớp {selectedClass?.name || selectedClassId}</h1>
            <p className="text-[10px] text-slate-400 font-medium">THCS Trần Bội Cơ</p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-slate-950/95 backdrop-blur-xl z-30 p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">Chọn lớp</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                handleClassChange(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>Lớp {cls.name}</option>
              ))}
            </select>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold",
                  pathname === item.href ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-900"
                )}
              >
                <span>{item.name}</span>
                {item.badge && <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded">{item.badge}</span>}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto bg-slate-900">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
