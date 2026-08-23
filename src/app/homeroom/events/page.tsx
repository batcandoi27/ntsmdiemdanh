"use client";

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Plus,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  UserCheck,
  FileDown,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  Eye,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomEvents,
  createHomeroomEvent,
  updateHomeroomEvent,
  deleteHomeroomEvent,
  getHomeroomInterventions,
  createHomeroomIntervention
} from '@/services/homeroom-service';
import { exportIncidentRecordDocx } from '@/services/homeroom-print-service';
import { HomeroomEvent, HomeroomIntervention } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import { PresetPicker } from '@/components/homeroom/preset-picker';
import { HomeroomPresetItem } from '@/types/homeroom-presets';
import toast from 'react-hot-toast';

export default function HomeroomEventsPage() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('Giáo viên chủ nhiệm');
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<HomeroomEvent[]>([]);
  const [interventions, setInterventions] = useState<HomeroomIntervention[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'all' | 'positive' | 'violation' | 'intervention'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal Ghi nhận Sự việc
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<any>({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'positive',
    category: 'Học tập',
    severity: 'minor',
    points_delta: 2,
    description: '',
    action_taken: '',
    result: '',
    status: 'resolved',
    is_visible_to_parent: true
  });

  // Modal Can thiệp cá nhân
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [interventionForm, setInterventionForm] = useState<any>({
    student_id: '',
    start_date: new Date().toISOString().split('T')[0],
    issue_summary: '',
    goals: '',
    measures: '',
    parent_cooperation: '',
    status: 'in_progress'
  });

  const loadData = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      // 1. Students & Class name
      const stList = await db.getStudentsByClass(classId);
      setStudents(stList || []);

      const { data: clsData } = await supabase
        .from('classes')
        .select('name, teacher_classes(is_homeroom, profiles(full_name))')
        .eq('id', classId)
        .maybeSingle();

      if (clsData) {
        setClassName(clsData.name || '');
        const homeroomTc: any = (clsData.teacher_classes || []).find((tc: any) => tc.is_homeroom);
        const name = Array.isArray(homeroomTc?.profiles)
          ? homeroomTc.profiles[0]?.full_name
          : homeroomTc?.profiles?.full_name;
        if (name) setTeacherName(name);
      }

      // 2. Events
      const evts = await getHomeroomEvents(classId, {
        type: filterType !== 'all' ? (filterType as any) : undefined,
        status: filterStatus !== 'all' ? (filterStatus as any) : undefined,
      });
      setEvents(evts);

      // 3. Interventions
      const invs = await getHomeroomInterventions(classId);
      setInterventions(invs);

    } catch (err) {
      console.error('Error loading events:', err);
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
  }, [classId, filterType, filterStatus]);

  // Xử lý chọn Preset tự điền vào Form Sự việc
  const handleSelectPresetEvent = (preset: HomeroomPresetItem) => {
    setEventForm((prev: any) => ({
      ...prev,
      type: preset.type || prev.type,
      category: preset.category || prev.category,
      points_delta: preset.points_delta !== undefined ? preset.points_delta : prev.points_delta,
      severity: preset.severity || prev.severity,
      description: preset.description || prev.description,
      action_taken: preset.suggested_action || prev.action_taken,
      status: preset.type === 'positive' ? 'resolved' : 'monitoring'
    }));
    toast.success(`Đã áp dụng mẫu "${preset.label}"!`);
  };

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
    if (!interventionForm.student_id) {
      toast.error('Vui lòng chọn học sinh!');
      return;
    }

    try {
      await createHomeroomIntervention({
        ...interventionForm,
        class_id: classId,
        created_by: 'gvcn'
      });
      toast.success('Đã lập kế hoạch can thiệp mới!');
      setIsInterventionModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Lỗi khi lưu kế hoạch can thiệp');
    }
  };

  // Xuất Biên bản sự việc Word
  const handleExportIncident = async (evt: HomeroomEvent) => {
    const student = students.find(s => s.id === evt.student_id);
    if (!student) return;
    try {
      await exportIncidentRecordDocx(className || 'Lớp học', student, evt, teacherName);
      toast.success('Đã xuất biên bản sự việc dạng Word!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Word');
    }
  };

  // Xóa Event
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sự việc này?')) return;
    try {
      await deleteHomeroomEvent(id);
      toast.success('Đã xóa sự việc');
      loadData();
    } catch (err) {
      toast.error('Lỗi khi xóa sự việc');
    }
  };

  // Filtered Events by Active Tab
  const displayedEvents = events.filter(e => {
    if (activeTab === 'positive') return e.type === 'positive';
    if (activeTab === 'violation') return e.type === 'violation';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTION BUTTONS (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Quản Lý Sự Việc, Nề Nếp & Khen Thưởng
            </h2>
            <HomeroomTooltip content="Ghi nhận kịp thời các tấm gương tốt, điểm cộng thi đua hoặc các vi phạm nề nếp kèm biện pháp giáo dục tích cực." />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : ''}</span> • Tổng số: <span className="font-bold text-slate-800">{events.length} sự việc</span> ({events.filter(e => e.type === 'positive').length} việc tốt, {events.filter(e => e.type === 'violation').length} vi phạm)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEventForm({
                student_id: '',
                date: new Date().toISOString().split('T')[0],
                type: 'positive',
                category: 'Học tập',
                severity: 'minor',
                points_delta: 2,
                description: '',
                action_taken: '',
                result: '',
                status: 'resolved',
                is_visible_to_parent: true
              });
              setIsEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi Nhận Sự Việc</span>
          </button>

          <button
            onClick={() => setIsInterventionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Kế Hoạch Can Thiệp ({interventions.length})</span>
          </button>
        </div>
      </div>

      {/* 2. TABS & BỘ LỌC */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'all'
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
            )}
          >
            Tất cả ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('positive')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === 'positive'
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Khen thưởng ({events.filter(e => e.type === 'positive').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('violation')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'violation'
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
            )}
          >
            Vi phạm & Nhắc nhở ({events.filter(e => e.type === 'violation').length})
          </button>
          <button
            onClick={() => setActiveTab('intervention')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'intervention'
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
            )}
          >
            Hồ sơ can thiệp ({interventions.length})
          </button>
        </div>

        {/* Filter Status Dropdown */}
        {activeTab !== 'intervention' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-bold">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
            >
              <option value="all" className="bg-white text-slate-900">Tất cả trạng thái</option>
              <option value="open" className="bg-white text-slate-900">Đang mở (Cần xử lý)</option>
              <option value="monitoring" className="bg-white text-slate-900">Đang theo dõi</option>
              <option value="resolved" className="bg-white text-slate-900">Đã giải quyết</option>
            </select>
          </div>
        )}
      </div>

      {/* 3. NỘI DUNG SỰ VIỆC HOẶC CAN THIỆP (Light Theme) */}
      {activeTab === 'intervention' ? (
        /* DANH SÁCH KẾ HOẠCH CAN THIỆP */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interventions.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-slate-400 text-xs rounded-3xl bg-white border border-slate-200 shadow-sm">
              Chưa có học sinh nào cần lập kế hoạch can thiệp cá nhân.
            </div>
          ) : (
            interventions.map((inv) => {
              const student = students.find(s => s.id === inv.student_id);
              return (
                <div key={inv.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {(student as any)?.full_name || (student as any)?.name || 'Học sinh'}
                      </h3>
                      <p className="text-[11px] text-slate-400">Bắt đầu: {inv.start_date}</p>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      inv.status === 'in_progress' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      inv.status === 'improved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                    )}>
                      {inv.status === 'in_progress' ? 'Đang can thiệp' : inv.status === 'improved' ? 'Đã tiến bộ' : 'Chưa tiến bộ'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 space-y-1.5 text-xs">
                    <p><span className="font-bold text-slate-700">Vấn đề:</span> <span className="text-slate-600">{inv.issue_summary}</span></p>
                    <p><span className="font-bold text-slate-700">Mục tiêu:</span> <span className="text-slate-600">{inv.goals}</span></p>
                    <p><span className="font-bold text-slate-700">Biện pháp:</span> <span className="text-slate-600">{inv.measures}</span></p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* BẢNG SỰ VIỆC (Light Theme Table) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-28">Ngày</th>
                  <th className="py-3.5 px-4 w-36">Học sinh</th>
                  <th className="py-3.5 px-4 w-32">Phân loại</th>
                  <th className="py-3.5 px-4">Nội dung sự việc</th>
                  <th className="py-3.5 px-4 w-24 text-center">Điểm</th>
                  <th className="py-3.5 px-4 w-28 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Chưa có sự việc nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  displayedEvents.map((evt) => {
                    const student = students.find(s => s.id === evt.student_id);
                    const studentName = (student as any)?.fullName || (student as any)?.full_name || (student as any)?.name || 'Học sinh';
                    const isPositive = evt.type === 'positive';
                    return (
                      <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-medium">{evt.date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{studentName}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            isPositive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"
                          )}>
                            {evt.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-800 font-medium">{evt.description}</p>
                          {evt.action_taken && (
                            <p className="text-[11px] text-indigo-600 mt-0.5">↳ Xử lý: {evt.action_taken}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {evt.points_delta !== 0 ? (
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-black",
                              evt.points_delta > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            )}>
                              {evt.points_delta > 0 ? `+${evt.points_delta}` : evt.points_delta}đ
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            evt.status === 'resolved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            evt.status === 'monitoring' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {evt.status === 'resolved' ? 'Đã giải quyết' : evt.status === 'monitoring' ? 'Đang theo dõi' : 'Cần xử lý'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isPositive && (
                              <button
                                onClick={() => handleExportIncident(evt)}
                                title="Xuất biên bản sự việc Word"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEventForm(evt);
                                setIsEventModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* 4. MODAL GHI NHẬN SỰ VIỆC (Có PresetPicker tự điền mẫu 1 chạm) */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {eventForm.id ? 'Chỉnh Sửa Sự Việc' : 'Ghi Nhận Sự Việc / Khen Thưởng'}
                </h3>
                <p className="text-xs text-slate-500">Lớp {className ? `Lớp ${className}` : ''}</p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRESET PICKER BUTTON (1-Chạm tự điền mẫu) */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Điền nhanh từ mẫu:</span>
              <PresetPicker
                applicableForm="event"
                onSelect={handleSelectPresetEvent}
              />
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleSubmitEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">1. Chọn học sinh *</label>
                <select
                  value={eventForm.student_id}
                  onChange={(e) => setEventForm({ ...eventForm, student_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">-- Chọn học sinh trong lớp --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.code ? `[${st.code}] ` : ''}{(st as any).fullName || (st as any).full_name || (st as any).name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">2. Loại sự việc</label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="positive">Khen thưởng / Việc tốt</option>
                    <option value="violation">Vi phạm nề nếp</option>
                    <option value="neutral">Ghi nhận thông thường</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">3. Phân loại / Lĩnh vực</label>
                  <input
                    type="text"
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    placeholder="VD: Học tập, Kỷ luật, Phong trào..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">4. Điểm cộng / trừ (+/-)</label>
                  <input
                    type="number"
                    value={eventForm.points_delta}
                    onChange={(e) => setEventForm({ ...eventForm, points_delta: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">5. Ngày ghi nhận</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">6. Mô tả chi tiết sự việc *</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Mô tả cụ thể sự việc xảy ra..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">7. Biện pháp xử lý / Tuyên dương</label>
                <input
                  type="text"
                  value={eventForm.action_taken}
                  onChange={(e) => setEventForm({ ...eventForm, action_taken: e.target.value })}
                  placeholder="VD: Tuyên dương trước lớp, nhắc nhở, lập cam kết..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventForm.is_visible_to_parent}
                    onChange={(e) => setEventForm({ ...eventForm, is_visible_to_parent: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-bold text-slate-700">Cho phép Phụ huynh xem trên Cổng /portal</span>
                </label>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  {eventForm.id ? 'Lưu Thay Đổi' : 'Ghi Nhận Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL KẾ HOẠCH CAN THIỆP */}
      {isInterventionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">Lập Kế Hoạch Can Thiệp Học Sinh</h3>
              <button
                onClick={() => setIsInterventionModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIntervention} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">1. Chọn học sinh cần hỗ trợ *</label>
                <select
                  value={interventionForm.student_id}
                  onChange={(e) => setInterventionForm({ ...interventionForm, student_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Chọn học sinh --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{(st as any).fullName || (st as any).full_name || (st as any).name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">2. Tóm tắt vấn đề khó khăn *</label>
                <textarea
                  rows={2}
                  value={interventionForm.issue_summary}
                  onChange={(e) => setInterventionForm({ ...interventionForm, issue_summary: e.target.value })}
                  placeholder="VD: Thường xuyên mất tập trung trong giờ học, kết quả kiểm tra sa sút..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">3. Mục tiêu cần đạt</label>
                <input
                  type="text"
                  value={interventionForm.goals}
                  onChange={(e) => setInterventionForm({ ...interventionForm, goals: e.target.value })}
                  placeholder="VD: Không còn nói chuyện riêng, cải thiện điểm số lên trung bình khá..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">4. Biện pháp giáo dục thực hiện</label>
                <textarea
                  rows={2}
                  value={interventionForm.measures}
                  onChange={(e) => setInterventionForm({ ...interventionForm, measures: e.target.value })}
                  placeholder="VD: Đổi chỗ ngồi lên bàn đầu, phân công bạn học giỏi kèm cặp, trao đổi hàng tuần..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  Lưu Kế Hoạch Can Thiệp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
