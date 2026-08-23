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
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/services/db';
import {
  getHomeroomClassSettings,
  saveHomeroomClassSettings
} from '@/services/homeroom-service';
import { exportClassListDocx } from '@/services/homeroom-print-service';
import { HomeroomClassSettings, ClassStructure, SeatingChart } from '@/types/homeroom';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'cadre' | 'groups' | 'seating'>('cadre');

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
          const name = Array.isArray(homeroomTc?.profiles)
            ? homeroomTc.profiles[0]?.full_name
            : homeroomTc?.profiles?.full_name;
          if (name) setTeacherName(name);
        }

        const classSettings = await getHomeroomClassSettings(currentId);
        setSettings(classSettings);
        if (classSettings.class_structure) {
          setStructure(classSettings.class_structure);
        } else {
          setStructure({
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
        }
        if (classSettings.seating_chart) {
          setSeating(classSettings.seating_chart);
        } else {
          setSeating({
            rows: 5,
            cols: 2,
            seats_per_desk: 2,
            seats: {}
          });
        }
      } catch (err) {
        console.error('Error loading class organization:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const handleClassChange = () => {
      const newId = localStorage.getItem('homeroom_active_class_id') || '';
      if (newId) {
        setClassId(newId);
      }
    };

    window.addEventListener('homeroom_class_changed', handleClassChange);
    return () => window.removeEventListener('homeroom_class_changed', handleClassChange);
  }, [classId]);

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
        announcement: settings?.announcement || ''
      });
      toast.success('Đã lưu cơ cấu tổ chức & sơ đồ lớp thành công!');
    } catch (err) {
      toast.error('Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  // Export DOCX
  const handleExportDocx = async () => {
    if (!settings) return;
    try {
      await exportClassListDocx(
        className || 'Lớp học',
        '2025-2026',
        teacherName,
        students,
        { ...settings, class_structure: structure, seating_chart: seating }
      );
      toast.success('Đã xuất file Word danh sách & cơ cấu lớp!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xuất file Word');
    }
  };

  // Handle assign seat
  const handleSeatChange = (deskKey: string, seatIndex: number, studentId: string) => {
    const key = `${deskKey}_seat_${seatIndex}`;
    setSeating(prev => ({
      ...prev,
      seats: {
        ...prev.seats,
        [key]: studentId
      }
    }));
  };

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
              Cơ Cấu Tổ Chức Lớp & Sơ Đồ Chỗ Ngồi
            </h2>
            <HomeroomTooltip content="Phân công Ban cán sự lớp, chia 4 Tổ và sắp xếp sơ đồ chỗ ngồi bàn đôi trực quan." />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lớp <span className="text-indigo-600 font-bold">{className ? `Lớp ${className}` : ''}</span> • Sĩ số: <span className="font-bold text-slate-800">{students.length} học sinh</span> • GVCN: <span className="text-slate-700 font-bold">{teacherName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* 2. TABS (Tự động màu nền theo index & kích hoạt màu đậm khi chọn) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {[
          { id: 'cadre', label: '1. Ban Cán Sự Lớp', icon: Award },
          { id: 'groups', label: '2. Danh Sách 4 Tổ', icon: Users },
          { id: 'seating', label: '3. Sơ Đồ Chỗ Ngồi', icon: Grid },
        ].map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer outline-none",
                getThemedTabClass(idx, isActive)
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: BAN CÁN SỰ LỚP (Tự động màu hóa theo index 0, 1, 2, 3) */}
      {activeTab === 'cadre' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'LỚP TRƯỞNG', idKey: 'monitor_id', nameKey: 'monitor_name' },
            { label: 'PHÓ HỌC TẬP', idKey: 'vice_academic_id', nameKey: 'vice_academic_name' },
            { label: 'PHÓ KỶ LUẬT', idKey: 'vice_discipline_id', nameKey: 'vice_discipline_name' },
            { label: 'PHÓ PHONG TRÀO', idKey: 'vice_activity_id', nameKey: 'vice_activity_name' },
          ].map((role, idx) => {
            const currentId = (structure as any)[role.idKey] || '';
            return (
              <ThemedCard
                key={role.idKey}
                index={idx}
                badgeText={role.label}
                icon={Award}
                showNumber={true}
                innerContainer={true}
              >
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">Học sinh đảm nhiệm:</label>
                  <select
                    value={currentId}
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

      {/* 4. TAB 2: DANH SÁCH 4 TỔ (Tự động màu hóa theo index 0..3) */}
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

      {/* 5. TAB 3: SƠ ĐỒ CHỖ NGỒI THÔNG MINH (Seat Layout Editor) */}
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
    </div>
  );
}
