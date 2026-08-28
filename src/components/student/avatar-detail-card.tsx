'use client';

import React from 'react';
import { AvatarDetailVM } from '@/domain/classroom-world/types';
import { SvgPet } from './svg-pet';
import { Flame, Coins, Trophy, ScrollText, MapPin, Zap, X, Sparkles, RefreshCw } from 'lucide-react';

interface AvatarDetailCardProps {
  vm: AvatarDetailVM;
  isCurrentUser?: boolean;
  onClose?: () => void;
  className?: string;
  isMobileDrawer?: boolean;
}

export const AvatarDetailCard: React.FC<AvatarDetailCardProps> = ({
  vm,
  isCurrentUser = false,
  onClose,
  className = '',
  isMobileDrawer = false
}) => {
  const xpPercent = Math.min(100, Math.round((vm.currentXp / Math.max(1, vm.requiredXp)) * 100));

  return (
    <div
      className={`w-full sm:w-80 rounded-t-3xl sm:rounded-3xl border border-indigo-500/50 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-950 p-5 text-slate-100 shadow-2xl backdrop-blur-2xl animate-in ${
        isMobileDrawer ? 'slide-in-from-bottom duration-200' : 'zoom-in-95 duration-150'
      } z-50 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile Drag Indicator */}
      <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

      {/* Header */}
      <div className="flex items-start justify-between border-b border-indigo-950/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SvgPet
              branch={vm.evolutionBranch}
              level={vm.level}
              customColor={vm.eggBaseColor}
              gender={vm.gender}
              size={56}
              className="filter drop-shadow-lg"
            />
            {isCurrentUser && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm">
                Tôi
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-white tracking-tight">
                {vm.displayLabel}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-900 text-indigo-200 font-bold border border-indigo-700">
                Lv.{vm.level}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-semibold">
                {vm.gender === 'female' ? '🌸 Nữ' : '⚡ Nam'}
              </span>
            </div>
            <p className="text-xs text-indigo-300 font-semibold truncate max-w-[160px]">
              {vm.anonymousName}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                {vm.level === 0 ? '🥚 Trứng Nguyên Vẹn' : vm.level < 5 ? '🐣 Nứt Vỏ' : vm.level < 10 ? '✨ Sơ Sinh' : '🦅 Trưởng Thành'}
              </span>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Progress & Stats Body */}
      <div className="mt-3.5 space-y-3">
        {/* XP Progress Bar */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Tiến Trình Cấp Độ
            </span>
            <span className="text-amber-400 font-bold font-mono">
              {vm.currentXp} / {vm.requiredXp} XP
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Cần thêm: <strong className="text-rose-400">{vm.xpNeeded} XP</strong></span>
            <span>Tỉ lệ: <strong className="text-indigo-300">{xpPercent}%</strong></span>
          </div>
        </div>

        {/* 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Vitality */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold">
              🍖
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Sinh Lực</span>
              <span className="font-black text-emerald-400">{vm.vitalityPercent}%</span>
            </div>
          </div>

          {/* Streak Days */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-950/60 border border-orange-800 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Chuỗi Ngày</span>
              <span className="font-black text-orange-400">{vm.streakDays} ngày</span>
            </div>
          </div>

          {/* Coins */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800 flex items-center justify-center text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Tài Sản Xu</span>
              <span className="font-black text-amber-400">{vm.totalCoins} Xu</span>
            </div>
          </div>

          {/* Competition Score */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Thi Đua</span>
              <span className="font-black text-purple-300">+{vm.competitionScore}đ</span>
            </div>
          </div>
        </div>

        {/* Quota & Rebirth Token Strip */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              Lượt Đổi Nhánh / Bí Danh:
            </span>
            <span className="font-bold text-indigo-300 font-mono">
              {vm.evolutionChangesLeft}/3 nhánh • {vm.nicknameChangesLeft}/1 tên
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Phiếu Tẩy Tủy Tháng:
            </span>
            <span className="font-bold text-amber-400 font-mono">
              {vm.rebirthTokensCount} Phiếu 🔮
            </span>
          </div>
        </div>

        {/* Location & Completed Quests Footer */}
        <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-indigo-200">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[140px] font-semibold">
              {vm.currentZone.icon} {vm.currentZone.vietnameseName.split('(')[0]}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-300 font-medium">
            <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
            <span>{vm.completedQuestsCount} nhiệm vụ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
