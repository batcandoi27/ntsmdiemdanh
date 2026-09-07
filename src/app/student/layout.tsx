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
    { href: '/student', label: 'Trung Tâm Lựa Chọn', icon: '⚡' },
    { href: '/student/study', label: 'Khu Vực Học Tập', icon: '🎓' },
    { href: '/student/pet', label: 'Khu Vực Giải Trí', icon: '🎮' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Header Bar (Light Theme) */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/student" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold">
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                CỔNG HỌC SINH
              </h1>
              <p className="text-[10px] text-slate-500 font-bold font-mono">TRƯỜNG THCS TRẦN BỘI CƠ</p>
            </div>
          </Link>

          {/* Quick Stats Bar */}
          <div className="flex items-center gap-2.5">
            {/* Chuỗi Streak */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
              <span className="text-xs">🔥</span>
              <span className="text-xs font-black text-amber-700">
                {pet?.streak_days ?? 1} ngày
              </span>
            </div>

            {/* Ví Coins */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-900 shadow-2xs">
              <span className="text-xs">🪙</span>
              <span className="text-xs font-black text-yellow-700">
                {pet?.total_coins ?? 0}
              </span>
            </div>

            {/* Bí danh Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                <SvgPet
                  branch={pet?.evolution_branch || 'cosmic'}
                  level={pet?.level ?? 1}
                  size={32}
                />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-black text-slate-800">
                  {pet?.anonymous_name || 'Học sinh'}
                </p>
                <p className="text-[10px] text-blue-600 font-bold">
                  Level {pet?.level ?? 1} • {pet?.level === 0 ? 'Ấp Trứng' : 'Linh Vật'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100 py-1.5">
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
        {children}
      </main>
    </div>
  );
}
