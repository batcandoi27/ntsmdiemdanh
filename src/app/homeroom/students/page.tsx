"use client";

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  FileDown,
  UserCheck,
  Clock,
  UserX,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Eye,
  Filter,
  X,
  Calendar,
  Phone,
  BookOpen,
  Send,
  HelpCircle
} from 'lucide-react';
import { db } from '@/services/db';
import { supabase } from '@/lib/supabase';
import {
  getStudentEducationalProfile,
  getHomeroomClassSettings,
  saveHomeroomPlan
} from '@/services/homeroom-service';
import { exportStudentReportDocx } from '@/services/homeroom-print-service';
import { StudentEducationalProfile, HomeroomEvent } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import toast from 'react-hot-toast';

export default function HomeroomStudentsPage() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('Giáo viên chủ nhiệm');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected student for Profile Drawer
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentEducationalProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load class ID & Students
  useEffect(() => {
    const activeId = localStorage.getItem('homeroom_active_class_id') || '';
    setClassId(activeId);

    async function loadData() {
      if (!activeId) return;
      setLoading(true);
      try {
        // Lấy tên lớp
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

        // Lấy danh sách học sinh của lớp
        const list = await db.getStudentsByClass(activeId);
        setStudents(list || []);
      } catch (err) {
        console.error('Error loading students:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const handleClassChange = () => {
      const newId = localStorage.getItem('homeroom_active_class_id') || '';
      setClassId(newId);
      loadData();
    };

    window.addEventListener('homeroom_class_changed', handleClassChange);
    return () => window.removeEventListener('homeroom_class_changed', handleClassChange);
  }, [classId]);

  // Handle open student profile
  const handleOpenProfile = async (st: Student) => {
    setSelectedStudent(st);
    setIsDrawerOpen(true);
    setProfileLoading(true);
    try {
      const data = await getStudentEducationalProfile(st.id, classId);
      setStudentProfile(data);
    } catch (err) {
      toast.error('Lỗi khi tải hồ sơ học sinh');
    } finally {
      setProfileLoading(false);
    }
  };

  // Export DOCX Report
  const handleExportDocx = async (st: Student) => {
    if (!studentProfile) return;
    try {
      await exportStudentReportDocx(
        className || 'Lớp học',
        st,
        studentProfile.attendanceStats,
        studentProfile.events,
        teacherName
      );
      toast.success(`Đã xuất phiếu liên lạc cho em ${(st as any).full_name || (st as any).name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xuất file Word');
    }
  };

  // Filter students
  const filteredStudents = students.filter(st => {
    const name = (st as any).full_name || (st as any).name || '';
    const code = st.code || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Danh Sách & Hồ Sơ Giáo Dục Học Sinh
            </h2>
            <HomeroomTooltip content="Quản lý toàn bộ hồ sơ, xem dòng thời gian rèn luyện, chuyên cần và xuất phiếu liên lạc Word cho từng em." />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : 'Đang tải...'}</span> • Sĩ số: <span className="font-bold text-slate-800">{students.length} học sinh</span> • GVCN: <span className="text-slate-700 font-bold">{teacherName}</span>
          </p>
        </div>

        {/* SEARCH BOX */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã HS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      {/* STUDENTS TABLE (Light Theme) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">STT</th>
                <th className="py-3.5 px-4 w-28">Mã HS</th>
                <th className="py-3.5 px-4">Họ và tên</th>
                <th className="py-3.5 px-4 text-center w-20">Giới tính</th>
                <th className="py-3.5 px-4 w-28">Ngày sinh</th>
                <th className="py-3.5 px-4">Thông tin Phụ huynh</th>
                <th className="py-3.5 px-4 text-right w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {loading ? 'Đang tải danh sách học sinh...' : 'Không tìm thấy học sinh phù hợp.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const studentName = (st as any).full_name || (st as any).name || 'Học sinh';
                  const isFemale = (st as any).gender === 'female' || (st as any).gender === 'F' || (st as any).gender === 'Nữ';
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => handleOpenProfile(st)}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 font-medium">{st.code || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {studentName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          isFemale ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {isFemale ? 'Nữ' : 'Nam'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{st.birthday || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {(st as any).parent_name && <span className="font-semibold text-slate-800">{(st as any).parent_name}: </span>}
                        <span className="text-slate-500">{(st as any).parent_phone || (st as any).phone || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenProfile(st)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-bold transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Hồ sơ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT PROFILE DRAWER (Bounded, Responsive, Light Theme) */}
      {isDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl h-full flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
            
            {/* DRAWER HEADER */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
                  {((selectedStudent as any).full_name || (selectedStudent as any).name || 'H').charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {(selectedStudent as any).full_name || (selectedStudent as any).name}
                  </h3>
                  {/* HIỂN THỊ TÊN LỚP THÂN THIỆN - TUYỆT ĐỐI KHÔNG HIỂN THỊ RAW UUID */}
                  <p className="text-xs text-slate-500 font-medium">
                    Mã HS: <span className="font-mono text-slate-800 font-bold">{selectedStudent.code || 'Chưa có'}</span> • Lớp: <span className="text-indigo-700 font-bold">{className ? `Lớp ${className}` : 'Lớp học'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportDocx(selectedStudent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                  title="Xuất phiếu liên lạc dạng Word"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xuất Word</span>
                </button>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DRAWER BODY (Internal scroll, non-destructive layout) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {profileLoading || !studentProfile ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  Đang tải hồ sơ quá trình giáo dục...
                </div>
              ) : (
                <>
                  {/* 1. THỐNG KÊ CHUYÊN CẦN */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Thống kê Chuyên Cần</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                        <span className="text-[11px] text-emerald-800 block font-medium">Tỷ lệ có mặt</span>
                        <span className="text-lg font-black text-emerald-600">
                          {studentProfile.attendanceStats.attendanceRate}%
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                        <span className="text-[11px] text-amber-800 block font-medium">Đi muộn</span>
                        <span className="text-lg font-black text-amber-600">
                          {studentProfile.attendanceStats.lateCount} lần
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                        <span className="text-[11px] text-rose-800 block font-medium">Vắng (Phép/KP)</span>
                        <span className="text-lg font-black text-rose-600">
                          {studentProfile.attendanceStats.excusedCount + studentProfile.attendanceStats.unexcusedCount} buổi
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. DÒNG THỜI GIAN SỰ VIỆC & RÈN LUYỆN */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Dòng Thời Gian Sự Việc & Rèn Luyện</span>
                    </div>

                    {studentProfile.events.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center text-slate-400 text-xs">
                        Chưa có sự việc hoặc ghi nhận nào cho học sinh này.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {studentProfile.events.map((evt) => (
                          <div
                            key={evt.id}
                            className={cn(
                              "p-3.5 rounded-2xl border transition-all",
                              evt.type === 'positive'
                                ? "bg-emerald-50/60 border-emerald-200/80"
                                : "bg-slate-50 border-slate-200/80"
                            )}
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={cn(
                                "font-bold",
                                evt.type === 'positive' ? "text-emerald-800" : "text-slate-900"
                              )}>
                                {evt.category}
                              </span>
                              <div className="flex items-center gap-2">
                                {evt.points_delta !== 0 && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-black",
                                    evt.points_delta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                  )}>
                                    {evt.points_delta > 0 ? `+${evt.points_delta}` : evt.points_delta}đ
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">{evt.date}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
                            {evt.result && (
                              <p className="text-[11px] text-indigo-600 font-medium mt-1">↳ Kết quả: {evt.result}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* DRAWER FOOTER */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
