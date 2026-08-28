'use client';

import React, { useState } from 'react';

export default function StudentCoopPage() {
  const [targetXp] = useState(3000);
  const [currentXp] = useState(1850);

  const groups = [
    { id: 'g1', name: 'Tổ 1: Phượng Hoàng Lửa', icon: '🦅', points: 520, color: 'border-rose-500/40 bg-rose-950/20' },
    { id: 'g2', name: 'Tổ 2: Rồng Biển Xanh', icon: '🐉', points: 480, color: 'border-blue-500/40 bg-blue-950/20' },
    { id: 'g3', name: 'Tổ 3: Hổ Trắng Rừng', icon: '🐅', points: 430, color: 'border-emerald-500/40 bg-emerald-950/20' },
    { id: 'g4', name: 'Tổ 4: Kỳ Lân Sao Băng', icon: '🦄', points: 420, color: 'border-purple-500/40 bg-purple-950/20' }
  ];

  const fuelPercent = Math.min(100, Math.round((currentXp / targetXp) * 100));

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          🚀 Tàu Vũ Trụ Lớp Học & Năng Lượng Đồng Đội (Co-op)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Mỗi bài tập hoàn thành đều nạp nhiên liệu bay cho con tàu lớp • Cùng nhau mở khóa phần thưởng chung
        </p>
      </div>

      {/* Main Spaceship Fuel Gauge */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-purple-950/50 p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-4xl shadow-inner animate-pulse">
              🛸
            </div>
            <div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-900 text-indigo-300 font-bold border border-indigo-700">
                Nhiệm Vụ Tuần 35
              </span>
              <h3 className="text-lg font-black text-slate-100 mt-1">
                Tàu Khám Phá Tri Thức Lớp 8A13
              </h3>
              <p className="text-xs text-indigo-300">
                Năng lượng: {currentXp} / {targetXp} XP ({fuelPercent}%)
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/30 px-4 py-2.5 rounded-2xl text-center">
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
              Phần Thưởng Chung
            </span>
            <span className="text-xs font-bold text-slate-100">
              🎬 Chiếu Phim Khoa Học Cuối Tuần
            </span>
          </div>
        </div>

        {/* Big Fuel Bar */}
        <div className="w-full h-4 bg-slate-950 rounded-full mt-6 overflow-hidden border border-slate-800 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 transition-all duration-700 shadow-lg shadow-indigo-500/50"
            style={{ width: `${fuelPercent}%` }}
          />
        </div>
      </div>

      {/* 4 Tổ Thi Đua & Linh Vật Tổ */}
      <div>
        <h3 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
          🛡️ Đóng Góp Năng Lượng Theo 4 Tổ
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {groups.map(g => (
            <div
              key={g.id}
              className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center shadow-lg transition hover:scale-105 ${g.color}`}
            >
              <span className="text-3xl my-1">{g.icon}</span>
              <h4 className="text-xs font-bold text-slate-200 mt-1">{g.name}</h4>
              <p className="text-sm font-black text-indigo-400 mt-1">+{g.points} XP</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
