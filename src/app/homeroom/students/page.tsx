"use client";

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Eye,
  Printer,
  Calendar,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Award,
  Clock,
  ChevronRight,
  X,
  FileText,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStudentEducationalProfile } from '@/services/homeroom-service';
import { exportStudentReportDocx } from '@/services/homeroom-print-service';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomeroomStudentsPage() {
  const [classId, setClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
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

    async function loadStudents() {
      setLoading(true);
      try {
        const { data: studentClasses } = await supabase
          .from('student_classes')
          .select('student_id, students(*)')
          .eq('class_id', classId);

        const list: Student[] = (studentClasses || [])
          .map((sc: any) => sc.students)
          .filter(Boolean)
          .sort((a: any, b: any) => {
            const nameA = a.full_name || a.name || '';
            const nameB = b.full_name || b.name || '';
            return nameA.localeCompare(nameB, 'vi');
          });

        setStudents(list);

        // Lấy tên GVCN
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
        console.error('Error loading students:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [classId]);

  // Xem chi tiết hồ sơ học sinh
  const handleOpenProfile = async (student: Student) => {
    setSelectedStudent(student);
    setProfileLoading(true);
    try {
      const res = await getStudentEducationalProfile(student.id, classId);
      setStudentProfile(res);
    } catch (err) {
      toast.error('Lỗi khi tải hồ sơ học sinh');
    } finally {
      setProfileLoading(false);
    }
  };

  // Xuất phiếu liên lạc DOCX
  const handleExportDocx = async () => {
    if (!selectedStudent || !studentProfile) return;
    try {
      toast.loading('Đang tạo file Word...', { id: 'docx-gen' });
      await exportStudentReportDocx(
        classId,
        selectedStudent,
        studentProfile.attendanceStats,
        studentProfile.events,
        teacherName
      );
      toast.success('Đã tải xuống Phiếu liên lạc Word!', { id: 'docx-gen' });
    } catch (err) {
      toast.error('Lỗi khi xuất file', { id: 'docx-gen' });
    }
  };

  const filteredStudents = students.filter(s => {
    const name = ((s as any).full_name || (s as any).name || '').toLowerCase();
    const code = (s.code || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || code.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Danh Sách & Hồ Sơ Giáo Dục Học Sinh
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lớp {classId} — Tổng số {students.length} học sinh chính thức
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã HS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* STUDENT TABLE / LIST */}
      <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 text-center w-12">STT</th>
                <th className="py-3 px-4">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4 text-center">Giới tính</th>
                <th className="py-3 px-4">Ngày sinh</th>
                <th className="py-3 px-4">Liên hệ Phụ huynh</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    {loading ? 'Đang tải danh sách học sinh...' : 'Không tìm thấy học sinh phù hợp.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const studentName = (st as any).full_name || (st as any).name;
                  const isFemale = (st as any).gender === 'female' || (st as any).gender === 'F' || (st as any).gender === 'Nữ';
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenProfile(st)}
                    >
                      <td className="py-3 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-slate-300 font-medium">{st.code || '—'}</td>
                      <td className="py-3 px-4 font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {studentName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          isFemale ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        )}>
                          {isFemale ? 'Nữ' : 'Nam'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{st.birthday || '—'}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {(st as any).parent_name && <span className="font-medium text-slate-200">{(st as any).parent_name}: </span>}
                        <span className="text-slate-400">{(st as any).parent_phone || (st as any).phone || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenProfile(st)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Hồ sơ</span>
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

      {/* DRAWER / MODAL: HỒ SƠ GIÁO DỤC CÁ NHÂN HỌC SINH */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {((selectedStudent as any).full_name || (selectedStudent as any).name || 'H').charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      {(selectedStudent as any).full_name || (selectedStudent as any).name}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      Mã HS: {selectedStudent.code || selectedStudent.id} • Lớp {classId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {profileLoading ? (
                <div className="py-20 text-center text-slate-400 text-sm">
                  Đang tải hồ sơ quá trình giáo dục...
                </div>
              ) : studentProfile ? (
                <div className="space-y-6">
                  {/* THÔNG TIN CHUYÊN CẦN */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Thống kê chuyên cần</span>
                    </h3>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-xs text-slate-400">Tỷ lệ có mặt</div>
                        <div className="text-lg font-black text-emerald-400">
                          {studentProfile.attendanceStats.attendanceRate}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-xs text-slate-400">Đi muộn</div>
                        <div className="text-lg font-black text-amber-400">
                          {studentProfile.attendanceStats.lateCount} lần
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-xs text-slate-400">Vắng</div>
                        <div className="text-lg font-black text-rose-400">
                          {studentProfile.attendanceStats.excusedAbsenceCount + studentProfile.attendanceStats.unexcusedAbsenceCount} buổi
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DÒNG THỜI GIAN QUÁ TRÌNH GIÁO DỤC (TIMELINE) */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Dòng thời gian sự việc & rèn luyện</span>
                    </h3>

                    {studentProfile.events.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                        Chưa có sự kiện nào được ghi nhận cho học sinh này.
                      </div>
                    ) : (
                      <div className="space-y-2.5 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800 pl-8">
                        {studentProfile.events.map((evt: any) => (
                          <div key={evt.id} className="relative group">
                            <div className={cn(
                              "absolute -left-8 top-1 w-4 h-4 rounded-full border-2 border-slate-900",
                              evt.type === 'positive' ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{evt.category}</span>
                                <span className="text-[10px] text-slate-400">{evt.date}</span>
                              </div>
                              <p className="text-xs text-slate-300">{evt.description}</p>
                              {evt.action_taken && (
                                <p className="text-[11px] text-indigo-300">↳ Biện pháp: {evt.action_taken}</p>
                              )}
                              {evt.result && (
                                <p className="text-[11px] text-emerald-300">↳ Kết quả: {evt.result}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KẾ HOẠCH HỖ TRỢ / CAN THIỆP (NẾU CÓ) */}
                  {studentProfile.interventions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-400" />
                        <span>Kế hoạch hỗ trợ cá nhân</span>
                      </h3>

                      <div className="space-y-2">
                        {studentProfile.interventions.map((inv: any) => (
                          <div key={inv.id} className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
                            <div className="text-xs font-bold text-purple-300">Vấn đề: {inv.problem}</div>
                            <p className="text-xs text-slate-300">Mục tiêu: {inv.goal}</p>
                            <div className="text-[11px] text-slate-400">
                              Trạng thái: <span className="text-purple-400 font-bold uppercase">{inv.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer Action: Xuất phiếu liên lạc DOCX */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Đóng
              </button>

              <button
                onClick={handleExportDocx}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                <Printer className="w-4 h-4" />
                <span>Xuất Phiếu Liên Lạc (.DOCX)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
