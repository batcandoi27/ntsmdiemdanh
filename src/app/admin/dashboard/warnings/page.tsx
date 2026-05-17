"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, UserX, UserMinus, Bell, Eye, TrendingUp, Trophy, AlertOctagon, Calendar, BarChart2, FileSpreadsheet, Loader2 } from 'lucide-react';
import { GlobalDataFilter } from '@/components/dashboard/GlobalDataFilter';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AnalyticsAndWarningsPage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'warnings' | 'trends'>('warnings');
    const [warningMetric, setWarningMetric] = useState<'absent' | 'late' | 'violation'>('absent');
    
    // Shared Date Filters
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
    });
    const [filterMode, setFilterMode] = useState<'WEEK' | 'MONTH' | 'CUSTOM'>('MONTH');
    const [selectedGrade, setSelectedGrade] = useState<string>('');

    // State for Warnings Tab (Học sinh nguy cơ cao)
    const [riskStudents, setRiskStudents] = useState<any[]>([]);

    // State for Trends Tab (Thi đua lớp & Bản đồ nhiệt)
    const [classMetrics, setClassMetrics] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, { k: number, t: number }>>({});

    // Fetch data whenever date range or grade changes
    useEffect(() => {
        fetchAllData();
    }, [dateRange, selectedGrade]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 1. FETCH RISK STUDENTS (Cảnh báo sớm học sinh)
            const { data: riskData, error: riskError } = await supabase.rpc('get_student_risk_scores', {
                target_class_id: null,
                p_start_date: dateRange.start,
                p_end_date: dateRange.end
            });

            if (!riskError && riskData && riskData.length > 0) {
                const studentIds = riskData.map((r: any) => r.student_id);
                
                // Fetch student and class mappings using our highly optimized JOIN query
                const { data: studentMappings } = await supabase
                    .from('student_classes')
                    .select(`
                        student_id,
                        class_id,
                        students (
                            full_name
                        ),
                        classes (
                            name
                        )
                    `)
                    .in('student_id', studentIds);

                const mappedData = riskData.map((r: any) => {
                    const mapping = studentMappings?.find(m => m.student_id === r.student_id);
                    const studentName = (mapping?.students as any)?.full_name || 'Không rõ tên';
                    const className = (mapping?.classes as any)?.name || 'N/A';
                    return {
                        ...r,
                        name: studentName,
                        class: className
                    };
                });

                // Apply selected grade filter locally in memory
                let filteredRiskData = mappedData;
                if (selectedGrade) {
                    filteredRiskData = mappedData.filter((r: any) => r.class.startsWith(selectedGrade));
                }
                setRiskStudents(filteredRiskData);
            } else {
                setRiskStudents([]);
            }

            // 2. FETCH CLASS METRICS (Thi đua & Xu hướng)
            const { data: metricsData, error: metricsError } = await supabase.rpc('get_class_metrics', {
                p_start_date: dateRange.start,
                p_end_date: dateRange.end
            });

            // Fetch metrics for PREVIOUS period to compute delta changes
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const lastStart = format(subDays(start, diffDays + 1), 'yyyy-MM-dd');
            const lastEnd = format(subDays(start, 1), 'yyyy-MM-dd');

            const { data: lastMetricsData } = await supabase.rpc('get_class_metrics', {
                p_start_date: lastStart,
                p_end_date: lastEnd
            });

            if (!metricsError && metricsData && metricsData.length > 0) {
                const { data: classes } = await supabase.from('classes').select('id, name');

                // Current ranks
                const currentSorted = [...metricsData].sort((a,b) => (a.total_absent_k + a.total_late + a.total_violation) - (b.total_absent_k + b.total_late + b.total_violation));
                const currentRankMap = new Map();
                currentSorted.forEach((item, idx) => currentRankMap.set(item.class_id, idx));

                // Previous ranks
                const lastSorted = lastMetricsData ? [...lastMetricsData].sort((a,b) => (a.total_absent_k + a.total_late + a.total_violation) - (b.total_absent_k + b.total_late + b.total_violation)) : [];
                const lastRankMap = new Map();
                lastSorted.forEach((item, idx) => lastRankMap.set(item.class_id, idx));

                const mappedMetrics = metricsData.map(m => {
                    const cls = classes?.find(c => c.id === m.class_id);
                    const currentRank = currentRankMap.get(m.class_id) || 0;
                    const lastRank = lastRankMap.has(m.class_id) ? lastRankMap.get(m.class_id) : currentRank;
                    const rankDiff = lastRank - currentRank; // positive means they went UP in ranking (better)
                    
                    const lastM = lastMetricsData?.find(l => l.class_id === m.class_id);
                    const lastTotalBad = lastM ? (lastM.total_absent_k + lastM.total_late + lastM.total_violation) : 0;
                    const currentTotalBad = m.total_absent_k + m.total_late + m.total_violation;
                    
                    let percentChange = 0;
                    if (lastTotalBad > 0) {
                        percentChange = Math.round(((currentTotalBad - lastTotalBad) / lastTotalBad) * 100);
                    }

                    return {
                        ...m,
                        class_name: cls?.name || m.class_id,
                        rankDiff,
                        percentChange
                    };
                });

                // Apply selected grade filter for class metrics locally
                let filteredMetrics = mappedMetrics;
                if (selectedGrade) {
                    filteredMetrics = mappedMetrics.filter(m => m.class_name.startsWith(selectedGrade));
                }
                setClassMetrics(filteredMetrics);
            } else {
                setClassMetrics([]);
            }

            // 3. FETCH DAILY SUMMARY FOR HEATMAP
            const { data: dailyData, error: dailyError } = await supabase
                .from('view_attendance_daily_summary')
                .select('date, absent_k_count, late_count')
                .gte('date', dateRange.start)
                .lte('date', dateRange.end);

            if (!dailyError && dailyData) {
                const dayMap: Record<string, { k: number, t: number }> = { 
                    'T2': {k: 0, t: 0}, 'T3': {k: 0, t: 0}, 'T4': {k: 0, t: 0}, 
                    'T5': {k: 0, t: 0}, 'T6': {k: 0, t: 0}, 'T7': {k: 0, t: 0} 
                };
                
                dailyData.forEach(row => {
                    const d = new Date(row.date);
                    const day = d.getDay(); // 0 = Sunday, 1 = Monday
                    if (day >= 1 && day <= 6) {
                        const dayLabel = `T${day + 1}`; // T2 to T7
                        dayMap[dayLabel].k += (row.absent_k_count || 0);
                        dayMap[dayLabel].t += (row.late_count || 0);
                    }
                });
                setHeatmapData(dayMap);
            }
        } catch (e) {
            console.error("Lỗi khi tải toàn bộ dữ liệu phân tích:", e);
        } finally {
            setLoading(false);
        }
    };

    // Computations for Warnings Tab
    const classAbsenceMap: Record<string, number> = {};
    let totalAbsences = 0;
    let totalLates = 0;
    let totalViolations = 0;

    riskStudents.forEach(s => {
        totalAbsences += s.absent_k_count || 0;
        totalLates += s.late_count || 0;
        totalViolations += s.violation_count || 0;
        
        if (s.class && s.class !== 'N/A') {
            let increment = 0;
            if (warningMetric === 'absent') increment = s.absent_k_count || 0;
            else if (warningMetric === 'late') increment = s.late_count || 0;
            else if (warningMetric === 'violation') increment = s.violation_count || 0;

            classAbsenceMap[s.class] = (classAbsenceMap[s.class] || 0) + increment;
        }
    });

    const topClasses = Object.entries(classAbsenceMap)
        .map(([className, count]) => ({ className, count }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const top10Students = [...riskStudents]
        .filter(s => {
            if (warningMetric === 'absent') return (s.absent_k_count || 0) > 0;
            if (warningMetric === 'late') return (s.late_count || 0) > 0;
            if (warningMetric === 'violation') return (s.violation_count || 0) > 0;
            return true;
        })
        .sort((a, b) => {
            if (warningMetric === 'absent') return (b.absent_k_count || 0) - (a.absent_k_count || 0);
            if (warningMetric === 'late') return (b.late_count || 0) - (a.late_count || 0);
            if (warningMetric === 'violation') return (b.violation_count || 0) - (a.violation_count || 0);
            return 0;
        })
        .slice(0, 10);

    // Computations for Trends Tab
    const sortedByGood = [...classMetrics].sort((a, b) => 
        (a.total_absent_k + a.total_late + a.total_violation) - (b.total_absent_k + b.total_late + b.total_violation)
    );
    const topGoodClasses = sortedByGood.slice(0, 3);
    
    const sortedByBad = [...classMetrics].sort((a, b) => 
        (b.total_absent_k + b.total_late + b.total_violation) - (a.total_absent_k + a.total_late + a.total_violation)
    );
    const topBadClasses = sortedByBad.slice(0, 3);

    const [exportLoading, setExportLoading] = useState(false);

    const handleExportWarnings = async () => {
        if (top10Students.length === 0) {
            alert('Chưa có học sinh nguy cơ cao để xuất.');
            return;
        }
        
        setExportLoading(true);
        try {
            // Dynamic import ExcelJS to prevent potential SSR issues
            const ExcelJS = (await import('exceljs')).default || await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Cảnh Báo Sớm');
            
            // Set margins and default view configuration
            sheet.views = [{ state: 'frozen', ySplit: 4 }];
            
            // Header Title
            sheet.mergeCells('A1:G1');
            const title1 = sheet.getCell('A1');
            title1.value = "TRƯỜNG THCS TRẦN BỘI CƠ";
            title1.font = { bold: true, size: 12, name: 'Times New Roman' };
            title1.alignment = { horizontal: 'left' };
            
            sheet.mergeCells('A2:G2');
            const title2 = sheet.getCell('A2');
            title2.value = "DANH SÁCH HỌC SINH CÓ NGUY CƠ GIẢM SÚT CHUYÊN CẦN CAO";
            title2.font = { bold: true, size: 16, name: 'Times New Roman', color: { argb: 'FF991B1B' } };
            title2.alignment = { horizontal: 'center' };
            
            sheet.mergeCells('A3:G3');
            const title3 = sheet.getCell('A3');
            title3.value = `Khoảng thời gian: từ ${format(new Date(dateRange.start), 'dd/MM/yyyy')} đến ${format(new Date(dateRange.end), 'dd/MM/yyyy')}`;
            title3.font = { italic: true, size: 11, name: 'Times New Roman' };
            title3.alignment = { horizontal: 'center' };
            
            // Columns
            sheet.getRow(4).values = ['STT', 'Học sinh', 'Lớp', 'Số buổi vắng', 'Đi trễ', 'Vi phạm', 'Điểm rủi ro'];
            sheet.getRow(4).font = { bold: true, name: 'Times New Roman', size: 11 };
            
            // Style Header Row
            const BORDER_STYLE = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
            
            sheet.getRow(4).eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFEE2E2' } // Light red header
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = BORDER_STYLE as any;
            });
            
            top10Students.forEach((student, index) => {
                const row = sheet.addRow([
                    index + 1,
                    student.name,
                    student.class,
                    student.absent_k_count || 0,
                    student.late_count || 0,
                    student.violation_count || 0,
                    student.risk_score || 0
                ]);
                
                row.font = { name: 'Times New Roman', size: 11 };
                row.eachCell((cell, colNumber) => {
                    cell.border = BORDER_STYLE as any;
                    if (colNumber === 1 || colNumber === 3) {
                        cell.alignment = { horizontal: 'center' };
                    } else if (colNumber > 3) {
                        cell.alignment = { horizontal: 'right' };
                    }
                    
                    // Highlight risk score in bold red
                    if (colNumber === 7) {
                        cell.font = { bold: true, color: { argb: 'FFB91C1C' }, name: 'Times New Roman', size: 11 };
                    }
                });
            });
            
            // Set widths
            sheet.columns.forEach((col, idx) => {
                if (idx === 0) col.width = 6;
                else if (idx === 1) col.width = 25;
                else if (idx === 2) col.width = 10;
                else col.width = 12;
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `DanhSach_CanhBaoSom_${dateRange.start}_den_${dateRange.end}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Lỗi xuất Excel Cảnh báo:", e);
            alert("Lỗi khi xuất danh sách cảnh báo: " + (e as Error).message);
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
                    <BarChart2 className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Phân tích & Cảnh báo</h2>
                    <p className="text-slate-500 text-sm">Trung tâm giám sát chuyên cần, thi đua lớp học và cảnh báo sớm học sinh.</p>
                    <p className="text-[11px] text-blue-600 font-bold mt-1">📅 Đang xem: {dateRange.start} → {dateRange.end}</p>
                </div>
            </div>

            {/* Shared Global Filter */}
            <GlobalDataFilter 
                dateRange={dateRange}
                setDateRange={setDateRange}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                gradeOptions={[
                    { value: '6', label: 'Khối 6' },
                    { value: '7', label: 'Khối 7' },
                    { value: '8', label: 'Khối 8' },
                    { value: '9', label: 'Khối 9' },
                ]}
                selectedGrade={selectedGrade}
                setSelectedGrade={setSelectedGrade}
            />

            {/* Unified Glassmorphism Inner Tab Switcher */}
            <div className="flex p-1 bg-slate-100/80 backdrop-blur-md rounded-xl max-w-md border border-slate-200/50">
                <button
                    onClick={() => setActiveTab('warnings')}
                    className={cn(
                        "flex-1 flex items-center justify-center space-x-2 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300",
                        activeTab === 'warnings'
                            ? "bg-white text-rose-600 shadow-sm border border-rose-100"
                            : "text-slate-600 hover:text-slate-800"
                    )}
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span>🚨 Cảnh Báo Học Sinh</span>
                </button>
                <button
                    onClick={() => setActiveTab('trends')}
                    className={cn(
                        "flex-1 flex items-center justify-center space-x-2 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300",
                        activeTab === 'trends'
                            ? "bg-white text-blue-600 shadow-sm border border-blue-100"
                            : "text-slate-600 hover:text-slate-800"
                    )}
                >
                    <Trophy className="w-4 h-4" />
                    <span>🏆 Phân Tích & Thi Đua</span>
                </button>
            </div>

            {/* TAB CONTENT: WARNINGS */}
            {activeTab === 'warnings' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    {/* Metric Toggler */}
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-inner">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-2">Xếp Hạng Theo:</span>
                        <button
                            onClick={() => setWarningMetric('absent')}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5",
                                warningMetric === 'absent'
                                    ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100/80"
                            )}
                        >
                            <span>🚨 Vắng Học</span>
                        </button>
                        <button
                            onClick={() => setWarningMetric('late')}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5",
                                warningMetric === 'late'
                                    ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100/80"
                            )}
                        >
                            <span>⚡ Đi Trễ</span>
                        </button>
                        <button
                            onClick={() => setWarningMetric('violation')}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5",
                                warningMetric === 'violation'
                                    ? "bg-purple-500 text-white shadow-md shadow-purple-200"
                                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100/80"
                            )}
                        >
                            <span>⚠️ Vi Phạm Khác</span>
                        </button>
                    </div>

                    {/* Thống kê Tổng quan nhanh & Top 5 Lớp nghỉ nhiều */}
                    {!loading && riskStudents.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Top 5 Lớp Nghỉ Học Nhiều Nhất */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className={cn("w-2.5 h-2.5 rounded-full animate-ping", 
                                        warningMetric === 'absent' ? "bg-rose-500" : 
                                        warningMetric === 'late' ? "bg-amber-500" : "bg-purple-500"
                                    )}></span>
                                    {warningMetric === 'absent' && "🔥 Top 5 Lớp vắng học nhiều nhất"}
                                    {warningMetric === 'late' && "⚡ Top 5 Lớp đi trễ nhiều nhất"}
                                    {warningMetric === 'violation' && "⚠️ Top 5 Lớp vi phạm nhiều nhất"}
                                </h3>
                                <div className="space-y-4">
                                    {topClasses.map((c, i) => {
                                        const maxVal = topClasses[0]?.count || 1;
                                        const pct = Math.round((c.count / maxVal) * 100);
                                        return (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between text-xs font-semibold text-slate-700">
                                                    <span>Hạng {i + 1}: Lớp {c.className}</span>
                                                    <span className={cn("font-bold", 
                                                        warningMetric === 'absent' ? "text-rose-600" : 
                                                        warningMetric === 'late' ? "text-amber-600" : "text-purple-600"
                                                    )}>
                                                        {c.count} {
                                                            warningMetric === 'absent' ? "lượt vắng" : 
                                                            warningMetric === 'late' ? "lượt đi trễ" : "lượt vi phạm"
                                                        }
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn("h-full rounded-full transition-all duration-1000", 
                                                            warningMetric === 'absent' ? "bg-rose-500" : 
                                                            warningMetric === 'late' ? "bg-amber-500" : "bg-purple-500"
                                                        )}
                                                        style={{ width: `${pct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {topClasses.length === 0 && (
                                        <div className="text-center py-6 text-slate-400 text-sm">
                                            Không có dữ liệu {
                                                warningMetric === 'absent' ? "vắng học" : 
                                                warningMetric === 'late' ? "đi trễ" : "vi phạm"
                                            }.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tổng quan Vi Phạm Toàn Trường trong kỳ */}
                            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base font-bold mb-4 text-slate-200">📊 Tổng quan dữ liệu cảnh báo</h3>
                                    <div className="space-y-3.5">
                                        <div className={cn("flex justify-between items-center p-2.5 rounded-lg border transition-all duration-350", 
                                            warningMetric === 'absent' 
                                                ? "bg-rose-950/40 border-rose-800/50 shadow-inner" 
                                                : "bg-slate-800/50 border-slate-700/30"
                                        )}>
                                            <span className="text-slate-400 text-xs font-medium">Tổng số lượt vắng:</span>
                                            <span className="text-lg font-black text-rose-400">{totalAbsences}</span>
                                        </div>
                                        <div className={cn("flex justify-between items-center p-2.5 rounded-lg border transition-all duration-350", 
                                            warningMetric === 'late' 
                                                ? "bg-amber-950/40 border-amber-800/50 shadow-inner" 
                                                : "bg-slate-800/50 border-slate-700/30"
                                        )}>
                                            <span className="text-slate-400 text-xs font-medium">Tổng số lượt đi trễ:</span>
                                            <span className="text-lg font-black text-amber-400">{totalLates}</span>
                                        </div>
                                        <div className={cn("flex justify-between items-center p-2.5 rounded-lg border transition-all duration-350", 
                                            warningMetric === 'violation' 
                                                ? "bg-purple-950/40 border-purple-800/50 shadow-inner" 
                                                : "bg-slate-800/50 border-slate-700/30"
                                        )}>
                                            <span className="text-slate-400 text-xs font-medium">Tổng số vi phạm khác:</span>
                                            <span className="text-lg font-black text-purple-400">{totalViolations}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-4 italic text-right">
                                    * Dữ liệu tự động cập nhật
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table: Cảnh báo học sinh có nguy cơ phân theo Khối */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <span>🚩</span> Bảng Phân Tích Cảnh Báo Nguy Cơ Học Sinh Theo Khối Lớp
                                </h3>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    Danh sách phân nhóm học sinh có điểm rủi ro chuyên cần tích lũy cao theo từng khối lớp để GVCN và BGH dễ dàng quản lý.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleExportWarnings}
                                    disabled={exportLoading}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
                                >
                                    {exportLoading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                    )}
                                    <span>{exportLoading ? 'Đang xuất...' : 'Xuất Excel Cảnh Báo'}</span>
                                </button>
                                <span className={cn("px-3 py-1 text-[11px] font-bold rounded-full border bg-rose-50 text-rose-700 border-rose-100")}>
                                    Tổng: {riskStudents.length} học sinh nguy cơ
                                </span>
                            </div>
                        </div>

                        <div className="p-6 space-y-8">
                            {(() => {
                                const gradesList = ['6', '7', '8', '9'];
                                let schoolTotalWarnStudents = 0;
                                let schoolTotalS3V = 0;
                                let schoolTotalS3T = 0;
                                let schoolTotalS3Vp = 0;

                                return (
                                    <div className="space-y-6">
                                        {gradesList.map((gNum, gIdx) => {
                                            const gradeStudents = riskStudents
                                                .filter(s => s.class && s.class.startsWith(gNum))
                                                .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

                                            let gradeS3V = 0;
                                            let gradeS3T = 0;
                                            let gradeS3Vp = 0;

                                            gradeStudents.forEach(s => {
                                                gradeS3V += s.absent_k_count || 0;
                                                gradeS3T += s.late_count || 0;
                                                gradeS3Vp += s.violation_count || 0;
                                            });

                                            schoolTotalWarnStudents += gradeStudents.length;
                                            schoolTotalS3V += gradeS3V;
                                            schoolTotalS3T += gradeS3T;
                                            schoolTotalS3Vp += gradeS3Vp;

                                            return (
                                                <div key={gIdx} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                        <span className="font-extrabold text-slate-800 text-xs tracking-wider">HỌC SINH CẢNH BÁO - KHỐI {gNum}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                                            {gradeStudents.length} học sinh
                                                        </span>
                                                    </div>

                                                    {gradeStudents.length === 0 ? (
                                                        <div className="p-6 text-center text-slate-400 text-xs italic bg-white">
                                                            🍀 Khối {gNum} an toàn tuyệt đối. Không có học sinh nào nằm trong danh sách rủi ro chuyên cần!
                                                        </div>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse bg-white text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                                                                        <th className="p-3 pl-5 w-16">STT</th>
                                                                        <th className="p-3">Họ và Tên</th>
                                                                        <th className="p-3 text-center w-20">Lớp</th>
                                                                        <th className="p-3 text-center w-24">Số Buổi Vắng</th>
                                                                        <th className="p-3 text-center w-24">Số Lần Trễ</th>
                                                                        <th className="p-3 text-center w-24">Vi Phạm Khác</th>
                                                                        <th className="p-3 text-center w-28">Điểm Rủi Ro</th>
                                                                        <th className="p-3 pl-4">Phân Loại Nguy Cơ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                                    {gradeStudents.map((student, idx) => {
                                                                        const score = student.risk_score || 0;
                                                                        const level = score >= 8 ? 'Nguy cơ cực cao 🚨' : (score >= 5 ? 'Cảnh báo đỏ ⚠️' : 'Cần theo dõi 🔍');
                                                                        return (
                                                                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                                                <td className="p-3 pl-5 text-slate-400">{idx + 1}</td>
                                                                                <td className="p-3 text-slate-900 font-extrabold">{student.name}</td>
                                                                                <td className="p-3 text-center font-bold text-blue-700">{student.class}</td>
                                                                                <td className="p-3 text-center text-rose-600 font-bold">{student.absent_k_count || 0}</td>
                                                                                <td className="p-3 text-center text-amber-600">{student.late_count || 0}</td>
                                                                                <td className="p-3 text-center text-purple-600">{student.violation_count || 0}</td>
                                                                                <td className="p-3 text-center text-rose-700 font-black text-sm">{score} / 10</td>
                                                                                <td className="p-3 pl-4">
                                                                                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                                                                        score >= 8 
                                                                                            ? 'text-rose-700 bg-rose-50 border border-rose-100'
                                                                                            : score >= 5 
                                                                                                ? 'text-amber-700 bg-amber-50 border border-amber-100'
                                                                                                : 'text-blue-700 bg-blue-50 border border-blue-100'
                                                                                    }`}>
                                                                                        {level}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                    <tr className="bg-slate-50/60 font-black text-slate-800 border-t border-slate-200">
                                                                        <td className="p-3 pl-5" colSpan={3}>TỔNG CỘNG KHỐI {gNum}</td>
                                                                        <td className="p-3 text-center text-rose-700">{gradeS3V}</td>
                                                                        <td className="p-3 text-center text-amber-700">{gradeS3T}</td>
                                                                        <td className="p-3 text-center text-purple-700">{gradeS3Vp}</td>
                                                                        <td className="p-3 text-center text-rose-800" colSpan={2}>
                                                                            {gradeStudents.length} học sinh cảnh báo
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Tổng hợp chung toàn trường */}
                                        <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-xl p-5 shadow-sm">
                                            <h5 className="font-extrabold text-rose-950 text-sm mb-3">🏢 IV. TỔNG HỢP CHUNG TOÀN TRƯỜNG</h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                                                <div className="bg-white p-3 rounded-lg border border-rose-100/50">
                                                    <span className="block text-[10px] text-rose-700 font-bold uppercase tracking-wider">Học Sinh Cảnh Báo</span>
                                                    <span className="block text-xl font-black text-rose-600 mt-1">{schoolTotalWarnStudents}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-rose-100/50">
                                                    <span className="block text-[10px] text-rose-700 font-bold uppercase tracking-wider">Tổng Lượt Vắng</span>
                                                    <span className="block text-xl font-black text-rose-600 mt-1">{schoolTotalS3V}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-rose-100/50">
                                                    <span className="block text-[10px] text-rose-700 font-bold uppercase tracking-wider">Tổng Lượt Trễ</span>
                                                    <span className="block text-xl font-black text-amber-600 mt-1">{schoolTotalS3T}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-rose-100/50">
                                                    <span className="block text-[10px] text-rose-700 font-bold uppercase tracking-wider">Tổng Lượt Vi Phạm</span>
                                                    <span className="block text-xl font-black text-purple-600 mt-1">{schoolTotalS3Vp}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-rose-100/50 col-span-2 sm:col-span-1 flex flex-col justify-center">
                                                    <span className="block text-[10px] text-rose-700 font-bold uppercase tracking-wider">Đánh Giá Chung</span>
                                                    <span className={`block text-xs font-black mt-1 ${
                                                        schoolTotalWarnStudents === 0 ? 'text-emerald-700' : schoolTotalWarnStudents <= 5 ? 'text-amber-700' : 'text-rose-700'
                                                    }`}>
                                                        {schoolTotalWarnStudents === 0 ? 'AN TOÀN TUYỆT ĐỐI ✅' : schoolTotalWarnStudents <= 5 ? 'MỨC ĐỘ NHẸ 👍' : 'CẦN CAN THIỆP NGAY 🚨'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: TRENDS & EMULATION */}
            {activeTab === 'trends' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    {/* Bảng Thống Kê Thi Đua Nề Nếp Lớp Học Theo Khối */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <span>🚩</span> Bảng Thống Kê Thi Đua Nề Nếp Lớp Học Theo Khối
                                </h3>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    Danh sách chỉ hiển thị các lớp học phát sinh sự cố nề nếp (vắng học, đi trễ, vi phạm). Các lớp giữ vững nề nếp xuất sắc (chỉ số = 0) không hiển thị tại đây.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-8">
                            {(() => {
                                const allClassStats = classMetrics.map(c => {
                                    return {
                                        name: c.class_name,
                                        grade: c.class_name.match(/[6789]/)?.[0] || '',
                                        k: c.total_absent_k || 0,
                                        t: c.total_late || 0,
                                        vp: c.total_violation || 0,
                                        total: (c.total_absent_k || 0) + (c.total_late || 0) + (c.total_violation || 0)
                                    };
                                }).filter(c => c.total > 0);

                                const gradesList = ['6', '7', '8', '9'];
                                let schoolTotalV = 0;
                                let schoolTotalT = 0;
                                let schoolTotalVp = 0;
                                let schoolTotalAll = 0;

                                return (
                                    <div className="space-y-6">
                                        {gradesList.map((gNum, gIdx) => {
                                            const gradeClasses = allClassStats
                                                .filter(c => c.grade === gNum || c.name.startsWith(gNum))
                                                .sort((a, b) => a.total - b.total); // Sắp xếp từ ít lỗi nhất đến nhiều lỗi nhất để làm bảng xếp hạng thi đua

                                            let gradeV = 0;
                                            let gradeT = 0;
                                            let gradeVp = 0;
                                            let gradeAll = 0;

                                            gradeClasses.forEach(c => {
                                                gradeV += c.k;
                                                gradeT += c.t;
                                                gradeVp += c.vp;
                                                gradeAll += c.total;
                                            });

                                            schoolTotalV += gradeV;
                                            schoolTotalT += gradeT;
                                            schoolTotalVp += gradeVp;
                                            schoolTotalAll += gradeAll;

                                            return (
                                                <div key={gIdx} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                        <span className="font-extrabold text-slate-800 text-xs tracking-wider">THI ĐUA LỚP HỌC - KHỐI {gNum}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                                            {gradeClasses.length} lớp phát sinh sự cố
                                                        </span>
                                                    </div>

                                                    {gradeClasses.length === 0 ? (
                                                        <div className="p-6 text-center text-slate-400 text-xs italic bg-white">
                                                            🍀 Tuyệt vời! Không ghi nhận lớp học nào thuộc Khối {gNum} phát sinh sự cố nề nếp. Tất cả đạt Xuất Sắc!
                                                        </div>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse bg-white text-xs">
                                                                <thead>
                                                                    <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                                                                        <th className="p-3 pl-5 w-24">Hạng Khối</th>
                                                                        <th className="p-3">Lớp Học</th>
                                                                        <th className="p-3 text-center">Số Lượt Vắng</th>
                                                                        <th className="p-3 text-center">Lượt Đi Trễ</th>
                                                                        <th className="p-3 text-center">Vi Phạm Khác</th>
                                                                        <th className="p-3 text-center">Tổng Sự Cố</th>
                                                                        <th className="p-3 pl-4">Đánh Giá Thi Đua</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                                    {gradeClasses.map((cls, idx) => (
                                                                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                                            <td className="p-3 pl-5 text-slate-900 font-bold">{idx + 1}</td>
                                                                            <td className="p-3 text-slate-900 font-extrabold">{cls.name}</td>
                                                                            <td className="p-3 text-center text-rose-600 font-bold">{cls.k}</td>
                                                                            <td className="p-3 text-center text-amber-600">{cls.t}</td>
                                                                            <td className="p-3 text-center text-purple-600">{cls.vp}</td>
                                                                            <td className="p-3 text-center text-slate-900 font-bold">{cls.total}</td>
                                                                            <td className="p-3 pl-4">
                                                                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                                                                    cls.total <= 3 
                                                                                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                                                                                        : 'text-rose-700 bg-rose-50 border border-rose-100'
                                                                                }`}>
                                                                                    {cls.total <= 3 ? 'Khá Tốt 👍' : 'Cần Lưu Ý ⚠️'}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="bg-slate-50/60 font-black text-slate-800 border-t border-slate-200">
                                                                        <td className="p-3 pl-5" colSpan={2}>TỔNG CỘNG KHỐI {gNum}</td>
                                                                        <td className="p-3 text-center text-rose-700">{gradeV}</td>
                                                                        <td className="p-3 text-center text-amber-700">{gradeT}</td>
                                                                        <td className="p-3 text-center text-purple-700">{gradeVp}</td>
                                                                        <td className="p-3 text-center text-slate-900">{gradeAll}</td>
                                                                        <td className="p-3"></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Tổng hợp chung toàn trường */}
                                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                                            <h5 className="font-extrabold text-emerald-950 text-sm mb-3">🏢 IV. TỔNG HỢP CHUNG TOÀN TRƯỜNG</h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                                                <div className="bg-white p-3 rounded-lg border border-emerald-100/50">
                                                    <span className="block text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Tổng Lượt Vắng</span>
                                                    <span className="block text-xl font-black text-rose-600 mt-1">{schoolTotalV}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-emerald-100/50">
                                                    <span className="block text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Tổng Lượt Trễ</span>
                                                    <span className="block text-xl font-black text-amber-600 mt-1">{schoolTotalT}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-emerald-100/50">
                                                    <span className="block text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Vi Phạm Khác</span>
                                                    <span className="block text-xl font-black text-purple-600 mt-1">{schoolTotalVp}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-emerald-100/50">
                                                    <span className="block text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Tổng Sự Cố</span>
                                                    <span className="block text-xl font-black text-slate-900 mt-1">{schoolTotalAll}</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-emerald-100/50 col-span-2 sm:col-span-1 flex flex-col justify-center">
                                                    <span className="block text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Trạng Thái Chung</span>
                                                    <span className={`block text-xs font-black mt-1 ${
                                                        schoolTotalAll <= 15 ? 'text-emerald-700' : schoolTotalAll <= 40 ? 'text-amber-700' : 'text-rose-700'
                                                    }`}>
                                                        {schoolTotalAll <= 15 ? 'XUẤT SẮC 🍀' : schoolTotalAll <= 40 ? 'KHÁ TỐT 👍' : 'CẦN CHẤN CHỈNH ⚠️'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    
                    {/* Heatmap đơn giản */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
                         <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                             <Calendar className="w-5 h-5 text-indigo-500" />
                             Bản Đồ Nhiệt Vắng Học
                         </h3>
                         <p className="text-sm text-slate-500 mb-6">Mức độ vắng học theo các thứ trong tuần.</p>
                         <div className="flex flex-wrap gap-2">
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => {
                                const dataObj = heatmapData[day] || { k: 0, t: 0 };
                                const count = dataObj.k;
                                let colorClass = 'bg-emerald-100';
                                if (count === 0) colorClass = 'bg-emerald-100';
                                else if (count < 5) colorClass = 'bg-amber-100';
                                else if (count < 10) colorClass = 'bg-amber-300';
                                else if (count < 20) colorClass = 'bg-rose-300';
                                else colorClass = 'bg-rose-500';

                                return (
                                    <div key={day} className="flex-1 min-w-[60px] h-24 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100 p-2 relative group cursor-pointer hover:border-slate-300 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 mb-1">{day}</span>
                                        <div className={cn("w-full h-8 rounded-md flex items-center justify-center transition-colors", colorClass)}>
                                            <span className={cn("text-xs font-bold", count >= 20 ? "text-white" : "text-slate-700")}>
                                                {count > 0 ? count : '-'}
                                            </span>
                                        </div>
                                        
                                        {/* Tooltip Chi tiết */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none translate-y-2 group-hover:translate-y-0">
                                            <div className="font-bold text-sm mb-1">{day}</div>
                                            <div className="flex justify-between mb-1"><span>Vắng học:</span> <span className="font-bold text-rose-400">{count}</span></div>
                                            <div className="flex justify-between mb-1"><span>Đi trễ:</span> <span className="font-bold text-amber-400">{dataObj.t}</span></div>
                                            <div className="w-full h-px bg-slate-700 my-2"></div>
                                            <div className={cn("font-semibold text-right", count > 10 ? "text-rose-400" : count > 0 ? "text-amber-400" : "text-emerald-400")}>
                                                {count > 10 ? `Cần chú ý` : count === 0 ? `Chuyên cần tốt` : `Bình thường`}
                                            </div>
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
}
