"use client";

import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileText,
  FileDown,
  Sparkles,
  Eye,
  CheckCircle2,
  BookOpen,
  Users,
  Award,
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomClassSettings,
  getHomeroomEvents,
  getHomeroomPlans
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
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import toast from 'react-hot-toast';

interface TemplateOption {
  id: string;
  title: string;
  code: string;
  category: string;
  desc: string;
  icon: any;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'template_class_list',
    title: 'Danh Sách Học Sinh & Ban Cán Sự Lớp',
    code: 'BM-01/GVCN',
    category: 'Hành chính đầu năm',
    desc: 'Bao gồm sĩ số, họ tên, ngày sinh, giới tính, SĐT phụ huynh và ban cán sự 4 tổ.',
    icon: Users
  },
  {
    id: 'template_handbook',
    title: 'Sổ Kế Hoạch & Quản Lý Chủ Nhiệm',
    code: 'BM-02/GVCN',
    category: 'Hồ sơ chủ nhiệm',
    desc: 'Toàn bộ nội dung sổ chủ nhiệm: Đặc điểm tình hình, chỉ tiêu, mục tiêu và biện pháp thực hiện.',
    icon: BookOpen
  },
  {
    id: 'template_student_report',
    title: 'Phiếu Thông Báo Tình Hình Rèn Luyện (Gửi PH)',
    code: 'BM-03/GVCN',
    category: 'Liên lạc phụ huynh',
    desc: 'Thông báo kết quả chuyên cần, việc tốt, vi phạm và nhận xét của GVCN cho từng học sinh.',
    icon: FileText
  },
  {
    id: 'template_incident',
    title: 'Biên Bản Ghi Nhận Sự Việc & Bản Cam Kết',
    code: 'BM-04/GVCN',
    category: 'Kỷ luật & Nề nếp',
    desc: 'Biên bản xử lý vi phạm nề nếp kèm bản cam kết rèn luyện có chữ ký học sinh.',
    icon: Award
  },
  {
    id: 'template_parent_meeting',
    title: 'Biên Bản Họp Cha Mẹ Học Sinh',
    code: 'BM-05/GVCN',
    category: 'Họp phụ huynh',
    desc: 'Biên bản cuộc họp phụ huynh đầu năm / học kỳ kèm danh sách ký tên tham dự.',
    icon: Layers
  }
];

