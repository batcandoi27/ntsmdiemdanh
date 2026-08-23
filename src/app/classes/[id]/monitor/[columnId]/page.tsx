'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getColumn, updateColumn } from '@/services/column-service';
import { getActiveStudents } from '@/services/student-service';
import { getAllRecordsForColumn, savePeriodRecord, getOneTimeRecords, saveOneTimeRecord } from '@/services/record-service';
import { Column, Student, PeriodRecord, OneTimeRecord } from '@/types/models';
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  Circle,
  X,
  FileDown,
  Share2,
  Eye,
  EyeOff,
  CreditCard,
  QrCode,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Filter,
  Sparkles,
  ChevronRight,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBookTheme } from '@/lib/book-themes';
import { Modal } from '@/components/ui/modal';
import { getMonitorExportData } from '@/app/actions/monitor';
import { exportMonitorBook, MonitorExportData, compareVietnameseNames } from '@/lib/export-utils';
import { MonitorMessageModal } from '@/components/monitor/monitor-message-modal';
import { db } from '@/services/db';
import toast from 'react-hot-toast';

/** Format số: 100000 → 100 000 (dùng thin space) */
const formatNum = (v: string | number): string => {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('vi-VN');
};

const isNumVal = (v: any): boolean => v !== undefined && v !== '' && !isNaN(Number(v));

/** Hiển thị giá trị: nếu là số thì format, không thì giữ nguyên */
const displayVal = (v: string | undefined): string => {
  if (!v) return '-';
  return isNumVal(v) ? formatNum(v) : v;
};

