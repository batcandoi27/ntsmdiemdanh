"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  School,
  Lock,
  Search,
  UserCheck,
  Clock,
  UserX,
  Sparkles,
  Calendar,
  Send,
  CheckCircle2,
  ChevronLeft,
  BookOpen,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/db';
import { verifyParentPortalAccess, getParentStudentOverview, createHomeroomParentContact } from '@/services/homeroom-service';
import { ParentStudentOverview } from '@/types/homeroom';
import { Class, Student } from '@/types/models';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ParentPortalPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [pinCodeInput, setPinCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Đã xác thực thành công
  const [authenticatedStudent, setAuthenticatedStudent] = useState<Student | null>(null);
  const [overview, setOverview] = useState<ParentStudentOverview | null>(null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'events' | 'timetable' | 'message'>('attendance');

  // Form gửi lời nhắn
  const [messageContent, setMessageContent] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    async function loadClasses() {
      try {
        const list = await db.getClasses();
        setClasses(list || []);
        if (list && list.length > 0) setSelectedClassId(list[0].id);
      } catch (err) {
        console.error('Error loading classes for portal:', err);
      }
    }
    loadClasses();
  }, []);

  // Xử lý xác thực tra cứu
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedClassId || !studentIdInput.trim() || !pinCodeInput.trim()) {
      setErrorMsg('Vui lòng chọn lớp, nhập Mã học sinh/CCCD và Mã PIN lớp!');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyParentPortalAccess(selectedClassId, studentIdInput, pinCodeInput);
      if (!res.success || !res.student) {
        setErrorMsg(res.error || 'Thông tin tra cứu không chính xác!');
        setLoading(false);
        return;
      }

      setAuthenticatedStudent(res.student);
      // Lấy toàn bộ dữ liệu hiển thị
      const data = await getParentStudentOverview(res.student.id, selectedClassId);
      setOverview(data);
      toast.success('Tra cứu thành công!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tra cứu thông tin');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi lời nhắn cho GVCN
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview || !messageContent.trim()) return;

    setSendingMsg(true);
    try {
      await createHomeroomParentContact({
        class_id: overview.student.class_id,
        student_id: overview.student.id,
        contact_type: 'portal_feedback',
        contact_date: new Date().toISOString().split('T')[0],
        title: 'Lời nhắn gửi từ Cổng Phụ huynh',
        content: messageContent,
        status: 'pending',
        created_by: 'parent'
      });
      toast.success('Đã gửi lời nhắn đến Giáo viên chủ nhiệm!');
      setMessageContent('');
    } catch (err) {
      toast.error('Lỗi khi gửi lời nhắn');
    } finally {
      setSendingMsg(false);
    }
  };

  // Đăng xuất tra cứu
  const handleLogout = () => {
    setAuthenticatedStudent(null);
    setOverview(null);
    setStudentIdInput('');
    setPinCodeInput('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* HEADER PORTAL */}
      <header className="bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-white">CỔNG TRA CỨU PHỤ HUYNH</h1>
              <p className="text-[10px] text-slate-400 font-medium">Trường THCS Trần Bội Cơ</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authenticatedStudent ? (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Đổi học sinh
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trang chủ</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-auto">
        {!overview ? (
          /* MÀN HÌNH TRA CỨU / ĐĂNG NHẬP */
          <div className="max-w-md mx-auto rounded-3xl bg-slate-950/80 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white">Tra Cứu Học Sinh</h2>
              <p className="text-xs text-slate-400">
                Nhập thông tin theo hướng dẫn của Giáo viên chủ nhiệm để xem kết quả học tập và rèn luyện
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-300 block mb-1.5">1. Chọn lớp của con</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-bold focus:ring-2 focus:ring-emerald-500/50"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Lớp {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1.5">2. Mã học sinh hoặc Số CCCD</label>
                <input
                  type="text"
                  placeholder="VD: hs8a12_05 hoặc CCCD..."
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1.5">3. Mã PIN lớp (do GVCN cấp)</label>
                <input
                  type="password"
                  placeholder="Mã PIN bảo mật 6 số..."
                  value={pinCodeInput}
                  onChange={(e) => setPinCodeInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Đang tra cứu dữ liệu...</span>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Tra cứu ngay</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-[11px] text-slate-500 text-center">
              Nếu Quý phụ huynh quên Mã PIN lớp, vui lòng liên hệ trực tiếp với GVCN.
            </div>
          </div>
        ) : (
          /* MÀN HÌNH HIỂN THỊ KẾT QUẢ CHO PHỤ HUYNH */
          <div className="space-y-6">
            {/* THÔNG TIN HỌC SINH CARD */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  {overview.student.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{overview.student.full_name}</h2>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Lớp {overview.student.class_name} • Mã HS: <span className="font-mono text-emerald-400">{overview.student.code}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    GVCN: <span className="text-white font-semibold">{overview.student.homeroom_teacher_name}</span>
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                <span className="text-xs text-slate-400 block">Tỷ lệ chuyên cần</span>
                <span className="text-2xl font-black text-emerald-400">{overview.attendance.attendance_rate}%</span>
              </div>
            </div>

            {/* THÔNG BÁO TỪ GVCN (NẾU CÓ) */}
            {overview.announcement && (
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Thông báo từ Giáo viên chủ nhiệm:</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200">{overview.announcement}</p>
              </div>
            )}

            {/* TABS */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 w-fit backdrop-blur-md">
              <button
                onClick={() => setActiveTab('attendance')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === 'attendance' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                1. Chuyên cần
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === 'events' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                2. Nề nếp & Khen thưởng ({overview.events.length})
              </button>
              <button
                onClick={() => setActiveTab('message')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === 'message' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                3. Gửi lời nhắn cho GVCN
              </button>
            </div>

            {/* TAB 1: CHUYÊN CẦN */}
            {activeTab === 'attendance' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Tổng ngày học</span>
                  <span className="text-2xl font-black text-white">{overview.attendance.total_school_days}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Có mặt</span>
                  <span className="text-2xl font-black text-emerald-400">{overview.attendance.present_days}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Đi muộn</span>
                  <span className="text-2xl font-black text-amber-400">{overview.attendance.late_days}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Vắng (Phép / KP)</span>
                  <span className="text-2xl font-black text-rose-400">
                    {overview.attendance.excused_absences + overview.attendance.unexcused_absences}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: NỀ NẾP & KHEN THƯỞNG */}
            {activeTab === 'events' && (
              <div className="space-y-3">
                {overview.events.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs">
                    Chưa có sự việc hoặc ghi nhận nào cần thông báo.
                  </div>
                ) : (
                  overview.events.map((evt) => (
                    <div
                      key={evt.id}
                      className={cn(
                        "p-4 rounded-2xl border space-y-1.5",
                        evt.type === 'positive'
                          ? "bg-emerald-950/20 border-emerald-500/20"
                          : "bg-slate-950/60 border-slate-800"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{evt.category}</span>
                        <span className="text-[10px] text-slate-400">{evt.date}</span>
                      </div>
                      <p className="text-xs text-slate-300">{evt.description}</p>
                      {evt.result && (
                        <p className="text-[11px] text-emerald-300 font-medium">↳ Kết quả: {evt.result}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: GỬI LỜI NHẮN */}
            {activeTab === 'message' && (
              <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white">Gửi Lời Nhắn / Phản Hồi Cho GVCN</h3>
                  <p className="text-xs text-slate-400">
                    Phụ huynh có thể trao đổi về tình hình sức khỏe, lý do xin nghỉ phép hoặc nguyện vọng phối hợp giáo dục
                  </p>
                </div>

                <form onSubmit={handleSendMessage} className="space-y-3">
                  <textarea
                    rows={4}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Nhập nội dung tin nhắn gửi Giáo viên chủ nhiệm..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/50"
                    required
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingMsg}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
                    >
                      <Send className="w-4 h-4" />
                      <span>{sendingMsg ? 'Đang gửi...' : 'Gửi lời nhắn ngay'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-[11px] text-slate-500 border-t border-slate-800/60">
        Hệ thống NTSM Điểm Danh & Trợ Lý GVCN • Trường THCS Trần Bội Cơ
      </footer>
    </div>
  );
}
