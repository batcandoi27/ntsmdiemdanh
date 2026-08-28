'use client';

import React from 'react';
import { ZoneDefinition } from '@/domain/classroom-world/types';
import { Lock, Sparkles, ArrowRight, X, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface LockedZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: ZoneDefinition | null;
  currentUserLevel: number;
}

export const LockedZoneModal: React.FC<LockedZoneModalProps> = ({
  isOpen,
  onClose,
  zone,
  currentUserLevel
}) => {
  if (!isOpen || !zone) return null;

  const levelsNeeded = Math.max(1, zone.minLevel - currentUserLevel);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-indigo-950/60 to-slate-950 rounded-3xl border border-rose-500/40 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-150 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-md">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                Khu Vực Đang Bị Khóa!
              </h3>
              <p className="text-xs text-rose-300 font-medium">Yêu cầu cấp độ rèn luyện cao hơn</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zone Details */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{zone.icon}</span>
            <div>
              <h4 className="font-bold text-white text-sm">{zone.vietnameseName}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{zone.description}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Yêu cầu cấp độ tối thiểu:</span>
            <span className="px-2.5 py-1 rounded-full bg-rose-900 text-rose-200 border border-rose-700 font-black">
              Level {zone.minLevel}+
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Cấp độ hiện tại của bạn:</span>
            <span className="font-bold text-amber-400">Level {currentUserLevel}</span>
          </div>
        </div>

        {/* Motivation Message */}
        <p className="text-xs text-slate-300 leading-relaxed bg-indigo-950/30 p-3 rounded-xl border border-indigo-900/40">
          💡 <strong>Hướng dẫn mở khóa:</strong> Bạn cần nâng thêm <strong>{levelsNeeded} Level</strong> để mở rộng tầm nhìn và cho phép thú cưng của bạn bước vào khám phá phân khu này. Hãy tích cực làm bài tập và hoàn thành nhiệm vụ mỗi ngày nhé!
        </p>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Đóng
          </button>

          <Link
            href="/student/quests"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Làm Nhiệm Vụ Kiếm XP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
};
