"use client";

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  PlusCircle,
  Award,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Printer,
  Trash2,
  Edit2,
  X,
  FileText,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getHomeroomEvents,
  createHomeroomEvent,
  updateHomeroomEvent,
  deleteHomeroomEvent,
  getHomeroomInterventions,
  saveHomeroomIntervention
} from '@/services/homeroom-service';
import { exportIncidentRecordDocx } from '@/services/homeroom-print-service';
import { HomeroomEvent, HomeroomIntervention } from '@/types/homeroom';
import { Student } from '@/types/models';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomeroomEventsPage() {
  const [classId, setClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<HomeroomEvent[]>([]);
  const [interventions, setInterventions] = useState<HomeroomIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'interventions'>('events');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [teacherName, setTeacherName] = useState('Giáo viên chủ nhiệm');

  // Modal State Event
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    id: '',
    student_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'behavior' as any,
    category: 'Đi muộn',
    severity: 'info' as any,
    points_delta: 0,
    description: '',
    action_taken: '',
    result: '',
    status: 'open' as any,
    is_visible_to_parent: true
  });

  // Modal State Intervention
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [interventionForm, setInterventionForm] = useState({
    id: '',
    student_id: '',
    problem: '',
    goal: '',
    measuresText: 'Đổi chỗ ngồi lên bàn đầu\nPhân công đôi bạn cùng tiến\nGặp riêng phụ huynh 2 tuần/lần',
    status: 'in_progress' as any,
    result: ''
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
      // 1. Học sinh
      const { data: studentClasses } = await supabase
        .from('student_classes')
        .select('student_id, students(*)')
        .eq('class_id', classId);

      const list: Student[] = (studentClasses || [])
        .map((sc: any) => sc.students)
        .filter(Boolean);

      setStudents(list);

      // 2. Events
      const evts = await getHomeroomEvents(classId, {
        type: filterType,
        status: filterStatus
      });
      setEvents(evts);

      // 3. Interventions
      const invs = await getHomeroomInterventions(classId);
      setInterventions(invs);

      // 4. GVCN name
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
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId, filterType, filterStatus]);

  // Submit Event Form
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.student_id) {
      toast.error('Vui lòng chọn học sinh!');
      return;
    }

    try {
      if (eventForm.id) {
        await updateHomeroomEvent(eventForm.id, eventForm);
        toast.success('Đã cập nhật sự việc!');
      } else {
        await createHomeroomEvent({
          ...eventForm,
          class_id: classId,
          source: 'gvcn',
          created_by: 'gvcn'
        });
        toast.success('Đã ghi nhận sự việc mới!');
      }
      setIsEventModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Lỗi khi lưu sự việc');
    }
  };

  // Submit Intervention Form
  const handleSubmitIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interventionForm.student_id || !interventionForm.problem || !interventionForm.goal) {
      toast.error('Vui lòng điền đủ thông tin can thiệp!');
      return;
    }

    const measures = interventionForm.measuresText
      .split('\n')
      .map(m => m.trim())
      .filter(Boolean);

    try {
      await saveHomeroomIntervention({
        id: interventionForm.id || undefined,
        class_id: classId,
        student_id: interventionForm.student_id,
        problem: interventionForm.problem,
        goal: interventionForm.goal,
        measures,
        status: interventionForm.status,
        result: interventionForm.result
      });
      toast.success('Đã lưu kế hoạch can thiệp!');
      setIsInterventionModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Lỗi lưu kế hoạch can thiệp');
    }
  };

  // Xuất biên bản sự việc
  const handleExportIncident = async (evt: HomeroomEvent) => {
    const student = students.find(s => s.id === evt.student_id);
    if (!student) {
      toast.error('Không tìm thấy học sinh liên quan');
      return;
    }

    try {
      toast.loading('Đang tạo Biên bản sự việc Word...', { id: 'incident-docx' });
      await exportIncidentRecordDocx(classId, student, evt, teacherName);
      toast.success('Đã tải xuống Biên bản Word!', { id: 'incident-docx' });
    } catch (err) {
      toast.error('Lỗi xuất file', { id: 'incident-docx' });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Quản Lý Sự Việc & Can Thiệp Giáo Dục
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lớp {classId} — Ghi nhận gương sáng, nề nếp, xử lý sự việc và theo dõi tiến bộ cá nhân
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'events' ? (
            <button
              onClick={() => {
                setEventForm({
                  id: '',
                  student_id: students[0]?.id || '',
                  date: format(new Date(), 'yyyy-MM-dd'),
                  type: 'positive',
                  category: 'Phát biểu tích cực',
                  severity: 'info',
                  points_delta: 3,
                  description: '',
                  action_taken: '',
                  result: '',
                  status: 'open',
                  is_visible_to_parent: true
                });
                setIsEventModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Ghi nhận sự việc / Khen thưởng</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setInterventionForm({
                  id: '',
                  student_id: students[0]?.id || '',
                  problem: '',
                  goal: '',
                  measuresText: 'Đổi chỗ ngồi lên bàn đầu\nPhân công đôi bạn cùng tiến',
                  status: 'in_progress',
                  result: ''
                });
                setIsInterventionModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Tạo kế hoạch hỗ trợ cá nhân</span>
            </button>
          )}
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 w-fit backdrop-blur-md">
          <button
            onClick={() => setActiveTab('events')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
              activeTab === 'events' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
            )}
          >
            1. Nhật ký sự việc & Rèn luyện ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('interventions')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
              activeTab === 'interventions' ? "bg-purple-600 text-white shadow-md shadow-purple-600/30" : "text-slate-400 hover:text-white"
            )}
          >
            2. Kế hoạch can thiệp & Hỗ trợ ({interventions.length})
          </button>
        </div>

        {activeTab === 'events' && (
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="all">Tất cả loại sự việc</option>
              <option value="positive">★ Tích cực / Khen thưởng</option>
              <option value="attendance">⚠ Chuyên cần / Đi muộn</option>
              <option value="academic">📚 Học tập</option>
              <option value="behavior">🛡️ Kỷ luật / Nề nếp</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Đang mở</option>
              <option value="monitoring">Đang theo dõi</option>
              <option value="resolved">Đã giải quyết</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: DANH SÁCH SỰ VIỆC */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="py-16 text-center text-slate-500 rounded-3xl bg-slate-950/40 border border-slate-800">
              {loading ? 'Đang tải dữ liệu...' : 'Không có sự việc nào phù hợp với bộ lọc.'}
            </div>
          ) : (
            events.map((evt) => {
              const student = students.find(s => s.id === evt.student_id);
              const studentName = student ? ((student as any).full_name || (student as any).name) : evt.student_id;
              const isPositive = evt.type === 'positive';

              return (
                <div
                  key={evt.id}
                  className={cn(
                    "p-4 sm:p-5 rounded-3xl border backdrop-blur-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                    isPositive
                      ? "bg-gradient-to-r from-emerald-950/20 to-slate-950/60 border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{studentName}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                        isPositive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      )}>
                        {evt.category}
                      </span>
                      {evt.points_delta !== 0 && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black",
                          evt.points_delta > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>
                          {evt.points_delta > 0 ? `+${evt.points_delta}đ` : `${evt.points_delta}đ`}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">• {evt.date}</span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300">{evt.description}</p>

                    {evt.action_taken && (
                      <p className="text-xs text-indigo-300 font-medium">
                        ↳ <span className="font-bold">Biện pháp xử lý:</span> {evt.action_taken}
                      </p>
                    )}
                    {evt.result && (
                      <p className="text-xs text-emerald-300 font-medium">
                        ↳ <span className="font-bold">Kết quả:</span> {evt.result}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    {!isPositive && (
                      <button
                        onClick={() => handleExportIncident(evt)}
                        title="In / Xuất biên bản sự việc Word"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Biên bản</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEventForm({
                          id: evt.id,
                          student_id: evt.student_id,
                          date: evt.date,
                          type: evt.type,
                          category: evt.category,
                          severity: evt.severity,
                          points_delta: evt.points_delta,
                          description: evt.description,
                          action_taken: evt.action_taken || '',
                          result: evt.result || '',
                          status: evt.status,
                          is_visible_to_parent: evt.is_visible_to_parent
                        });
                        setIsEventModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Sửa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={async () => {
                        if (confirm('Bạn có chắc muốn xóa sự việc này?')) {
                          await deleteHomeroomEvent(evt.id);
                          toast.success('Đã xóa sự việc');
                          loadData();
                        }
                      }}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: KẾ HOẠCH CAN THIỆP CHUYÊN SÂU */}
      {activeTab === 'interventions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interventions.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-slate-500 rounded-3xl bg-slate-950/40 border border-slate-800">
              Chưa có kế hoạch hỗ trợ cá nhân nào. Hãy tạo kế hoạch cho học sinh cần can thiệp.
            </div>
          ) : (
            interventions.map((inv) => {
              const student = students.find(s => s.id === inv.student_id);
              const studentName = student ? ((student as any).full_name || (student as any).name) : inv.student_id;

              return (
                <div
                  key={inv.id}
                  className="rounded-3xl bg-slate-950/60 border border-purple-500/20 p-5 space-y-3 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-white">{studentName}</h3>
                      <p className="text-[11px] text-purple-400">Kế hoạch hỗ trợ cá nhân</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 rounded uppercase">
                      {inv.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div><span className="font-bold text-slate-400">Vấn đề:</span> {inv.problem}</div>
                    <div><span className="font-bold text-slate-400">Mục tiêu:</span> {inv.goal}</div>
                    <div className="space-y-1 pt-1">
                      <span className="font-bold text-slate-400 block">Biện pháp thực hiện:</span>
                      <ul className="list-disc list-inside text-slate-300 pl-1 space-y-0.5">
                        {(inv.measures || []).map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: TẠO / SỬA SỰ VIỆC */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black text-white">
                {eventForm.id ? 'Cập Nhật Sự Việc / Khen Thưởng' : 'Ghi Nhận Sự Việc / Khen Thưởng Mới'}
              </h2>
              <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Chọn học sinh</label>
                <select
                  value={eventForm.student_id}
                  onChange={(e) => setEventForm({ ...eventForm, student_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{(s as any).full_name || (s as any).name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Loại sự kiện</label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="positive">★ Tích cực / Khen thưởng</option>
                    <option value="attendance">⚠ Chuyên cần / Đi muộn</option>
                    <option value="academic">📚 Học tập</option>
                    <option value="behavior">🛡️ Kỷ luật / Nề nếp</option>
                    <option value="activity">🎨 Hoạt động phong trào</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Điểm cộng / trừ</label>
                  <input
                    type="number"
                    value={eventForm.points_delta}
                    onChange={(e) => setEventForm({ ...eventForm, points_delta: parseInt(e.target.value) || 0 })}
                    placeholder="VD: +3 hoặc -2"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Tên hành vi / Tiêu đề</label>
                <input
                  type="text"
                  value={eventForm.category}
                  onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                  placeholder="VD: Đi muộn, Phát biểu tích cực, Quên sách vở..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Nêu rõ hoàn cảnh, diễn biến sự việc..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-indigo-300 block mb-1">Biện pháp xử lý của GVCN</label>
                <input
                  type="text"
                  value={eventForm.action_taken}
                  onChange={(e) => setEventForm({ ...eventForm, action_taken: e.target.value })}
                  placeholder="VD: Nhắc nhở, chuyển chỗ ngồi, gọi điện trao đổi PH..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-emerald-300 block mb-1">Kết quả rèn luyện</label>
                <input
                  type="text"
                  value={eventForm.result}
                  onChange={(e) => setEventForm({ ...eventForm, result: e.target.value })}
                  placeholder="VD: Đã khắc phục, không còn tái phạm..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="visibleParent"
                  checked={eventForm.is_visible_to_parent}
                  onChange={(e) => setEventForm({ ...eventForm, is_visible_to_parent: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                />
                <label htmlFor="visibleParent" className="text-slate-300 font-medium">
                  Hiển thị sự việc này cho Phụ huynh xem trên Cổng Tra Cứu
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  Lưu sự việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TẠO KẾ HOẠCH CAN THIỆP */}
      {isInterventionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-black text-white">Tạo Kế Hoạch Hỗ Trợ Cá Nhân</h2>
              <button onClick={() => setIsInterventionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIntervention} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Chọn học sinh cần hỗ trợ</label>
                <select
                  value={interventionForm.student_id}
                  onChange={(e) => setInterventionForm({ ...interventionForm, student_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{(s as any).full_name || (s as any).name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Vấn đề cần hỗ trợ</label>
                <input
                  type="text"
                  value={interventionForm.problem}
                  onChange={(e) => setInterventionForm({ ...interventionForm, problem: e.target.value })}
                  placeholder="VD: Thường xuyên mất tập trung môn Toán, hay đi muộn..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Mục tiêu rèn luyện</label>
                <input
                  type="text"
                  value={interventionForm.goal}
                  onChange={(e) => setInterventionForm({ ...interventionForm, goal: e.target.value })}
                  placeholder="VD: Đi học đúng giờ 100% trong 3 tuần tới..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Các biện pháp áp dụng (Mỗi dòng 1 biện pháp)</label>
                <textarea
                  rows={3}
                  value={interventionForm.measuresText}
                  onChange={(e) => setInterventionForm({ ...interventionForm, measuresText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInterventionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30"
                >
                  Lưu kế hoạch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
