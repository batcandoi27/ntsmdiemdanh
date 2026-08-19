"use client";

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Save,
  Printer,
  Calendar,
  CheckCircle2,
  Award,
  Sparkles,
  School,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getHomeroomClassSettings,
  getHomeroomPlans,
  saveHomeroomPlan
} from '@/services/homeroom-service';
import { exportHomeroomHandbookDocx } from '@/services/homeroom-print-service';
import { HomeroomPlan, HomeroomClassSettings } from '@/types/homeroom';
import { Student } from '@/types/models';
import toast from 'react-hot-toast';

export default function HomeroomHandbookPage() {
  const [classId, setClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<HomeroomClassSettings | null>(null);
  const [yearlyPlan, setYearlyPlan] = useState<HomeroomPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherName, setTeacherName] = useState('Giáo viên chủ nhiệm');

  const [formContent, setFormContent] = useState({
    strengths: 'Đa số học sinh chăm ngoan, có ý thức kỷ luật tốt. Cơ sở vật chất phòng học khang trang, phụ huynh luôn đồng hành cùng nhà trường.',
    challenges: 'Một số em có hoàn cảnh gia đình khó khăn, còn rụt rè trong phát biểu và chưa tự giác học bài ở nhà.',
    targets: {
      academic_good_percent: 85,
      conduct_good_percent: 95,
      competitions: 'Tập thể Lớp Tiên Tiến Xuất Sắc'
    },
    measures: [
      '1. Phát huy vai trò tự quản của Ban cán sự lớp và Tổ trưởng.',
      '2. Tổ chức phong trào Đôi bạn cùng tiến giúp đỡ nhau học tập.',
      '3. Cập nhật thông tin chuyên cần hàng ngày và thông báo phụ huynh qua Cổng tra cứu.',
      '4. Kịp thời biểu dương việc tốt và nhắc nhở học sinh vi phạm.'
    ]
  });

  useEffect(() => {
    const saved = localStorage.getItem('homeroom_selected_class') || '';
    setClassId(saved);

    const handleClassChange = (e: any) => {
      if (e.detail?.classId) {
        setClassId(e.detail.classId);
      }
    };

    window.addEventListener('homeroom:class_changed', handleClassChange);
    return () => window.removeEventListener('homeroom:class_changed', handleClassChange);
  }, []);

  useEffect(() => {
    if (!classId) return;

    async function load() {
      setLoading(true);
      try {
        // 1. Students
        const { data: studentClasses } = await supabase
          .from('student_classes')
          .select('student_id, students(*)')
          .eq('class_id', classId);

        const list: Student[] = (studentClasses || [])
          .map((sc: any) => sc.students)
          .filter(Boolean);

        setStudents(list);

        // 2. Settings
        const st = await getHomeroomClassSettings(classId);
        setSettings(st);

        // 3. Plans
        const plans = await getHomeroomPlans(classId, '2025-2026', 'yearly');
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
              measures: plans[0].content.measures || formContent.measures
            });
          }
        }

        // 4. Teacher Name
        const { data: classData } = await supabase
          .from('classes')
          .select('teacher_classes(is_homeroom, profiles(full_name))')
          .eq('id', classId)
          .maybeSingle();

        const homeroomTc: any = (classData?.teacher_classes || []).find((tc: any) => tc.is_homeroom);
        const name = Array.isArray(homeroomTc?.profiles)
          ? homeroomTc.profiles[0]?.full_name
          : homeroomTc?.profiles?.full_name;
        if (name) setTeacherName(name);

      } catch (err) {
        console.error('Error loading handbook data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [classId]);

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      await saveHomeroomPlan({
        id: yearlyPlan?.id,
        class_id: classId,
        academic_year: '2025-2026',
        plan_type: 'yearly',
        period_key: 'full_year',
        title: `Kế hoạch Chủ nhiệm Năm học 2025-2026 — Lớp ${classId}`,
        content: formContent
      });
      toast.success('Đã lưu Sổ chủ nhiệm số!');
    } catch (err) {
      toast.error('Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleExportDocx = async () => {
    if (!settings) return;
    try {
      toast.loading('Đang đóng gói file Sổ chủ nhiệm Word...', { id: 'handbook-docx' });
      await exportHomeroomHandbookDocx(
        classId,
        '2025-2026',
        teacherName,
        students,
        settings,
        {
          ...yearlyPlan,
          content: formContent
        } as any
      );
      toast.success('Đã tải xuống Sổ chủ nhiệm Word (.DOCX)!', { id: 'handbook-docx' });
    } catch (err) {
      toast.error('Lỗi khi xuất file', { id: 'handbook-docx' });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Sổ Kế Hoạch & Quản Lý Chủ Nhiệm Số
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lớp {classId} — Năm học 2025-2026 • Tự động liên kết dữ liệu sĩ số, ban cán sự và xuất bản in
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDocx}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Xuất Sổ Word (.DOCX)</span>
          </button>

          <button
            onClick={handleSavePlan}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu Sổ Chủ Nhiệm'}</span>
          </button>
        </div>
      </div>

      {/* SỔ CHỦ NHIỆM CONTENT CONTAINER */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-slate-950/70 border border-slate-800/80 p-6 sm:p-10 backdrop-blur-md space-y-8 shadow-2xl">
        {/* BÌA TRONG */}
        <div className="text-center border-b border-slate-800 pb-8 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Trường THCS Trần Bội Cơ</p>
          <h2 className="text-2xl sm:text-3xl font-black text-indigo-400 tracking-tight">
            SỔ KẾ HOẠCH CHỦ NHIỆM LỚP {classId}
          </h2>
          <p className="text-sm text-slate-300 font-medium">Năm học 2025 — 2026</p>
          <p className="text-xs text-slate-400 pt-2">
            Giáo viên chủ nhiệm: <span className="font-bold text-white">{teacherName}</span> • Sĩ số: <span className="font-bold text-white">{students.length} học sinh</span>
          </p>
        </div>

        {/* PHẦN I: ĐẶC ĐIỂM TÌNH HÌNH */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-300 font-black text-sm uppercase tracking-wider">
            <School className="w-4 h-4" />
            <span>Phần I: Đặc điểm tình hình lớp</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">1. Thuận lợi:</label>
              <textarea
                rows={3}
                value={formContent.strengths}
                onChange={(e) => setFormContent({ ...formContent, strengths: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs sm:text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">2. Khó khăn:</label>
              <textarea
                rows={3}
                value={formContent.challenges}
                onChange={(e) => setFormContent({ ...formContent, challenges: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs sm:text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>
        </div>

        {/* PHẦN II: MỤC TIÊU & CHỈ TIÊU */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-indigo-300 font-black text-sm uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Phần II: Mục tiêu & Chỉ tiêu phấn đấu</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Chỉ tiêu Học lực Tốt/Khá (%)</label>
              <input
                type="number"
                value={formContent.targets?.academic_good_percent || 85}
                onChange={(e) => setFormContent({
                  ...formContent,
                  targets: { ...formContent.targets, academic_good_percent: parseInt(e.target.value) || 0 }
                })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Chỉ tiêu Hạnh kiểm Tốt (%)</label>
              <input
                type="number"
                value={formContent.targets?.conduct_good_percent || 95}
                onChange={(e) => setFormContent({
                  ...formContent,
                  targets: { ...formContent.targets, conduct_good_percent: parseInt(e.target.value) || 0 }
                })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-blue-400"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <label className="text-xs font-bold text-slate-400 block">Danh hiệu thi đua</label>
              <input
                type="text"
                value={formContent.targets?.competitions || ''}
                onChange={(e) => setFormContent({
                  ...formContent,
                  targets: { ...formContent.targets, competitions: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-amber-400"
              />
            </div>
          </div>
        </div>

        {/* PHẦN III: BIỆN PHÁP GIÁO DỤC CHỦ YẾU */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-indigo-300 font-black text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Phần III: Biện pháp thực hiện chủ yếu</span>
          </div>

          <div className="space-y-2">
            {formContent.measures.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={m}
                  onChange={(e) => {
                    const updated = [...formContent.measures];
                    updated[idx] = e.target.value;
                    setFormContent({ ...formContent, measures: updated });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm text-slate-200"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
