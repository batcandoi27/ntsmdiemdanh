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
  saveHomeroomPlan,
  getStudent360Timeline,
  getStudentPortalQrPayload
} from '@/services/homeroom-service';
import { exportStudentReportDocx } from '@/services/homeroom-print-service';
import { StudentEducationalProfile, HomeroomEvent, Student360Event } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn, sortStudentsByCode } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import { QuickCaptureModal } from '@/components/homeroom/quick-capture-modal';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Zap } from 'lucide-react';
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
  const [timelineEvents, setTimelineEvents] = useState<Student360Event[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  const loadData = async (activeId: string) => {
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
  };

  // Load class ID & Students
  useEffect(() => {
    const activeId = localStorage.getItem('homeroom_active_class_id') || '';
    setClassId(activeId);
    if (activeId) loadData(activeId);

    const handleClassChange = () => {
      const newId = localStorage.getItem('homeroom_active_class_id') || '';
      setClassId(newId);
      if (newId) loadData(newId);
    };

    window.addEventListener('homeroom_class_changed', handleClassChange);
    return () => window.removeEventListener('homeroom_class_changed', handleClassChange);
  }, []);

  // Handle open student profile (Student 360)
  const handleOpenProfile = async (st: Student) => {
    setSelectedStudent(st);
    setIsDrawerOpen(true);
    setProfileLoading(true);
    try {
      const [profileData, timelineData] = await Promise.all([
        getStudentEducationalProfile(st.id, classId),
        getStudent360Timeline(st.id, classId)
      ]);
      setStudentProfile(profileData);
      setTimelineEvents(timelineData);
      setQrUrl(getStudentPortalQrPayload(st, classId));
    } catch (err) {
      toast.error('Lỗi khi tải hồ sơ học sinh');
    } finally {
      setProfileLoading(false);
    }
  };

  // Mở QR Modal trực tiếp
  const handleOpenQrModal = (st: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudent(st);
    setQrUrl(getStudentPortalQrPayload(st, classId));
    setIsQrModalOpen(true);
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

  // Filter and sort students by code
  const filteredStudents = sortStudentsByCode(
    students.filter(st => {
      const name = st.fullName || (st as any).full_name || (st as any).name || '';
      const code = st.code || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.toLowerCase().includes(searchQuery.toLowerCase());
    })
  );

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER SECTION (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card p-5 rounded-3xl border border-border-default shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-text-primary tracking-tight">
              Danh Sách & Hồ Sơ Giáo Dục Học Sinh
            </h2>
            <HomeroomTooltip content="Quản lý toàn bộ hồ sơ, xem dòng thời gian rèn luyện, chuyên cần và xuất phiếu liên lạc Word cho từng em." />
          </div>
          <p className="text-xs text-text-secondary font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : 'Đang tải...'}</span> • Sĩ số: <span className="font-bold text-text-primary">{students.length} học sinh</span> • GVCN: <span className="text-text-primary font-bold">{teacherName}</span>
          </p>
        </div>

        {/* SEARCH BOX */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã HS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-section border border-border-default rounded-2xl pl-10 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus transition-all placeholder:text-text-disabled font-medium shadow-xs"
          />
        </div>
      </div>

      {/* STUDENTS TABLE (Light Theme) */}
      <div className="bg-surface-card rounded-3xl border border-border-default shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead className="bg-surface-section border-b border-border-default text-text-secondary uppercase tracking-wider font-bold text-[11px]">
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
            <tbody className="divide-y divide-border-subtle">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-tertiary font-medium">
                    {loading ? 'Đang tải danh sách học sinh...' : 'Không tìm thấy học sinh phù hợp.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const studentName = st.fullName || (st as any).full_name || (st as any).name || 'Học sinh';
                  const isFemale = (st as any).gender === 'female' || (st as any).gender === 'F' || (st as any).gender === 'Nữ' || st.gender === 'Nữ';
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-surface-hover transition-colors group cursor-pointer"
                      onClick={() => handleOpenProfile(st)}
                    >
                      <td className="py-3 px-4 text-center text-text-tertiary font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-text-secondary font-medium">{st.code || '—'}</td>
                      <td className="py-3 px-4 font-bold text-text-primary group-hover:text-indigo-600 transition-colors">
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => handleOpenQrModal(st, e)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 text-xs font-bold transition-all shadow-xs"
                            title="Mã QR tra cứu cho phụ huynh"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenProfile(st)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-bold transition-all shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Hồ sơ 360</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT PROFILE DRAWER (Student 360 Timeline) */}
      {isDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
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
                  <p className="text-xs text-slate-500 font-medium">
                    Mã HS: <span className="font-mono text-slate-800 font-bold">{selectedStudent.code || 'Chưa có'}</span> • Lớp: <span className="text-indigo-700 font-bold">{className ? `Lớp ${className}` : 'Lớp học'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                  title="Xem mã QR tra cứu Phụ huynh"
                >
                  <QrCode className="w-4 h-4" />
                </button>

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

            {/* DRAWER BODY (Student 360 Timeline) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {profileLoading || !studentProfile ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  Đang tải hồ sơ 360 quá trình giáo dục...
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
                          {studentProfile.attendanceStats?.attendanceRate ?? 100}%
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                        <span className="text-[11px] text-amber-800 block font-medium">Đi muộn</span>
                        <span className="text-lg font-black text-amber-600">
                          {studentProfile.attendanceStats?.lateCount ?? 0} lần
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                        <span className="text-[11px] text-rose-800 block font-medium">Vắng (Phép/KP)</span>
                        <span className="text-lg font-black text-rose-600">
                          {((studentProfile.attendanceStats?.excusedCount ?? studentProfile.attendanceStats?.excusedAbsenceCount ?? 0) + (studentProfile.attendanceStats?.unexcusedCount ?? studentProfile.attendanceStats?.unexcusedAbsenceCount ?? 0)) || 0} buổi
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. DÒNG THỜI GIAN HỌC SINH 360 (CHUYÊN CẦN + NỀ NẾP + ĐƠN NGHỈ + LIÊN HỆ PH) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Dòng Thời Gian 360° ({timelineEvents.length} sự kiện)</span>
                      </div>
                    </div>

                    {timelineEvents.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center text-slate-400 text-xs">
                        Học sinh có nề nếp ổn định, chưa có sự việc hoặc ghi nhận bất thường.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {timelineEvents.map((evt) => (
                          <div
                            key={evt.id}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-all space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{evt.title}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", evt.badge_color)}>
                                  {evt.badge_label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">{evt.date}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
                            {evt.meta?.action_taken && (
                              <p className="text-[11px] text-indigo-600 font-medium">↳ Xử lý: {evt.meta.action_taken}</p>
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
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[11px] text-slate-500">Hồ sơ điện tử cập nhật thời gian thực</span>
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

      {/* QR CODE TRA CỨU MODAL CHO PHỤ HUYNH */}
      {isQrModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900">Mã QR Tra Cứu Phụ Huynh</h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Phụ huynh em <strong className="text-slate-900">{(selectedStudent as any).full_name || (selectedStudent as any).name}</strong> có thể quét mã này bằng Zalo / Camera để tự động vào Cổng Tra Cứu không cần đăng nhập.
            </p>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
              <QRCodeSVG value={qrUrl} size={180} level="M" />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono break-all text-left">
              {qrUrl}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(qrUrl);
                toast.success('Đã sao chép link tra cứu!');
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Sao chép đường dẫn (Deep-link)
            </button>
          </div>
        </div>
      )}

      {/* QUICK CAPTURE FLOATING BUTTON (Raised z-index and bottom clearance) */}
      <div className="fixed bottom-14 sm:bottom-16 right-6 sm:right-8 z-50">
        <button
          onClick={() => setIsQuickCaptureOpen(true)}
          className="px-5 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-2xl shadow-indigo-600/40 flex items-center gap-2 active:scale-95 transition-all border-2 border-white/30"
        >
          <Zap className="w-4 h-4 fill-current text-amber-300" />
          <span>+ Ghi Nhận (3s)</span>
        </button>
      </div>

      {/* QUICK CAPTURE MODAL */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        classId={classId}
        students={students}
        onEventCreated={() => {
          if (classId) loadData(classId);
        }}
      />
    </div>
  );
}

