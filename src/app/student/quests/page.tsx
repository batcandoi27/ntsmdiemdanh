'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getWeeklyAssignedQuest,
  getStoredSubmission,
  saveStoredSubmission,
  QuestSubmission
} from '@/domain/quests/weekly-quest-engine';
import { QUEST_BANK, QuestDefinition } from '@/domain/quests/quest-bank';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  Edit3,
  Send,
  Eye,
  ExternalLink,
  ShieldCheck,
  Zap,
  BookOpen,
  Award,
  Layers,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  AlertCircle
} from 'lucide-react';

export default function StudentQuestsPage() {
  const studentId = 'std-demo-current';
  const studentCode = '8A13_#821';
  const anonymousName = 'Phượng Hoàng Băng #821';

  const { quest: weeklyQuest, year, week } = getWeeklyAssignedQuest(studentId);
  const [submission, setSubmission] = useState<QuestSubmission | null>(null);

  // Form states for submission
  const [content, setContent] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [linkValidationStatus, setLinkValidationStatus] = useState<{
    valid: boolean;
    provider?: 'google-drive' | 'youtube' | 'other';
    message?: string;
  } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank browsing
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load existing submission
  useEffect(() => {
    const existing = getStoredSubmission(studentId, weeklyQuest.id, year, week);
    if (existing) {
      setSubmission(existing);
      setContent(existing.content);
      setEvidenceUrl(existing.evidenceUrl);
      if (existing.evidenceUrl && existing.evidenceUrl.startsWith('data:image')) {
        setUploadedFilePreview(existing.evidenceUrl);
      }
    }
  }, [studentId, weeklyQuest.id, year, week]);

  // Handle direct file upload with thumbnail preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedFilePreview(result);
        setEvidenceUrl(result);
        setLinkValidationStatus({
          valid: true,
          provider: 'other',
          message: `✓ Đã đính kèm ảnh trực tiếp: ${file.name}`
        });
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedFilePreview(null);
      setEvidenceUrl(`file://${file.name}`);
      setLinkValidationStatus({
        valid: true,
        provider: 'other',
        message: `✓ Đã đính kèm tệp tin: ${file.name}`
      });
    }
  };

  // Smart URL detector for Google Drive and YouTube
  const validateLinkUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setLinkValidationStatus(null);
      return;
    }

    if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
      setLinkValidationStatus({
        valid: true,
        provider: 'google-drive',
        message: '✓ Link Google Drive hợp lệ (Sẵn sàng chấm điểm)'
      });
    } else if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      setLinkValidationStatus({
        valid: true,
        provider: 'youtube',
        message: '✓ Link Video YouTube hợp lệ (Sẵn sàng chấm điểm)'
      });
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setLinkValidationStatus({
        valid: true,
        provider: 'other',
        message: '✓ Link tài liệu web trực tuyến hợp lệ'
      });
    } else {
      setLinkValidationStatus({
        valid: false,
        message: '⚠️ Vui lòng nhập đường link hợp lệ (bắt đầu bằng https://)'
      });
    }
  };

  const handleSubmitOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newSub: QuestSubmission = {
      submissionId: submission ? submission.submissionId : `sub-${Date.now()}`,
      questId: weeklyQuest.id,
      studentId,
      year,
      isoWeek: week,
      content,
      evidenceUrl,
      status: 'submitted',
      submittedAt: submission ? submission.submittedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      earnedXp: weeklyQuest.xpReward,
      earnedCoins: weeklyQuest.coinReward
    };

    saveStoredSubmission(newSub);
    setSubmission(newSub);
    setIsEditing(false);
    showToast('Đã nộp bài thành công! Bạn có thể chỉnh sửa bất cứ lúc nào trước khi thầy cô chấm.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredBank = QUEST_BANK.filter((q) => {
    const matchCat = activeCategory === 'all' || q.category === activeCategory;
    const matchSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
            🎯 Nhiệm Vụ Rèn Luyện Tuần {week} ({year})
          </h2>
          <p className="text-xs text-indigo-300 mt-0.5">
            Thuật toán tuần tự động giao 1 nhiệm vụ cố định cho <strong>{anonymousName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Phần Thưởng: +{weeklyQuest.xpReward} XP • +{weeklyQuest.coinReward} Xu</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ASSIGNED WEEKLY QUEST HERO CARD */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border-2 border-indigo-500/60 shadow-2xl space-y-4">
        
        {/* Quest Badge & Category */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl p-2 rounded-2xl bg-slate-950 border border-slate-800">
              {weeklyQuest.categoryIcon}
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700">
                {weeklyQuest.categoryName}
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">{weeklyQuest.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-3 py-1 rounded-full font-bold border ${
              submission
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                : 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse'
            }`}>
              {submission ? '✓ Đã Nộp Minh Chứng' : '⏳ Đang Thực Hiện'}
            </span>
          </div>
        </div>

        {/* Quest Description & Hint */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
          <p className="text-slate-200 leading-relaxed font-medium">
            {weeklyQuest.description}
          </p>
          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-indigo-300 text-[11px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>Gợi ý thực hiện:</strong> {weeklyQuest.hint}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SUBMISSION & EDITING WORKFLOW WITH FILE & DRIVE UPLOAD */}
        {/* ========================================================================= */}
        {submission && !isEditing ? (
          /* View Submitted Proof */
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Minh Chứng Đã Nộp (Lúc {new Date(submission.updatedAt).toLocaleTimeString('vi-VN')} ngày {new Date(submission.updatedAt).toLocaleDateString('vi-VN')}):
              </span>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh Sửa Bài Nộp</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap">
              {submission.content}
            </div>

            {submission.evidenceUrl && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 block">Minh Chứng Đính Kèm:</span>
                {submission.evidenceUrl.startsWith('data:image') ? (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-indigo-500/50 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={submission.evidenceUrl} alt="Minh chứng" className="max-h-48 rounded-xl object-contain bg-slate-950" />
                  </div>
                ) : (
                  <a
                    href={submission.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 font-mono text-xs underline flex items-center gap-1.5 truncate max-w-lg"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0 text-amber-400" />
                    <span className="truncate">{submission.evidenceUrl}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Submission / Edit Form */
          <form onSubmit={handleSubmitOrUpdate} className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-400" />
                {isEditing ? 'Cập Nhật / Bổ Sung Minh Chứng Bài Nộp' : 'Nộp Minh Chứng Hoàn Thành Nhiệm Vụ'}
              </span>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hủy Chỉnh Sửa
                </button>
              )}
            </div>

            {/* Content Textarea */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                1. Nhật ký & Cảm nhận rèn luyện:
              </label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ghi lại kết quả thực hiện, các bước em đã làm hoặc bài học rút ra..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 custom-scrollbar"
              />
            </div>

            {/* Evidence Attachment Box (File Upload + Google Drive / YouTube) */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. Đính Kèm File Ảnh / Link Google Drive / YouTube:</span>
              </label>

              {/* Option A: Direct File Upload */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Chọn Ảnh / Tệp Từ Máy</span>
                </button>

                <span className="text-[11px] text-slate-400">hoặc dán đường link bên dưới:</span>
              </div>

              {/* Uploaded Thumbnail Preview */}
              {uploadedFilePreview && (
                <div className="relative inline-block rounded-xl overflow-hidden border-2 border-indigo-500 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadedFilePreview} alt="Preview" className="max-h-36 rounded-xl object-contain bg-slate-950" />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFilePreview(null);
                      setEvidenceUrl('');
                      setUploadedFileName(null);
                      setLinkValidationStatus(null);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 shadow"
                    title="Xóa ảnh này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Option B: Google Drive / Video Link Input with Instant Validator */}
              <div className="space-y-1.5">
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={evidenceUrl.startsWith('data:image') ? '' : evidenceUrl}
                    onChange={(e) => {
                      setEvidenceUrl(e.target.value);
                      validateLinkUrl(e.target.value);
                    }}
                    placeholder="Dán Link Google Drive / Video YouTube / Ảnh trực tuyến..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Validation Status Badge */}
                {linkValidationStatus && (
                  <div className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-2 ${
                    linkValidationStatus.valid
                      ? 'bg-emerald-950/70 border border-emerald-600/60 text-emerald-300'
                      : 'bg-rose-950/70 border border-rose-600/60 text-rose-300'
                  }`}>
                    {linkValidationStatus.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{linkValidationStatus.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                ⭐ Em có thể xem lại và cập nhật lại bài nộp bất cứ khi nào
              </span>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Lưu Cập Nhật' : 'Nộp Bài Nhiệm Vụ'}</span>
              </button>
            </div>
          </form>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. NGÂN HÀNG 80+ NHIỆM VỤ THAM KHẢO (EXPLORATION DRAWER) */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-indigo-900/40">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-base text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Ngân Hàng 80 Nhiệm Vụ Rèn Luyện Toàn Diện (20 Mỗi Nhóm)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Khám phá các nhiệm vụ rèn luyện chuẩn mực theo chương trình giáo dục
            </p>
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Tìm kiếm nhiệm vụ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 max-w-xs w-full shadow-sm"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { code: 'all', label: 'Tất Cả (80)', icon: '🌟' },
            { code: 'attendance_discipline', label: 'Chuyên Cần & Nề Nếp (20)', icon: '⏰' },
            { code: 'academic_progress', label: 'Học Tập & Tri Thức (20)', icon: '🧠' },
            { code: 'teamwork_activities', label: 'Phong Trào & Đội Nhóm (20)', icon: '🤝' },
            { code: 'family_lifeskills', label: 'Gia Đình & Kỹ Năng Sống (20)', icon: '🍳' }
          ].map((cat) => (
            <button
              key={cat.code}
              onClick={() => setActiveCategory(cat.code)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.code
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 80 Quests Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredBank.map((q) => (
            <div
              key={q.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2.5 transition hover:border-indigo-500/50 ${
                q.id === weeklyQuest.id
                  ? 'bg-indigo-950/60 border-indigo-500/70 shadow-lg ring-2 ring-indigo-500/30'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xl">{q.categoryIcon}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-amber-300 font-bold font-mono">
                    +{q.xpReward} XP
                  </span>
                </div>

                <h4 className="font-bold text-xs text-white line-clamp-1">{q.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {q.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-indigo-300">
                <span className="capitalize">{q.categoryName}</span>
                {q.id === weeklyQuest.id ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                    Tuần Này
                  </span>
                ) : (
                  <span className="text-slate-500">Ngân Hàng</span>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
