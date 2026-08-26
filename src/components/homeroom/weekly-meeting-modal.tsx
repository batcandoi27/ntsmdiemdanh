"use client";

import React, { useState } from 'react';
import {
  CalendarCheck2,
  Copy,
  Check,
  X,
  Sparkles,
  FileDown,
  Presentation,
  Users,
  Award,
  AlertTriangle
} from 'lucide-react';
import { WeeklyMeetingDraft } from '@/types/homeroom';
import { exportWeeklyMeetingDocx, exportWeeklyMeetingPptx } from '@/services/homeroom-print-service';
import toast from 'react-hot-toast';

interface WeeklyMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: WeeklyMeetingDraft | null;
  loading: boolean;
  className?: string;
  teacherName?: string;
}

export function WeeklyMeetingModal({
  isOpen,
  onClose,
  draft,
  loading,
  className = 'Lớp',
  teacherName = 'Giáo viên chủ nhiệm'
}: WeeklyMeetingModalProps) {
  const [copied, setCopied] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!draft?.full_script_markdown) return;
    navigator.clipboard.writeText(draft.full_script_markdown);
    setCopied(true);
    toast.success('Đã sao chép toàn bộ kịch bản sinh hoạt lớp!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportDocx = async () => {
    if (!draft) return;
    setExportingDocx(true);
    try {
      await exportWeeklyMeetingDocx(className, '2025 - 2026', teacherName, draft);
      toast.success('Đã xuất bản Word (.DOCX) đẹp chuẩn sư phạm!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Word');
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportPptx = async () => {
    if (!draft) return;
    setExportingPptx(true);
    try {
      await exportWeeklyMeetingPptx(className, '2025 - 2026', teacherName, draft);
      toast.success('Đã xuất Slide thuyết trình (.PPTX) 16:9 thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Slide PPTX');
    } finally {
      setExportingPptx(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="p-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300 shadow-sm">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight">
                Kịch Bản & Biên Bản Tiết Sinh Hoạt Lớp Thứ 7
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                Tự động tổng hợp dữ liệu chuyên cần, nề nếp, điểm thi đua và học sinh cần lưu ý
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p>Đang tự động thu thập số liệu và sinh kịch bản sinh hoạt lớp...</p>
            </div>
          ) : !draft ? (
            <div className="py-12 text-center text-slate-400">
              Không thể tải dữ liệu sinh hoạt lớp.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block">Sĩ số lớp</span>
                  <span className="text-xl font-black text-slate-900">{draft.summary.total_students} HS</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[11px] text-emerald-800 font-bold block">Tỷ lệ chuyên cần</span>
                  <span className="text-xl font-black text-emerald-600">{draft.summary.attendance_rate}%</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[11px] text-amber-800 font-bold block">Đi muộn</span>
                  <span className="text-xl font-black text-amber-600">{draft.summary.late_count} lượt</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                  <span className="text-[11px] text-rose-800 font-bold block">Vắng KP</span>
                  <span className="text-xl font-black text-rose-600">{draft.summary.unexcused_count} lượt</span>
                </div>
              </div>

              {/* BẢNG KỊCH BẢN CHUẨN MARKDOWN PREVIEW */}
              <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800 space-y-4">
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
                  {draft.full_script_markdown}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportDocx}
              disabled={loading || !draft || exportingDocx}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span>{exportingDocx ? 'Đang xuất Word...' : 'Tải File Word (.DOCX)'}</span>
            </button>

            <button
              onClick={handleExportPptx}
              disabled={loading || !draft || exportingPptx}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Presentation className="w-4 h-4" />
              <span>{exportingPptx ? 'Đang tạo Slide...' : 'Xuất Slide (.PPTX) 16:9'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopy}
              disabled={loading || !draft}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Đã sao chép!' : 'Sao chép Markdown'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
