'use client';

import React, { useState, useEffect } from 'react';
import { StudentQuest, VerificationAnchors } from '@/types/student-portal';
import { CheckCircle2, UploadCloud, Link as LinkIcon, Check, Sparkles, ShieldCheck } from 'lucide-react';

interface QuestTimelineCardProps {
  quest: StudentQuest;
  petAnonymousName: string;
  studentCode?: string;
  isCategoryLockedForWeek?: boolean;
  onCompleteManual?: (questId: string, anchors: VerificationAnchors, proofUrls: string[]) => Promise<void>;
}

export const QuestTimelineCard: React.FC<QuestTimelineCardProps> = ({
  quest,
  petAnonymousName,
  studentCode = '8A13_#821',
  isCategoryLockedForWeek = false,
  onCompleteManual
}) => {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [actionAnchor, setActionAnchor] = useState('');
  const [temporalAnchor, setTemporalAnchor] = useState('');
  const [reflection, setReflection] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Drive In-place Upload State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    const savedConnect = localStorage.getItem('tbc_gdrive_connected');
    if (savedConnect === 'true') {
      setIsDriveConnected(true);
    }
  }, []);

  const handleConnectDrive = () => {
    // Giả lập kết nối OAuth2 Google Drive 1-Click và duy trì session
    localStorage.setItem('tbc_gdrive_connected', 'true');
    setIsDriveConnected(true);
  };

  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    // Giả lập upload trực tiếp in-place vào Google Drive qua backend webhook/Google Apps Script
    setTimeout(() => {
      const generatedDriveUrl = `https://drive.google.com/file/d/drive_${Date.now()}_${encodeURIComponent(file.name)}/view`;
      setProofUrl(generatedDriveUrl);
      setUploadedFileName(file.name);
      setUploadingFile(false);
    }, 1200);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'academic':
        return { label: 'Trí Tuệ & Học Tập', color: 'bg-blue-950/80 text-blue-300 border-blue-700' };
      case 'habit_life':
        return { label: 'Thói Quen & Nề Nếp', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700' };
      case 'metacognition':
        return { label: 'Tư Duy & Đọc Sách', color: 'bg-purple-950/80 text-purple-300 border-purple-700' };
      case 'social_peer':
        return { label: 'Đồng Đội & Bạn Bè', color: 'bg-amber-950/80 text-amber-300 border-amber-700' };
      case 'life_skills':
        return { label: 'Kỹ Năng Sinh Tồn', color: 'bg-rose-950/80 text-rose-300 border-rose-700' };
      default:
        return { label: 'Rèn Luyện Chung', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const badge = getCategoryBadge(quest.category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCompleteManual) return;
    setIsSubmitting(true);
    try {
      await onCompleteManual(
        quest.id,
        {
          action_anchor: actionAnchor,
          temporal_anchor: temporalAnchor,
          physical_pet_code: `${studentCode} (${petAnonymousName})`,
          personal_reflection: reflection
        },
        proofUrl ? [proofUrl] : []
      );
      setIsOpenForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 p-5 ${
        quest.is_completed
          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/30'
          : isCategoryLockedForWeek
          ? 'border-slate-800 bg-slate-950/40 opacity-70'
          : 'border-slate-800 bg-slate-900/70 hover:border-indigo-500/40 hover:bg-slate-900/90 shadow-xl'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ⏱️ {quest.estimated_minutes} phút
            </span>
            {quest.is_completed && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Đã Nộp & Ghi Nhận
              </span>
            )}
            {isCategoryLockedForWeek && !quest.is_completed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                🔒 Đã hoàn thành 1 nhiệm vụ nhóm này tuần này
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-slate-100 mt-2">{quest.title}</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{quest.description}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs font-black text-amber-400 font-mono">
              +{quest.reward_xp} XP • +{quest.reward_coins} Xu
            </div>
          </div>

          {!quest.is_completed && (
            <button
              type="button"
              disabled={isCategoryLockedForWeek}
              onClick={() => setIsOpenForm(!isOpenForm)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                isCategoryLockedForWeek
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              {isOpenForm ? 'Đóng Lại' : 'Báo Cáo Hoàn Thành'}
            </button>
          )}
        </div>
      </div>

      {/* Form Nộp Minh Chứng Với Google Drive In-Place Upload & Auto Metadata */}
      {isOpenForm && !quest.is_completed && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in">
          
          {/* Automatic Student Metadata Banner (Thay thế hoàn toàn tờ giấy ghi bí danh) */}
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>Định Danh Tự Động:</strong> Bài nộp được gắn kèm mã <strong>{studentCode}</strong> ({petAnonymousName}). Thầy Cô sẽ kiểm duyệt trực tiếp mà không cần giấy ghi bí danh.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                1. Cụ thể em đã làm việc gì?
              </label>
              <input
                type="text"
                required
                placeholder="VD: Rửa 6 cái bát và lau bàn ăn sạch sẽ"
                value={actionAnchor}
                onChange={e => setActionAnchor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                2. Thời gian & địa điểm thực hiện?
              </label>
              <input
                type="text"
                required
                placeholder="VD: Lúc 19h15 tại phòng bếp gia đình"
                value={temporalAnchor}
                onChange={e => setTemporalAnchor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 3. Google Drive In-Place Upload Widget */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                3. Nộp Minh Chứng Trực Tiếp (Google Drive / Ảnh / Video):
              </span>

              {!isDriveConnected ? (
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 border border-indigo-700 font-bold text-[11px] transition"
                >
                  🔗 Kết Nối Google Drive (1-Click)
                </button>
              ) : (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Đã Kết Nối Drive Tự Động
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Direct File Picker */}
              <label className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition active:scale-95">
                <UploadCloud className="w-4 h-4" />
                <span>{uploadingFile ? 'Đang tải lên Drive...' : 'Tải Ảnh/Video Tại Chỗ'}</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleDirectFileUpload}
                  className="hidden"
                />
              </label>

              {/* Or Manual URL */}
              <div className="flex-1 w-full relative">
                <input
                  type="url"
                  placeholder="Hoặc dán link Google Drive / YouTube tại đây..."
                  value={proofUrl}
                  onChange={e => setProofUrl(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {uploadedFileName && (
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                ✅ Đã tải file: <strong>{uploadedFileName}</strong> lên thư mục lớp trên Google Drive thành công!
              </p>
            )}
          </div>

          {/* 4. Cảm nhận */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              4. Cảm nhận thật của em khi hoàn thành (1-2 câu):
            </label>
            <input
              type="text"
              required
              placeholder="VD: Em thấy vui vì giúp được bố mẹ và rèn luyện tính tự giác."
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpenForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadingFile}
              className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <span>Xác Nhận Nộp Minh Chứng</span>
              )}
            </button>
          </div>

        </form>
      )}
    </div>
  );
};
