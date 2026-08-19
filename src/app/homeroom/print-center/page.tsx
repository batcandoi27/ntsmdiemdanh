"use client";

import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Users,
  Award,
  AlertTriangle,
  School,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getHomeroomClassSettings,
  getHomeroomPlans,
  getHomeroomEvents
} from '@/services/homeroom-service';
import {
  exportClassListDocx,
  exportHomeroomHandbookDocx,
  exportStudentReportDocx,
  exportIncidentRecordDocx,
  exportParentMeetingDocx
} from '@/services/homeroom-print-service';
import { HomeroomClassSettings, HomeroomEvent, HomeroomPlan } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TemplateOption {
  id: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
}

const templates: TemplateOption[] = [
  {
    id: 'template_class_list',
    title: '1. Danh sách học sinh & Ban cán sự lớp',
    category: 'Đầu năm / Tổ chức',
    description: 'Bao gồm toàn bộ danh sách lớp, ban cán sự, danh sách 4 tổ và thông tin phụ huynh.',
    badge: 'Phổ biến'
  },
  {
    id: 'template_handbook',
    title: '2. Toàn bộ Sổ kế hoạch chủ nhiệm điện tử',
    category: 'Sổ sách hành chính',
    description: 'Bìa sổ, đặc điểm tình hình lớp, mục tiêu, chỉ tiêu và biện pháp thực hiện theo năm học.',
    badge: 'Quan trọng'
  },
  {
    id: 'template_student_report',
    title: '3. Phiếu liên lạc & Báo cáo kết quả rèn luyện',
    category: 'Gửi Phụ huynh',
    description: 'Tổng kết chuyên cần, ghi nhận việc tốt, sự việc cần lưu ý và nhận xét của GVCN cho 1 học sinh.',
    badge: 'Thường dùng'
  },
  {
    id: 'template_incident',
    title: '4. Biên bản sự việc & Bản cam kết rèn luyện',
    category: 'Kỷ luật & Xử lý',
    description: 'Ghi nhận diễn biến sự việc vi phạm, biện pháp xử lý và cam kết khắc phục của học sinh.',
  },
  {
    id: 'template_parent_meeting',
    title: '5. Biên bản họp Cha Mẹ Học Sinh & DS ký tên',
    category: 'Họp Phụ huynh',
    description: 'Biên bản cuộc họp phụ huynh đầu năm/cuối kỳ kèm danh sách ký tên xác nhận của cha mẹ học sinh.',
    badge: 'Đầu năm'
  }
];

