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
      className={`w-full sm:w-80 rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop-blur-2xl animate-in ${
        isMobileDrawer ? 'slide-in-from-bottom duration-200' : 'zoom-in-95 duration-150'
      } z-50 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile Drag Indicator */}
      <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SvgPet
              branch={vm.evolutionBranch}
              level={vm.level}
              customColor={vm.eggBaseColor}
              gender={vm.gender}
              size={56}
              className="filter drop-shadow-sm"
            />
            {isCurrentUser && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm">
                Tôi
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-slate-900 tracking-tight">
                {vm.displayLabel}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                Lv.{vm.level}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {vm.gender === 'female' ? '🌸 Nữ' : '⚡ Nam'}
              </span>
            </div>
            <p className="text-xs text-blue-700 font-bold truncate max-w-[160px]">
              {vm.anonymousName}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                {vm.level === 0 ? '🥚 Trứng Nguyên Vẹn' : vm.level < 5 ? '🐣 Nứt Vỏ' : vm.level < 10 ? '✨ Sơ Sinh' : '🦅 Trưởng Thành'}
              </span>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Progress & Stats Body */}
      <div className="mt-3.5 space-y-3">
        {/* XP Progress Bar */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 flex items-center gap-1 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Tiến Trình Cấp Độ
            </span>
            <span className="text-amber-700 font-bold font-mono">
              {vm.currentXp} / {vm.requiredXp} XP
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>Cần thêm: <strong className="text-rose-600">{vm.xpNeeded} XP</strong></span>
            <span>Tỉ lệ: <strong className="text-blue-700">{xpPercent}%</strong></span>
          </div>
        </div>

        {/* 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Vitality */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold">
              🍖
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Sinh Lực</span>
              <span className="font-black text-emerald-700">{vm.vitalityPercent}%</span>
            </div>
          </div>

          {/* Streak Days */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Chuỗi Ngày</span>
              <span className="font-black text-orange-700">{vm.streakDays} ngày</span>
            </div>
          </div>

          {/* Coins */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Tài Sản Xu</span>
              <span className="font-black text-amber-700">{vm.totalCoins} Xu</span>
            </div>
          </div>

          {/* Competition Score */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Thi Đua</span>
              <span className="font-black text-purple-700">+{vm.competitionScore}đ</span>
            </div>
          </div>
        </div>

        {/* Quota & Rebirth Token Strip */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1 font-medium">
              <RefreshCw className="w-3 h-3 text-blue-600" />
              Lượt Đổi Nhánh / Bí Danh:
            </span>
            <span className="font-bold text-blue-700 font-mono">
              {vm.evolutionChangesLeft}/3 nhánh • {vm.nicknameChangesLeft}/1 tên
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Phiếu Tẩy Tủy Tháng:
            </span>
            <span className="font-bold text-amber-700 font-mono">
              {vm.rebirthTokensCount} Phiếu 🔮
            </span>
          </div>
        </div>

        {/* Location & Completed Quests Footer */}
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-blue-900">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate max-w-[140px] font-bold">
              {vm.currentZone.icon} {vm.currentZone.vietnameseName.split('(')[0]}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-600 font-bold">
            <ScrollText className="w-3.5 h-3.5 text-emerald-600" />
            <span>{vm.completedQuestsCount} nhiệm vụ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
