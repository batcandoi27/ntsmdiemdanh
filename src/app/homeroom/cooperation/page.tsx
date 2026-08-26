"use client";

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Phone,
  Plus,
  Users,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  HelpCircle,
  X,
  BookOpen,
  ThumbsUp,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomParentContacts,
  createHomeroomParentContact,
  getSubjectTeacherFeed,
  createSubjectTeacherFeedback,
  handleSubjectTeacherFeedbackAction
} from '@/services/homeroom-service';
import { HomeroomParentContact, SubjectTeacherFeedback } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import toast from 'react-hot-toast';

export default function HomeroomCooperationPage() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [contacts, setContacts] = useState<HomeroomParentContact[]>([]);
  const [subjectFeed, setSubjectFeed] = useState<SubjectTeacherFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'parent_logs' | 'portal_feedback' | 'subject_feedback'>('parent_logs');

  // Modal thêm cuộc gọi/gặp gỡ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    contact_type: 'call',
    contact_date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    agreed_solution: ''
  });

  // Modal thêm nhận xét GVBM
  const [isGvbmModalOpen, setIsGvbmModalOpen] = useState(false);
  const [gvbmForm, setGvbmForm] = useState({
    subject_name: 'Toán học',
    teacher_name: '',
    period_number: 1,
    date: new Date().toISOString().split('T')[0],
    lesson_evaluation: 'good' as 'good' | 'average' | 'poor',
    praised_student_id: '',
    praised_note: '',
    reminded_student_id: '',
    reminded_note: '',
    general_comment: ''
  });

  const loadData = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const stList = await db.getStudentsByClass(classId);
      setStudents(stList || []);

      const { data: clsData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .maybeSingle();
      if (clsData) setClassName(clsData.name);

      const list = await getHomeroomParentContacts(classId);
      setContacts(list);

      const feed = await getSubjectTeacherFeed(classId);
      setSubjectFeed(feed);
    } catch (err) {
      console.error('Error loading cooperation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeId = localStorage.getItem('homeroom_active_class_id') || '';
    setClassId(activeId);
  }, []);

  useEffect(() => {
    loadData();
  }, [classId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id) {
      toast.error('Vui lòng chọn học sinh!');
      return;
    }

    try {
      await createHomeroomParentContact({
        class_id: classId,
        student_id: form.student_id,
        contact_type: form.contact_type as any,
        contact_date: form.contact_date,
        title: form.title,
        content: form.content,
        agreed_solution: form.agreed_solution,
        status: 'completed',
        created_by: 'gvcn'
      });
      toast.success('Đã lưu nhật ký liên hệ phụ huynh!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleGvbmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gvbmForm.teacher_name) {
      toast.error('Vui lòng nhập tên Giáo viên Bộ môn!');
      return;
    }

    const praisedStudents = [];
    if (gvbmForm.praised_student_id) {
      const st = students.find(s => s.id === gvbmForm.praised_student_id);
      praisedStudents.push({
        student_id: gvbmForm.praised_student_id,
        student_name: st?.fullName || (st as any)?.name || 'Học sinh',
        note: gvbmForm.praised_note || 'Tuyên dương phát biểu tích cực'
      });
    }

    const remindedStudents = [];
    if (gvbmForm.reminded_student_id) {
      const st = students.find(s => s.id === gvbmForm.reminded_student_id);
      remindedStudents.push({
        student_id: gvbmForm.reminded_student_id,
        student_name: st?.fullName || (st as any)?.name || 'Học sinh',
        note: gvbmForm.reminded_note || 'Nhắc nhở làm việc riêng trong giờ'
      });
    }

    try {
      await createSubjectTeacherFeedback({
        class_id: classId,
        subject_name: gvbmForm.subject_name,
        teacher_name: gvbmForm.teacher_name,
        period_number: Number(gvbmForm.period_number),
        date: gvbmForm.date,
        lesson_evaluation: gvbmForm.lesson_evaluation,
        praised_students: praisedStudents,
        reminded_students: remindedStudents,
        general_comment: gvbmForm.general_comment
      });
      toast.success('Đã thêm ghi nhận từ Giáo viên Bộ môn!');
      setIsGvbmModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Lỗi khi lưu ghi nhận GVBM');
    }
  };

  const handleFeedAction = async (feedId: string, action: 'acknowledged' | 'converted_to_event') => {
    try {
      const res = await handleSubjectTeacherFeedbackAction(feedId, action);
      if (res.success) {
        toast.success(action === 'converted_to_event' ? 'Đã 1-Click chuyển thành Sự kiện nề nếp (+/- điểm)!' : 'Đã xác nhận tiếp nhận thông tin');
        loadData();
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (activeTab === 'portal_feedback') return c.contact_type === 'portal_feedback';
    return c.contact_type === 'call' || c.contact_type === 'meeting' || c.contact_type === 'zalo';
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTIONS (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Phối Hợp Giáo Dục & Liên Hệ Phụ Huynh
            </h2>
            <HomeroomTooltip content="Theo dõi nhật ký trao đổi với gia đình học sinh, tiếp nhận lời nhắn gửi từ Cổng Phụ Huynh và phản hồi từ GVBM." />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : ''}</span> • Tổng số: <span className="font-bold text-slate-800">{contacts.length} lượt trao đổi</span> • <span className="font-bold text-indigo-600">{subjectFeed.length} feed GVBM</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'subject_feedback' ? (
            <button
              onClick={() => setIsGvbmModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nhận Xét GVBM</span>
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi Nhật Ký Liên Hệ</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TABS */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('parent_logs')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === 'parent_logs'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
          )}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>1. Nhật Ký Trao Đổi PH ({contacts.filter(c => c.contact_type !== 'portal_feedback' && c.contact_type !== 'subject_teacher_feedback').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('portal_feedback')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === 'portal_feedback'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>2. Lời Nhắn Từ Cổng Phụ Huynh ({contacts.filter(c => c.contact_type === 'portal_feedback').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subject_feedback')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === 'subject_feedback'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>3. Phối Hợp Giáo Viên Bộ Môn ({subjectFeed.length})</span>
        </button>
      </div>

      {/* 3. NỘI DUNG TAB 3: FEED GIÁO VIÊN BỘ MÔN (SUBJECT FEED) */}
      {activeTab === 'subject_feedback' && (
        <div className="space-y-4">
          {subjectFeed.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs rounded-3xl bg-white border border-slate-200 shadow-sm">
              Chưa có phản hồi hoặc nhận xét nào từ Giáo viên Bộ môn trong tuần này.
            </div>
          ) : (
            subjectFeed.map((feed) => (
              <div
                key={feed.id}
                className={cn(
                  "p-5 rounded-3xl border shadow-sm space-y-3 transition-all",
                  feed.status === 'converted_to_event'
                    ? "bg-emerald-50/40 border-emerald-200"
                    : feed.status === 'acknowledged'
                    ? "bg-indigo-50/30 border-indigo-200"
                    : "bg-white border-slate-200"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{feed.subject_name} (Tiết {feed.period_number})</span>
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">{feed.teacher_name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Ngày dạy: {feed.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold",
                      feed.lesson_evaluation === 'good'
                        ? "bg-emerald-100 text-emerald-800"
                        : feed.lesson_evaluation === 'average'
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    )}>
                      {feed.lesson_evaluation === 'good' ? '⭐ Tiết học tốt' : feed.lesson_evaluation === 'average' ? '⏳ Trung bình' : '⚠️ Cần chấn chỉnh'}
                    </span>

                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold",
                      feed.status === 'converted_to_event'
                        ? "bg-purple-100 text-purple-800"
                        : feed.status === 'acknowledged'
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                    )}>
                      {feed.status === 'converted_to_event' ? '✓ Đã ghi nhận nề nếp' : feed.status === 'acknowledged' ? '✓ Đã tiếp nhận' : 'Chưa xử lý'}
                    </span>
                  </div>
                </div>

                {feed.general_comment && (
                  <p className="text-xs text-slate-700 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <strong>Nhận xét chung của GVBM:</strong> {feed.general_comment}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Học sinh khen thưởng */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Học sinh được tuyên dương (+2đ):</span>
                    </span>
                    {feed.praised_students.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Không có ghi nhận tuyên dương</p>
                    ) : (
                      feed.praised_students.map((p, idx) => (
                        <div key={idx} className="text-xs text-slate-800">
                          • <strong>{p.student_name}:</strong> {p.note}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Học sinh nhắc nhở */}
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1.5">
                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Học sinh cần nhắc nhở (-2đ):</span>
                    </span>
                    {feed.reminded_students.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Không có ghi nhận nhắc nhở</p>
                    ) : (
                      feed.reminded_students.map((r, idx) => (
                        <div key={idx} className="text-xs text-slate-800">
                          • <strong>{r.student_name}:</strong> {r.note}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Nút hành động GVCN */}
                {feed.status !== 'converted_to_event' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {feed.status === 'unread' && (
                      <button
                        onClick={() => handleFeedAction(feed.id, 'acknowledged')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Đã tiếp nhận
                      </button>
                    )}
                    <button
                      onClick={() => handleFeedAction(feed.id, 'converted_to_event')}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>1-Click Chuyển Thành Sự Kiện Nề Nếp (+/- Điểm)</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. NỘI DUNG TABS 1 & 2: PHỤ HUYNH */}
      {activeTab !== 'subject_feedback' && (
        <div className="space-y-3">
          {filteredContacts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs rounded-3xl bg-white border border-slate-200 shadow-sm">
              Chưa có thông tin trao đổi hoặc lời nhắn nào trong mục này.
            </div>
          ) : (
            filteredContacts.map((item) => {
              const student = students.find(s => s.id === item.student_id);
              const studentName = student?.fullName || (student as any)?.full_name || (student as any)?.name || 'Học sinh';
              return (
                <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.contact_type === 'call' ? '📞 Điện thoại' :
                         item.contact_type === 'meeting' ? '🤝 Gặp trực tiếp' :
                         item.contact_type === 'portal_feedback' ? '💬 Cổng phụ huynh' : '📝 Phản hồi'}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{studentName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{item.contact_date}</span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">{item.content}</p>
                  {item.agreed_solution && (
                    <p className="text-[11px] text-emerald-700 font-medium">↳ Thống nhất: {item.agreed_solution}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. MODAL THÊM NHẬT KÝ LIÊN HỆ PHỤ HUYNH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">Ghi Nhật Ký Liên Hệ Phụ Huynh</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">1. Chọn học sinh *</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">-- Chọn học sinh --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.fullName || (st as any).full_name || (st as any).name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">2. Hình thức liên hệ</label>
                  <select
                    value={form.contact_type}
                    onChange={(e) => setForm({ ...form, contact_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="call">Gọi điện thoại</option>
                    <option value="meeting">Gặp gỡ trực tiếp</option>
                    <option value="zalo">Nhắn tin Zalo</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">3. Ngày liên hệ</label>
                  <input
                    type="date"
                    value={form.contact_date}
                    onChange={(e) => setForm({ ...form, contact_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">4. Nội dung trao đổi *</label>
                {/* MẪU ĐIỀN NHANH */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Nhắc nhở đi học muộn & chuyên cần',
                    'Trao đổi về kết quả học tập & chuẩn bị bài',
                    'Chấn chỉnh nề nếp kỷ luật trong giờ học',
                    'Tuyên dương học sinh có việc tốt & tiến bộ',
                    'Thăm hỏi sức khỏe & phối hợp rèn luyện'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, content: preset }))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-medium border border-slate-200 transition-all text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Nội dung đã trao đổi với phụ huynh..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">5. Biện pháp thống nhất với gia đình</label>
                {/* MẪU ĐIỀN NHANH BIỆN PHÁP */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Gia đình đôn đốc học bài buổi tối, phối hợp báo cáo hàng tuần',
                    'Phụ huynh kiểm tra thời khóa biểu, nhắc nhở đi học đúng giờ',
                    'Gia đình quản lý điện thoại, đôn đốc làm bài tập về nhà',
                    'Tiếp tục động viên khích lệ khi học sinh có tiến bộ'
                  ].map((sol, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, agreed_solution: sol }))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-medium border border-slate-200 transition-all text-left"
                    >
                      {sol}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={form.agreed_solution}
                  onChange={(e) => setForm({ ...form, agreed_solution: e.target.value })}
                  placeholder="VD: Gia đình đôn đốc học bài buổi tối, phối hợp báo cáo hàng tuần..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  Lưu Nhật Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL THÊM GHI NHẬN TỪ GVBM */}
      {isGvbmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">Thêm Ghi Nhận Tiết Học Của GVBM</h3>
              <button
                onClick={() => setIsGvbmModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGvbmSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Môn học *</label>
                  <select
                    value={gvbmForm.subject_name}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, subject_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    {['Toán học', 'Ngữ văn', 'Tiếng Anh', 'Khoa học tự nhiên', 'Lịch sử & Địa lý', 'GDCD', 'Tin học', 'Thể chất', 'Âm nhạc', 'Mỹ thuật'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tiết dạy *</label>
                  <select
                    value={gvbmForm.period_number}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, period_number: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    {[1, 2, 3, 4, 5].map(p => (
                      <option key={p} value={p}>Tiết {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên Giáo viên Bộ môn *</label>
                  <input
                    type="text"
                    value={gvbmForm.teacher_name}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, teacher_name: e.target.value })}
                    placeholder="VD: Thầy Đức (GVBM Toán)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đánh giá chung tiết học</label>
                  <select
                    value={gvbmForm.lesson_evaluation}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, lesson_evaluation: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="good">⭐ Tốt / Tích cực</option>
                    <option value="average">⏳ Trung bình</option>
                    <option value="poor">⚠️ Cần chấn chỉnh</option>
                  </select>
                </div>
              </div>

              {/* Tuyên dương học sinh */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
                <label className="font-bold text-emerald-800 block">⭐ Tuyên dương học sinh (+2đ):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={gvbmForm.praised_student_id}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, praised_student_id: e.target.value })}
                    className="bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">-- Chọn học sinh tuyên dương --</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id}>{st.fullName || (st as any).name || (st as any).full_name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={gvbmForm.praised_note}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, praised_note: e.target.value })}
                    placeholder="Lý do tuyên dương..."
                    className="bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Nhắc nhở học sinh */}
              <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200/80 space-y-2">
                <label className="font-bold text-rose-800 block">⚠️ Nhắc nhở học sinh (-2đ):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={gvbmForm.reminded_student_id}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, reminded_student_id: e.target.value })}
                    className="bg-white border border-rose-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="">-- Chọn học sinh nhắc nhở --</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id}>{st.fullName || (st as any).name || (st as any).full_name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={gvbmForm.reminded_note}
                    onChange={(e) => setGvbmForm({ ...gvbmForm, reminded_note: e.target.value })}
                    placeholder="Lý do nhắc nhở..."
                    className="bg-white border border-rose-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nhận xét chung cho GVCN:</label>
                <textarea
                  rows={2}
                  value={gvbmForm.general_comment}
                  onChange={(e) => setGvbmForm({ ...gvbmForm, general_comment: e.target.value })}
                  placeholder="Ghi chú thêm về không khí lớp học..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  Lưu Ghi Nhận GVBM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