export default function HomeroomPrintCenterPage() {
  const [classId, setClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<HomeroomClassSettings | null>(null);
  const [events, setEvents] = useState<HomeroomEvent[]>([]);
  const [yearlyPlan, setYearlyPlan] = useState<HomeroomPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template_class_list');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [teacherName, setTeacherName] = useState('Giáo viên chủ nhiệm');

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
        // Students
        const { data: studentClasses } = await supabase
          .from('student_classes')
          .select('student_id, students(*)')
          .eq('class_id', classId);

        const list: Student[] = (studentClasses || [])
          .map((sc: any) => sc.students)
          .filter(Boolean);

        setStudents(list);
        if (list.length > 0) setSelectedStudentId(list[0].id);

        // Settings
        const st = await getHomeroomClassSettings(classId);
        setSettings(st);

        // Events
        const evts = await getHomeroomEvents(classId);
        setEvents(evts);

        // Plans
        const plans = await getHomeroomPlans(classId, '2025-2026', 'yearly');
        if (plans && plans.length > 0) setYearlyPlan(plans[0]);

        // Teacher Name
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
        console.error('Error loading print center:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [classId]);

  // Xử lý xuất file DOCX theo mẫu đang chọn
  const handleExportCurrent = async () => {
    if (!settings) return;
    try {
      toast.loading('Đang khởi tạo file Word chuẩn...', { id: 'print-docx' });

      if (selectedTemplateId === 'template_class_list') {
        await exportClassListDocx(classId, '2025-2026', teacherName, students, settings);
      } else if (selectedTemplateId === 'template_handbook') {
        await exportHomeroomHandbookDocx(classId, '2025-2026', teacherName, students, settings, yearlyPlan);
      } else if (selectedTemplateId === 'template_student_report') {
        const student = students.find(s => s.id === selectedStudentId) || students[0];
        const studentEvents = events.filter(e => e.student_id === student.id);
        await exportStudentReportDocx(
          classId,
          student,
          { totalDays: 30, presentCount: 29, excusedAbsenceCount: 1, unexcusedAbsenceCount: 0, lateCount: 0, attendanceRate: 97 },
          studentEvents,
          teacherName
        );
      } else if (selectedTemplateId === 'template_incident') {
        const student = students.find(s => s.id === selectedStudentId) || students[0];
        const sampleEvent: HomeroomEvent = events.find(e => e.student_id === student.id) || {
          id: 'temp',
          class_id: classId,
          student_id: student.id,
          date: '2026-08-20',
          type: 'behavior',
          category: 'Vi phạm nề nếp',
          severity: 'attention',
          points_delta: -2,
          description: 'Học sinh đi học muộn và chưa thuộc bài đầu giờ.',
          source: 'gvcn',
          action_taken: 'GVCN nhắc nhở và yêu cầu viết bản cam kết.',
          status: 'open',
          is_visible_to_parent: true,
          created_by: 'gvcn',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await exportIncidentRecordDocx(classId, student, sampleEvent, teacherName);
      } else if (selectedTemplateId === 'template_parent_meeting') {
        await exportParentMeetingDocx(classId, '2025-2026', teacherName, students);
      }

      toast.success('Đã tải file Word (.DOCX) thành công!', { id: 'print-docx' });
    } catch (err) {
      toast.error('Lỗi khi xuất file', { id: 'print-docx' });
    }
  };

  // In trực tiếp bằng trình duyệt
  const handleBrowserPrint = () => {
    window.print();
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Trung Tâm In Ấn & Biểu Mẫu Hành Chính
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lớp {classId} — Trích xuất dữ liệu lớp học thành các văn bản chuẩn THCS để in ấn hoặc xuất file Word
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBrowserPrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>In trực tiếp (Print)</span>
          </button>

          <button
            onClick={handleExportCurrent}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Tải file Word (.DOCX)</span>
          </button>
        </div>
      </div>

      {/* GRID: TEMPLATE SELECTOR (LEFT) + LIVE PREVIEW (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TEMPLATE LIST (4 COLS) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Danh mục biểu mẫu chuẩn
          </h2>

          <div className="space-y-2.5">
            {templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-3xl border transition-all space-y-1.5",
                    isSelected
                      ? "bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {tpl.category}
                    </span>
                    {tpl.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {tpl.badge}
                      </span>
                    )}
                  </div>
                  <h3 className={cn("text-sm font-black", isSelected ? "text-white" : "text-slate-200")}>
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{tpl.description}</p>
                </button>
              );
            })}
          </div>

          {/* CHỌN HỌC SINH NẾU LÀ BIỂU MẪU CÁ NHÂN */}
          {(selectedTemplateId === 'template_student_report' || selectedTemplateId === 'template_incident') && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Chọn học sinh áp dụng biểu mẫu:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {(s as any).full_name || (s as any).name} ({s.code || s.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* LIVE PREVIEW CANVAS (7 COLS) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Xem trước trực quan (Live Preview)</span>
            </h2>
            <span className="text-[11px] text-slate-500">Khổ giấy chuẩn A4</span>
          </div>

          {/* PREVIEW PAPER (LIGHT THEME LIKE WORD/A4) */}
          <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 min-h-[500px] text-xs sm:text-sm space-y-6 font-sans">
            {/* PAPER HEADER */}
            <div className="text-center space-y-1 border-b pb-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Trường THCS Trần Bội Cơ</p>
              <h3 className="text-lg font-black text-slate-900 uppercase">
                {selectedTemplate?.title.replace(/^\d+\.\s*/, '')}
              </h3>
              <p className="text-xs italic text-slate-600">
                Lớp: <span className="font-bold">{classId}</span> — Năm học: 2025-2026 — GVCN: <span className="font-bold">{teacherName}</span>
              </p>
            </div>

            {/* PREVIEW BODY */}
            {selectedTemplateId === 'template_class_list' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-700">
                  <p className="font-bold text-slate-900 mb-1">I. BAN CÁN SỰ LỚP:</p>
                  <p>• Lớp trưởng: <span className="font-bold">{settings?.class_structure?.monitor_name || 'Chưa phân công'}</span></p>
                  <p>• Lớp phó Học tập: <span className="font-bold">{settings?.class_structure?.vice_academic_name || 'Chưa phân công'}</span></p>
                </div>

                <div>
                  <p className="font-bold text-slate-900 mb-2">II. DANH SÁCH HỌC SINH ({students.length} HS):</p>
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold">
                        <th className="border border-slate-300 p-1.5 text-center w-10">STT</th>
                        <th className="border border-slate-300 p-1.5">Mã HS</th>
                        <th className="border border-slate-300 p-1.5">Họ và tên</th>
                        <th className="border border-slate-300 p-1.5">Ngày sinh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 5).map((s, idx) => (
                        <tr key={s.id}>
                          <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-mono">{s.code || '—'}</td>
                          <td className="border border-slate-300 p-1.5 font-medium">{(s as any).full_name || (s as any).name}</td>
                          <td className="border border-slate-300 p-1.5">{s.birthday || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length > 5 && (
                    <p className="text-[11px] italic text-slate-500 mt-1">...và {students.length - 5} học sinh khác</p>
                  )}
                </div>
              </div>
            )}

            {selectedTemplateId === 'template_handbook' && (
              <div className="space-y-3 text-xs text-slate-700">
                <p><span className="font-bold">1. Thuận lợi:</span> Đa số học sinh chăm ngoan, cơ sở vật chất đầy đủ.</p>
                <p><span className="font-bold">2. Khó khăn:</span> Cần tăng cường kiểm tra nề nếp và bài tập về nhà.</p>
                <p><span className="font-bold">3. Chỉ tiêu:</span> 85% học lực Tốt/Khá, 95% hạnh kiểm Tốt.</p>
                <p className="text-slate-500 italic pt-4">...Trọn bộ sổ chủ nhiệm số sẽ được xuất tự động đầy đủ khi tải file Word.</p>
              </div>
            )}

            {selectedTemplateId === 'template_student_report' && (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p>Học sinh: <span className="font-bold text-slate-900">{(selectedStudent as any)?.full_name || (selectedStudent as any)?.name}</span> (Mã: {selectedStudent?.code || '—'})</p>
                  <p>Chuyên cần: <span className="font-bold text-emerald-700">Có mặt 29/30 ngày (97%)</span> • Đi muộn: 0 lần</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">Ghi nhận rèn luyện & Nhận xét:</p>
                  <p className="italic">Em có ý thức tự giác cao, tích cực tham gia các hoạt động tập thể của lớp.</p>
                </div>
              </div>
            )}

            {/* PAPER FOOTER */}
            <div className="pt-6 border-t flex items-center justify-between text-xs text-slate-500">
              <span>NTSM Điểm Danh • In ấn v1.0</span>
              <span>Ký tên: {teacherName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
