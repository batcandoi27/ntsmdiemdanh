"use client";

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Phone,
  UserCheck,
  PlusCircle,
  Clock,
  Send,
  Sparkles,
  Inbox,
  User,
  CheckCircle2,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getHomeroomParentContacts, createHomeroomParentContact } from '@/services/homeroom-service';
import { HomeroomParentContact } from '@/types/homeroom';
import { Student } from '@/types/models';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomeroomCooperationPage() {
  const [classId, setClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [contacts, setContacts] = useState<HomeroomParentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'parents' | 'portal_feedback' | 'gvbm'>('parents');

  const [form, setForm] = useState({
    student_id: '',
    contact_type: 'call' as any,
    contact_date: format(new Date(), 'yyyy-MM-dd'),
    title: 'Trao đổi tình hình học tập và chuyên cần',
    content: '',
    parent_feedback: '',
    status: 'resolved' as any
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

  const loadData = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data: studentClasses } = await supabase
        .from('student_classes')
        .select('student_id, students(*)')
        .eq('class_id', classId);

      const list: Student[] = (studentClasses || [])
        .map((sc: any) => sc.students)
        .filter(Boolean);

      setStudents(list);

      const res = await getHomeroomParentContacts(classId);
      setContacts(res);
    } catch (err) {
      console.error('Error loading cooperation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.content) {
      toast.error('Vui lòng nhập đầy đủ thông tin trao đổi!');
      return;
    }

    try {
      await createHomeroomParentContact({
        class_id: classId,
        student_id: form.student_id,
        contact_type: form.contact_type,
        contact_date: form.contact_date,
        title: form.title,
        content: form.content,
        parent_feedback: form.parent_feedback,
        status: form.status,
        created_by: 'gvcn'
      });
      toast.success('Đã lưu nhật ký liên hệ!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Lỗi khi lưu liên hệ');
    }
  };

  const parentLogs = contacts.filter(c => c.contact_type === 'call' || c.contact_type === 'meeting' || c.contact_type === 'zalo');
  const portalLogs = contacts.filter(c => c.contact_type === 'portal_feedback');
  const gvbmLogs = contacts.filter(c => c.contact_type === 'gvbm_note');

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Phối Hợp Giáo Dục (Phụ Huynh & GVBM)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lớp {classId} — Lưu trữ lịch sử liên lạc, phản hồi từ phụ huynh và ý kiến từ giáo viên bộ môn
          </p>
        </div>

        <button
          onClick={() => {
            setForm({
              student_id: students[0]?.id || '',
              contact_type: 'call',
              contact_date: format(new Date(), 'yyyy-MM-dd'),
              title: 'Trao đổi tình hình chuyên cần',
              content: '',
              parent_feedback: '',
              status: 'resolved'
            });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Ghi nhận liên hệ phụ huynh</span>
        </button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 w-fit backdrop-blur-md">
        <button
          onClick={() => setActiveTab('parents')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === 'parents' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
          )}
        >
          1. Nhật ký liên hệ Phụ huynh ({parentLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('portal_feedback')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === 'portal_feedback' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
          )}
        >
          2. Lời nhắn từ Cổng Phụ huynh ({portalLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('gvbm')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === 'gvbm' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
          )}
        >
          3. Phản ánh từ GV Bộ môn ({gvbmLogs.length})
        </button>
      </div>

      {/* LIST OF CONTACTS */}
      <div className="space-y-3">
        {activeTab === 'parents' && (
          parentLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 rounded-3xl bg-slate-950/40 border border-slate-800">
              Chưa có nhật ký liên hệ phụ huynh nào. Hãy ghi lại các cuộc gọi, tin nhắn trao đổi quan trọng!
            </div>
          ) : (
            parentLogs.map((item) => {
              const student = students.find(s => s.id === item.student_id);
              const studentName = student ? ((student as any).full_name || (student as any).name) : item.student_id;

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800/80 space-y-2 backdrop-blur-md hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{studentName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {item.contact_type === 'call' ? '📞 Cuộc gọi' : item.contact_type === 'meeting' ? '🤝 Gặp trực tiếp' : '💬 Zalo'}
                      </span>
                      <span className="text-xs text-slate-500">• {item.contact_date}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300">
                    <span className="font-bold text-slate-400">Nội dung trao đổi:</span> {item.content}
                  </p>

                  {item.parent_feedback && (
                    <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300">
                      <span className="font-bold">Ý kiến / Cam kết của Phụ huynh:</span> {item.parent_feedback}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}

        {activeTab === 'portal_feedback' && (
          portalLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 rounded-3xl bg-slate-950/40 border border-slate-800">
              Hộp thư Cổng phụ huynh hiện đang trống. Khi phụ huynh gửi lời nhắn từ Cổng tra cứu, thông tin sẽ xuất hiện tại đây.
            </div>
          ) : (
            portalLogs.map((item) => (
              <div key={item.id} className="p-5 rounded-3xl bg-slate-950/60 border border-emerald-500/20 space-y-2">
                <div className="text-xs font-bold text-emerald-400">Lời nhắn từ Phụ huynh HS ID: {item.student_id} ({item.contact_date})</div>
                <p className="text-xs text-slate-300">{item.content}</p>
              </div>
            ))
          )
        )}

        {activeTab === 'gvbm' && (
          gvbmLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 rounded-3xl bg-slate-950/40 border border-slate-800">
              Chưa có phản hồi từ Giáo viên bộ môn.
            </div>
          ) : (
            gvbmLogs.map((item) => (
              <div key={item.id} className="p-5 rounded-3xl bg-slate-950/60 border border-blue-500/20 space-y-2">
                <div className="text-xs font-bold text-blue-400">Ghi chú từ Giáo viên bộ môn ({item.contact_date})</div>
                <p className="text-xs text-slate-300">{item.content}</p>
              </div>
            ))
          )
        )}
      </div>

      {/* MODAL: TẠO LIÊN HỆ PHỤ HUYNH */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black text-white">Ghi Nhận Liên Hệ Phụ Huynh</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Chọn học sinh</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{(s as any).full_name || (s as any).name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Hình thức liên lạc</label>
                  <select
                    value={form.contact_type}
                    onChange={(e) => setForm({ ...form, contact_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="call">📞 Cuộc gọi điện thoại</option>
                    <option value="meeting">🤝 Gặp trực tiếp</option>
                    <option value="zalo">💬 Tin nhắn Zalo/SMS</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Ngày liên hệ</label>
                  <input
                    type="date"
                    value={form.contact_date}
                    onChange={(e) => setForm({ ...form, contact_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Nội dung trao đổi</label>
                <textarea
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Nêu rõ lý do liên hệ, tình hình chuyên cần, thái độ của học sinh..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-indigo-300 block mb-1">Ý kiến / Phản hồi của Phụ huynh</label>
                <textarea
                  rows={2}
                  value={form.parent_feedback}
                  onChange={(e) => setForm({ ...form, parent_feedback: e.target.value })}
                  placeholder="Ghi nhận lời hứa, cam kết đôn đốc con hoặc đề xuất của phụ huynh..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  Lưu liên hệ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
