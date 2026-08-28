'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SvgPet } from '@/components/student/svg-pet';
import { ClassroomWorldGrid } from '@/components/student/classroom-world-grid';
import { GlobalTopPodium } from '@/components/student/global-top-podium';
import { StudentPet } from '@/types/student-portal';
import { generateClassroomRoster } from '@/domain/classroom-world/roster-builder';
import { getISOWeekDetails } from '@/domain/quests/weekly-quest-engine';
import {
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Target,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  Home
} from 'lucide-react';

export default function StudentDashboardPage() {
  const classCode = '8A13';
  const studentCode = '8A13_#821';
  const { week, year } = getISOWeekDetails();

  const [pet, setPet] = useState<StudentPet>({
    id: 'mock-pet-01',
    student_id: 'mock-pet-01',
    class_id: classCode,
    anonymous_name: 'Phượng Hoàng Băng #821',
    anonymous_avatar_code: 'cosmic_egg',
    evolution_branch: 'cosmic',
    level: 1,
    current_xp: 45,
    vitality_percent: 100,
    streak_days: 14,
    is_hibernating: false,
    total_coins: 120,
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const fullRoster = generateClassroomRoster(classCode, 43);
  const xpRequiredNextLevel = Math.round(100 * Math.pow(1.5, Math.max(0, pet.level)));
  const progressPercent = Math.min(100, Math.round((pet.current_xp / xpRequiredNextLevel) * 100));

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      
      {/* 1. Global Floating Podium Strip (Anonymous Leaderboard Top 3) */}
      <GlobalTopPodium classNameCode={classCode} students={fullRoster} />

      {/* 2. Banner Chào Mừng & Lời Dặn Dò GVCN */}
      <div className="rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-950 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4">
            <SvgPet
              branch={pet.evolution_branch}
              level={pet.level}
              vitality={pet.vitality_percent}
              isHibernating={pet.is_hibernating}
              size={72}
              showRankInsignia={true}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">{pet.anonymous_name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                  Level {pet.level}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  {pet.total_coins} Xu
                </span>
              </div>
              <p className="text-xs text-indigo-300 mt-1">
                Tiến trình lên Level {pet.level + 1}: {pet.current_xp}/{xpRequiredNextLevel} XP ({progressPercent}%)
              </p>
              {/* Progress bar */}
              <div className="w-48 sm:w-56 h-2 bg-slate-900 rounded-full mt-2 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Dặn Dò GVCN & Nút Nhiệm Vụ Tuần */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 max-w-md w-full flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                📢 Lời Dặn Dò GVCN
              </span>
              <Link
                href="/student/quests"
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black flex items-center gap-1 transition active:scale-95 shadow-md shadow-indigo-600/30"
              >
                <span>Nhiệm Vụ Tuần {week}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              &ldquo;Chào mừng các em đến với Metaverse Lớp Học! Hãy hoàn thành nhiệm vụ tuần để rèn luyện nề nếp, tích lũy XP và sắm sửa nội thất cho căn cứ nhé!&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* 3. Grid 3 Thẻ Trạng Thái Nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Chuyên cần hôm nay */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 flex items-center gap-3.5 shadow-md">
          <div className="h-11 w-11 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
            ✅
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Điểm danh hôm nay</p>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-400">Đã Có Mặt Đúng Giờ</h4>
            <p className="text-[10px] text-slate-500">Mã học sinh: {studentCode}</p>
          </div>
        </div>

        {/* Card 2: Nhiệm vụ tuần đang mở */}
        <Link
          href="/student/quests"
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 flex items-center justify-between gap-3 shadow-md hover:border-indigo-500/50 transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-xl shrink-0">
              🎯
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Nhiệm vụ tuần {week}</p>
              <h4 className="text-xs sm:text-sm font-bold text-indigo-300 group-hover:text-indigo-200">
                1 Nhiệm Vụ Cố Định
              </h4>
              <p className="text-[10px] text-amber-400 font-bold">+35 XP • +15 Xu thưởng</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </Link>

        {/* Card 3: Chuỗi Streak */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 flex items-center gap-3.5 shadow-md">
          <div className="h-11 w-11 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
            🔥
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Chuỗi chuyên cần</p>
            <h4 className="text-xs sm:text-sm font-bold text-amber-400">{pet.streak_days} Ngày Liên Tục</h4>
            <p className="text-[10px] text-slate-500">Mốc tiếp theo: 21 ngày nhận Rương Vàng</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. METAVERSE LÀNG LỚP HỌC 2D INTERACTIVE WORLD (HERO SHOWCASE) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <ClassroomWorldGrid
          classCode={classCode}
          students={fullRoster}
          currentPetId={pet.id}
          currentUserLevel={pet.level}
        />
      </div>

    </div>
  );
}
