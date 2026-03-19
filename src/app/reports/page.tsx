'use client';

import { useState, useEffect, useMemo } from 'react';
import { getReports, getMonthlyReportData, getAdvancedReportData, getExcelExportData, addReportAttendance, ReportCriteria, ReportResult } from '@/app/actions/report';
import { getAllClasses, getClassAndStudents } from '@/app/actions/common';
import { Class, Student } from '@/types/models';
import { FileBarChart, Plus, X, Loader2, AlertTriangle } from 'lucide-react';
import { exportToExcel, exportTermReport, exportGradeReport, exportMonthlyReportV2 } from '@/lib/export-utils';
import { ReportsStats } from '@/components/reports/reports-stats';
import { ReportsFilter } from '@/components/reports/reports-filter';
import { ReportsListView } from '@/components/reports/reports-list-view';
import { ReportsGridView } from '@/components/reports/reports-grid-view';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useFeatureFlags } from '@/context/feature-flags-context';
import { useLoading } from '@/context/loading-context';

export default function ReportsPage() {
    const { showLoading, hideLoading } = useLoading();
    const { flags, loading: flagsLoading } = useFeatureFlags();
    const { appUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [result, setResult] = useState<ReportResult | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);

    // View State
    const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
    const [groupBy, setGroupBy] = useState<'DATE' | 'CLASS'>('CLASS');

    // Filters
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    });
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['P', 'K', 'T', 'VP', 'KH']); // Default visible columns
    const [isFilterActive, setIsFilterActive] = useState(false); // Track if user has manually triggered report
    const [filterMode, setFilterMode] = useState<'WEEK' | 'MONTH' | 'CUSTOM'>('WEEK');

    // Read initial selected classes from localStorage (Lớp của tôi)
    useEffect(() => {
        if (!appUser) return;
        try {
            const saved = localStorage.getItem(`myClasses_${appUser.uid}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSelectedClasses(parsed);
                }
            } else if (appUser.assignedClassIds && appUser.assignedClassIds.length > 0) {
                // Tự động load từ Firebase nếu chưa có
                setSelectedClasses(appUser.assignedClassIds);
            }
        } catch (e) {
            console.error('Lỗi đọc myClasses từ localStorage', e);
        }
    }, [appUser]);

    useEffect(() => {
        const loadClasses = async () => {
            const cls = await getAllClasses();
            setClasses(cls);
        };
        loadClasses();
    }, []);

    // ... (existing code)

    const stats = result ? {
        P: result.totalP,
        K: result.totalK,
        V: result.totalV,
        T: result.totalT,
        VP: result.totalVP,
        KH: result.totalKH || 0, // Add KH
        Total: result.absences.length // Total records (violations/absences)
    } : { P: 0, K: 0, V: 0, T: 0, VP: 0, KH: 0, Total: 0 };

    const handleManualFetch = async () => {
        if (selectedClasses.length === 0) {
            alert('Vui lòng chọn ít nhất một lớp để xem báo cáo.');
            return;
        }

        // Cảnh báo hạn ngạch cho Giáo viên
        if ((appUser?.role === 'teacher' || appUser?.role === 'gvbm') && selectedClasses.length > 10) {
            alert(`Bạn đã chọn ${selectedClasses.length} lớp. Giáo viên chỉ được phép báo cáo tối đa 10 lớp mỗi lần để đảm bảo hiệu năng.`);
            return;
        }

        setLoading(true);
        showLoading('Đang tải dữ liệu báo cáo...');
        setIsFilterActive(true);
        try {
            const targetClassIds = selectedClasses;
            const data = await getReports(
                { startDate: dateRange.start, endDate: dateRange.end, classIds: targetClassIds },
                appUser?.role
            );
            setResult(data);
        } catch (error) {
            console.error(error);
            alert('Lỗi tải báo cáo: ' + (error as Error).message);
        } finally {
            setLoading(false);
            hideLoading();
        }
    };

    const handleExport = async (isCompact: boolean = false) => {
        if (selectedClasses.length === 0) {
            alert('Vui lòng chọn ít nhất một lớp để xuất báo cáo.');
            return;
        }
        if (exportLoading) return;
        setExportLoading(true);
        showLoading('Đang chuẩn bị dữ liệu Excel...');
        try {
            const targetClassIds = selectedClasses;
            const data = await getExcelExportData(dateRange.start, dateRange.end, targetClassIds, isCompact, appUser?.role);
            if (!data || data.length === 0) {
                alert('Chưa có dữ liệu để xuất.');
                return;
            }
            const ts = format(new Date(), 'HHmmss');
            await exportGradeReport(data, `BaoCao_Khoi_${ts}`, visibleColumns);
        } catch (error) {
            console.error("[handleExport] Lỗi:", error);
            alert('Lỗi xuất báo cáo: ' + (error as Error).message);
        } finally {
            setExportLoading(false);
            hideLoading();
        }
    };

    const handleExportAdvanced = async () => {
        if (selectedClasses.length === 0) {
            alert('Vui lòng chọn ít nhất một lớp để xuất báo cáo.');
            return;
        }
        if (exportLoading) return;
        setExportLoading(true);
        showLoading('Đang xử lý báo cáo tổng hợp (vui lòng chờ)...');
        try {
            const targetClassIds = selectedClasses;
            const data = await getAdvancedReportData(dateRange.start, dateRange.end, targetClassIds, appUser?.uid, appUser?.role);
            if (data.length === 0) {
                alert('Không có dữ liệu để xuất.');
                return;
            }
            const ts = format(new Date(), 'HHmmss');
            await exportTermReport(data, `BaoCaoTongHop_${ts}`, visibleColumns);
        } catch (error) {
            console.error('[handleExportAdvanced] Lỗi:', error);
            alert('Có lỗi khi xuất báo cáo: ' + (error as Error).message);
        } finally {
            setExportLoading(false);
            hideLoading();
        }
    };

    const handleExportGrid = async () => {
        if (selectedClasses.length === 0) {
            alert('Vui lòng chọn ít nhất một lớp để xuất báo cáo.');
            return;
        }
        if (exportLoading) return;
        setExportLoading(true);
        try {
            const targetClassIds = selectedClasses;
            const data = await getExcelExportData(dateRange.start, dateRange.end, targetClassIds, false, appUser?.role);
            if (!data || data.length === 0) {
                alert('Chưa có dữ liệu để xuất.');
                return;
            }
            const rangeStr = dateRange.start === dateRange.end 
                ? format(new Date(dateRange.start), 'dd-MM-yyyy')
                : `${format(new Date(dateRange.start), 'dd-MM-yyyy')}_den_${format(new Date(dateRange.end), 'dd-MM-yyyy')}`;
            await exportGradeReport(data, `BaoCao_DiemDanh_TheoKhoi_${rangeStr}`, visibleColumns);
        } catch (error) {
            console.error("[handleExportGrid] Lỗi:", error);
            alert('Lỗi xuất báo cáo: ' + (error as Error).message);
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportV2 = async () => {
        if (selectedClasses.length === 0) {
            alert('Vui lòng chọn ít nhất một lớp để xuất báo cáo.');
            return;
        }
        if (exportLoading) return;
        setExportLoading(true);
        showLoading('Đang chuẩn bị Báo cáo V2 (Tách cột Sáng/Chiều)...');
        try {
            const data = await getExcelExportData(dateRange.start, dateRange.end, selectedClasses, false, appUser?.role);
            if (!data || data.length === 0) {
                alert('Chưa có dữ liệu để xuất.');
                return;
            }
            const rangeStr = dateRange.start === dateRange.end 
                ? format(new Date(dateRange.start), 'dd-MM-yyyy')
                : `${format(new Date(dateRange.start), 'dd-MM-yyyy')}_den_${format(new Date(dateRange.end), 'dd-MM-yyyy')}`;
            await exportMonthlyReportV2(data, `BaoCao_V2_S-C_${rangeStr}`, visibleColumns);
        } catch (error) {
            console.error("[handleExportV2] Lỗi:", error);
            alert('Lỗi xuất báo cáo V2: ' + (error as Error).message);
        } finally {
            setExportLoading(false);
            hideLoading();
        }
    };

    if (flagsLoading) {
        return <div className="p-8 text-center text-gray-500 flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin mr-2" /> Đang tải...</div>;
    }

    if (!flags.reports) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-amber-50/50">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tính năng đang được phát triển</h2>
                <p className="text-gray-500 max-w-md">Chức năng Báo Cáo hiện đang được cập nhật hoặc tạm thời vô hiệu hóa bởi Quản trị viên. Vui lòng thử lại sau.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-6 px-4 pb-20">
            <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
                {/* Header section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FileBarChart className="text-blue-600 w-6 h-6" />
                            </div>
                            Báo Cáo Điểm Danh
                        </h1>
                        <p className="text-gray-500 text-sm">Thống kê chi tiết & Xuất dữ liệu</p>
                    </div>
                </div>

                {/* Filter Bar */}
                <ReportsFilter
                    appUser={appUser}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    selectedClasses={selectedClasses}
                    setSelectedClasses={setSelectedClasses}
                    classes={classes}
                    visibleColumns={visibleColumns}
                    setVisibleColumns={setVisibleColumns}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    groupBy={groupBy}
                    setGroupBy={setGroupBy}
                    onExport={handleExport}
                    onExportAdvanced={handleExportAdvanced}
                    onExportGrid={handleExportGrid}
                    onExportV2={handleExportV2}
                    onGenerateReport={handleManualFetch}
                    isLoading={loading}
                    isExporting={exportLoading}
                />

                {/* Stats Cards */}
                <ReportsStats stats={stats} loading={loading} />

                {/* Main Content Area */}
                <div className="min-h-[400px]">
                    {loading && !result ? (
                        <div className="flex justify-center p-12 text-gray-400">Đang tải dữ liệu...</div>
                    ) : (
                        <>
                            {viewMode === 'LIST' ? (
                                <ReportsListView
                                    data={result?.absences || []}
                                    classSizes={result?.classSizes || {}}
                                    groupBy={groupBy}
                                    visibleColumns={visibleColumns}
                                    onRefresh={handleManualFetch}
                                />
                            ) : (
                                <ReportsGridView
                                    dateRange={dateRange}
                                    selectedClasses={selectedClasses}
                                    absences={result?.absences || []}
                                    classSizes={result?.classSizes || {}}
                                    classes={classes}
                                    visibleColumns={visibleColumns}
                                    onRefresh={handleManualFetch}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Add Attendance Modal Component
function AddAttendanceModal({ classes, onClose, onRefresh }: { classes: Class[], onClose: () => void, onRefresh: () => void }) {
    const { appUser } = useAuth();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentCode, setSelectedStudentCode] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [status, setStatus] = useState('P');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedClassId) {
            setStudents([]);
            setSelectedStudentCode('');
            return;
        }
        getClassAndStudents(selectedClassId).then(res => {
            setStudents(res.students.sort((a, b) => a.fullName.localeCompare(b.fullName)));
            setSelectedStudentCode(res.students.length > 0 ? res.students[0].code : '');
        });
    }, [selectedClassId]);

    const handleSave = async () => {
        if (!selectedClassId || !selectedStudentCode || !date || !status) {
            alert("Vui lòng nhập đủ thông tin.");
            return;
        }
        setLoading(true);
        try {
            const stu = students.find(s => s.code === selectedStudentCode);
            const res = await addReportAttendance(appUser, selectedClassId, selectedStudentCode, stu?.fullName || '', date, status as any);
            if (!res.success) {
                alert(res.message);
            } else {
                onRefresh();
                onClose();
            }
        } catch (error: any) {
            alert(error.message || "Lỗi lưu dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Thêm Bù Vi Phạm</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition text-gray-500">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Chọn Lớp</label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-blue-700 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none hover:bg-blue-50 transition-colors"
                        >
                            <option value="">-- Chọn 1 lớp --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Ngày Điểm Danh</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Học Sinh</label>
                        <select
                            value={selectedStudentCode}
                            onChange={(e) => setSelectedStudentCode(e.target.value)}
                            disabled={!selectedClassId || students.length === 0}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-blue-700 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:hover:bg-white"
                        >
                            <option value="">{selectedClassId ? "-- Chọn học sinh --" : "-- Chọn lớp trước --"}</option>
                            {students.map((s, idx) => <option key={s.id} value={s.code}>{idx + 1}. {s.fullName}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Trạng Thái (Vi phạm)</label>
                        <div className="grid grid-cols-5 gap-2">
                            {['P', 'K', 'T', 'VP', 'KH'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatus(st)}
                                    className={cn(
                                        "p-2 rounded-lg text-sm font-black border transition-all text-center",
                                        status === st ? "shadow-md ring-2 ring-offset-1 ring-blue-500" : "opacity-70 border-gray-300 hover:bg-gray-50",
                                        st === 'P' ? "bg-yellow-100 text-yellow-800" :
                                            st === 'K' ? "bg-red-100 text-red-800" :
                                                st === 'T' ? "bg-blue-100 text-blue-800" :
                                                    st === 'VP' ? "bg-purple-100 text-purple-800" :
                                                        "bg-orange-100 text-orange-800"
                                    )}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                        Trở lại
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />} Xong
                    </button>
                </div>
            </div>
        </div>
    );
}

// Assuming 'cn' utility is imported or defined elsewhere.
// If not, you might need to add `import {cn} from '@/lib/utils';` or define `cn` locally.
function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
    const mapColor = {
        yellow: "text-yellow-600 bg-yellow-50 border-yellow-100",
        red: "text-red-600 bg-red-50 border-red-100",
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
    };

    return (
        <div className={cn("p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-1", mapColor[color as keyof typeof mapColor])}>
            <p className="text-[10px] font-bold uppercase opacity-70 tracking-wider">{label}</p>
            <p className="text-3xl font-black">{value}</p>
        </div>
    );
}
