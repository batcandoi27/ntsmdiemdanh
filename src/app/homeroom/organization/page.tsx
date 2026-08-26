"use client";

import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Grid,
  Save,
  FileDown,
  UserCheck,
  Sparkles,
  HelpCircle,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomClassSettings,
  saveHomeroomClassSettings,
  getCadreLogs,
  submitCadreLog,
  reviewCadreLogs
} from '@/services/homeroom-service';
import { exportClassListDocx } from '@/services/homeroom-print-service';
import { HomeroomClassSettings, ClassStructure, SeatingChart, CadreLogEntry } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import { ThemedCard, getThemedTabClass } from '@/design-system';
import { SeatLayoutEditor, EditorStudent } from '@/features/seat-layout';
import toast from 'react-hot-toast';

export default function HomeroomOrganizationPage() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('Giáo viên chủ nhiệm');
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<HomeroomClassSettings | null>(null);
  const [cadreLogs, setCadreLogs] = useState<CadreLogEntry[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'cadre' | 'groups' | 'seating' | 'cadre_logs'>('cadre');

  // Modal Ban cán sự ghi nhận
  const [isCadreModalOpen, setIsCadreModalOpen] = useState(false);
  const [cadreForm, setCadreForm] = useState({
    cadre_role: 'group_leader_1' as CadreLogEntry['cadre_role'],
    cadre_name: 'Tổ trưởng Tổ 1',
    target_student_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'violation' as 'positive' | 'violation',
    category: 'Nề nếp đầu giờ',
    description: '',
    points_delta: -2
  });

  // Chuyển đổi danh sách học sinh sang EditorStudent
  const editorStudents: EditorStudent[] = React.useMemo(() => {
    return (students || []).map((st, idx) => ({
      id: st.id,
      fullName: st.fullName || (st as any).name || (st as any).full_name || '',
      code: (st as any).studentCode || (st as any).code || '',
      stt: idx + 1,
      gender: st.gender
    }));
  }, [students]);

  // Form structure
  const [structure, setStructure] = useState<ClassStructure>({
    monitor_id: '',
    monitor_name: '',
    vice_academic_id: '',
    vice_academic_name: '',
    vice_discipline_id: '',
    vice_discipline_name: '',
    vice_activity_id: '',
    vice_activity_name: '',
    groups: [
      { id: 'group_1', name: 'Tổ 1', leader_id: '', leader_name: '', vice_id: '', vice_name: '', member_ids: [] },
      { id: 'group_2', name: 'Tổ 2', leader_id: '', leader_name: '', vice_id: '', vice_name: '', member_ids: [] },
      { id: 'group_3', name: 'Tổ 3', leader_id: '', leader_name: '', vice_id: '', vice_name: '', member_ids: [] },
      { id: 'group_4', name: 'Tổ 4', leader_id: '', leader_name: '', vice_id: '', vice_name: '', member_ids: [] },
    ]
  });

  // Seating
  const [seating, setSeating] = useState<SeatingChart>({
    rows: 5,
    cols: 2,
    seats_per_desk: 2,
    seats: {}
  });

  useEffect(() => {
    const activeId = localStorage.getItem('homeroom_active_class_id') || classId || '';
    if (activeId && activeId !== classId) {
      setClassId(activeId);
    }

    async function loadData() {
      const currentId = localStorage.getItem('homeroom_active_class_id') || classId || '';
      if (!currentId) return;
      setLoading(true);
      try {
        const stList = await db.getStudentsByClass(currentId);
        setStudents(stList || []);

        const { data: clsData } = await supabase
          .from('classes')
          .select('name, teacher_classes(is_homeroom, profiles(full_name))')
          .eq('id', currentId)
          .maybeSingle();

        if (clsData) {
          setClassName(clsData.name || '');
          const homeroomTc: any = (clsData.teacher_classes || []).find((tc: any) => tc.is_homeroom);
          if (homeroomTc?.profiles) {
            const name = Array.isArray(homeroomTc.profiles)
              ? homeroomTc.profiles[0]?.full_name
              : homeroomTc.profiles?.full_name;
            if (name) setTeacherName(name);
          }
        }

        const data = await getHomeroomClassSettings(currentId);
        if (data) {
          setSettings(data);
          if (data.class_structure) setStructure(data.class_structure);
          if (data.seating_chart) setSeating(data.seating_chart);
        }

        const logs = await getCadreLogs(currentId);
        setCadreLogs(logs);
      } catch (err) {
        console.error('Error loading class structure:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [classId]);

  const reloadLogs = async () => {
    if (!classId) return;
    const logs = await getCadreLogs(classId);
    setCadreLogs(logs);
  };

  // Save Settings
  const handleSave = async () => {
    if (!classId) return;
    setSaving(true);
    try {
      await saveHomeroomClassSettings({
        class_id: classId,
        pin_code: settings?.pin_code || '123456',
        class_structure: structure,
        seating_chart: seating,
        classroom_layout: settings?.classroom_layout || null,
        announcement: settings?.announcement || ''
      });
      toast.success('Đã lưu thành công cấu hình lớp!');
    } catch (err) {
      toast.error('Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  // Export DOCX
  const handleExportDocx = async () => {
    if (!classId) return;
    try {
      toast.loading('Đang tạo file Word danh sách...', { id: 'docx' });
      await exportClassListDocx(
        className || 'Lớp học',
        '2025-2026',
        teacherName,
        students,
        { ...settings, class_structure: structure, seating_chart: seating }
      );
      toast.success('Đã xuất file Word thành công!', { id: 'docx' });
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Word', { id: 'docx' });
    }
  };

  const handleCadreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadreForm.target_student_id) {
      toast.error('Vui lòng chọn học sinh được ghi nhận!');
      return;
    }

    const targetSt = students.find(s => s.id === cadreForm.target_student_id);
    const targetName = targetSt?.fullName || (targetSt as any)?.name || 'Học sinh';

    try {
      await submitCadreLog({
        class_id: classId,
        cadre_role: cadreForm.cadre_role,
        cadre_name: cadreForm.cadre_name,
        target_student_id: cadreForm.target_student_id,
        target_student_name: targetName,
        date: cadreForm.date,
        type: cadreForm.type,
        category: cadreForm.category,
        description: cadreForm.description,
        points_delta: cadreForm.points_delta
      });
      toast.success('Đã nộp ghi nhận! Đang chờ GVCN phê duyệt.');
      setIsCadreModalOpen(false);
      reloadLogs();
    } catch (err) {
      toast.error('Lỗi khi lưu ghi nhận');
    }
  };

  const handleBatchReview = async (action: 'approved' | 'rejected') => {
    if (selectedLogIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một mục để duyệt!');
      return;
    }

    try {
      const res = await reviewCadreLogs(selectedLogIds, action);
      if (res.success) {
        toast.success(action === 'approved' ? `Đã 1-Click duyệt ${res.count} ghi nhận và cộng/trừ điểm thi đua!` : `Đã từ chối ${res.count} ghi nhận`);
        setSelectedLogIds([]);
        reloadLogs();
      }
    } catch (err) {
      toast.error('Lỗi khi duyệt ghi nhận');
    }
  };

  const handleSingleReview = async (logId: string, action: 'approved' | 'rejected') => {
    try {
      const res = await reviewCadreLogs([logId], action);
      if (res.success) {
        toast.success(action === 'approved' ? 'Đã duyệt ghi nhận và tính điểm thi đua!' : 'Đã từ chối ghi nhận');
        reloadLogs();
      }
    } catch (err) {
      toast.error('Lỗi xử lý');
    }
  };

  const pendingLogs = cadreLogs.filter(l => l.status === 'pending_review');

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-xs">Đang tải cơ cấu lớp & sơ đồ chỗ ngồi...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACTIONS (Light Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Cơ Cấu Tổ Chức Lớp & Phân Quyền Ban Cán Sự
            </h2>
            <HomeroomTooltip content="Phân công Ban cán sự lớp, chia 4 Tổ, sắp xếp chỗ ngồi và duyệt nhật ký thi đua nề nếp từ Ban Cán sự." />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : ''}</span> • Sĩ số: <span className="font-bold text-slate-800">{students.length} học sinh</span> • <span className="text-amber-600 font-bold">{pendingLogs.length} ghi nhận chờ duyệt</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'cadre_logs' ? (
            <button
              onClick={() => setIsCadreModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ban Cán Sự Ghi Nhận</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleExportDocx}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all shadow-sm"
              >
                <FileDown className="w-4 h-4 text-indigo-600" />
                <span>Xuất Word (.DOCX)</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. TABS */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {[
          { id: 'cadre', label: '1. Ban Cán Sự Lớp', icon: Award },
          { id: 'groups', label: '2. Danh Sách 4 Tổ', icon: Users },
          { id: 'seating', label: '3. Sơ Đồ Chỗ Ngồi', icon: Grid },
          { id: 'cadre_logs', label: `4. Nhật Ký Ban Cán Sự (${pendingLogs.length} chờ duyệt)`, icon: ClipboardList }
        ].map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 shadow-xs active:scale-95",
                getThemedTabClass(idx, isActive)
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: BAN CÁN SỰ LỚP */}
      {activeTab === 'cadre' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { idKey: 'monitor_id', nameKey: 'monitor_name', roleTitle: 'Lớp Trưởng', desc: 'Quản lý chung & điều hành lớp' },
            { idKey: 'vice_academic_id', nameKey: 'vice_academic_name', roleTitle: 'Lớp Phó Học Tập', desc: 'Theo dõi bài tập & học tập' },
            { idKey: 'vice_discipline_id', nameKey: 'vice_discipline_name', roleTitle: 'Lớp Phó Kỷ Luật', desc: 'Theo dõi nề nếp & chuyên cần' },
            { idKey: 'vice_activity_id', nameKey: 'vice_activity_name', roleTitle: 'Lớp Phó Phong Trào', desc: 'Văn thể mỹ & hoạt động Đội' },
          ].map((role, rIdx) => {
            const currentStudentId = (structure as any)[role.idKey];
            return (
              <ThemedCard
                key={role.idKey}
                index={rIdx}
                badgeText={role.roleTitle}
                icon={Award}
                showNumber={true}
                innerContainer={true}
              >
                <div className="space-y-3">
                  <p className="text-[11px] font-medium text-slate-500">{role.desc}</p>
                  <select
                    value={currentStudentId || ''}
                    onChange={(e) => {
                      const st = students.find(s => s.id === e.target.value);
                      setStructure({
                        ...structure,
                        [role.idKey]: e.target.value,
                        [role.nameKey]: st?.fullName || (st as any)?.name || (st as any)?.full_name || ''
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold shadow-xs cursor-pointer focus:bg-white focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 outline-none transition-all"
                  >
                    <option value="" className="text-slate-500 bg-white font-medium">-- Chọn học sinh --</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id} className="text-slate-900 bg-white font-bold">
                        {st.fullName || (st as any).name || (st as any).full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </ThemedCard>
            );
          })}
        </div>
      )}

      {/* 4. TAB 2: DANH SÁCH 4 TỔ */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(structure.groups || []).map((grp, gIdx) => (
            <ThemedCard
              key={grp.id}
              index={gIdx}
              badgeText={grp.name}
              icon={Users}
              showNumber={true}
              innerContainer={true}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Tổ trưởng:</label>
                  <select
                    value={grp.leader_id || ''}
                    onChange={(e) => {
                      const st = students.find(s => s.id === e.target.value);
                      const updated = [...structure.groups];
                      updated[gIdx].leader_id = e.target.value;
                      updated[gIdx].leader_name = st?.fullName || (st as any)?.name || (st as any)?.full_name || '';
                      setStructure({ ...structure, groups: updated });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold shadow-xs cursor-pointer focus:bg-white focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all"
                  >
                    <option value="" className="text-slate-500 bg-white font-medium">-- Chọn tổ trưởng --</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id} className="text-slate-900 bg-white font-bold">
                        {st.fullName || (st as any).name || (st as any).full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Tổ phó:</label>
                  <select
                    value={grp.vice_id || ''}
                    onChange={(e) => {
                      const st = students.find(s => s.id === e.target.value);
                      const updated = [...structure.groups];
                      updated[gIdx].vice_id = e.target.value;
                      updated[gIdx].vice_name = st?.fullName || (st as any)?.name || (st as any)?.full_name || '';
                      setStructure({ ...structure, groups: updated });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold shadow-xs cursor-pointer focus:bg-white focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all"
                  >
                    <option value="" className="text-slate-500 bg-white font-medium">-- Chọn tổ phó --</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id} className="text-slate-900 bg-white font-bold">
                        {st.fullName || (st as any).name || (st as any).full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </ThemedCard>
          ))}
        </div>
      )}

      {/* 5. TAB 3: SƠ ĐỒ CHỖ NGỒI */}
      {activeTab === 'seating' && (
        <SeatLayoutEditor
          initialLayout={settings?.classroom_layout || null}
          students={editorStudents}
          classId={classId}
          className={className}
          teacherName={teacherName}
          onSave={async (newLayout) => {
            if (!classId) return;
            await saveHomeroomClassSettings({
              class_id: classId,
              pin_code: settings?.pin_code || '123456',
              class_structure: structure,
              seating_chart: seating,
              classroom_layout: newLayout,
              announcement: settings?.announcement || ''
            });
            setSettings(prev => prev ? { ...prev, classroom_layout: newLayout } : null);
          }}
        />
      )}

      {/* 6. TAB 4: NHẬT KÝ BAN CÁN SỰ & DUYỆT ĐIỂM THI ĐUA */}
      {activeTab === 'cadre_logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Quy Trình Kiểm Duyệt Nhật Ký Nề Nếp Ban Cán Sự Lớp</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các ghi nhận của Tổ trưởng và Lớp trưởng được gom tại đây. GVCN duyệt sẽ tự động cộng/trừ điểm thi đua chính thức.
              </p>
            </div>

            {pendingLogs.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBatchReview('approved')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Duyệt Hàng Loạt ({selectedLogIds.length || pendingLogs.length})</span>
                </button>
                <button
                  onClick={() => handleBatchReview('rejected')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 transition-all"
                >
                  Từ Chối
                </button>
              </div>
            )}
          </div>

          {cadreLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs rounded-3xl bg-white border border-slate-200 shadow-sm">
              Chưa có ghi nhận nề nếp nào từ Ban cán sự lớp trong tuần này.
            </div>
          ) : (
            <div className="space-y-2.5">
              {cadreLogs.map((log) => {
                const isSelected = selectedLogIds.includes(log.id);
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all",
                      log.status === 'approved'
                        ? "bg-emerald-50/40 border-emerald-200"
                        : log.status === 'rejected'
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-white border-amber-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {log.status === 'pending_review' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLogIds([...selectedLogIds, log.id]);
                            } else {
                              setSelectedLogIds(selectedLogIds.filter(id => id !== log.id));
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{log.target_student_name}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            log.type === 'positive' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          )}>
                            {log.type === 'positive' ? `+${log.points_delta}đ` : `${log.points_delta}đ`} ({log.category})
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{log.date}</span>
                        </div>
                        <p className="text-xs text-slate-700">{log.description}</p>
                        <p className="text-[11px] text-indigo-600 font-medium">Người ghi nhận: {log.cadre_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-bold",
                        log.status === 'approved'
                          ? "bg-emerald-100 text-emerald-800"
                          : log.status === 'rejected'
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800 animate-pulse"
                      )}>
                        {log.status === 'approved' ? '✓ Đã duyệt' : log.status === 'rejected' ? '✕ Từ chối' : '⏳ Chờ GVCN duyệt'}
                      </span>

                      {log.status === 'pending_review' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSingleReview(log.id, 'approved')}
                            className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 transition-all"
                            title="Duyệt ghi nhận"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSingleReview(log.id, 'rejected')}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 active:scale-95 transition-all"
                            title="Từ chối ghi nhận"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. MODAL BAN CÁN SỰ GHI NHẬN NỀ NẾP */}
      {isCadreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">Ban Cán Sự Ghi Nhận Nề Nếp Tổ</h3>
              <button
                onClick={() => setIsCadreModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCadreSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vai trò ghi nhận *</label>
                  <select
                    value={cadreForm.cadre_role}
                    onChange={(e) => {
                      const role = e.target.value as any;
                      const roleLabels: Record<string, string> = {
                        group_leader_1: 'Tổ trưởng Tổ 1',
                        group_leader_2: 'Tổ trưởng Tổ 2',
                        group_leader_3: 'Tổ trưởng Tổ 3',
                        group_leader_4: 'Tổ trưởng Tổ 4',
                        monitor: 'Lớp trưởng',
                        vice_monitor: 'Lớp phó kỷ luật'
                      };
                      setCadreForm({ ...cadreForm, cadre_role: role, cadre_name: roleLabels[role] || 'Ban cán sự' });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="group_leader_1">Tổ trưởng Tổ 1</option>
                    <option value="group_leader_2">Tổ trưởng Tổ 2</option>
                    <option value="group_leader_3">Tổ trưởng Tổ 3</option>
                    <option value="group_leader_4">Tổ trưởng Tổ 4</option>
                    <option value="monitor">Lớp trưởng</option>
                    <option value="vice_monitor">Lớp phó kỷ luật</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày ghi nhận *</label>
                  <input
                    type="date"
                    value={cadreForm.date}
                    onChange={(e) => setCadreForm({ ...cadreForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Chọn học sinh *</label>
                <select
                  value={cadreForm.target_student_id}
                  onChange={(e) => setCadreForm({ ...cadreForm, target_student_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Chọn học sinh được ghi nhận --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.fullName || (st as any).name || (st as any).full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loại ghi nhận</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCadreForm({ ...cadreForm, type: 'violation', points_delta: -2, category: 'Vi phạm nề nếp' })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                        cadreForm.type === 'violation'
                          ? "bg-rose-50 border-rose-300 text-rose-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      )}
                    >
                      ⚠️ Vi phạm (-đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadreForm({ ...cadreForm, type: 'positive', points_delta: 2, category: 'Việc tốt' })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                        cadreForm.type === 'positive'
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      )}
                    >
                      ⭐ Việc tốt (+đ)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Điểm cộng/trừ</label>
                  <input
                    type="number"
                    value={cadreForm.points_delta}
                    onChange={(e) => setCadreForm({ ...cadreForm, points_delta: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hành vi / Lý do chi tiết *</label>
                <textarea
                  rows={2}
                  value={cadreForm.description}
                  onChange={(e) => setCadreForm({ ...cadreForm, description: e.target.value })}
                  placeholder="VD: Không mang khăn quàng đỏ, trực nhật sạch sẽ..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  Nộp Ghi Nhận Cho GVCN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
