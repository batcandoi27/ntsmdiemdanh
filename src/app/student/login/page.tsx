'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState('');
  const [pin, setPin] = useState('');
  const [className, setClassName] = useState('8A13');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      localStorage.setItem('tbc_student_session', JSON.stringify({
        studentCode: studentCode || 'HS-821',
        className: className || '8A13'
      }));
      router.push('/student');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-950 p-8 shadow-2xl backdrop-blur-xl">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/40 mb-3">
            🎓
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            Đăng Nhập Cổng Học Sinh
          </h2>
          <p className="text-xs text-indigo-300 mt-1">
            Không Gian Game Hóa & Nuôi Thú Ảo Ẩn Danh
          </p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mã Lớp Học:
            </label>
            <select
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
            >
              <option value="6A1">Lớp 6A1</option>
              <option value="6A2">Lớp 6A2</option>
              <option value="7A1">Lớp 7A1</option>
              <option value="8A13">Lớp 8A13</option>
              <option value="9A1">Lớp 9A1</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mã Học Sinh / Số Thứ Tự:
            </label>
            <input
              type="text"
              required
              placeholder="VD: HS01 hoặc STT 21"
              value={studentCode}
              onChange={e => setStudentCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mã PIN Bảo Mật (4 số):
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs text-center tracking-widest focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all duration-200 shadow-lg shadow-indigo-600/40 mt-2"
          >
            {isLoading ? 'Đang vào cổng...' : 'Vào Không Gian Học Sinh ➔'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Trường THCS Trần Bội Cơ • Năm học 2025 - 2026
          </p>
        </div>
      </div>
    </div>
  );
}