export default function HomeroomPrintCenterPage() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('Giáo viên chủ nhiệm');
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<HomeroomClassSettings | null>(null);
  const [yearlyPlan, setYearlyPlan] = useState<HomeroomPlan | null>(null);
  const [events, setEvents] = useState<HomeroomEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template_class_list');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const activeId = localStorage.getItem('homeroom_active_class_id') || '';
    setClassId(activeId);

    async function load() {
      if (!activeId) return;
      setLoading(true);
      try {
        const stList = await db.getStudentsByClass(activeId);
        setStudents(stList || []);
        if (stList && stList.length > 0) setSelectedStudentId(stList[0].id);

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
        if (plans && plans.length > 0) setYearlyPlan(plans[0]);

        const evts = await getHomeroomEvents(activeId);
        setEvents(evts);
      } catch (err) {
        console.error('Error loading print center:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [classId]);

  // Handle Export DOCX
  const handleExportDocx = async () => {
    if (!settings) return;
    setDownloading(true);
    try {
      if (selectedTemplateId === 'template_class_list') {
        await exportClassListDocx(className || 'Lop', '2025-2026', teacherName, students, settings);
      } else if (selectedTemplateId === 'template_handbook') {
        await exportHomeroomHandbookDocx(className || 'Lop', '2025-2026', teacherName, students, settings, yearlyPlan);
      } else if (selectedTemplateId === 'template_student_report') {
        const st = students.find(s => s.id === selectedStudentId) || students[0];
        await exportStudentReportDocx(className || 'Lop', st, { totalDays: 30, presentCount: 30, attendanceRate: 100 }, events, teacherName);
      } else if (selectedTemplateId === 'template_incident') {
        const st = students.find(s => s.id === selectedStudentId) || students[0];
        const evt = events.find(e => e.student_id === st?.id) || {
          id: 'temp',
          class_id: classId,
          student_id: st?.id || '',
          date: '2026-08-20',
          type: 'violation',
          category: 'Kỷ luật',
          severity: 'minor',
          points_delta: -2,
          description: 'Nói chuyện riêng trong giờ học',
          action_taken: 'Nhắc nhở và cam kết',
          status: 'resolved',
          is_visible_to_parent: true,
          created_by: 'gvcn'
        };
        await exportIncidentRecordDocx(className || 'Lop', st, evt as any, teacherName);
      } else if (selectedTemplateId === 'template_parent_meeting') {
        await exportParentMeetingDocx(className || 'Lop', '2025-2026', teacherName, students);
      }
      toast.success('Đã xuất file Word (.DOCX) thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Word');
    } finally {
      setDownloading(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTIONS (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Trung Tâm In Ấn & Biểu Mẫu Hành Chính
            </h2>
            <HomeroomTooltip content="Tự động kết xuất 5 bộ biểu mẫu chuẩn THCS với Live Preview khổ giấy A4 và xuất file Word (.DOCX) native." />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : ''}</span> • GVCN: <span className="text-slate-700 font-bold">{teacherName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>In Trực Tiếp (Ctrl + P)</span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>{downloading ? 'Đang xuất Word...' : 'Tải File Word (.DOCX)'}</span>
          </button>
        </div>
      </div>

      {/* 2. GRID 2 CỘT: DANH MỤC BIỂU MẪU & LIVE PREVIEW (A4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CỘT TRÁI (4 CỘT): DANH MỤC BIỂU MẪU */}
        <div className="lg:col-span-4 space-y-3 print:hidden">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-2.5">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">
              Danh Mục Biểu Mẫu Chuẩn THCS
            </h3>

            {TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3",
                    isSelected
                      ? "bg-indigo-50/80 border-indigo-300 shadow-sm"
                      : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/80"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-600 font-bold">{tmpl.code}</span>
                      <span className="text-[10px] text-slate-400">{tmpl.category}</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900">{tmpl.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">{tmpl.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selector chọn học sinh cho phiếu cá nhân */}
          {(selectedTemplateId === 'template_student_report' || selectedTemplateId === 'template_incident') && (
            <div className="bg-surface-card p-4 rounded-2xl border border-border-default shadow-xs space-y-2">
              <label className="font-bold text-xs text-text-primary block">
                Chọn học sinh để xuất biểu mẫu:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-surface-card border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary font-bold focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none transition-all shadow-xs cursor-pointer"
              >
                {students.map(st => (
                  <option key={st.id} value={st.id} className="text-text-primary bg-surface-card font-bold">
                    {st.fullName || (st as any).name || (st as any).full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (8 CỘT): LIVE PREVIEW KHỔ A4 TRẮNG SÁNG */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-10 text-slate-900 min-h-[800px] space-y-6">
            
            {/* QUỐC HIỆU TIÊU NGỮ */}
            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
              <h4 className="text-xs uppercase font-bold text-slate-600">ỦY BAN NHÂN DÂN QUẬN 5 — TRƯỜNG THCS TRẦN BỘI CƠ</h4>
              <h3 className="text-base sm:text-lg font-black text-indigo-950 uppercase tracking-tight">
                {selectedTemplate.title}
              </h3>
              <p className="text-xs text-slate-500 italic">
                Lớp {className ? `Lớp ${className}` : ''} — Năm học 2025 - 2026 • Giáo viên chủ nhiệm: {teacherName}
              </p>
            </div>

            {/* PREVIEW CONTENT NỘI DUNG TỪNG BIỂU MẪU */}
            {selectedTemplateId === 'template_class_list' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-black text-indigo-900 uppercase tracking-wider mb-2">
                    I. Ban Cán Sự Lớp & Tổ Trưởng:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <p>• Lớp trưởng: <span className="font-bold">{settings?.class_structure?.monitor_name || '........................'}</span></p>
                    <p>• Lớp phó Học tập: <span className="font-bold">{settings?.class_structure?.vice_academic_name || '........................'}</span></p>
                    <p>• Lớp phó Kỷ luật: <span className="font-bold">{settings?.class_structure?.vice_discipline_name || '........................'}</span></p>
                    <p>• Lớp phó Phong trào: <span className="font-bold">{settings?.class_structure?.vice_activity_name || '........................'}</span></p>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-indigo-900 uppercase tracking-wider mb-2">
                    II. Danh Sách Học Sinh Toàn Lớp (Sĩ số: {students.length}):
                  </h4>
                  <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="border border-slate-300 p-1.5 text-center w-8">STT</th>
                        <th className="border border-slate-300 p-1.5 w-20">Mã HS</th>
                        <th className="border border-slate-300 p-1.5">Họ và tên</th>
                        <th className="border border-slate-300 p-1.5 text-center w-16">Giới tính</th>
                        <th className="border border-slate-300 p-1.5 w-24">Ngày sinh</th>
                        <th className="border border-slate-300 p-1.5">SĐT Phụ huynh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 15).map((s, idx) => (
                        <tr key={s.id}>
                          <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-mono">{s.code || ''}</td>
                          <td className="border border-slate-300 p-1.5 font-bold">{s.fullName || (s as any).full_name || (s as any).name}</td>
                          <td className="border border-slate-300 p-1.5 text-center">{(s as any).gender === 'female' || (s as any).gender === 'F' || (s as any).gender === 'Nữ' || s.gender === 'Nữ' ? 'Nữ' : 'Nam'}</td>
                          <td className="border border-slate-300 p-1.5">{s.birthday || ''}</td>
                          <td className="border border-slate-300 p-1.5">{(s as any).parent_phone || (s as any).phone || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length > 15 && (
                    <p className="text-[10px] text-slate-400 italic text-center mt-2">
                      (Đang hiển thị 15/{students.length} học sinh xem trước. Bản tải về Word sẽ bao gồm toàn bộ danh sách).
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedTemplateId === 'template_handbook' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-black text-indigo-900 uppercase tracking-wider mb-1">1. Thuận lợi:</h4>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {yearlyPlan?.content?.strengths || 'Đa số học sinh chăm ngoan, có ý thức kỷ luật tốt.'}
                  </p>
                </div>

                <div>
                  <h4 className="font-black text-indigo-900 uppercase tracking-wider mb-1">2. Khó khăn:</h4>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {yearlyPlan?.content?.challenges || 'Cần tăng cường theo dõi nề nếp và học lực.'}
                  </p>
                </div>

                <div>
                  <h4 className="font-black text-indigo-900 uppercase tracking-wider mb-1">3. Chỉ tiêu phấn đấu:</h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p>• Học lực Tốt/Khá: <span className="font-bold">{yearlyPlan?.content?.targets?.academic_good_percent || 85}%</span></p>
                    <p>• Hạnh kiểm Tốt: <span className="font-bold">{yearlyPlan?.content?.targets?.conduct_good_percent || 95}%</span></p>
                  </div>
                </div>
              </div>
            )}

            {selectedTemplateId === 'template_student_report' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-indigo-900 text-sm">
                      {selectedStudent?.fullName || (selectedStudent as any)?.full_name || (selectedStudent as any)?.name}
                    </h4>
                    <p className="text-slate-500 font-medium">Lớp: {className} • Mã HS: {selectedStudent?.code || '—'}</p>
                  </div>
                  <span className="text-emerald-700 font-black text-base">Chuyên cần: 100%</span>
                </div>

                <div>
                  <h4 className="font-black text-indigo-900 uppercase tracking-wider mb-1">I. Tình hình chuyên cần:</h4>
                  <p className="text-slate-700">• Tổng số ngày học: 30 ngày | Có mặt: 30 ngày | Đi muộn: 0 lần</p>
                </div>

                <div>
                  <h4 className="font-black text-indigo-900 uppercase tracking-wider mb-1">II. Nhận xét của Giáo viên chủ nhiệm:</h4>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 italic text-slate-700">
                    "Em chăm ngoan, có ý thức rèn luyện tốt, hòa đồng và giúp đỡ bạn bè. Kính mong Quý phụ huynh tiếp tục theo dõi, đôn đốc con."
                  </div>
                </div>
              </div>
            )}

            {/* FOOTER CHỮ KÝ */}
            <div className="flex justify-between items-end pt-8 text-xs text-slate-600 border-t border-slate-100">
              <div>
                <p className="italic">Người lập biểu</p>
                <div className="h-12" />
                <p className="font-bold text-slate-900">Ban Cán Sự Lớp</p>
              </div>

              <div className="text-right">
                <p className="italic">TP. Hồ Chí Minh, ngày ...... tháng ...... năm 2026</p>
                <p className="font-bold text-slate-900 uppercase mt-0.5">Giáo Viên Chủ Nhiệm</p>
                <div className="h-12" />
                <p className="font-bold text-slate-900">{teacherName}</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
