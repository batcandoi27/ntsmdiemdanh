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

    const isTest = className === '9A_TEST' || studentCode.toUpperCase().includes('TEST');
    const studentName = isTest ? 'Trần Thử Nghiệm' : 'Nguyễn Văn An';

    setTimeout(() => {
      localStorage.setItem('tbc_student_session', JSON.stringify({
        studentCode: studentCode || (isTest ? 'TEST9999' : 'HS-821'),
        className: className || (isTest ? '9A_TEST' : '8A13'),
        studentName
      }));
      router.push('/student');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/30 text-white mb-3">
            🎓
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Đăng Nhập Cổng Học Sinh
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Không Gian Học Tập & Tra Cứu Toàn Diện
          </p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã Lớp Học:
            </label>
            <select
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="6A1">Lớp 6A1</option>
              <option value="6A2">Lớp 6A2</option>
              <option value="7A1">Lớp 7A1</option>
              <option value="8A13">Lớp 8A13</option>
              <option value="9A1">Lớp 9A1</option>
              <option value="9A_TEST">Lớp 9A_TEST (Thử Nghiệm)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã Học Sinh / Số Thứ Tự:
            </label>
            <input
              type="text"
              required
              placeholder="VD: HS-821 hoặc STT 21"
              value={studentCode}
              onChange={e => setStudentCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã PIN Bảo Mật (4 số):
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all duration-200 shadow-md shadow-blue-600/30 mt-2 active:scale-98"
          >
            {isLoading ? 'Đang vào cổng...' : 'Vào Không Gian Học Sinh ➔'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Trường THCS Trần Bội Cơ • Năm học 2026 – 2027
          </p>
        </div>
      </div>
    </div>
  );
}
