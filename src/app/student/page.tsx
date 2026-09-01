'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SvgPet } from '@/components/student/svg-pet';
import { ClassroomWorldGrid } from '@/components/student/classroom-world-grid';
import { GlobalTopPodium } from '@/components/student/global-top-podium';
import { StudentPet } from '@/types/student-portal';
import { generateClassroomRoster } from '@/domain/classroom-world/roster-builder';
import { getISOWeekDetails } from '@/domain/quests/weekly-quest-engine';
import { soundscape } from '@/domain/sound/web-audio-soundscape';
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
  Home,
  Compass,
  CheckCircle2,
  Heart
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
      
      {/* 1. KHỐI TRỌNG TÂM: HÔM NAY CỦA EM & TIẾN BỘ TUẦN NÀY (GROWTH-FIRST HERO) */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/90 via-purple-950/60 to-slate-950 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-8">
          
          {/* Avatar Thú Cưng & Cột Mốc Cấp Độ Vĩnh Viễn */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div
              onClick={() => soundscape.playPetInteractSound(pet.evolution_branch)}
              className="cursor-pointer transition transform hover:scale-110 active:scale-95"
              title="Chạm vào người bạn đồng hành!"
            >
              <SvgPet
                branch={pet.evolution_branch}
                level={pet.level}
                vitality={pet.vitality_percent}
                isHibernating={pet.is_hibernating}
                size={80}
                showRankInsignia={true}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white">{pet.anonymous_name}</h2>
                <span className="text-xs px-3 py-0.5 rounded-full bg-indigo-600/90 text-white font-bold border border-indigo-400/40">
                  Cột Mốc Cấp {pet.level}
                </span>
                <span className="text-xs px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  {pet.total_coins} Xu
                </span>
              </div>
              
              <p className="text-xs text-indigo-200/90 mt-1.5 flex items-center gap-1.5">
                <span>🌱 Tiến độ tích lũy:</span>
                <span className="font-mono font-bold text-white">{pet.current_xp}/{xpRequiredNextLevel} XP</span>
                <span>({progressPercent}%)</span>
              </p>
              
              {/* Progress bar */}
              <div className="w-52 sm:w-64 h-2.5 bg-slate-900/90 rounded-full mt-2 overflow-hidden border border-slate-700/80 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Khối Lời Động Viên GVCN & Mục Tiêu Tiếp Theo */}
          <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-4 max-w-md w-full flex flex-col justify-between gap-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                📢 Lời Nhắn Nhủ GVCN
              </span>
              <span className="text-[11px] text-indigo-300 font-medium font-mono">
                Tuần {week} • Năm {year}
              </span>
            </div>
            
            <p className="text-xs text-slate-200 leading-relaxed italic">
              &ldquo;Chào mừng em trở lại không gian lớp học! Hãy tự tin hoàn thành nhiệm vụ theo nhịp độ riêng của mình nhé!&rdquo;
            </p>

            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>1 việc nhỏ hôm nay:</span>
              </span>
              <Link
                href="/student/quests"
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition active:scale-95 shadow-md shadow-indigo-600/30"
              >
                <span>Xem Nhiệm Vụ Tuần</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRID 3 THẺ TIẾN TRÌNH & THÓI QUEN (PERSONAL GROWTH CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Chuyên cần hôm nay */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 flex items-center gap-3.5 shadow-md">
          <div className="h-11 w-11 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Điểm danh hôm nay</p>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-400">Đã Có Mặt Đúng Giờ</h4>
            <p className="text-[10px] text-slate-500">Mã định danh: {studentCode}</p>
          </div>
        </div>

        {/* Card 2: Nhiệm vụ tuần đang mở */}
        <Link
          href="/student/quests"
          className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 flex items-center justify-between gap-3 shadow-md hover:border-indigo-500/50 transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-xl shrink-0">
              🎯
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Nhiệm vụ rèn luyện</p>
              <h4 className="text-xs sm:text-sm font-bold text-indigo-300 group-hover:text-indigo-200">
                Tuần {week} Đang Mở
              </h4>
              <p className="text-[10px] text-amber-400 font-medium">Tự do lựa chọn theo sức mình</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </Link>

        {/* Card 3: Nhịp độ rèn luyện mềm dẻo */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 flex items-center gap-3.5 shadow-md">
          <div className="h-11 w-11 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
            🔥
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Nhịp độ rèn luyện</p>
            <h4 className="text-xs sm:text-sm font-bold text-amber-400">{pet.streak_days} Ngày Tích Lũy</h4>
            <p className="text-[10px] text-slate-500">Tôn trọng nhịp học linh hoạt</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KHÔNG GIAN HỌC TẬP & LÀNG LỚP HỌC 2.5D ISOMETRIC */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Home className="w-4 h-4 text-indigo-400" />
            <span>Làng Học Tập Lớp {classCode} (Không Gian Sáng Tạo 2.5D)</span>
          </h3>
          <Link
            href="/student/map"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
          >
            <span>Mở Toàn Cảnh Bản Đồ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ClassroomWorldGrid
          classCode={classCode}
          students={fullRoster}
          currentPetId={pet.id}
          currentUserLevel={pet.level}
        />
      </div>

      {/* ========================================================================= */}
      {/* 4. DẢI BỤC VINH DANH TIẾN BỘ ẨN DANH (DISCOVERY & APPRECIATION) */}
      {/* ========================================================================= */}
      <div className="pt-4 border-t border-slate-800/60">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Góc Ghi Nhận Nỗ Lực Học Tập</span>
          </span>
        </div>
        <GlobalTopPodium classNameCode={classCode} students={fullRoster} />
      </div>

    </div>
  );
}
