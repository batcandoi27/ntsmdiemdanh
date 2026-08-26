"use client";

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Award,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  Users,
  Calendar
} from 'lucide-react';
import { Student } from '@/types/models';
import { createHomeroomEvent } from '@/services/homeroom-service';
import { HOMEROOM_PRESETS, HomeroomPresetItem } from '@/types/homeroom-presets';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  students: Student[];
  onEventCreated?: () => void;
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  classId,
  students,
  onEventCreated
}: QuickCaptureModalProps) {
  const [eventType, setEventType] = useState<'positive' | 'violation'>('positive');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [category, setCategory] = useState<string>('Khen thưởng học tập');
  const [pointsDelta, setPointsDelta] = useState<number>(2);
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  if (!isOpen) return null;

  const presets = HOMEROOM_PRESETS.filter(p => p.type === eventType).slice(0, 8);

  const handleSelectPreset = (p: HomeroomPresetItem) => {
    setCategory(p.category || (eventType === 'positive' ? 'Khen thưởng' : 'Vi phạm'));
    setPointsDelta(p.points_delta !== undefined ? p.points_delta : (eventType === 'positive' ? 2 : -2));
    setDescription(p.description || p.label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Vui lòng chọn học sinh!');
      return;
    }
    if (!description.trim()) {
      toast.error('Vui lòng nhập nội dung ghi nhận!');
      return;
    }

    setSubmitting(true);
    try {
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      const studentName = selectedStudent?.fullName || (selectedStudent as any)?.name || (selectedStudent as any)?.full_name || 'Học sinh';

      await createHomeroomEvent({
        class_id: classId,
        student_id: selectedStudentId,
        date: new Date().toISOString().split('T')[0],
        type: eventType,
        category: category || (eventType === 'positive' ? 'Khen thưởng' : 'Vi phạm'),
        severity: eventType === 'positive' ? 'info' : 'minor',
        points_delta: pointsDelta,
        description: description.trim(),
        source: 'gvcn',
        status: eventType === 'positive' ? 'resolved' : 'monitoring',
        is_visible_to_parent: true,
        created_by: 'gvcn'
      });

      toast.success(`⚡ Đã ghi nhận siêu tốc cho em ${studentName} (${pointsDelta >= 0 ? `+${pointsDelta}` : pointsDelta} điểm)!`);
      setDescription('');
      onClose();
      if (onEventCreated) onEventCreated();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi ghi nhận');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base tracking-tight">Ghi Nhận Nhanh (Quick Capture)</h3>
              <p className="text-[11px] text-indigo-100 font-medium">Thao tác 3 giây • Tự động cộng/trừ điểm thi đua</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          
          {/* LOẠI SỰ VIỆC (KHEN THƯỞNG / VI PHẠM) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setEventType('positive');
                setPointsDelta(2);
                setCategory('Khen thưởng học tập');
              }}
              className={cn(
                "py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all",
                eventType === 'positive'
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Award className="w-4 h-4" />
              <span>1. Khen thưởng (+Điểm)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEventType('violation');
                setPointsDelta(-2);
                setCategory('Nề nếp / Kỷ luật');
              }}
              className={cn(
                "py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all",
                eventType === 'violation'
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>2. Vi phạm (-Điểm)</span>
            </button>
          </div>

          {/* CHỌN HỌC SINH */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">Chọn học sinh:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {students.map((st, idx) => (
                <option key={st.id} value={st.id}>
                  {idx + 1}. {st.fullName || (st as any).name || (st as any).full_name} ({st.code || 'HS'})
                </option>
              ))}
            </select>
          </div>

          {/* GỢI Ý MẪU NHANH (1-CLICK PRESETS) */}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mẫu gợi ý 1-chạm:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 transition-colors text-slate-700 text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* NỘI DUNG CHI TIẾT & ĐIỂM */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="font-bold text-slate-800 block mb-1">Nội dung ghi nhận:</label>
              <input
                type="text"
                placeholder="VD: Hăng hái phát biểu, Giúp đỡ bạn..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">Điểm cộng/trừ:</label>
              <input
                type="number"
                value={pointsDelta}
                onChange={(e) => setPointsDelta(Number(e.target.value))}
                className={cn(
                  "w-full border rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-center focus:ring-2 outline-none",
                  pointsDelta >= 0 ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-rose-50 border-rose-300 text-rose-700"
                )}
              />
            </div>
          </div>

          {/* NÚT SUBMIT */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? 'Đang lưu...' : 'Lưu Ghi Nhận Ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
