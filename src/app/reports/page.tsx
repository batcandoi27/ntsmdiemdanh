'use client';

import { useState, useEffect, useMemo } from 'react';
import { getReports, getMonthlyReportData, getAdvancedReportData, ReportCriteria, ReportResult } from '@/app/actions/report';
import { getAllClasses } from '@/app/actions/common';
import { Class } from '@/types/models';
import { FileBarChart } from 'lucide-react';
import { exportMonthlyReport, exportTermReport } from '@/lib/export-utils';
import { ReportsStats } from '@/components/reports/reports-stats';
import { ReportsFilter } from '@/components/reports/reports-filter';
import { ReportsListView } from '@/components/reports/reports-list-view';
import { ReportsGridView } from '@/components/reports/reports-grid-view';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ReportResult | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);

    // View State
    const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
    const [groupBy, setGroupBy] = useState<'DATE' | 'CLASS'>('DATE');

    // Filters
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
    });
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['P', 'K', 'T', 'VP', 'KH']); // Default visible columns
    const [isFilterActive, setIsFilterActive] = useState(false); // Track if user has manually triggered report

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
        setLoading(true);
        setIsFilterActive(true);
        try {
            const targetClassIds = selectedClasses.length > 0 ? selectedClasses : classes.map(c => c.id);
            const data = await getReports(dateRange.start, dateRange.end, targetClassIds);
            setResult(data);
        } catch (error) {
            console.error(error);
            alert('Lỗi tải báo cáo: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            if (!result || result.absences.length === 0) {
                alert('Chưa có dữ liệu để xuất.');
                return;
            }
            await exportMonthlyReport(result.absences, `BaoCao_${dateRange.start}_${dateRange.end}`);
        } catch (error) {
            console.error(error);
            alert('Lỗi xuất báo cáo');
        } finally {
            setLoading(false);
        }
    };

    const handleExportAdvanced = async () => {
        setLoading(true);
        try {
            const targetClassIds = selectedClasses.length > 0 ? selectedClasses : classes.map(c => c.id);
            // Server Action
            const data = await getAdvancedReportData(dateRange.start, dateRange.end, targetClassIds);

            if (data.length === 0) {
                alert('Không có dữ liệu để xuất.');
                return;
            }

            // Export logic (Client)
            await exportTermReport(data, `BaoCaoTongHop_${dateRange.start}_${dateRange.end}`);
        } catch (error) {
            console.error('Export error:', error);
            alert('Có lỗi khi xuất báo cáo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50/50 space-y-6">
            {/* Header Title */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileBarChart className="text-blue-600" size={28} />
                    Báo Cáo Điểm Danh
                </h1>
                <p className="text-gray-500 text-sm">Thống kê chi tiết & Xuất dữ liệu</p>
            </div>

            {/* Filter Bar */}
            <ReportsFilter
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
                onGenerateReport={handleManualFetch}
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
                                groupBy={groupBy}
                                visibleColumns={visibleColumns}
                            />
                        ) : (
                            <ReportsGridView
                                dateRange={dateRange}
                                selectedClasses={selectedClasses}
                                absences={result?.absences || []}
                                classes={classes}
                                visibleColumns={visibleColumns}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Assuming 'cn' utility is imported or defined elsewhere.
// If not, you might need to add `import { cn } from '@/lib/utils';` or define `cn` locally.
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
