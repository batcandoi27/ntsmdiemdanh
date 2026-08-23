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
    const activeId = localStorage.getItem('homeroom_active_class_id') || '';
    setClassId(activeId);

    async function loadData() {
      if (!activeId) return;
      setLoading(true);
      try {
        const stList = await db.getStudentsByClass(activeId);
        setStudents(stList || []);

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

        const classSettings = await getHomeroomClassSettings(activeId);
        setSettings(classSettings);
        if (classSettings.class_structure) {
          setStructure(classSettings.class_structure);
        }
        if (classSettings.seating_chart) {
          setSeating(classSettings.seating_chart);
        }
      } catch (err) {
        console.error('Error loading class organization:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

      {/* 2. TABS */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('cadre')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === 'cadre'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
          )}
        >
          <Award className="w-3.5 h-3.5" />
          <span>1. Ban Cán Sự Lớp</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === 'groups'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>2. Danh Sách 4 Tổ</span>
        </button>

        <button
          onClick={() => setActiveTab('seating')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            activeTab === 'seating'
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80"
          )}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>3. Sơ Đồ Chỗ Ngồi</span>
        </button>
      </div>

      {/* 3. TAB 1: BAN CÁN SỰ LỚP */}
      {activeTab === 'cadre' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lớp trưởng */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Lớp Trưởng</span>
            </div>
            <select
              value={structure.monitor_id || ''}
              onChange={(e) => {
                const st = students.find(s => s.id === e.target.value);
                setStructure({
                  ...structure,
                  monitor_id: e.target.value,
                  monitor_name: (st as any)?.full_name || (st as any)?.name || ''
                });
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- Chọn học sinh --</option>
              {students.map(st => (
                <option key={st.id} value={st.id}>{(st as any).full_name || (st as any).name}</option>
              ))}
            </select>
          </div>

          {/* Lớp phó Học tập */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Lớp Phó Học Tập</span>
            </div>
            <select
              value={structure.vice_academic_id || ''}
              onChange={(e) => {
                const st = students.find(s => s.id === e.target.value);
                setStructure({
                  ...structure,
                  vice_academic_id: e.target.value,
                  vice_academic_name: (st as any)?.full_name || (st as any)?.name || ''
                });
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- Chọn học sinh --</option>
              {students.map(st => (
                <option key={st.id} value={st.id}>{(st as any).full_name || (st as any).name}</option>
              ))}
            </select>
          </div>

          {/* Lớp phó Kỷ luật */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Lớp Phó Kỷ Luật</span>
            </div>
            <select
              value={structure.vice_discipline_id || ''}
              onChange={(e) => {
                const st = students.find(s => s.id === e.target.value);
                setStructure({
                  ...structure,
                  vice_discipline_id: e.target.value,
                  vice_discipline_name: (st as any)?.full_name || (st as any)?.name || ''
                });
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- Chọn học sinh --</option>
              {students.map(st => (
                <option key={st.id} value={st.id}>{(st as any).full_name || (st as any).name}</option>
              ))}
            </select>
          </div>

          {/* Lớp phó Phong trào */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Lớp Phó Phong Trào</span>
            </div>
            <select
              value={structure.vice_activity_id || ''}
              onChange={(e) => {
                const st = students.find(s => s.id === e.target.value);
                setStructure({
                  ...structure,
                  vice_activity_id: e.target.value,
                  vice_activity_name: (st as any)?.full_name || (st as any)?.name || ''
                });
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- Chọn học sinh --</option>
              {students.map(st => (
                <option key={st.id} value={st.id}>{(st as any).full_name || (st as any).name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 4. TAB 2: DANH SÁCH 4 TỔ */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(structure.groups || []).map((grp, gIdx) => (
            <div key={grp.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-indigo-700 text-sm">{grp.name}</h3>
                <span className="text-[11px] text-slate-400 font-medium">Tổ {gIdx + 1}</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Tổ trưởng:</label>
                <select
                  value={grp.leader_id || ''}
                  onChange={(e) => {
                    const st = students.find(s => s.id === e.target.value);
                    const updated = [...structure.groups];
                    updated[gIdx].leader_id = e.target.value;
                    updated[gIdx].leader_name = (st as any)?.full_name || (st as any)?.name || '';
                    setStructure({ ...structure, groups: updated });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                >
                  <option value="">-- Chọn tổ trưởng --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{(st as any).full_name || (st as any).name}</option>
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
                    updated[gIdx].vice_name = (st as any)?.full_name || (st as any)?.name || '';
                    setStructure({ ...structure, groups: updated });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                >
                  <option value="">-- Chọn tổ phó --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{(st as any).full_name || (st as any).name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. TAB 3: SƠ ĐỒ CHỖ NGỒI TƯƠNG TÁC (5 Dãy x 2 Cột Bàn Đôi) */}
      {activeTab === 'seating' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          
          {/* BỤC GIẢNG & BẢNG LỚP */}
          <div className="max-w-md mx-auto py-3 bg-slate-100 rounded-2xl border border-slate-200 text-center">
            <span className="font-black text-xs uppercase tracking-widest text-slate-600">
              🎓 BỤC GIẢNG & BẢNG ĐEN
            </span>
          </div>

          {/* LƯỚI BÀN HỌC (5 Hàng x 2 Cột) */}
          <div className="space-y-4 max-w-3xl mx-auto">
            {Array.from({ length: seating.rows || 5 }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              return (
                <div key={rowNum} className="grid grid-cols-2 gap-6">
                  {/* Cột 1 (Dãy Trái) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block text-center">
                      Bàn {rowNum}A (Dãy Trái)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2].map((sNum) => {
                        const seatKey = `desk_${rowNum}_1_seat_${sNum}`;
                        const currentStudentId = seating.seats[seatKey] || '';
                        return (
                          <select
                            key={sNum}
                            value={currentStudentId}
                            onChange={(e) => handleSeatChange(`desk_${rowNum}_1`, sNum, e.target.value)}
                            className={cn(
                              "w-full rounded-xl px-2 py-1.5 text-[11px] font-bold border transition-colors shadow-sm",
                              currentStudentId
                                ? "bg-indigo-50 border-indigo-300 text-indigo-950"
                                : "bg-white border-slate-300 text-slate-600"
                            )}
                          >
                            <option value="" className="text-slate-500 bg-white">-- Chỗ {sNum} trống --</option>
                            {students.map(st => (
                              <option key={st.id} value={st.id} className="text-slate-900 bg-white font-bold">
                                {(st as any).full_name || (st as any).name}
                              </option>
                            ))}
                          </select>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cột 2 (Dãy Phải) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 block text-center">
                      Bàn {rowNum}B (Dãy Phải)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2].map((sNum) => {
                        const seatKey = `desk_${rowNum}_2_seat_${sNum}`;
                        const currentStudentId = seating.seats[seatKey] || '';
                        return (
                          <select
                            key={sNum}
                            value={currentStudentId}
                            onChange={(e) => handleSeatChange(`desk_${rowNum}_2`, sNum, e.target.value)}
                            className={cn(
                              "w-full rounded-xl px-2 py-1.5 text-[11px] font-bold border transition-colors shadow-sm",
                              currentStudentId
                                ? "bg-indigo-50 border-indigo-300 text-indigo-950"
                                : "bg-white border-slate-300 text-slate-600"
                            )}
                          >
                            <option value="" className="text-slate-500 bg-white">-- Chỗ {sNum} trống --</option>
                            {students.map(st => (
                              <option key={st.id} value={st.id} className="text-slate-900 bg-white font-bold">
                                {(st as any).full_name || (st as any).name}
                              </option>
                            ))}
                          </select>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CỬA RA VÀO */}
          <div className="flex justify-between max-w-3xl mx-auto text-[11px] font-bold text-slate-400 pt-2 border-t border-slate-100">
            <span>🚪 Cửa Trước Lớp</span>
            <span>🚪 Cửa Sau Lớp</span>
          </div>
        </div>
      )}
    </div>
  );
}
