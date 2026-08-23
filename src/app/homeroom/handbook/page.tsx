"use client";

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Save,
  FileDown,
  Sparkles,
  Award,
  ChevronDown,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomClassSettings,
  getHomeroomPlans,
  saveHomeroomPlan
} from '@/services/homeroom-service';
import { exportHomeroomHandbookDocx } from '@/services/homeroom-print-service';
import { HomeroomPlan, HomeroomClassSettings } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import { HANDBOOK_TEMPLATES } from '@/types/homeroom-presets';
import { ThemedCard } from '@/design-system';
import toast from 'react-hot-toast';

export default function HomeroomHandbookPage() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('Giáo viên chủ nhiệm');
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<HomeroomClassSettings | null>(null);
  const [yearlyPlan, setYearlyPlan] = useState<HomeroomPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formContent, setFormContent] = useState({
    strengths: '',
    challenges: '',
    targets: {
      academic_good_percent: 85,
      conduct_good_percent: 95,
      competitions: 'Lớp Tiên Tiến Xuất Sắc'
    },
    measures: ''
  });

  useEffect(() => {
    const activeId = localStorage.getItem('homeroom_active_class_id') || '';
    setClassId(activeId);

    async function load() {
      if (!activeId) return;
      setLoading(true);
      try {
        const stList = await db.getStudentsByClass(activeId);
        setStudents(stList || []);

        const { data: clsData } = await supabase
          .from('classes')
          .select('name, teacher_classes(is_homeroom, profiles(full_name))')
          .eq('id', activeId)
          .maybeSingle();

        if (clsData) {
          setClassName(clsData.name || '');
          const homeroomTc: any = (clsData.teacher_classes || []).find((tc: any) => tc.is_homeroom);
          const name = Array.isArray(homeroomTc?.profiles)
            ? homeroomTc.profiles[0]?.full_name
            : homeroomTc?.profiles?.full_name;
          if (name) setTeacherName(name);
        }

        const st = await getHomeroomClassSettings(activeId);
        setSettings(st);

        const plans = await getHomeroomPlans(activeId, '2025-2026', 'yearly');
        if (plans && plans.length > 0) {
          setYearlyPlan(plans[0]);
          if (plans[0].content) {
            setFormContent({
              strengths: plans[0].content.strengths || formContent.strengths,
              challenges: plans[0].content.challenges || formContent.challenges,
              targets: {
                academic_good_percent: plans[0].content.targets?.academic_good_percent ?? formContent.targets.academic_good_percent,
                conduct_good_percent: plans[0].content.targets?.conduct_good_percent ?? formContent.targets.conduct_good_percent,
                competitions: plans[0].content.targets?.competitions ?? formContent.targets.competitions
              },
              measures: Array.isArray(plans[0].content.measures)
                ? plans[0].content.measures.join('\n')
                : (plans[0].content.measures || formContent.measures)
            });
          }
        }
      } catch (err) {
        console.error('Error loading handbook data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [classId]);

  // Save Plan
  const handleSavePlan = async () => {
    setSaving(true);
    try {
      await saveHomeroomPlan({
        class_id: classId,
        academic_year: '2025-2026',
        plan_type: 'yearly',
        period_key: 'yearly',
        title: `Sổ kế hoạch chủ nhiệm lớp ${className || classId} năm học 2025-2026`,
        content: formContent
      });
      toast.success('Đã lưu Sổ chủ nhiệm số thành công!');
    } catch (err) {
      toast.error('Lỗi khi lưu sổ chủ nhiệm');
    } finally {
      setSaving(false);
    }
  };

  // Export Word
  const handleExportDocx = async () => {
    if (!settings) return;
    try {
      await exportHomeroomHandbookDocx(
        className || 'Lớp học',
        '2025-2026',
        teacherName,
        students,
        settings,
        {
          id: yearlyPlan?.id || '',
          class_id: classId,
          academic_year: '2025-2026',
          plan_type: 'yearly',
          title: `Sổ chủ nhiệm lớp ${className}`,
          content: formContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );
      toast.success('Đã xuất Sổ chủ nhiệm điện tử ra file Word!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Word');
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Đang tải Sổ chủ nhiệm điện tử...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTIONS (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Sổ Kế Hoạch & Quản Lý Chủ Nhiệm Số
            </h2>
            <HomeroomTooltip content="Số hóa toàn diện sổ chủ nhiệm THCS theo quy định. Tự động liên kết sĩ số, ban cán sự và xuất file Word hoàn chỉnh." />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : ''}</span> • Năm học: 2025 - 2026 • GVCN: <span className="text-slate-700 font-bold">{teacherName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDocx}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all shadow-sm"
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            <span>Xuất Word (.DOCX)</span>
          </button>

          <button
            onClick={handleSavePlan}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu Sổ Chủ Nhiệm'}</span>
          </button>
        </div>
      </div>

      {/* 2. FORM PHẦN I: ĐẶC ĐIỂM TÌNH HÌNH LỚP (Auto Theme Index 0 - Sky) */}
      <ThemedCard
        index={0}
        badgeText="PHẦN I: ĐẶC ĐIỂM TÌNH HÌNH LỚP"
        icon={BookOpen}
        showNumber={true}
        innerContainer={true}
        className="space-y-4"
      >
        {/* 1. Thuận lợi */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs text-slate-700">1. Thuận lợi:</label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold mr-1">Mẫu gợi ý:</span>
              {HANDBOOK_TEMPLATES.strengths.map((stText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormContent(prev => ({ ...prev, strengths: stText }))}
                  className="px-2 py-0.5 rounded-lg bg-sky-100/70 hover:bg-sky-600 hover:text-white text-[10px] font-bold text-sky-900 transition-colors"
                >
                  Mẫu {idx + 1}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={3}
            value={formContent.strengths}
            onChange={(e) => setFormContent({ ...formContent, strengths: e.target.value })}
            placeholder="Nêu các điểm thuận lợi về ý thức học sinh, sự quan tâm của phụ huynh..."
            className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 outline-none transition-all"
          />
        </div>

        {/* 2. Khó khăn */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs text-slate-700">2. Khó khăn:</label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold mr-1">Mẫu gợi ý:</span>
              {HANDBOOK_TEMPLATES.challenges.map((chText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormContent(prev => ({ ...prev, challenges: chText }))}
                  className="px-2 py-0.5 rounded-lg bg-sky-100/70 hover:bg-sky-600 hover:text-white text-[10px] font-bold text-sky-900 transition-colors"
                >
                  Mẫu {idx + 1}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={3}
            value={formContent.challenges}
            onChange={(e) => setFormContent({ ...formContent, challenges: e.target.value })}
            placeholder="Nêu các khó khăn về học lực, nề nếp, hoàn cảnh học sinh..."
            className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 outline-none transition-all"
          />
        </div>
      </ThemedCard>

      {/* 3. FORM PHẦN II: MỤC TIÊU & CHỈ TIÊU PHẤN ĐẤU (Auto Theme Index 1 - Emerald) */}
      <ThemedCard
        index={1}
        badgeText="PHẦN II: MỤC TIÊU & CHỈ TIÊU PHẤN ĐẤU"
        icon={Award}
        showNumber={true}
        innerContainer={true}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-bold text-xs text-slate-700 block mb-1">Chỉ tiêu Học lực Tốt/Khá (%)</label>
            <input
              type="number"
              value={formContent.targets.academic_good_percent}
              onChange={(e) => setFormContent({
                ...formContent,
                targets: { ...formContent.targets, academic_good_percent: parseInt(e.target.value) || 0 }
              })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-bold text-xs text-slate-700 block mb-1">Chỉ tiêu Hạnh kiểm Tốt (%)</label>
            <input
              type="number"
              value={formContent.targets.conduct_good_percent}
              onChange={(e) => setFormContent({
                ...formContent,
                targets: { ...formContent.targets, conduct_good_percent: parseInt(e.target.value) || 0 }
              })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-bold text-xs text-slate-700 block mb-1">Danh hiệu thi đua đăng ký</label>
            <input
              type="text"
              value={formContent.targets.competitions}
              onChange={(e) => setFormContent({
                ...formContent,
                targets: { ...formContent.targets, competitions: e.target.value }
              })}
              placeholder="VD: Tập thể Lớp Xuất Sắc"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
        </div>
      </ThemedCard>

      {/* 4. FORM PHẦN III: BIỆN PHÁP THỰC HIỆN (Auto Theme Index 2 - Amber) */}
      <ThemedCard
        index={2}
        badgeText="PHẦN III: BIỆN PHÁP THỰC HIỆN"
        icon={Sparkles}
        showNumber={true}
        innerContainer={true}
        className="space-y-4"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-xs text-slate-700">Các biện pháp thực hiện chính:</label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold mr-1">Mẫu gợi ý:</span>
              {HANDBOOK_TEMPLATES.measures.map((msText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormContent(prev => ({ ...prev, measures: msText }))}
                  className="px-2 py-0.5 rounded-lg bg-amber-100/70 hover:bg-amber-600 hover:text-white text-[10px] font-bold text-amber-900 transition-colors"
                >
                  Mẫu {idx + 1}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={4}
            value={formContent.measures}
            onChange={(e) => setFormContent({ ...formContent, measures: e.target.value })}
            placeholder="Nêu các giải pháp nâng cao chất lượng học tập, rèn luyện nề nếp..."
            className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-4 focus:ring-amber-500/15 focus:border-amber-500 outline-none transition-all"
          />
        </div>
      </ThemedCard>
    </div>
  );
}
