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
  AlertCircle,
  CreditCard,
  QrCode,
  Receipt,
  Check
} from 'lucide-react';
import { db } from '@/services/db';
import { verifyParentPortalAccess, getParentStudentOverview, createHomeroomParentContact } from '@/services/homeroom-service';
import { ParentStudentOverview } from '@/types/homeroom';
import { Class, Student } from '@/types/models';
import { cn } from '@/lib/utils';
import { getBookTheme } from '@/lib/book-themes';
import { VietQRPaymentModal } from '@/components/portal/vietqr-payment-modal';
import toast from 'react-hot-toast';

const PORTAL_AUTH_KEY = 'tbc_portal_parent_session';

export default function ParentPortalPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [pinCodeInput, setPinCodeInput] = useState('');
  const [rememberLogin, setRememberLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Đã xác thực thành công
  const [authenticatedStudent, setAuthenticatedStudent] = useState<Student | null>(null);
  const [overview, setOverview] = useState<ParentStudentOverview | null>(null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'events' | 'monitor' | 'message'>('attendance');

  // Modal VietQR
  const [paymentModalData, setPaymentModalData] = useState<{
    isOpen: boolean;
    title: string;
    amount: number;
    columnId: string;
    periodKey?: string;
    periodLabel?: string;
    bankInfo: any;
  } | null>(null);

  // Form gửi lời nhắn
  const [messageContent, setMessageContent] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    async function loadClassesAndRestoreSession() {
      try {
        const list = await db.getClasses();
        setClasses(list || []);

        // Khôi phục phiên đăng nhập đã lưu
        const savedRaw = localStorage.getItem(PORTAL_AUTH_KEY) || sessionStorage.getItem(PORTAL_AUTH_KEY);
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw);
            if (saved.classId && saved.studentIdInput && saved.pinCodeInput) {
              setSelectedClassId(saved.classId);
              setStudentIdInput(saved.studentIdInput);
              setPinCodeInput(saved.pinCodeInput);

              // Tự động khôi phục dữ liệu
              setLoading(true);
              const res = await verifyParentPortalAccess(saved.classId, saved.studentIdInput, saved.pinCodeInput);
              if (res.success && res.student) {
                setAuthenticatedStudent(res.student);
                const data = await getParentStudentOverview(res.student.id, saved.classId);
                setOverview(data);
              } else {
                localStorage.removeItem(PORTAL_AUTH_KEY);
                sessionStorage.removeItem(PORTAL_AUTH_KEY);
              }
            }
          } catch (parseErr) {
            console.error('Lỗi khôi phục phiên tra cứu:', parseErr);
          }
        } else if (list && list.length > 0) {
          setSelectedClassId(list[0].id);
        }
      } catch (err) {
        console.error('Error loading classes for portal:', err);
      } finally {
        setLoading(false);
        setInitialChecking(false);
      }
    }
    loadClassesAndRestoreSession();
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
      const data = await getParentStudentOverview(res.student.id, selectedClassId);
      setOverview(data);

      // Lưu trạng thái đăng nhập
      const sessionPayload = JSON.stringify({
        classId: selectedClassId,
        studentIdInput: studentIdInput.trim(),
        pinCodeInput: pinCodeInput.trim(),
        savedAt: new Date().toISOString()
      });

      if (rememberLogin) {
        localStorage.setItem(PORTAL_AUTH_KEY, sessionPayload);
      } else {
        sessionStorage.setItem(PORTAL_AUTH_KEY, sessionPayload);
      }

      toast.success('Tra cứu kết quả học sinh thành công!');
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

  // Đổi học sinh / Đăng xuất phiên
  const handleLogout = () => {
    localStorage.removeItem(PORTAL_AUTH_KEY);
    sessionStorage.removeItem(PORTAL_AUTH_KEY);
    setAuthenticatedStudent(null);
    setOverview(null);
    setStudentIdInput('');
    setPinCodeInput('');
    toast.success('Đã đăng xuất phiên tra cứu!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      
      {/* 1. HEADER CỔNG PHỤ HUYNH (Light Theme) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-slate-900">CỔNG TRA CỨU PHỤ HUYNH</h1>
              <p className="text-[11px] text-slate-500 font-medium">Trường THCS Trần Bội Cơ</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authenticatedStudent ? (
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                Đổi học sinh tra cứu
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trang chủ</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-auto">
        {!overview ? (
          /* MÀN HÌNH TRA CỨU / ĐĂNG NHẬP (Light Theme Card) */
          <div className="max-w-md mx-auto rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Tra Cứu Học Sinh</h2>
              <p className="text-xs text-slate-500">
                Nhập thông tin theo hướng dẫn của GVCN để xem kết quả học tập và chuyên cần của con
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">1. Chọn lớp của con</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Lớp {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">2. Mã học sinh, Mã định danh hoặc CCCD</label>
                <input
                  type="text"
                  placeholder="VD: Mã định danh, 8A13_1 hoặc CCCD..."
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">3. Mã PIN lớp (do GVCN cấp)</label>
                <input
                  type="password"
                  placeholder="Mã PIN bảo mật 6 số (mặc định 123456)..."
                  value={pinCodeInput}
                  onChange={(e) => setPinCodeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Ghi nhớ tra cứu trên thiết bị này</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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

            <div className="text-[11px] text-slate-400 text-center">
              Nếu Quý phụ huynh quên Mã PIN lớp, vui lòng liên hệ trực tiếp với Giáo viên chủ nhiệm.
            </div>
          </div>
        ) : (
          /* MÀN HÌNH HIỂN THỊ KẾT QUẢ CHO PHỤ HUYNH (Light Theme) */
          <div className="space-y-6">
            
            {/* THÔNG TIN HỌC SINH CARD */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-600/20">
                  {overview.student.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{overview.student.full_name}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Lớp <span className="text-indigo-700 font-bold">{overview.student.class_name ? `Lớp ${overview.student.class_name}` : ''}</span> • Mã HS: <span className="font-mono text-slate-800 font-bold">{overview.student.code}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    GVCN: <span className="font-bold text-slate-800">{overview.student.homeroom_teacher_name}</span>
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <span className="text-xs text-slate-500 block">Tỷ lệ chuyên cần</span>
                <span className="text-2xl font-black text-emerald-600">{overview.attendance.attendance_rate}%</span>
              </div>
            </div>

            {/* THÔNG BÁO TỪ GVCN (NẾU CÓ) */}
            {overview.announcement && (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Thông báo từ Giáo viên chủ nhiệm:</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{overview.announcement}</p>
              </div>
            )}

            {/* TABS */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
              <button
                onClick={() => setActiveTab('attendance')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === 'attendance'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                )}
              >
                1. Chuyên cần
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === 'events'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                )}
              >
                2. Nề nếp & Khen thưởng ({overview.events.length})
              </button>
              <button
                onClick={() => setActiveTab('monitor')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5",
                  activeTab === 'monitor'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                )}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>3. Sổ Theo Dõi & Thu Phí ({overview.sharedMonitorColumns?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('message')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === 'message'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                )}
              >
                4. Gửi lời nhắn cho GVCN
              </button>
            </div>

            {/* TAB 1: CHUYÊN CẦN & NỀ NẾP (Chuẩn 5 Danh Mục: P, K, T, VP, KH) */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                {/* 5 Thẻ Thống Kê Chuẩn Điểm Danh */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
                  {/* 1. PHÉP (P) */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center shadow-sm">
                    <span className="text-[11px] text-emerald-800 font-bold block mb-1">
                      PHÉP (P)
                    </span>
                    <span className="text-2xl font-black text-emerald-600">
                      {overview.attendance.p_count ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Vắng có phép</span>
                  </div>

                  {/* 2. KHÔNG PHÉP (K) */}
                  <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-center shadow-sm">
                    <span className="text-[11px] text-rose-800 font-bold block mb-1">
                      KHÔNG (K)
                    </span>
                    <span className="text-2xl font-black text-rose-600">
                      {overview.attendance.k_count ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Không phép</span>
                  </div>

                  {/* 3. TRỄ (T) */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-center shadow-sm">
                    <span className="text-[11px] text-amber-800 font-bold block mb-1">
                      TRỄ (T)
                    </span>
                    <span className="text-2xl font-black text-amber-600">
                      {overview.attendance.t_count ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Đi muộn</span>
                  </div>

                  {/* 4. VI PHẠM (VP) */}
                  <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200 text-center shadow-sm">
                    <span className="text-[11px] text-orange-800 font-bold block mb-1">
                      VI PHẠM (VP)
                    </span>
                    <span className="text-2xl font-black text-orange-600">
                      {overview.attendance.vp_count ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Nề nếp / Kỷ luật</span>
                  </div>

                  {/* 5. KHEN THƯỞNG (KH) */}
                  <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-center shadow-sm">
                    <span className="text-[11px] text-purple-800 font-bold block mb-1">
                      KHEN THƯỞNG (KH)
                    </span>
                    <span className="text-2xl font-black text-purple-600">
                      {overview.attendance.kh_count ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Tuyên dương</span>
                  </div>
                </div>

                {/* Danh Sách Lịch Sử Ghi Nhận Điểm Danh */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
                    <span>📋 Nhật ký điểm danh & ghi nhận gần đây</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Tổng số lượt ghi nhận: {(overview.attendance.history || []).length}
                    </span>
                  </h3>

                  {(overview.attendance.history || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <span className="font-bold text-emerald-800">Em đi học chuyên cần và đúng giờ!</span>
                      <span className="text-[11px] text-slate-400">Không có lượt vắng, đi trễ hay vi phạm nào được ghi nhận.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                      {overview.attendance.history!.map((item, idx) => (
                        <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="px-2 py-0.5 rounded-lg font-black text-[11px] text-white shadow-sm shrink-0"
                              style={{ backgroundColor: item.color || '#6366f1' }}
                            >
                              {item.statusCode}
                            </span>
                            <div>
                              <div className="font-bold text-slate-800">
                                {item.statusLabel}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {item.session} {item.period ? `• ${item.period}` : ''}
                                {item.note ? ` • Ghi chú: ${item.note}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-[11px] font-mono font-medium text-slate-500 shrink-0">
                            {item.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: NỀ NẾP & KHEN THƯỞNG */}
            {activeTab === 'events' && (
              <div className="space-y-3">
                {overview.events.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 rounded-2xl bg-white border border-slate-200 text-xs shadow-sm">
                    Chưa có sự việc hoặc ghi nhận nào cần thông báo.
                  </div>
                ) : (
                  overview.events.map((evt) => (
                    <div
                      key={evt.id}
                      className={cn(
                        "p-4 rounded-2xl border space-y-1.5 shadow-sm",
                        evt.type === 'positive'
                          ? "bg-emerald-50/70 border-emerald-200"
                          : "bg-white border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{evt.category}</span>
                        <span className="text-[11px] text-slate-400">{evt.date}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{evt.description}</p>
                      {evt.result && (
                        <p className="text-[11px] text-emerald-700 font-medium">↳ Kết quả: {evt.result}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: SỔ THEO DÕI & THU PHÍ (VIETQR) */}
            {activeTab === 'monitor' && (
              <div className="space-y-4">
                {(!overview.sharedMonitorColumns || overview.sharedMonitorColumns.length === 0) ? (
                  <div className="py-12 text-center text-slate-400 rounded-3xl bg-white border border-slate-200 text-xs shadow-sm space-y-2">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>Hiện tại chưa có sổ theo dõi hoặc khoản thu nào được mở chia sẻ cho phụ huynh.</div>
                  </div>
                ) : (
                  overview.sharedMonitorColumns.map((item, colIdx) => {
                    const col = item.column;
                    const defaultAmt = col.paymentConfig?.defaultAmount || 0;
                    const isPayment = !!col.paymentConfig?.enabled;
                    const theme = getBookTheme(colIdx, col.id || col.name);

                    return (
                      <div
                        key={col.id}
                        className={cn(
                          "p-5 rounded-3xl border shadow-sm space-y-4 transition-all",
                          theme.bgGradient,
                          theme.borderColor,
                          theme.borderLeftAccent
                        )}
                      >
                        {/* Header của Cột */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={cn("text-base font-black tracking-tight", theme.titleColor)}>{col.name}</h3>
                              {isPayment && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                                  <QrCode className="w-3 h-3 text-indigo-600" />
                                  <span>Hỗ trợ VietQR</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                              {col.frequency === 'period'
                                ? 'Theo dõi theo từng giai đoạn / tháng'
                                : col.frequency === 'one_time'
                                ? 'Theo dõi một lần'
                                : 'Theo dõi hàng ngày'}{' '}
                              • <span className="italic text-slate-400 font-normal">Chỉ đọc</span>
                            </p>
                          </div>

                          {isPayment && defaultAmt > 0 && (
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block font-medium">Mức thu chuẩn</span>
                              <span className="text-sm font-black text-indigo-600">
                                {defaultAmt.toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Danh sách các kỳ (Nếu là period column) */}
                        {col.frequency === 'period' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {(col.subPeriods || []).map((sub) => {
                              const rec = item.records[sub.id];
                              const isCompleted = !!rec?.completed;

                              return (
                                <div
                                  key={sub.id}
                                  className={cn(
                                    "p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5",
                                    isCompleted
                                      ? "bg-emerald-50/60 border-emerald-200"
                                      : "bg-slate-50 border-slate-200"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div>
                                      <div className="font-bold text-xs text-slate-900">{sub.label}</div>
                                      {rec?.note && (
                                        <div className="text-[11px] text-slate-500 mt-0.5">{rec.note}</div>
                                      )}
                                    </div>

                                    {isCompleted ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                        <Check className="w-3 h-3" />
                                        <span>Đã nộp</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 shrink-0">
                                        <span>Chưa nộp</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Nút VietQR nếu chưa nộp và có cấu hình thanh toán */}
                                  {!isCompleted && isPayment && item.bankInfo && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentModalData({
                                          isOpen: true,
                                          title: `${col.name} (${sub.label})`,
                                          amount: defaultAmt,
                                          columnId: col.id,
                                          periodKey: sub.id,
                                          periodLabel: sub.label,
                                          bankInfo: item.bankInfo
                                        });
                                      }}
                                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                    >
                                      <QrCode className="w-3.5 h-3.5" />
                                      <span>Quét mã VietQR</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Nếu là one_time column */}
                        {col.frequency === 'one_time' && (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-800">Trạng thái hoàn thành:</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {item.records['one_time']?.completed ? '✅ Đã hoàn thành' : '⏳ Chưa hoàn thành'}
                              </div>
                            </div>

                            {!item.records['one_time']?.completed && isPayment && item.bankInfo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentModalData({
                                    isOpen: true,
                                    title: col.name,
                                    amount: defaultAmt,
                                    columnId: col.id,
                                    bankInfo: item.bankInfo
                                  });
                                }}
                                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Quét mã VietQR</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 4: GỬI LỜI NHẮN */}
            {activeTab === 'message' && (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Gửi Lời Nhắn / Phản Hồi Cho GVCN</h3>
                  <p className="text-xs text-slate-500">
                    Phụ huynh có thể trao đổi về tình hình sức khỏe, lý do xin nghỉ phép hoặc nguyện vọng phối hợp giáo dục
                  </p>
                </div>

                <form onSubmit={handleSendMessage} className="space-y-3">
                  <textarea
                    rows={4}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Nhập nội dung tin nhắn gửi Giáo viên chủ nhiệm..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingMsg}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
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

      {/* MODAL VIETQR THANH TOÁN */}
      {paymentModalData && overview && (
        <VietQRPaymentModal
          isOpen={paymentModalData.isOpen}
          onClose={() => setPaymentModalData(null)}
          title={paymentModalData.title}
          amount={paymentModalData.amount}
          className={overview.student.class_name}
          studentCode={overview.student.code}
          studentName={overview.student.full_name}
          columnId={paymentModalData.columnId}
          periodKey={paymentModalData.periodKey}
          periodLabel={paymentModalData.periodLabel}
          bankInfo={paymentModalData.bankInfo}
        />
      )}

      {/* 3. FOOTER */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200">
        Hệ thống NTSM Điểm Danh & Trợ Lý GVCN • Trường THCS Trần Bội Cơ
      </footer>
    </div>
  );
}
