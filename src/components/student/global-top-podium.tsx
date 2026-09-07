'use client';

import React, { useState } from 'react';
import { Trophy, Flame, Zap, ScrollText, Sparkles, X, ChevronRight } from 'lucide-react';
import { SvgPet } from './svg-pet';
import { StudentRosterItem } from '@/domain/classroom-world/types';
import { generateClassroomRoster } from '@/domain/classroom-world/roster-builder';

interface GlobalTopPodiumProps {
  classNameCode?: string;
  students?: StudentRosterItem[];
}

export const GlobalTopPodium: React.FC<GlobalTopPodiumProps> = ({
  classNameCode = '8A13',
  students
}) => {
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'xp' | 'streak' | 'quests' | 'competition'>('xp');

  const roster = students && students.length > 0 ? students : generateClassroomRoster(classNameCode, 43);

  // Sắp xếp danh sách theo từng tiêu chí
  const sortedByXp = [...roster].sort((a, b) => (b.currentXp ?? 0) - (a.currentXp ?? 0));
  const sortedByStreak = [...roster].sort((a, b) => (b.streakDays ?? 0) - (a.streakDays ?? 0));
  const sortedByQuests = [...roster].sort((a, b) => (b.completedQuestsCount ?? 0) - (a.completedQuestsCount ?? 0));
  const sortedByCompetition = [...roster].sort((a, b) => (b.competitionScore ?? 0) - (a.competitionScore ?? 0));

  const currentList =
    activeTab === 'xp'
      ? sortedByXp
      : activeTab === 'streak'
      ? sortedByStreak
      : activeTab === 'quests'
      ? sortedByQuests
      : sortedByCompetition;

  const top3 = sortedByXp.slice(0, 3);

  return (
    <>
      {/* 1. Global Floating Podium Strip */}
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-900 mb-6">
        
        {/* Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
            <Trophy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                👑 Bảng Vàng Top 3 Lớp {classNameCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Bảo vệ danh tính • Chỉ hiển thị bí danh & linh vật</p>
          </div>
        </div>

        {/* Top 3 Avatars Strip */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-1 max-w-xl">
          {top3.map((st, idx) => {
            const medals = ['🥇', '🥈', '🥉'];
            const cardStyles = [
              'border-amber-300 bg-amber-50/60 shadow-2xs',
              'border-slate-300 bg-slate-50/60 shadow-2xs',
              'border-orange-300 bg-orange-50/40 shadow-2xs'
            ];

            return (
              <div
                key={st.id}
                onClick={() => setIsLeaderboardOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border cursor-pointer hover:scale-105 transition-all ${cardStyles[idx]}`}
              >
                <span className="text-base">{medals[idx]}</span>
                <SvgPet
                  branch={st.evolutionBranch}
                  level={st.level}
                  customColor={st.eggBaseColor}
                  gender={st.gender}
                  size={32}
                />
                <div className="text-left">
                  {/* ANONYMOUS NICKNAME ONLY */}
                  <span className="font-black text-xs text-slate-900 block leading-tight truncate max-w-[110px]">
                    {st.anonymousName}
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono font-bold">
                    {st.currentXp} XP
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        <button
          type="button"
          onClick={() => setIsLeaderboardOpen(true)}
          className="shrink-0 px-4 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
        >
          <span>Xem Bảng Xếp Hạng</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Full Classroom Leaderboard Modal */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 text-slate-900 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                    Bảng Xếp Hạng Lớp {classNameCode}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Bảo mật danh tính • Chỉ hiển thị Bí Danh & Linh Vật của từng học sinh
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('xp')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'xp'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Kinh Nghiệm XP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('streak')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'streak'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Chuỗi Ngày Học</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quests')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'quests'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Nhiệm Vụ Tuần</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('competition')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'competition'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Điểm Thi Đua</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {currentList.map((st, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const medals = ['🥇', '🥈', '🥉'];

                return (
                  <div
                    key={st.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                      isTop3
                        ? 'bg-blue-50/50 border-blue-200 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-black text-sm text-slate-600">
                        {isTop3 ? medals[idx] : `#${rank}`}
                      </span>

                      <SvgPet
                        branch={st.evolutionBranch}
                        level={st.level}
                        customColor={st.eggBaseColor}
                        gender={st.gender}
                        size={40}
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          {/* ANONYMOUS NICKNAME ONLY */}
                          <span className="font-black text-sm text-slate-900">{st.anonymousName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold">
                            Lv.{st.level}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium block">
                          Nhánh {st.evolutionBranch === 'cosmic' ? 'Vũ Trụ' : st.evolutionBranch === 'nature' ? 'Thiên Nhiên' : 'Công Nghệ'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {activeTab === 'xp' && (
                        <div>
                          <span className="text-sm font-black text-blue-700 font-mono block">
                            {st.currentXp} XP
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">{st.totalCoins} Xu</span>
                        </div>
                      )}

                      {activeTab === 'streak' && (
                        <div>
                          <span className="text-sm font-black text-orange-600 font-mono block flex items-center justify-end gap-1">
                            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                            {st.streakDays} Ngày
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Liên tục</span>
                        </div>
                      )}

                      {activeTab === 'quests' && (
                        <div>
                          <span className="text-sm font-black text-emerald-600 font-mono block">
                            {st.completedQuestsCount} NV
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Đã hoàn thành</span>
                        </div>
                      )}

                      {activeTab === 'competition' && (
                        <div>
                          <span className="text-sm font-black text-purple-700 font-mono block">
                            {st.competitionScore} Điểm
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Thi đua tuần</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
              <span>Đang hiển thị {currentList.length} thành viên lớp {classNameCode}</span>
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