export default function MonitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const columnId = params.columnId as string;

  const [loading, setLoading] = useState(true);
  const [column, setColumn] = useState<Column | null>(null);
  const [currentClass, setCurrentClass] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'done' | 'pending'>('all');

  // Records State
  const [periodRecords, setPeriodRecords] = useState<Record<string, Record<string, string>>>({}); // studentCode -> periodKey -> value
  const [oneTimeRecords, setOneTimeRecords] = useState<Record<string, { completed: boolean; value?: string; note?: string }>>({}); // studentCode -> { completed, value, note }

  // Export & Share State
  const [exportLoading, setExportLoading] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [columnId]);

  const loadData = async () => {
    try {
      const [col, studList, cls] = await Promise.all([
        getColumn(columnId),
        getActiveStudents(classId),
        db.getClass(classId)
      ]);

      if (!col) {
        alert('Không tìm thấy cột này');
        router.back();
        return;
      }

      setColumn(col);
      setCurrentClass(cls);

      // Filter students by scope
      let filteredStudents = studList;
      if (col.applicableScope === 'subset' && col.applicableStudentIds) {
        filteredStudents = studList.filter(s => col.applicableStudentIds?.includes(s.id));
      }
      // Sort by Vietnamese name
      filteredStudents.sort((a, b) => compareVietnameseNames(a.fullName, b.fullName));

      setStudents(filteredStudents);

      // Fetch Records based on frequency
      if (col.frequency === 'period') {
        const allRecords = await getAllRecordsForColumn(columnId);
        const records = allRecords as PeriodRecord[];

        const map: Record<string, Record<string, string>> = {};
        records.forEach(r => {
          if (!map[r.studentCode]) map[r.studentCode] = {};
          map[r.studentCode][r.periodKey] = r.value as string;
        });
        setPeriodRecords(map);
      } else if (col.frequency === 'one_time') {
        const records = await getOneTimeRecords(columnId);
        const map: Record<string, any> = {};
        records.forEach(r => {
          map[r.studentCode] = { completed: r.status === 'done', note: r.note };
        });
        setOneTimeRecords(map);
      }
    } catch (error) {
      console.error('Error loading detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOneTimeToggle = async (studentCode: string) => {
    if (!column) return;
    const current = oneTimeRecords[studentCode] || { completed: false };
    const newCompleted = !current.completed;

    setOneTimeRecords(prev => ({
      ...prev,
      [studentCode]: { ...current, completed: newCompleted }
    }));

    try {
      await saveOneTimeRecord({
        columnId: column.id,
        classId,
        studentCode,
        status: newCompleted ? 'done' : 'pending',
        note: current.note
      });
    } catch (error) {
      console.error(error);
      alert('Lỗi lưu trạng thái: ' + (error as Error).message);
      setOneTimeRecords(prev => ({
        ...prev,
        [studentCode]: { ...current, completed: !newCompleted }
      }));
    }
  };

  const handleBulkOneTime = async (completed: boolean) => {
    if (!column) return;
    if (!confirm(completed ? 'Đánh dấu tất cả là xong?' : 'Hủy đánh dấu tất cả?')) return;

    const nextRecords = { ...oneTimeRecords };
    const promises = [];

    for (const s of students) {
      const current = nextRecords[s.code];
      nextRecords[s.code] = {
        completed,
        value: current?.value,
        note: current?.note
      };

      promises.push(
        saveOneTimeRecord({
          columnId: column.id,
          classId,
          studentCode: s.code,
          status: completed ? 'done' : 'pending',
          note: current?.note
        })
      );
    }
    setOneTimeRecords(nextRecords);
    try {
      await Promise.all(promises);
      toast.success('Đã cập nhật toàn bộ học sinh!');
    } catch (e) {
      console.error(e);
      alert('Lỗi lưu thay đổi');
    }
  };

  const handlePeriodCellClick = async (studentCode: string, periodKey: string) => {
    if (!column) return;

    if (column.suggestions.length > 0) {
      const currentVal = periodRecords[studentCode]?.[periodKey];
      const currentIndex = column.suggestions.indexOf(currentVal || '');

      let nextVal = '';
      if (currentIndex === -1) {
        nextVal = column.suggestions[0];
      } else if (currentIndex < column.suggestions.length - 1) {
        nextVal = column.suggestions[currentIndex + 1];
      } else {
        nextVal = ''; // Cycle back to empty (unchecked)
      }

      updatePeriodRecord(studentCode, periodKey, nextVal);
    } else {
      // Default amount or X or empty
      const defaultAmount = column.paymentConfig?.defaultAmount;
      const currentVal = periodRecords[studentCode]?.[periodKey];
      let nextVal = '';

      if (!currentVal) {
        nextVal = defaultAmount ? String(defaultAmount) : 'X';
      } else {
        nextVal = '';
      }
      updatePeriodRecord(studentCode, periodKey, nextVal);
    }
  };

  const updatePeriodRecord = async (studentCode: string, periodKey: string, value: string) => {
    if (!column) return;

    setPeriodRecords(prev => ({
      ...prev,
      [studentCode]: {
        ...prev[studentCode],
        [periodKey]: value
      }
    }));

    try {
      await savePeriodRecord({
        columnId: column.id,
        classId,
        studentCode,
        periodKey,
        value
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleParentSharing = async () => {
    if (!column) return;
    const newShared = !column.isSharedWithParents;
    try {
      await updateColumn(column.id, { isSharedWithParents: newShared });
      setColumn(prev => (prev ? { ...prev, isSharedWithParents: newShared } : null));
      toast.success(newShared ? 'Đã bật chia sẻ sổ theo dõi cho Phụ huynh tại /portal' : 'Đã tắt chia sẻ (Chuyển về Riêng tư)');
    } catch (err: any) {
      toast.error('Lỗi cập nhật chia sẻ: ' + err.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const exportData = await getMonitorExportData(columnId);
      await exportMonitorBook(exportData, column?.name || 'So_theo_doi');
      toast.success('Đã xuất file Excel thành công!');
    } catch (error) {
      console.error('Export Excel Error:', error);
      alert('Lỗi xuất Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const currentClassData = useMemo(() => {
    if (!column || !students || !currentClass) return null;

    const mappedStudents = students.map(s => {
      let recs: Record<string, any> = {};
      if (column.frequency === 'period') {
        recs = periodRecords[s.code] || {};
      } else {
        const rec = oneTimeRecords[s.code];
        if (rec?.completed) recs['status'] = 'done';
        if (rec?.value) recs['value'] = rec.value;
      }
      return {
        id: s.id,
        code: s.code,
        name: s.fullName,
        records: recs
      };
    });

    return {
      classId,
      className: currentClass.name || 'Lớp',
      columnId,
      columnName: column.name,
      frequency: column.frequency as any,
      subPeriods: column.subPeriods,
      students: mappedStudents
    } as MonitorExportData;
  }, [column, students, periodRecords, oneTimeRecords, currentClass, classId, columnId]);

  // Dynamic Theme
  const theme = useMemo(() => {
    return getBookTheme(0, column?.id || column?.name);
  }, [column]);

  // Statistics Calculation
  const stats = useMemo(() => {
    if (!column || students.length === 0) {
      return { totalRevenue: 0, completedCount: 0, completionRate: 0, pendingCount: 0, totalSlots: 0, filledSlots: 0 };
    }

    let totalRevenue = 0;
    let completedStudents = 0;

    if (column.frequency === 'period') {
      const subPeriods = column.subPeriods || [{ id: 'main', label: 'Kỳ chính' }];
      const totalSlots = students.length * subPeriods.length;
      let filledSlots = 0;

      students.forEach(s => {
        let studentFilled = 0;
        subPeriods.forEach(sp => {
          const val = periodRecords[s.code]?.[sp.id];
          if (val !== undefined && val !== '') {
            filledSlots++;
            studentFilled++;
            if (isNumVal(val)) {
              totalRevenue += Number(val);
            }
          }
        });
        if (studentFilled === subPeriods.length && subPeriods.length > 0) {
          completedStudents++;
        }
      });

      const completionRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
      return {
        totalRevenue,
        completedCount: completedStudents,
        completionRate,
        pendingCount: students.length - completedStudents,
        totalSlots,
        filledSlots
      };
    } else {
      students.forEach(s => {
        if (oneTimeRecords[s.code]?.completed) {
          completedStudents++;
        }
      });
      const completionRate = Math.round((completedStudents / students.length) * 100);
      return {
        totalRevenue: 0,
        completedCount: completedStudents,
        completionRate,
        pendingCount: students.length - completedStudents,
        totalSlots: students.length,
        filledSlots: completedStudents
      };
    }
  }, [column, students, periodRecords, oneTimeRecords]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'all') return true;

      if (column?.frequency === 'period') {
        const subPeriods = column.subPeriods || [{ id: 'main', label: 'Kỳ chính' }];
        const filled = subPeriods.filter(sp => {
          const v = periodRecords[s.code]?.[sp.id];
          return v !== undefined && v !== '';
        }).length;
        const isFull = filled === subPeriods.length && subPeriods.length > 0;
        return filterStatus === 'done' ? isFull : !isFull;
      } else {
        const isDone = !!oneTimeRecords[s.code]?.completed;
        return filterStatus === 'done' ? isDone : !isDone;
      }
    });
  }, [students, searchQuery, filterStatus, column, periodRecords, oneTimeRecords]);

  if (loading || !column) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
        <span className="text-sm text-slate-500 font-medium">Đang tải dữ liệu sổ theo dõi...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 pb-24 text-slate-900">
      {/* 1. Header Top Navigation Bar */}
      <div className={cn("border-b sticky top-0 z-30 px-4 sm:px-6 py-3.5 shadow-sm backdrop-blur-md bg-white/95", theme.borderColor)}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/classes/${classId}/monitor`)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              title="Quay lại danh sách sổ"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={cn("font-black text-lg sm:text-xl tracking-tight", theme.titleColor)}>
                  {column.name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {currentClass?.name || 'Lớp'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {students.length} học sinh • {column.frequency === 'period' ? 'Theo giai đoạn / tháng' : 'Nhiệm vụ một lần'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMessageModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:from-teal-700 hover:to-emerald-700 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm shadow-emerald-500/20 active:scale-95"
              title="Báo cáo nhanh cho phụ huynh qua Zalo"
            >
              <Share2 size={15} />
              <span>Báo cáo Zalo</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exportLoading}
              className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
              title="Xuất file Excel chuyên nghiệp"
            >
              {exportLoading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        {/* 2. Top KPI Dashboard Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Tổng Tiền Đã Thu (nếu có thu tiền) hoặc Tổng lượt đã ghi */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">
                {stats.totalRevenue > 0 ? 'Tổng tiền đã thu' : 'Lượt đã ghi nhận'}
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <DollarSign size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              {stats.totalRevenue > 0 ? `${formatNum(stats.totalRevenue)} đ` : `${stats.filledSlots} lượt`}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {stats.totalSlots > 0 ? `Đạt ${stats.completionRate}% tổng số lượt` : 'Đang cập nhật'}
            </div>
          </div>

          {/* Card 2: Tiến độ hoàn thành */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">Học sinh hoàn tất</span>
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Users size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600">
              {stats.completedCount} <span className="text-sm font-normal text-slate-400">/ {students.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          {/* Card 3: Chưa hoàn thành */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">Chưa xong / Còn thiếu</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Clock size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600">
              {stats.pendingCount} <span className="text-sm font-normal text-slate-400">học sinh</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Cần theo dõi và đối soát
            </div>
          </div>

          {/* Card 4: Trạng thái Chia Sẻ Portal & VietQR */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Cổng Phụ Huynh</span>
              <button
                type="button"
                onClick={handleToggleParentSharing}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-xl font-bold transition-all shadow-2xs flex items-center gap-1",
                  column.isSharedWithParents
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                )}
              >
                {column.isSharedWithParents ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{column.isSharedWithParents ? 'Đang mở' : 'Khóa'}</span>
              </button>
            </div>

            {column.paymentConfig?.enabled ? (
              <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1 truncate">
                <CreditCard size={12} className="shrink-0" />
                <span className="truncate">
                  VietQR {column.paymentConfig.recipientType === 'teacher' ? 'GV' : 'Trường'}
                  {column.paymentConfig.defaultAmount ? ` • ${formatNum(column.paymentConfig.defaultAmount)}đ` : ''}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic">Chưa bật thanh toán QR</div>
            )}
          </div>
        </div>

        {/* 3. Search & Filter Bar */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm học sinh theo tên hoặc mã số..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                filterStatus === 'all'
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Tất cả ({students.length})
            </button>
            <button
              onClick={() => setFilterStatus('done')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                filterStatus === 'done'
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              )}
            >
              Đã xong ({stats.completedCount})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                filterStatus === 'pending'
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              )}
            >
              Chưa xong ({stats.pendingCount})
            </button>
          </div>
        </div>

        {/* 4. Main Matrix Spreadsheet Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {column.frequency === 'period' ? (
            <div className="overflow-x-auto max-h-[650px] relative">
              <table className="w-full border-collapse text-left text-xs">
                {/* Table Header */}
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20 shadow-xs">
                  <tr>
                    {/* Fixed First Column Header */}
                    <th className="p-3 font-extrabold text-slate-700 w-52 sm:w-60 sticky left-0 bg-slate-50 z-30 border-r border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-600" />
                        <span>Học sinh ({filteredStudents.length})</span>
                      </div>
                    </th>

                    {/* Sub-period Headers */}
                    {(column.subPeriods || [{ id: 'main', label: 'Kỳ chính' }]).map(sub => {
                      // Đếm số lượng học sinh đã nộp ở kỳ này
                      const filledCount = students.filter(s => {
                        const v = periodRecords[s.code]?.[sub.id];
                        return v !== undefined && v !== '';
                      }).length;

                      return (
                        <th
                          key={sub.id}
                          className="p-3 text-center font-bold text-slate-800 min-w-[110px] border-r border-slate-100"
                        >
                          <div className="text-slate-900 font-extrabold">{sub.label}</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {filledCount}/{students.length} đã nộp
                          </div>
                        </th>
                      );
                    })}

                    {/* Total Header */}
                    <th className="p-3 text-center font-black text-indigo-900 bg-indigo-50/80 min-w-[110px] sticky right-0 z-30 border-l border-indigo-200">
                      Tổng cộng
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={(column.subPeriods?.length || 1) + 2}
                        className="py-12 text-center text-slate-400 font-medium"
                      >
                        Không tìm thấy học sinh nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const subPeriods = column.subPeriods || [{ id: 'main', label: 'Kỳ chính' }];
                      const subPeriodValues = subPeriods.map(sp => periodRecords[student.code]?.[sp.id]);
                      const numericValues = subPeriodValues.filter(v => isNumVal(v));
                      const rowTotal = numericValues.length > 0 ? numericValues.reduce((a, v) => a + Number(v), 0) : null;

                      return (
                        <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                          {/* Sticky Left Column: Student Info */}
                          <td className="p-2.5 sticky left-0 bg-white group-hover:bg-indigo-50/40 z-10 border-r border-slate-200 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-800 flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors">
                                {idx + 1}
                              </span>
                              <div className="truncate">
                                <div className="font-bold text-slate-900 text-xs truncate">
                                  {student.fullName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {student.code}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Matrix Cells */}
                          {subPeriods.map(sub => {
                            const val = periodRecords[student.code]?.[sub.id];
                            const isFilled = val !== undefined && val !== '';
                            const isNumber = isNumVal(val);

                            return (
                              <td key={sub.id} className="p-1.5 text-center border-r border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handlePeriodCellClick(student.code, sub.id)}
                                  className={cn(
                                    "w-full h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all active:scale-95 shadow-2xs",
                                    isFilled
                                      ? isNumber
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300 font-black hover:bg-emerald-100"
                                        : "bg-indigo-50 text-indigo-800 border border-indigo-300 font-black hover:bg-indigo-100"
                                      : "bg-slate-50/80 text-slate-300 hover:bg-slate-100 hover:text-slate-500 border border-slate-200"
                                  )}
                                  title={isFilled ? `Giá trị: ${val} (Bấm để thay đổi)` : 'Chưa ghi (Bấm để nộp)'}
                                >
                                  {isFilled ? (isNumber ? formatNum(val) : val) : '-'}
                                </button>
                              </td>
                            );
                          })}

                          {/* Sticky Right Column: Total */}
                          <td className="p-1.5 text-center sticky right-0 bg-white group-hover:bg-indigo-50/40 z-10 border-l border-indigo-100 font-black transition-colors">
                            {rowTotal !== null ? (
                              <div className="w-full h-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs shadow-2xs">
                                {formatNum(rowTotal)}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer Summary Row */}
                {(() => {
                  const subPeriods = column.subPeriods || [{ id: 'main', label: 'Kỳ chính' }];
                  const colTotals = subPeriods.map(sp => {
                    const vals = students
                      .map(s => periodRecords[s.code]?.[sp.id])
                      .filter(v => isNumVal(v));
                    return vals.length > 0 ? vals.reduce((a, v) => a + Number(v), 0) : null;
                  });
                  const grandTotal = colTotals.filter(t => t !== null).reduce((a, t) => a + t!, 0);

                  return (
                    <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-300 sticky bottom-0 z-20 shadow-md">
                      <tr>
                        <td className="p-3 sticky left-0 bg-slate-100 z-30 border-r border-slate-300 text-slate-900 uppercase tracking-wide">
                          Tổng thu từng kỳ
                        </td>
                        {subPeriods.map((sp, idx) => (
                          <td key={sp.id} className="p-2.5 text-center text-emerald-800 border-r border-slate-200 text-xs">
                            {colTotals[idx] !== null ? formatNum(colTotals[idx]!) : '-'}
                          </td>
                        ))}
                        <td className="p-2.5 text-center sticky right-0 bg-indigo-100 z-30 border-l border-indigo-300 text-indigo-950 text-sm font-black">
                          {grandTotal > 0 ? `${formatNum(grandTotal)} đ` : '-'}
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          ) : (
            /* One Time Column Layout */
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-bold">
                  Danh sách hoàn thành ({stats.completedCount}/{students.length})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkOneTime(true)}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 font-bold transition-all shadow-2xs"
                  >
                    ✓ Chọn tất cả
                  </button>
                  <button
                    onClick={() => handleBulkOneTime(false)}
                    className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-200 font-bold transition-all shadow-2xs"
                  >
                    ✕ Bỏ chọn hết
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredStudents.map((student, idx) => {
                  const record = oneTimeRecords[student.code];
                  const isDone = !!record?.completed;

                  return (
                    <div
                      key={student.id}
                      onClick={() => handleOneTimeToggle(student.code)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer shadow-2xs",
                        isDone
                          ? "bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100/70"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors",
                            isDone ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {idx + 1}
                        </div>
                        <div className="truncate">
                          <div className={cn("font-bold text-xs truncate", isDone ? "text-emerald-950" : "text-slate-800")}>
                            {student.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {student.code}
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                          isDone ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" : "border-slate-300 bg-white"
                        )}
                      >
                        {isDone && <CheckCircle2 size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Modal */}
      {currentClassData && (
        <MonitorMessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          data={currentClassData}
        />
      )}
    </div>
  );
}
