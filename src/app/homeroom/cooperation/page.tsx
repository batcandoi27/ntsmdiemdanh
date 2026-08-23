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
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomParentContacts,
  createHomeroomParentContact
} from '@/services/homeroom-service';
import { HomeroomParentContact } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import toast from 'react-hot-toast';

export default function HomeroomCooperationPage() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [contacts, setContacts] = useState<HomeroomParentContact[]>([]);
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

  const filteredContacts = contacts.filter(c => {
    if (activeTab === 'portal_feedback') return c.contact_type === 'portal_feedback';
    if (activeTab === 'subject_feedback') return c.contact_type === 'subject_teacher_feedback';
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
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : ''}</span> • Tổng số: <span className="font-bold text-slate-800">{contacts.length} lượt trao đổi</span>
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ghi Nhật Ký Liên Hệ</span>
        </button>
      </div>

      {/* 2. TABS */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
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
          <Users className="w-3.5 h-3.5" />
          <span>3. Phản Hồi Từ GVBM ({contacts.filter(c => c.contact_type === 'subject_teacher_feedback').length})</span>
        </button>
      </div>

      {/* 3. NỘI DUNG DANH SÁCH (Light Theme Cards) */}
      <div className="space-y-3">
        {filteredContacts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs rounded-3xl bg-white border border-slate-200 shadow-sm">
            Chưa có thông tin trao đổi hoặc lời nhắn nào trong mục này.
          </div>
        ) : (
          filteredContacts.map((item) => {
            const student = students.find(s => s.id === item.student_id);
            const studentName = (student as any)?.full_name || (student as any)?.name || 'Học sinh';
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
                  <span className="text-[11px] text-slate-400">{item.contact_date}</span>
                </div>

                <p className="text-xs text-slate-800 font-medium">{item.content}</p>
                {item.agreed_solution && (
                  <p className="text-[11px] text-emerald-700 font-medium">↳ Thống nhất: {item.agreed_solution}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. MODAL THÊM NHẬT KÝ LIÊN HỆ */}
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
                    <option key={st.id} value={st.id}>{(st as any).full_name || (st as any).name}</option>
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
                <textarea
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Nội dung đã trao đổi với phụ huynh..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">5. Biện pháp thống nhất với gia đình</label>
                <input
                  type="text"
                  value={form.agreed_solution}
                  onChange={(e) => setForm({ ...form, agreed_solution: e.target.value })}
                  placeholder="VD: Gia đình đôn đốc học bài buổi tối, phối hợp báo cáo hàng tuần..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
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
    </div>
  );
}
