'use client';

import React, { useState } from 'react';
import { soundscape } from '@/domain/sound/web-audio-soundscape';
import { offlineSyncQueue } from '@/domain/sync/student-offline-sync-queue';
import {
  Compass,
  HeartHandshake,
  MessageCircleHeart,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  BookOpen,
  CalendarCheck,
  UserCheck,
  Send,
  HelpCircle,
  Lightbulb
} from 'lucide-react';

export default function StudentRecordsPage() {
  const [reflectionText, setReflectionText] = useState('');
  const [counselorText, setCounselorText] = useState('');
  const [sentNotice, setSentNotice] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  const compassAxes = [
    {
      id: 'attendance',
      name: 'Chuyên Cần & Đúng Giờ',
      icon: <CalendarCheck className="w-5 h-5 text-emerald-600" />,
      status: 'Đạt chuẩn đều đặn',
      evidence: 'Có mặt đúng giờ 14/14 ngày gần nhất',
      nextStep: 'Duy trì thói quen chuẩn bị cặp sách từ tối hôm trước',
      color: 'border-emerald-200 bg-emerald-50/40'
    },
    {
      id: 'academic',
      name: 'Học Tập & Tìm Tòi',
      icon: <BookOpen className="w-5 h-5 text-blue-600" />,
      status: 'Đang tiến bộ tích cực',
      evidence: 'Hoàn thành 3/4 nhiệm vụ tự học tuần này',
      nextStep: 'Thử thách giải 1 bài toán mở rộng môn Toán/KHTN',
      color: 'border-blue-200 bg-blue-50/40'
    },
    {
      id: 'discipline',
      name: 'Nề Nếp & Tác Phong',
      icon: <UserCheck className="w-5 h-5 text-amber-600" />,
      status: 'Chuẩn mực văn minh',
      evidence: 'Đồng phục nghiêm túc, giữ vệ sinh chỗ ngồi',
      nextStep: 'Chủ động nhắc nhở và giúp đỡ bạn cùng bàn',
      color: 'border-amber-200 bg-amber-50/40'
    },
    {
      id: 'lifeskills',
      name: 'Kỹ Năng & Giúp Đỡ',
      icon: <HeartHandshake className="w-5 h-5 text-pink-600" />,
      status: 'Tự lập mỗi ngày',
      evidence: 'Ghi nhận phụ giúp gia đình việc nhà 2 lần/tuần',
      nextStep: 'Tập tự chuẩn bị bữa sáng hoặc tự gấp gọn chăn màn',
      color: 'border-pink-200 bg-pink-50/40'
    }
  ];

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim()) return;
    soundscape.playSoftChime();
    offlineSyncQueue.enqueue('reflection_save', { text: reflectionText });
    setReflectionSaved(true);
    setTimeout(() => setReflectionSaved(false), 3000);
  };

  const handleSendCounselor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselorText.trim()) return;
    soundscape.playMilestoneFanfare();
    offlineSyncQueue.enqueue('reflection_save', { counselorMessage: counselorText });
    setSentNotice(true);
    setCounselorText('');
    setTimeout(() => setSentNotice(false), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <Compass className="w-6 h-6 text-blue-600" />
          <span>La Bàn Tiến Bộ (Growth Compass) & Hộp Thư Tâm Sự</span>
        </h2>
        <p className="text-xs text-slate-600 font-medium mt-1">
          Không gian tự soi chiếu cá nhân • Ghi nhận nỗ lực thực tế và tìm kiếm bước đi tiếp theo cho bản thân
        </p>
      </div>

      {/* 1. KHỐI LA BÀN TIẾN BỘ 4 TRỤC RÈN LUYỆN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>4 Trục Phát Triển Cá Nhân (Tiến Bộ So Với Chính Mình)</span>
          </h3>
          <span className="text-[11px] text-blue-700 font-bold">Cập nhật tự động qua minh chứng</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {compassAxes.map((axis) => (
            <div
              key={axis.id}
              className={`rounded-3xl border-2 p-5 shadow-xs space-y-3 transition hover:shadow-md ${axis.color}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shrink-0 shadow-2xs">
                    {axis.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{axis.name}</h4>
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{axis.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-slate-200/90 text-xs space-y-1.5 shadow-2xs">
                <div className="text-slate-700 flex items-start gap-1.5 font-medium">
                  <span className="text-slate-500 font-bold shrink-0">Minh chứng:</span>
                  <span>{axis.evidence}</span>
                </div>
                <div className="text-blue-900 flex items-start gap-1.5 pt-1.5 border-t border-slate-100 font-semibold">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Bước tiếp theo:</strong> {axis.nextStep}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. SỔ TỰ PHẢN TƯ & HỘP THƯ BẢO VỆ AN TOÀN GVCN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sổ Tự Soi Chiếu Hằng Ngày */}
        <form
          onSubmit={handleSaveReflection}
          className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              🌱 Sổ Tự Soi Chiếu Bản Thân
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Dành 2 phút ghi lại 1 điều em hài lòng về bản thân hôm nay và 1 mục tiêu nhỏ em muốn thử sức ngày mai.
            </p>

            <textarea
              rows={4}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Hôm nay em đã kiên trì đọc hết 1 bài đọc hiểu tiếng Anh..."
              className="w-full px-4 py-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {reflectionSaved ? (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                ✓ Đã lưu nhật ký tiến bộ!
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/20 active:scale-95"
            >
              Lưu Vào Sổ Rèn Luyện
            </button>
          </div>
        </form>

        {/* Hộp Thư Tâm Sự Riêng Tư Với GVCN (Safe-By-Design) */}
        <form
          onSubmit={handleSendCounselor}
          className="rounded-3xl border border-pink-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <MessageCircleHeart className="w-4 h-4 text-pink-500" />
                <span>Hộp Thư Tâm Sự Riêng Tư Với GVCN</span>
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-pink-800 font-bold">
                1 - 1 Riêng Tư
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Gửi lời nhắn riêng tới Thầy/Cô Chủ Nhiệm khi em gặp khó khăn trong học tập hoặc cần người lắng nghe.
            </p>

            <textarea
              rows={4}
              required
              value={counselorText}
              onChange={(e) => setCounselorText(e.target.value)}
              placeholder="Thưa thầy/cô, tuần này em cảm thấy hơi bỡ ngỡ với phần bài tập nhóm..."
              className="w-full px-4 py-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500 transition placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="space-y-2.5">
            {sentNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                ✓ Thầy/Cô đã nhận được lời nhắn của em và sẽ sớm trò chuyện cùng em!
              </div>
            )}

            {/* Thông báo An Toàn Trẻ Em Theo Chuẩn Sư Phạm */}
            <p className="text-[10px] text-slate-500 leading-tight flex items-start gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Bảo vệ an toàn:</strong> Tin nhắn được giữ riêng tư với GVCN. Trong tình huống khẩn cấp hoặc có nguy cơ về sự an toàn, nhà trường sẽ phối hợp để hỗ trợ em kịp thời nhất.
              </span>
            </p>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition shadow-md shadow-pink-600/20 flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Tới GVCN</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
