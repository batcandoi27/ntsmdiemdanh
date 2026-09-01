'use client';

import React, { useState } from 'react';
import {
  Rocket,
  Sparkles,
  Heart,
  Users,
  ShieldCheck,
  Award,
  ArrowRight,
  MessageCircleHeart,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function StudentCoopPage() {
  const [targetXp] = useState(3000);
  const [currentXp] = useState(1850);
  const [peerSent, setPeerSent] = useState<string | null>(null);

  const groups = [
    { id: 'g1', name: 'Tổ 1: Phượng Hoàng', icon: '🦅', points: 520, members: '11 bạn', color: 'border-rose-500/40 bg-rose-950/20' },
    { id: 'g2', name: 'Tổ 2: Rồng Biển Xanh', icon: '🐉', points: 480, members: '11 bạn', color: 'border-blue-500/40 bg-blue-950/20' },
    { id: 'g3', name: 'Tổ 3: Hổ Trắng Rừng', icon: '🐅', points: 430, members: '11 bạn', color: 'border-emerald-500/40 bg-emerald-950/20' },
    { id: 'g4', name: 'Tổ 4: Kỳ Lân Sao Băng', icon: '🦄', points: 420, members: '10 bạn', color: 'border-purple-500/40 bg-purple-950/20' }
  ];

  const fuelPercent = Math.min(100, Math.round((currentXp / targetXp) * 100));

  const handleSendCheer = (groupName: string) => {
    setPeerSent(groupName);
    setTimeout(() => setPeerSent(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2.5">
          <Rocket className="w-6 h-6 text-indigo-400" />
          <span>Phi Thuyền Không Gian & Tinh Thần Hợp Tác Lớp Học</span>
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          Mỗi nỗ lực cá nhân đều góp phần vào hành trình chung của tập thể • Không ai bị bỏ lại phía sau
        </p>
      </div>

      {/* Main Spaceship Fuel Gauge */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-purple-950/50 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-4xl shadow-inner animate-pulse shrink-0">
              🛸
            </div>
            <div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-900 text-indigo-300 font-bold border border-indigo-700">
                Mục Tiêu Tập Thể Tuần Này
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-100 mt-1">
                Tàu Khám Phá Tri Thức Lớp 8A13
              </h3>
              <p className="text-xs text-indigo-300 font-mono font-bold mt-0.5">
                Năng lượng tích lũy: {currentXp} / {targetXp} XP ({fuelPercent}%)
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/30 px-4 py-2.5 rounded-2xl text-center shadow-md">
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
              Phần Thưởng Chung Cả Lớp
            </span>
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 justify-center mt-0.5">
              🎬 Buổi Xem Phim Khoa Học Cuối Tuần
            </span>
          </div>
        </div>

        {/* Big Fuel Bar */}
        <div className="w-full h-4 bg-slate-950 rounded-full mt-5 overflow-hidden border border-slate-800 p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 transition-all duration-700 shadow-lg shadow-indigo-500/50"
            style={{ width: `${fuelPercent}%` }}
          />
        </div>

        {/* Catch-up info */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Thời hạn tích lũy: Đến hết Chủ Nhật (Có cơ chế bù bài thoải mái)</span>
          </span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mở khóa từng nấc đóng góp</span>
          </span>
        </div>
      </div>

      {/* 4 Tổ Thi Đua & Đóng Góp */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Đóng Góp Năng Lượng 4 Tổ (Ghi Nhận Nỗ Lực Đồng Đội)</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between shadow-lg transition hover:border-indigo-400/50 ${g.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{g.icon}</span>
                <span className="text-[10px] text-slate-400 font-medium">{g.members}</span>
              </div>

              <div className="my-2">
                <h4 className="text-xs font-bold text-slate-200">{g.name}</h4>
                <p className="text-base font-black text-indigo-300 font-mono mt-0.5">+{g.points} XP</p>
              </div>

              <button
                type="button"
                onClick={() => handleSendCheer(g.name)}
                className="w-full mt-1 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-indigo-300 hover:text-white text-[11px] font-bold border border-indigo-900/60 flex items-center justify-center gap-1 transition active:scale-95"
              >
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                <span>Gửi Lời Động Viên</span>
              </button>
            </div>
          ))}
        </div>

        {peerSent && (
          <div className="p-3 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-center text-xs font-bold text-indigo-200 animate-in fade-in">
            💖 Em đã gửi lời động viên và năng lượng tích cực tới {peerSent}! Cùng nhau tiến bộ nhé!
          </div>
        )}
      </div>

      {/* Triết Lý Đồng Đội */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="leading-relaxed">
          <strong>Tinh thần lớp học:</strong> Mỗi thành viên đều có thế mạnh riêng. Sự tiến bộ của từng bạn — dù nhỏ nhất — đều là động lực lớn lao giúp phi thuyền cả lớp bay xa hơn!
        </p>
      </div>
    </div>
  );
}
