'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SvgPet } from '@/components/student/svg-pet';
import { StudentPet } from '@/types/student-portal';

import { GlobalTopPodium } from '@/components/student/global-top-podium';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pet, setPet] = useState<StudentPet | null>(null);

  useEffect(() => {
    // Đọc session học sinh từ localStorage hoặc fallback
    const saved = localStorage.getItem('tbc_student_pet_session');
    if (saved) {
      try {
        setPet(JSON.parse(saved));
      } catch {
        // Ignore
      }
    } else {
      setPet({
        id: 'mock-pet',
        student_id: 'std-1',
        class_id: '8A13',
        anonymous_name: 'Phượng Hoàng Băng #821',
        anonymous_avatar_code: 'cosmic_egg',
        evolution_branch: 'cosmic',
        level: 1,
        current_xp: 45,
        vitality_percent: 100,
        streak_days: 14,
        is_hibernating: false,
        total_coins: 35,
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }, []);

  const navLinks = [
    { href: '/student', label: 'Tổng Quan', icon: '⚡' },
    { href: '/student/pet', label: 'Thú Cưng SVG', icon: '🥚' },
    { href: '/student/quests', label: 'Nhiệm Vụ', icon: '🎯' },
    { href: '/student/map', label: 'Làng Lớp Học', icon: '🏡' },
    { href: '/student/coop', label: 'Tàu Vũ Trụ', icon: '🚀' },
    { href: '/student/records', label: 'Tự Rèn Luyện', icon: '📖' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/student" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                CỔNG HỌC SINH
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">THCS TRẦN BỘI CƠ</p>
            </div>
          </Link>

          {/* Quick Stats Bar */}
          <div className="flex items-center gap-3">
            {/* Chuỗi Streak */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold text-amber-400">
                {pet?.streak_days ?? 1} ngày
              </span>
            </div>

            {/* Ví Coins */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 shadow-inner">
              <span className="text-sm">🪙</span>
              <span className="text-xs font-bold text-amber-300">
                {pet?.total_coins ?? 0}
              </span>
            </div>

            {/* Bí danh Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <SvgPet
                branch={pet?.evolution_branch || 'cosmic'}
                level={pet?.level ?? 1}
                size={36}
              />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-200">
                  {pet?.anonymous_name || 'Học sinh ẩn danh'}
                </p>
                <p className="text-[10px] text-indigo-400 font-medium">
                  Level {pet?.level ?? 1} • {pet?.level === 0 ? 'Ấp Trứng' : 'Linh Vật'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/40 py-1">
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <GlobalTopPodium classNameCode="8A13" />
        {children}
      </main>
    </div>
  );
}
