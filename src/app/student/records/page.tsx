'use client';

import React, { useState } from 'react';

export default function StudentRecordsPage() {
  const [reflectionText, setReflectionText] = useState('');
  const [counselorText, setCounselorText] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  const handleSendCounselor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselorText.trim()) return;
    setSentNotice(true);
    setCounselorText('');
    setTimeout(() => setSentNotice(false), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          📖 Sổ Tự Soi Chiếu & Hộp Thư Bí Mật GVCN
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Không gian riêng tư để ghi nhận sự tiến bộ của bản thân và chia sẻ điều khó nói với thầy cô
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sổ Tự Soi Chiếu */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            🌱 Sổ Ghi Nhận Tiến Bộ Bản Thân
          </h3>
          <p className="text-xs text-slate-400">
            Hãy dành 2 phút mỗi tối để ghi lại 1 điều em làm tốt hôm nay và 1 điều muốn khắc phục vào ngày mai.
          </p>

          <textarea
            rows={4}
            value={reflectionText}
            onChange={e => setReflectionText(e.target.value)}
            placeholder="Hôm nay em đã kiên trì giải xong bài toán khó..."
            className="w-full px-4 py-3 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={() => alert('Đã lưu nhật ký tiến bộ của em!')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow shadow-indigo-600/30"
          >
            Lưu Vào Sổ Tự Rèn Luyện
          </button>
        </div>

        {/* Hộp Thư Bí Mật Với GVCN */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 to-indigo-950/40 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            💌 Hộp Thư Tâm Sự Bí Mật Với GVCN
          </h3>
          <p className="text-xs text-slate-400">
            Tin nhắn gửi thẳng tới hòm thư bảo mật của Giáo viên chủ nhiệm. Các bạn khác trong lớp hoàn toàn không thấy.
          </p>

          {sentNotice && (
            <div className="p-3 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
              ✓ Thầy/Cô đã nhận được lời nhắn của em và sẽ phản hồi sớm nhất!
            </div>
          )}

          <form onSubmit={handleSendCounselor} className="space-y-3">
            <textarea
              rows={4}
              required
              value={counselorText}
              onChange={e => setCounselorText(e.target.value)}
              placeholder="Thưa thầy/cô, tuần này em cảm thấy hơi áp lực môn KHTN..."
              className="w-full px-4 py-3 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
            />

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition shadow shadow-pink-600/30"
            >
              Gửi Tin Nhắn Bí Mật
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
