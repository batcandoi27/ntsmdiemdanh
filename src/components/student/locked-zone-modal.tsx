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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-slate-900 flex items-center gap-2">
                Khu Vực Đang Bị Khóa!
              </h3>
              <p className="text-xs text-rose-600 font-bold">Yêu cầu cấp độ rèn luyện cao hơn</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zone Details */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{zone.icon}</span>
            <div>
              <h4 className="font-black text-slate-900 text-sm">{zone.vietnameseName}</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{zone.description}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">Yêu cầu cấp độ tối thiểu:</span>
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-black">
              Level {zone.minLevel}+
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Cấp độ hiện tại của bạn:</span>
            <span className="font-bold text-amber-700 font-mono">Level {currentUserLevel}</span>
          </div>
        </div>

        {/* Motivation Message */}
        <p className="text-xs text-blue-950 leading-relaxed bg-blue-50 p-3.5 rounded-2xl border border-blue-200 font-medium">
          💡 <strong>Hướng dẫn mở khóa:</strong> Bạn cần nâng thêm <strong>{levelsNeeded} Level</strong> để mở rộng tầm nhìn và cho phép thú cưng của bạn bước vào khám phá phân khu này. Hãy tích cực làm bài tập và hoàn thành nhiệm vụ mỗi ngày nhé!
        </p>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Đóng
          </button>

          <Link
            href="/student/quests"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Làm Nhiệm Vụ Kiếm XP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
};
