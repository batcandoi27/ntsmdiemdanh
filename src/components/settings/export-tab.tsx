'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileArchive, CalendarDays, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/services/db';
import { getAllTimetables } from '@/services/timetable-service';
import { getActiveYear } from '@/services/year-service';
import {
    buildExportData,
    downloadJSON,
    downloadExcel,
    downloadZip,
    ExportData
} from '@/services/export-v3-service';
import { AttendanceRecordV3, formatDateKey } from '@/types/attendance-v3';
import { cn } from '@/lib/utils';
import { Student } from '@/types/models';

export function ExportTab() {
    const { appUser, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Gather data
    const prepareData = async (): Promise<ExportData | null> => {
        if (!appUser) return null;

        try {
            const activeYear = await getActiveYear();

            setStatusText('Đang tải danh sách lớp học...');
            const classes = await db.getClasses();

            setStatusText('Đang tải danh sách học sinh...');
            const students: Student[] = [];
            for (const cls of classes) {
                const classStudents = await db.getStudentsByClass(cls.id);
                students.push(...classStudents);
            }

            setStatusText('Đang tải thời khoá biểu...');
            const timetables = await getAllTimetables();
            console.log(`[Export] Found ${timetables.length} timetables`);

            setStatusText('Đang tổng hợp dữ liệu điểm danh...');
            const reportRecords = await db.getReportData?.(startDate, endDate);

            const attendanceMap: Record<string, AttendanceRecordV3[]> = {};

            if (reportRecords) {
                // Nhóm reportRecords theo date và classId
                const grouped: Record<string, Record<string, any>> = {};
                for (const r of reportRecords) {
                    const dateKey = r.date.replace(/-/g, '');
                    if (!grouped[dateKey]) grouped[dateKey] = {};
                    if (!grouped[dateKey][r.classId]) {
                        grouped[dateKey][r.classId] = {
                            id: dateKey,
                            date: r.date,
                            classId: r.classId,
                            absences: {},
                            updatedBy: (r as any).markedBy || 'system',
                            updatedAt: (r as any).timestamp || new Date().toISOString(),
                            syncStatus: 'synced'
                        } as any;
                    }
                    grouped[dateKey][r.classId].absences[r.studentId] = r.status as string;
                }

                for (const [dateKey, clsMap] of Object.entries(grouped)) {
                    attendanceMap[dateKey] = Object.values(clsMap);
                }
            }

            setStatusText('Đang đóng gói dữ liệu...');
            return buildExportData(
                classes,
                students,
                attendanceMap,
                timetables,
                appUser.displayName || 'Vô danh'
            );

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Có lỗi xảy ra khi tổng hợp dữ liệu.' });
            return null;
        }
    };

    const handleExport = async (format: 'json' | 'excel' | 'zip') => {
        if (!appUser) return;

        setLoading(true);
        setMessage(null);
        setStatusText('Khởi tạo quá trình xuất dữ liệu...');

        try {
            const data = await prepareData();
            if (!data) {
                setLoading(false);
                return;
            }

            setStatusText(`Đang tạo file ${format.toUpperCase()}...`);

            const fileName = `Data_AppDiemDanh_${data.meta.year}_${formatDateKey(new Date())}`;

            if (format === 'json') {
                downloadJSON(data, `${fileName}.json`);
            } else if (format === 'excel') {
                await downloadExcel(data, `${fileName}.xlsx`);
            } else if (format === 'zip') {
                await downloadZip(data, `${fileName}.zip`);
            }

            setMessage({ type: 'success', text: `Đã xuất dữ liệu định dạng ${format.toUpperCase()} thành công!` });
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: `Lỗi xuất dữ liệu: ${error.message}` });
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };

    if (authLoading) return null;

    if (appUser?.role !== 'admin' && appUser?.role !== 'principal') {
        return <div className="p-8 text-center text-gray-500">Bạn không có quyền chức năng này.</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Download className="text-blue-600" size={20} />
                    Xuất Dữ Liệu
                </h2>
                <p className="text-sm text-gray-500">Xuất báo cáo điểm danh, thông tin học sinh và TKB.</p>
            </div>

            {message && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                    message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium text-sm">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto text-xs underline opacity-70 hover:opacity-100">Đóng</button>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-2xl">
                <div className="space-y-6">
                    {/* Date Filters */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Phạm vi dữ liệu Điểm Danh</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 italic">
                            * Lưu ý: Query khoảng thời gian dài có thể mất nhiều thời gian do hệ thống lấy từng bản ghi.
                        </p>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Format Selection */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Định dạng xuất báo cáo</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Excel */}
                            <button
                                onClick={() => handleExport('excel')}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-200 transition-all font-bold text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/40 group-hover:bg-transparent transition-colors z-0" />
                                <FileSpreadsheet size={32} className="relative z-10" />
                                <span className="relative z-10 text-sm">Excel (Multi-sheet)</span>
                            </button>

                            {/* ZIP */}
                            <button
                                onClick={() => handleExport('zip')}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-200 transition-all font-bold text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/40 group-hover:bg-transparent transition-colors z-0" />
                                <FileArchive size={32} className="relative z-10" />
                                <span className="relative z-10 text-sm">ZIP Bundle</span>
                            </button>

                            {/* JSON */}
                            <button
                                onClick={() => handleExport('json')}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/40 group-hover:bg-transparent transition-colors z-0" />
                                <FileJson size={32} className="relative z-10" />
                                <span className="relative z-10 text-sm">JSON Raw</span>
                            </button>
                        </div>
                    </div>

                    {/* Progress Indication */}
                    {loading && (
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-center gap-3 mt-4">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                            <div>
                                <p className="font-bold text-sm">Đang xuất dữ liệu...</p>
                                <p className="text-xs opacity-80">{statusText}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
