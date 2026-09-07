'use client';

import React, { useState } from 'react';
import {
  Rocket,
  Users,
  Award,
  Sparkles,
  Heart,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function StudentCoopPage() {
  const [currentXp, setCurrentXp] = useState(1420);
  const targetXp = 2000;
  const fuelPercent = Math.min(100, Math.round((currentXp / targetXp) * 100));

  const [peerSent, setPeerSent] = useState<string | null>(null);

  const groups = [
    { id: 1, name: 'Tổ 1 • Chiến Binh Mặt Trời', points: 380, members: '11 Bạn', color: 'border-amber-200 bg-amber-50/50', icon: '☀️' },
    { id: 2, name: 'Tổ 2 • Biệt Đội Rừng Xanh', points: 340, members: '11 Bạn', color: 'border-emerald-200 bg-emerald-50/50', icon: '🌿' },
    { id: 3, name: 'Tổ 3 • Hải Âu Đại Dương', points: 410, members: '10 Bạn', color: 'border-blue-200 bg-blue-50/50', icon: '🌊' },
    { id: 4, name: 'Tổ 4 • Ánh Sáng Ngân Hà', points: 290, members: '11 Bạn', color: 'border-purple-200 bg-purple-50/50', icon: '✨' }
  ];

  const handleSendCheer = (groupName: string) => {
    setPeerSent(groupName);
    setTimeout(() => setPeerSent(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Header */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <Rocket className="w-6 h-6 text-blue-600" />
          <span>Phi Thuyền Không Gian & Tinh Thần Hợp Tác Lớp Học</span>
        </h2>
        <p className="text-xs text-slate-600 font-medium mt-1">
          Mỗi nỗ lực cá nhân đều góp phần vào hành trình chung của tập thể • Không ai bị bỏ lại phía sau
        </p>
      </div>

      {/* Main Spaceship Fuel Gauge */}
      <div className="rounded-3xl border-2 border-indigo-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-4xl shadow-2xs shrink-0">
              🛸
            </div>
            <div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                Mục Tiêu Tập Thể Tuần Này
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                Tàu Khám Phá Tri Thức Lớp 8A13
              </h3>
              <p className="text-xs text-blue-700 font-mono font-bold mt-0.5">
                Năng lượng tích lũy: {currentXp} / {targetXp} XP ({fuelPercent}%)
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl text-center shadow-2xs">
            <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider block">
              Phần Thưởng Chung Cả Lớp
            </span>
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 justify-center mt-0.5">
              🎬 Buổi Xem Phim Khoa Học Cuối Tuần
            </span>
          </div>
        </div>

        {/* Big Fuel Bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full mt-5 overflow-hidden border border-slate-200 p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 transition-all duration-700 shadow-md"
            style={{ width: `${fuelPercent}%` }}
          />
        </div>

        {/* Catch-up info */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Thời hạn tích lũy: Đến hết Chủ Nhật (Có cơ chế bù bài thoải mái)</span>
          </span>
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mở khóa từng nấc đóng góp</span>
          </span>
        </div>
      </div>

      {/* 4 Tổ Thi Đua & Đóng Góp */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Đóng Góp Năng Lượng 4 Tổ (Ghi Nhận Nỗ Lực Đồng Đội)</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between shadow-xs transition hover:shadow-md ${g.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{g.icon}</span>
                <span className="text-[10px] text-slate-500 font-bold">{g.members}</span>
              </div>

              <div className="my-2">
                <h4 className="text-xs font-bold text-slate-900">{g.name}</h4>
                <p className="text-base font-black text-blue-700 font-mono mt-0.5">+{g.points} XP</p>
              </div>

              <button
                type="button"
                onClick={() => handleSendCheer(g.name)}
                className="w-full mt-1 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold border border-slate-200 flex items-center justify-center gap-1 transition active:scale-95 shadow-2xs"
              >
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span>Gửi Lời Động Viên</span>
              </button>
            </div>
          ))}
        </div>

        {peerSent && (
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center text-xs font-bold text-blue-900 animate-in fade-in shadow-2xs">
            💖 Em đã gửi lời động viên và năng lượng tích cực tới {peerSent}! Cùng nhau tiến bộ nhé!
          </div>
        )}
      </div>

    </div>
  );
}
