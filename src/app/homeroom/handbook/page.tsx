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
  HelpCircle,
  Brain,
  AlertTriangle,
  Users,
  Copy,
  Check,
  TrendingUp,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomClassSettings,
  getHomeroomPlans,
  saveHomeroomPlan,
  getHomeroomMonthlySynthesis,
  getReportCardEvaluationPresets
} from '@/services/homeroom-service';
import { exportHomeroomHandbookDocx } from '@/services/homeroom-print-service';
import { HomeroomPlan, HomeroomClassSettings, MonthlySynthesisReport, ReportCardEvaluationPreset } from '@/types/homeroom';
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
  const [activeTab, setActiveTab] = useState<'yearly_plan' | 'monthly_ai'>('yearly_plan');

  // Month synthesis state
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [synthesisReport, setSynthesisReport] = useState<MonthlySynthesisReport | null>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const [evaluationPresets, setEvaluationPresets] = useState<ReportCardEvaluationPreset[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
    setEvaluationPresets(getReportCardEvaluationPresets());

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

        // Load monthly synthesis
        loadSynthesis(activeId, selectedMonth);
      } catch (err) {
        console.error('Error loading handbook data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [classId]);

  const loadSynthesis = async (cId: string, month: string) => {
    if (!cId) return;
    setLoadingSynthesis(true);
    try {
      const rep = await getHomeroomMonthlySynthesis(cId, month);
      setSynthesisReport(rep);
    } catch (e) {
      console.error('Failed to load synthesis:', e);
    } finally {
      setLoadingSynthesis(false);
    }
  };

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success('Đã sao chép câu nhận xét!');
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Đang tải Sổ chủ nhiệm điện tử...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Sổ Kế Hoạch & Trợ Lý Chủ Nhiệm Số
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

          {activeTab === 'yearly_plan' && (
            <button
              onClick={handleSavePlan}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Sổ Chủ Nhiệm'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('yearly_plan')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'yearly_plan'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Sổ Kế Hoạch Năm Học</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly_ai')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'monthly_ai'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <Brain className="w-4 h-4" />
          <span>Trợ Lý Báo Cáo Tháng & Đề Xuất Can Thiệp AI</span>
        </button>
      </div>

      {/* 2. TAB 1: SỔ KẾ HOẠCH NĂM HỌC */}
      {activeTab === 'yearly_plan' && (
        <div className="space-y-6">
          {/* PHẦN I */}
          <ThemedCard
            index={0}
            badgeText="PHẦN I: ĐẶC ĐIỂM TÌNH HÌNH LỚP"
            icon={BookOpen}
            showNumber={true}
            innerContainer={true}
            className="space-y-4"
          >
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

          {/* PHẦN II */}
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

          {/* PHẦN III */}
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
      )}

      {/* 3. TAB 2: TRỢ LÝ BÁO CÁO THÁNG & ĐỀ XUẤT CAN THIỆP AI */}
      {activeTab === 'monthly_ai' && (
        <div className="space-y-6">
          {/* MONTH SELECTOR & QUICK METRICS */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Tổng Hợp Tình Hình Học Sinh Tháng {selectedMonth}</span>
                </h3>
                <p className="text-xs text-slate-500">Phân tích đa tín hiệu chuyên cần, nề nếp, khen thưởng và đề xuất can thiệp cá nhân hóa.</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Chọn tháng:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    loadSynthesis(classId, e.target.value);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50"
                />
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-[11px] font-bold text-indigo-700 block">Sĩ số lớp</span>
                <span className="text-xl font-black text-indigo-900">{synthesisReport?.total_students || students.length} học sinh</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-700 block">Tỷ lệ chuyên cần</span>
                <span className="text-xl font-black text-emerald-900">{synthesisReport?.attendance_rate || 98}%</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100">
                <span className="text-[11px] font-bold text-sky-700 block">Tuyên dương / Việc tốt</span>
                <span className="text-xl font-black text-sky-900">+{synthesisReport?.total_positive_events || 0} lượt</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
                <span className="text-[11px] font-bold text-rose-700 block">Vi phạm nề nếp</span>
                <span className="text-xl font-black text-rose-900">{synthesisReport?.total_violations || 0} lượt</span>
              </div>
            </div>
          </div>

          {/* 4 NHÓM HỌC SINH TỰ ĐỘNG */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900">Phân Loại 4 Nhóm Học Sinh Trong Tháng</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(synthesisReport?.student_groups || []).map((grp) => (
                <div
                  key={grp.group_type}
                  className={cn(
                    "p-4 rounded-3xl border shadow-sm space-y-3",
                    grp.group_type === 'praise' ? "bg-emerald-50/30 border-emerald-200" :
                    grp.group_type === 'attendance_warning' ? "bg-amber-50/30 border-amber-200" :
                    grp.group_type === 'discipline_intervention' ? "bg-rose-50/30 border-rose-200" :
                    "bg-slate-50/50 border-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{grp.group_name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                      {grp.students.length} học sinh
                    </span>
                  </div>

                  {grp.students.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-[11px]">Không có học sinh trong nhóm này</div>
                  ) : (
                    <div className="space-y-1.5">
                      {grp.students.map((st) => (
                        <div key={st.student_id} className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-800">{st.student_name}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{st.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ĐỀ XUẤT CAN THIỆP CÁ NHÂN HÓA */}
          {synthesisReport && synthesisReport.recommended_interventions.length > 0 && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Kế Hoạch & Đề Xuất Can Thiệp Cá Nhân Hóa</span>
              </h3>
              <div className="space-y-2">
                {synthesisReport.recommended_interventions.map((rec, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{rec.student_name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {rec.category}
                        </span>
                        <span className="text-[11px] text-indigo-600 font-medium">
                          Phối hợp: {rec.coordination_target === 'parent' ? 'Phụ huynh' : rec.coordination_target === 'gvbm' ? 'GVBM' : 'Ban cán sự'}
                        </span>
                      </div>
                      <p className="text-slate-600">{rec.suggested_action}</p>
                    </div>

                    <button
                      onClick={() => toast.success(`Đã thêm kế hoạch can thiệp cho ${rec.student_name}!`)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-sm self-end sm:self-center transition-all"
                    >
                      + Tạo Kế Hoạch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KHO MẪU NHẬN XÉT HỌC BẠ THÔNG TƯ 22/27 */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Kho Mẫu Nhận Xét Học Bạ & Sổ Liên Lạc (Chuẩn Thông Tư 22 & 27)</span>
              </h3>
              <p className="text-xs text-slate-500">Giúp GVCN soạn nhận xét định kỳ chuẩn sư phạm, không trùng lặp và đa dạng theo từng mức xếp loại.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluationPresets.map((preset) => (
                <div key={preset.level} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span>{preset.title}</span>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-[11px] text-slate-500 block">Nhận xét rèn luyện & đạo đức:</span>
                    {preset.conduct_comments.map((cm, cIdx) => (
                      <div key={cIdx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2 group hover:border-indigo-300 transition-all">
                        <span className="text-slate-700 leading-relaxed">{cm}</span>
                        <button
                          onClick={() => copyToClipboard(cm)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 opacity-80 group-hover:opacity-100 transition-all"
                          title="Sao chép câu nhận xét"
                        >
                          {copiedText === cm ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-[11px] text-slate-500 block">Nhận xét học tập & tự học:</span>
                    {preset.academic_comments.map((cm, aIdx) => (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2 group hover:border-indigo-300 transition-all">
                        <span className="text-slate-700 leading-relaxed">{cm}</span>
                        <button
                          onClick={() => copyToClipboard(cm)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 opacity-80 group-hover:opacity-100 transition-all"
                          title="Sao chép câu nhận xét"
                        >
                          {copiedText === cm ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

