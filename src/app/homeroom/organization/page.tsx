"use client";

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Users,
  Award,
  Save,
  Printer,
  Plus,
  Trash2,
  MoveHorizontal,
  CheckCircle2,
  School,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getHomeroomClassSettings, saveHomeroomClassSettings } from '@/services/homeroom-service';
import { exportClassListDocx } from '@/services/homeroom-print-service';
import { HomeroomClassSettings, ClassStructure, SeatingChartConfig } from '@/types/homeroom';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomeroomOrganizationPage() {
  const [classId, setClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<HomeroomClassSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'cadre' | 'groups' | 'seating'>('cadre');
  const [teacherName, setTeacherName] = useState('Giáo viên chủ nhiệm');

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

  useEffect(() => {
    if (!classId) return;

    async function load() {
      setLoading(true);
      try {
        // 1. Lấy danh sách HS
        const { data: studentClasses } = await supabase
          .from('student_classes')
          .select('student_id, students(*)')
          .eq('class_id', classId);

        const list: Student[] = (studentClasses || [])
          .map((sc: any) => sc.students)
          .filter(Boolean);

        setStudents(list);

        // 2. Lấy settings
        const st = await getHomeroomClassSettings(classId);
        setSettings(st);

        // 3. Tên GVCN
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
        console.error('Error loading organization data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [classId]);

  // Cập nhật ban cán sự
  const handleCadreChange = (roleKey: keyof ClassStructure, studentId: string) => {
    if (!settings) return;
    const student = students.find(s => s.id === studentId);
    const studentName = student ? ((student as any).full_name || (student as any).name) : '';

    const updatedStructure = {
      ...settings.class_structure,
      [roleKey]: studentId,
      [`${String(roleKey).replace('_id', '')}_name`]: studentName
    };

    setSettings({
      ...settings,
      class_structure: updatedStructure
    });
  };

  // Cập nhật chỗ ngồi
  const handleSeatAssign = (seatKey: string, studentId: string) => {
    if (!settings) return;
    const currentSeats = { ...(settings.seating_chart?.seats || {}) };
    if (studentId === '') {
      delete currentSeats[seatKey];
    } else {
      currentSeats[seatKey] = studentId;
    }

    setSettings({
      ...settings,
      seating_chart: {
        ...settings.seating_chart,
        seats: currentSeats
      }
    });
  };

  // Lưu toàn bộ cấu hình
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await saveHomeroomClassSettings(settings);
      if (res.success) {
        toast.success('Đã lưu cơ cấu tổ chức & sơ đồ lớp!');
      } else {
        toast.error('Lỗi khi lưu: ' + res.error);
      }
    } catch (err) {
      toast.error('Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  // Xuất file Word danh sách & ban cán sự
  const handleExportDocx = async () => {
    if (!settings) return;
    try {
      toast.loading('Đang tạo file Word...', { id: 'docx-gen' });
      await exportClassListDocx(
        classId,
        '2025-2026',
        teacherName,
        students,
        settings
      );
      toast.success('Đã tải xuống file Word danh sách lớp & ban cán sự!', { id: 'docx-gen' });
    } catch (err) {
      toast.error('Lỗi xuất file', { id: 'docx-gen' });
    }
  };

  if (loading || !settings) {
    return <div className="py-20 text-center text-slate-400 text-sm">Đang tải thông tin cơ cấu lớp...</div>;
  }

  const structure = settings.class_structure || { groups: [] };
  const seating = settings.seating_chart || { rows: 5, cols: 2, seats_per_desk: 2, seats: {} };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Cơ Cấu Lớp & Sơ Đồ Chỗ Ngồi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lớp {classId} — Quản lý Ban cán sự, 4 Tổ và Sơ đồ vị trí chỗ ngồi học sinh
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDocx}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Xuất file Word (.DOCX)</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 w-fit backdrop-blur-md">
        <button
          onClick={() => setActiveTab('cadre')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === 'cadre' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
          )}
        >
          1. Ban cán sự lớp
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === 'groups' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
          )}
        >
          2. Phân chia 4 Tổ
        </button>
        <button
          onClick={() => setActiveTab('seating')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
            activeTab === 'seating' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-400 hover:text-white"
          )}
        >
          3. Sơ đồ chỗ ngồi (Bàn ghế)
        </button>
      </div>

      {/* TAB 1: BAN CÁN SỰ LỚP */}
      {activeTab === 'cadre' && (
        <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white">Đội ngũ Ban Cán Sự Lớp</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lớp trưởng */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-indigo-300 uppercase block">⭐ Lớp trưởng</label>
              <select
                value={structure.monitor_id || ''}
                onChange={(e) => handleCadreChange('monitor_id', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">-- Chọn học sinh --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {(s as any).full_name || (s as any).name} ({s.code || s.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Lớp phó Học tập */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-blue-300 uppercase block">📚 Lớp phó Học tập</label>
              <select
                value={structure.vice_academic_id || ''}
                onChange={(e) => handleCadreChange('vice_academic_id', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">-- Chọn học sinh --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {(s as any).full_name || (s as any).name} ({s.code || s.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Lớp phó Kỷ luật */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-rose-300 uppercase block">🛡️ Lớp phó Kỷ luật / Nề nếp</label>
              <select
                value={structure.vice_discipline_id || ''}
                onChange={(e) => handleCadreChange('vice_discipline_id', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">-- Chọn học sinh --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {(s as any).full_name || (s as any).name} ({s.code || s.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Lớp phó Phong trào */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-purple-300 uppercase block">🎨 Lớp phó Văn thể mỹ / Phong trào</label>
              <select
                value={structure.vice_activity_id || ''}
                onChange={(e) => handleCadreChange('vice_activity_id', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">-- Chọn học sinh --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {(s as any).full_name || (s as any).name} ({s.code || s.id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PHÂN CHIA 4 TỔ */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(structure.groups || []).map((grp, gIdx) => (
            <div key={grp.id || gIdx} className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-black text-indigo-400">{grp.name}</span>
                <span className="text-xs text-slate-400">{grp.member_ids?.length || 0} thành viên</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Tổ trưởng</label>
                  <select
                    value={grp.leader_id || ''}
                    onChange={(e) => {
                      const updated = [...structure.groups];
                      const s = students.find(x => x.id === e.target.value);
                      updated[gIdx].leader_id = e.target.value;
                      updated[gIdx].leader_name = s ? ((s as any).full_name || (s as any).name) : '';
                      setSettings({ ...settings, class_structure: { ...structure, groups: updated } });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Chọn tổ trưởng --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{(s as any).full_name || (s as any).name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Tổ phó</label>
                  <select
                    value={grp.vice_id || ''}
                    onChange={(e) => {
                      const updated = [...structure.groups];
                      const s = students.find(x => x.id === e.target.value);
                      updated[gIdx].vice_id = e.target.value;
                      updated[gIdx].vice_name = s ? ((s as any).full_name || (s as any).name) : '';
                      setSettings({ ...settings, class_structure: { ...structure, groups: updated } });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Chọn tổ phó --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{(s as any).full_name || (s as any).name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SƠ ĐỒ CHỖ NGỒI (SEATING CHART) */}
      {activeTab === 'seating' && (
        <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-black text-white">Sơ Đồ Bàn Ghế Lớp Học (Bàn đôi 2 học sinh)</h2>
            </div>

            <div className="text-xs text-slate-400">
              Đã xếp chỗ: <span className="font-bold text-emerald-400">{Object.keys(seating.seats || {}).length}</span> / {students.length} HS
            </div>
          </div>

          {/* BẢNG ĐEN / BÀN GIÁO VIÊN */}
          <div className="max-w-md mx-auto py-2.5 px-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-center text-xs font-black uppercase tracking-widest text-slate-300 shadow-inner">
            ▲ BẢNG ĐEN / BÀN GIÁO VIÊN ▲
          </div>

          {/* LƯỚI BÀN GHẾ 5 DÃY X 2 CỘT */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-4 max-w-4xl mx-auto">
            {[0, 1].map((colIdx) => (
              <div key={colIdx} className="space-y-4">
                <div className="text-center text-xs font-bold uppercase text-slate-500">
                  Dãy {colIdx === 0 ? 'Trái' : 'Phải'}
                </div>

                {[0, 1, 2, 3, 4].map((rowIdx) => {
                  const seatKey1 = `r${rowIdx}_c${colIdx}_s0`;
                  const seatKey2 = `r${rowIdx}_c${colIdx}_s1`;
                  const studentId1 = seating.seats?.[seatKey1] || '';
                  const studentId2 = seating.seats?.[seatKey2] || '';
                  const st1 = students.find(s => s.id === studentId1);
                  const st2 = students.find(s => s.id === studentId2);

                  return (
                    <div
                      key={rowIdx}
                      className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>Bàn {rowIdx + 1}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Ghế 1 */}
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 block">Ghế 1</span>
                          <select
                            value={studentId1}
                            onChange={(e) => handleSeatAssign(seatKey1, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                          >
                            <option value="">(Trống)</option>
                            {students.map(s => (
                              <option key={s.id} value={s.id}>
                                {(s as any).full_name || (s as any).name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Ghế 2 */}
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 block">Ghế 2</span>
                          <select
                            value={studentId2}
                            onChange={(e) => handleSeatAssign(seatKey2, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                          >
                            <option value="">(Trống)</option>
                            {students.map(s => (
                              <option key={s.id} value={s.id}>
                                {(s as any).full_name || (s as any).name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
