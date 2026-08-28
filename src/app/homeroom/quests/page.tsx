'use client';

import React, { useState } from 'react';
import { StudentQuest } from '@/types/student-portal';

export default function HomeroomQuestCmsPage() {
  const [quests, setQuests] = useState<StudentQuest[]>([
    {
      id: 'quest-math-01',
      subject_code: 'MATH',
      category: 'academic',
      cadence: 'daily',
      estimated_minutes: 5,
      title: 'Khởi Động Ngày Mới: 3 Bài Toán Tư Duy Nhanh',
      description: 'Thử sức với 3 bài toán tính nhanh hoặc câu đố logic để rèn luyện não bộ.',
      week_timeline_start: 1,
      week_timeline_end: 35,
      reward_xp: 30,
      reward_coins: 5,
      evidence_type: 'form',
      requires_anchor: true,
      is_active: true
    },
    {
      id: 'quest-habit-01',
      subject_code: 'HOMEROOM',
      category: 'habit_life',
      cadence: 'daily',
      estimated_minutes: 3,
      title: 'Góc Học Tập Gọn Gàng & Check-in 20h00',
      description: 'Sắp xếp bàn học sạch sẽ và bấm check-in tự giác học bài đúng giờ buổi tối.',
      week_timeline_start: 1,
      week_timeline_end: 35,
      reward_xp: 25,
      reward_coins: 5,
      evidence_type: 'image',
      requires_anchor: true,
      is_active: true
    },
    {
      id: 'quest-meta-01',
      subject_code: 'ALL',
      category: 'metacognition',
      cadence: 'alternate',
      estimated_minutes: 8,
      title: 'Vượt Khó: Sửa Lại 1 Lỗi Sai Trong Bài Kiểm Tra',
      description: 'Chọn 1 câu đã từng làm sai, giải lại đúng và ghi 1 câu giải thích tại sao mình sai.',
      week_timeline_start: 1,
      week_timeline_end: 35,
      reward_xp: 60,
      reward_coins: 15,
      evidence_type: 'form',
      requires_anchor: true,
      is_active: true
    }
  ]);

  const toggleQuestActive = (questId: string) => {
    setQuests(prev =>
      prev.map(q => (q.id === questId ? { ...q, is_active: !q.is_active } : q))
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            ⚙️ Quản Lý & Tùy Biến Ngân Hàng Nhiệm Vụ (Teacher Override CMS)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quyền sư phạm tối cao: Giáo viên có thể 1-Click Bật/Tắt, đổi điểm thưởng hoặc tạo nhiệm vụ riêng cho lớp mình
          </p>
        </div>

        <button
          onClick={() => alert('Mở form tạo nhiệm vụ đặc thù cho lớp!')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
        >
          + Thêm Nhiệm Vụ Mới
        </button>
      </div>

      {/* Quest Table CMS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
            <tr>
              <th className="p-4">Tên Nhiệm Vụ</th>
              <th className="p-4">Phân Loại</th>
              <th className="p-4">Thời Lượng</th>
              <th className="p-4">Thưởng XP / Coin</th>
              <th className="p-4 text-center">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quests.map(quest => (
              <tr key={quest.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-semibold text-slate-800">
                  {quest.title}
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">{quest.description}</p>
                </td>
                <td className="p-4 font-mono text-slate-600 uppercase">{quest.category}</td>
                <td className="p-4 text-slate-600">{quest.estimated_minutes} phút</td>
                <td className="p-4 font-bold text-blue-600">
                  +{quest.reward_xp} XP / +{quest.reward_coins} Coin
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      quest.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {quest.is_active ? 'Đang Mở' : 'Đã Khóa'}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => toggleQuestActive(quest.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      quest.is_active
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {quest.is_active ? 'Tắt' : 'Bật'}
                  </button>
                  <button
                    onClick={() => alert(`Chỉnh sửa nhiệm vụ: ${quest.title}`)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
