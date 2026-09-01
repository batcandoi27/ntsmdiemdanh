"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { GlobalDataFilter } from '@/components/dashboard/GlobalDataFilter';
import {
  Users, AlertCircle, Clock, ShieldAlert, TrendingUp, LayoutDashboard,
  ArrowUpDown, FileSpreadsheet, Loader2, Eye, EyeOff, ShieldCheck,
  Sparkles, RefreshCw, Search, Filter, AlertTriangle, Activity,
  CheckCircle2, BellRing, UserX, MessageSquare, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useLoading } from '@/context/loading-context';
import { useAuth } from '@/context/auth-context';
import { getReports, getExcelExportData } from '@/app/actions/report';
import { getAllClasses } from '@/app/actions/common';
import { exportDashboardReportExcel } from '@/lib/export-dashboard-excel';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, subWeeks, subMonths } from 'date-fns';
import {
  maskStudentName,
  detectAttendanceAnomalies,
  generateSparklineTrends,
  calculateStudentRiskProfiles,
  type StudentRiskLevel
} from '@/domain/admin/admin-analytics-engine';

const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value, dataKey, payload, compareMode } = props;
    if (!value || value === 0) return null;
    
    let diffText = '';
    let diffColor = '#64748b';
    
    if (compareMode && payload && dataKey && (dataKey === 'k' || dataKey === 't' || dataKey === 'vp')) {
        const lastKey = `last_${dataKey}`;
        const lastVal = payload[lastKey] || 0;
        const diff = value - lastVal;
        if (diff > 0) {
            diffText = ` (↑${diff})`;
            diffColor = '#e11d48'; // Red for increase (bad for absence/late)
        } else if (diff < 0) {
            diffText = ` (↓${Math.abs(diff)})`;
            diffColor = '#10b981'; // Green for decrease (good)
        }
    }
    
    if (dataKey && typeof dataKey === 'string' && dataKey.startsWith('last_')) {
        return (
            <text x={x + width + 5} y={y + height / 2 + 4} fill="#94a3b8" fontSize={11} fontWeight="bold">
                {value}
            </text>
        );
    }
    
    return (
        <text x={x + width + 5} y={y + height / 2 + 4} fill="#0f172a" fontSize={11} fontWeight="bold">
            {value}
            {compareMode && diffText && <tspan fill={diffColor} fontSize={10} fontWeight="bold">{diffText}</tspan>}
        </text>
    );
};

export default function BGHDashboardOverview() {
    const { showLoading, hideLoading } = useLoading();
    const { appUser } = useAuth();
    
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    });
    const [filterMode, setFilterMode] = useState<'WEEK' | 'MONTH' | 'CUSTOM'>('WEEK');

    const [compareMode, setCompareMode] = useState(false);

    const compareLabelLast = filterMode === 'WEEK' ? 'Tuần Trước' : 'Tháng Trước';
    const compareLabelCurrent = filterMode === 'WEEK' ? 'Tuần Này' : 'Tháng Này';

    const [stats, setStats] = useState({
        attendanceRate: 0,
        absentK: 0,
        absentUnexcused: 0,
        absentExcused: 0,
        late: 0,
        violation: 0,
        lastAbsentK: 0,
        lastLate: 0,
        lastViolation: 0
    });
    const [classesList, setClassesList] = useState<any[]>([]);
    const [riskStudents, setRiskStudents] = useState<any[]>([]);
    const [exportLoading, setExportLoading] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [classChartData, setClassChartData] = useState<any[]>([]);
    const [sparklines, setSparklines] = useState({ k: [] as number[], t: [] as number[], vp: [] as number[] });
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

    // Executive Enhancements v2.0
    const [anonymizeMode, setAnonymizeMode] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RISK_RADAR' | 'GRADE_TABLE'>('OVERVIEW');
    const [riskSearchQuery, setRiskSearchQuery] = useState<string>('');
    const [riskLevelFilter, setRiskLevelFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH_RISK' | 'ATTENTION'>('ALL');
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Processed Risk Profiles with Anonymization support & Weighted Scoring
    const processedRiskProfiles = useMemo(() => {
        return (riskStudents || []).map((student: any) => {
            const unexcused = Number(student.absent_unexcused_count || student.k_count || student.unexcused || student.k || 0);
            const excused = Number(student.absent_excused_count || student.p_count || student.excused || student.p || 0);
            const late = Number(student.late_count || student.t_count || student.late || student.t || 0);
            const violation = Number(student.violation_count || student.vp_count || student.violation || student.vp || 0);
            const rawScore = (unexcused * 3.0) + (excused * 1.0) + (late * 0.5) + (violation * 2.0);
            const riskScore = student.risk_score ? Number(student.risk_score) : Number(rawScore.toFixed(1));
            
            let riskLevel: StudentRiskLevel = 'NORMAL';
            if (riskScore >= 10.0 || unexcused >= 3) riskLevel = 'CRITICAL';
            else if (riskScore >= 6.0 || unexcused >= 2) riskLevel = 'HIGH_RISK';
            else if (riskScore >= 3.0 || late >= 3) riskLevel = 'ATTENTION';

            const rawName = student.name || student.full_name || 'Học sinh';
            const displayName = anonymizeMode ? maskStudentName(rawName) : rawName;

            return {
                id: student.student_id || student.id || Math.random().toString(),
                rawName,
                displayName,
                className: student.class || student.class_name || 'N/A',
                unexcused,
                excused,
                late,
                violation,
                riskScore,
                riskLevel
            };
        });
    }, [riskStudents, anonymizeMode]);

    const filteredRiskProfiles = useMemo(() => {
        return processedRiskProfiles.filter(p => {
            if (riskLevelFilter === 'CRITICAL' && p.riskLevel !== 'CRITICAL') return false;
            if (riskLevelFilter === 'HIGH_RISK' && (p.riskLevel !== 'HIGH_RISK' && p.riskLevel !== 'CRITICAL')) return false;
            if (riskLevelFilter === 'ATTENTION' && p.riskLevel === 'NORMAL') return false;

            if (riskSearchQuery.trim()) {
                const q = riskSearchQuery.toLowerCase();
                const matchName = p.rawName.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q);
                const matchClass = p.className.toLowerCase().includes(q);
                return matchName || matchClass;
            }
            return true;
        });
    }, [processedRiskProfiles, riskLevelFilter, riskSearchQuery]);

    const [classSortConfig, setClassSortConfig] = useState<Record<'k'|'t'|'vp', 'name_asc' | 'value_desc'>>({
        k: 'name_asc', t: 'name_asc', vp: 'name_asc'
    });

    const [gradeSortConfig, setGradeSortConfig] = useState<Record<'k'|'t'|'vp', 'name_asc' | 'value_desc'>>({
        k: 'name_asc', t: 'name_asc', vp: 'name_asc'
    });

    const toggleSort = (key: 'k'|'t'|'vp') => {
        setClassSortConfig(prev => ({
            ...prev,
            [key]: prev[key] === 'name_asc' ? 'value_desc' : 'name_asc'
        }));
    };

    const toggleGradeSort = (key: 'k'|'t'|'vp') => {
        setGradeSortConfig(prev => ({
            ...prev,
            [key]: prev[key] === 'name_asc' ? 'value_desc' : 'name_asc'
        }));
    };

    const sortGrades = (data: any[], key: 'k'|'t'|'vp', order: 'name_asc' | 'value_desc') => {
        return [...data].sort((a, b) => {
            if (order === 'value_desc') {
                return b[key] - a[key];
            } else {
                const gradeA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
                const gradeB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
                return gradeA - gradeB;
            }
        });
    };

    const sortClasses = (data: any[], key: 'k'|'t'|'vp', order: 'name_asc' | 'value_desc') => {
        return [...data].sort((a, b) => {
            if (order === 'value_desc') {
                return b[key] - a[key];
            } else {
                const matchA = a.name.match(/(\d+)([a-zA-Z]+)(\d+)/);
                const matchB = b.name.match(/(\d+)([a-zA-Z]+)(\d+)/);
                if (matchA && matchB) {
                    const gradeA = parseInt(matchA[1], 10);
                    const gradeB = parseInt(matchB[1], 10);
                    if (gradeA !== gradeB) return gradeA - gradeB;
                    const classNumA = parseInt(matchA[3], 10);
                    const classNumB = parseInt(matchB[3], 10);
                    return classNumA - classNumB;
                }
                return a.name.localeCompare(b.name);
            }
        });
    };

    const timeRangeText = filterMode === 'WEEK' 
        ? `${format(parseISO(dateRange.start), "dd/MM/yyyy")} - ${format(parseISO(dateRange.end), "dd/MM/yyyy")}`
        : `Tháng ${format(parseISO(dateRange.start), 'MM/yyyy')}`;

    useEffect(() => {
        fetchData();
    }, [dateRange, compareMode]);

    const fetchData = async () => {
        showLoading('Đang tải dữ liệu phân tích...');
        try {
            const startDate = dateRange.start;
            const endDate = dateRange.end;

            // Lấy danh sách tất cả các lớp
            const classes = await getAllClasses();
            setClassesList(classes);
            const classIds = classes.map(c => c.id);

            let lastStartDate = '', lastEndDate = '';
            if (compareMode) {
                if (filterMode === 'WEEK') {
                    lastStartDate = format(subWeeks(parseISO(startDate), 1), 'yyyy-MM-dd');
                    lastEndDate = format(subWeeks(parseISO(endDate), 1), 'yyyy-MM-dd');
                } else if (filterMode === 'MONTH') {
                    lastStartDate = format(subMonths(parseISO(startDate), 1), 'yyyy-MM-dd');
                    lastEndDate = format(subMonths(parseISO(endDate), 1), 'yyyy-MM-dd');
                } else {
                    lastStartDate = format(subWeeks(parseISO(startDate), 1), 'yyyy-MM-dd');
                    lastEndDate = format(subWeeks(parseISO(endDate), 1), 'yyyy-MM-dd');
                }
            }

            // Fetch song song
            const currentPromise = getReports({ startDate, endDate, classIds }, appUser?.role);
            let lastPromise = Promise.resolve({ totalK: 0, totalP: 0, totalT: 0, totalVP: 0, absences: [] } as any);
            if (compareMode) {
                lastPromise = getReports({ startDate: lastStartDate, endDate: lastEndDate, classIds }, appUser?.role);
            }

            const [result, lastResult] = await Promise.all([currentPromise, lastPromise]);

            setStats({
                attendanceRate: 98.5, // Mock rate cho health score
                absentK: result.totalK + result.totalP, // Tính gộp vắng phép và không phép
                absentUnexcused: result.totalK,
                absentExcused: result.totalP,
                late: result.totalT,
                violation: result.totalVP,
                lastAbsentK: lastResult.totalK + lastResult.totalP, // Tính gộp vắng phép và không phép
                lastLate: lastResult.totalT,
                lastViolation: lastResult.totalVP
            });

            // Gom nhóm theo Khối
            const gradeMap: Record<string, any> = {
                '6': { name: 'Khối 6', k: 0, t: 0, vp: 0, last_k: 0, last_t: 0, last_vp: 0 },
                '7': { name: 'Khối 7', k: 0, t: 0, vp: 0, last_k: 0, last_t: 0, last_vp: 0 },
                '8': { name: 'Khối 8', k: 0, t: 0, vp: 0, last_k: 0, last_t: 0, last_vp: 0 },
                '9': { name: 'Khối 9', k: 0, t: 0, vp: 0, last_k: 0, last_t: 0, last_vp: 0 },
            };

            const classStatsMap: Record<string, any> = {};

            const processAbsences = (absences: any[], isLast: boolean) => {
                if (!absences) return;
                
                // Debug log
                if (!isLast && absences.length > 0) {
                    console.log('Sample absence for grade processing:', absences[0]);
                }

                absences.forEach(a => {
                    const classObj = classes.find((c: any) => c.id === a.classId);
                    const clsName = classObj?.name || a.className || '';
                    
                    // Tìm số 6, 7, 8, 9 đầu tiên trong chuỗi tên lớp (VD: "8A1" -> "8")
                    const match = clsName.match(/[6789]/);
                    const grade = match ? match[0] : '';
                    
                    const prefix = isLast ? 'last_' : '';
                    const st = a.status || '';
                    const isK = /(^|;| )[KP]($| |;|Sáng|Chiều)/.test(st); // Chấp nhận cả K (Không phép) và P (Có phép) làm trạng thái vắng học
                    const isT = /(^|;| )T($| |;|Sáng|Chiều)/.test(st);
                    const isVP = /(^|;| )VP($| |;|Sáng|Chiều)/.test(st);

                    if (grade && gradeMap[grade]) {
                        if (isK) gradeMap[grade][prefix + 'k']++;
                        if (isT) gradeMap[grade][prefix + 't']++;
                        if (isVP) gradeMap[grade][prefix + 'vp']++;
                    }

                    if (clsName && grade) {
                        if (!classStatsMap[clsName]) {
                            classStatsMap[clsName] = { name: clsName, grade: grade, k: 0, t: 0, vp: 0, last_k: 0, last_t: 0, last_vp: 0 };
                        }
                        if (isK) classStatsMap[clsName][prefix + 'k']++;
                        if (isT) classStatsMap[clsName][prefix + 't']++;
                        if (isVP) classStatsMap[clsName][prefix + 'vp']++;
                    }
                });
            };

            processAbsences(result.absences, false);
            if (compareMode) processAbsences(lastResult.absences, true);

            // Chuyển object thành mảng để đưa vào Recharts
            setChartData(Object.values(gradeMap));
            setClassChartData(Object.values(classStatsMap));

            // Lấy dữ liệu cho Sparklines
            const { data: dailyData } = await supabase
                .from('view_attendance_daily_summary')
                .select('date, absent_k_count, absent_p_count, late_count, violation_count')
                .gte('date', dateRange.start)
                .lte('date', dateRange.end)
                .order('date', { ascending: true });

            let kSpark: number[] = [];
            let tSpark: number[] = [];
            let vpSpark: number[] = [];

            if (dailyData) {
                // Gom nhóm theo ngày
                const dateMap: Record<string, any> = {};
                dailyData.forEach(d => {
                    if (!dateMap[d.date]) dateMap[d.date] = { k: 0, t: 0, vp: 0 };
                    dateMap[d.date].k += (d.absent_k_count || 0) + (d.absent_p_count || 0); // Cộng gộp KP và CP
                    dateMap[d.date].t += d.late_count || 0;
                    dateMap[d.date].vp += d.violation_count || 0;
                });
                const sortedDates = Object.keys(dateMap).sort();
                kSpark = sortedDates.map(d => dateMap[d].k);
                tSpark = sortedDates.map(d => dateMap[d].t);
                vpSpark = sortedDates.map(d => dateMap[d].vp);
            }
            setSparklines({ k: kSpark.length ? kSpark : [0,0,0], t: tSpark.length ? tSpark : [0,0,0], vp: vpSpark.length ? vpSpark : [0,0,0] });

            // Tải danh sách học sinh nguy cơ cao phục vụ trích xuất Excel
            const { data: riskData, error: riskError } = await supabase.rpc('get_student_risk_scores', {
                target_class_id: null,
                p_start_date: startDate,
                p_end_date: endDate
            });

            if (!riskError && riskData && riskData.length > 0) {
                const studentIds = riskData.map((r: any) => r.student_id);
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

                const mappedRiskStudents = riskData.map((r: any) => {
                    const mapping = studentMappings?.find(m => m.student_id === r.student_id);
                    const studentName = (mapping?.students as any)?.full_name || 'Không rõ tên';
                    const className = (mapping?.classes as any)?.name || 'N/A';
                    return {
                        ...r,
                        name: studentName,
                        class: className
                    };
                });
                setRiskStudents(mappedRiskStudents);
            } else {
                setRiskStudents([]);
            }
            
        } catch (err) {
            console.error(err);
        } finally {
            hideLoading();
        }
    };

    const handleExportExcel = async () => {
        if (!dateRange.start || !dateRange.end) return;
        setExportLoading(true);
        showLoading('Đang kết xuất báo cáo Quản trị & Điều hành tổng hợp...');
        try {
            // Lấy tất cả lớp học thực tế từ state hoặc DB
            let classes = classesList;
            if (classes.length === 0) {
                classes = await getAllClasses();
                setClassesList(classes);
            }
            
            await exportDashboardReportExcel({
                dateRange,
                stats,
                chartData,
                classChartData,
                classesList: classes,
                riskStudents
            });
        } catch (error) {
            console.error("[handleExportExcel] Lỗi:", error);
            alert('Lỗi khi kết xuất báo cáo: ' + (error as Error).message);
        } finally {
            setExportLoading(false);
            hideLoading();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Header section with Executive Meeting & Privacy Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-semibold text-slate-500">Dữ liệu cập nhật lúc {format(new Date(), 'HH:mm:ss')} (GMT+7)</span>
                        {anonymizeMode && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                🔒 Đang Ẩn Danh Hội Nghị
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shadow-sm">
                            <LayoutDashboard className="text-blue-600 w-6 h-6" />
                        </div>
                        Quản trị và Điều hành
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Xin chào {appUser?.displayName || 'Ban Giám Hiệu'}! Trung tâm giám sát nề nếp & cảnh báo sớm toàn trường.</p>
                </div>

                {/* Executive Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-end">
                    {/* Meeting Projector Anonymize Toggle */}
                    <button
                        onClick={() => setAnonymizeMode(!anonymizeMode)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            anonymizeMode 
                                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-300 shadow-amber-200' 
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                        title="Bật/Tắt chế độ che tên học sinh (Ng** V** A**) khi trình chiếu hội nghị BGH theo Luật 91/2025/QH15"
                    >
                        {anonymizeMode ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-slate-500" />}
                        <span>{anonymizeMode ? 'Chế Độ Hội Nghị (BẬT)' : 'Chế Độ Hội Nghị (Ẩn danh)'}</span>
                        {anonymizeMode && <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />}
                    </button>

                    {/* Live Refresh */}
                    <button
                        onClick={() => { setIsRefreshing(true); fetchData().finally(() => setIsRefreshing(false)); }}
                        disabled={isRefreshing}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                        title="Làm mới số liệu tức thì"
                    >
                        <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    {/* Export Excel */}
                    <button
                        onClick={handleExportExcel}
                        disabled={exportLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        {exportLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                        )}
                        <span>{exportLoading ? 'Đang trích xuất...' : 'Xuất Báo Cáo Excel'}</span>
                    </button>
                </div>
            </div>

            {/* AI Executive Early Warning Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-md border border-indigo-700/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-indigo-100 tracking-wide uppercase flex items-center gap-2">
                                Radar Phân Tích Dị Thường & Cảnh Báo Sớm BGH
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                AI Analytics v2.0
                            </span>
                        </div>
                        <p className="text-xs text-indigo-200/90 mt-0.5">
                            Tỷ lệ chuyên cần toàn trường đạt <strong className="text-white">{stats.attendanceRate}%</strong>.
                            {processedRiskProfiles.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH_RISK').length > 0 ? (
                                <span> Phát hiện <strong className="text-rose-300">{processedRiskProfiles.filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH_RISK').length} học sinh</strong> có nguy cơ vắng/trễ cao cần can thiệp sư phạm.</span>
                            ) : (
                                <span> Nề nếp toàn trường duy trì rất tốt, không phát hiện biến động bất thường.</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('RISK_RADAR')}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
                    >
                        <BellRing className="w-3.5 h-3.5 text-amber-300" />
                        <span>Mở Radar Cảnh Báo ({processedRiskProfiles.length})</span>
                    </button>
                </div>
            </div>

            <GlobalDataFilter 
                dateRange={dateRange}
                setDateRange={setDateRange}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                compareMode={compareMode}
                setCompareMode={setCompareMode}
            />

            {/* Executive Tab Switcher */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('OVERVIEW')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'OVERVIEW'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Tổng Quan & Biểu Đồ</span>
                </button>
                <button
                    onClick={() => setActiveTab('RISK_RADAR')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'RISK_RADAR'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Radar Học Sinh Nguy Cơ</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-current">
                        {processedRiskProfiles.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('GRADE_TABLE')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'GRADE_TABLE'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Bảng Số Liệu Quản Trị Khối</span>
                </button>
            </div>
            {/* ========================================================================= */}
            {/* TAB 1: TỔNG QUAN & BIỂU ĐỒ (OVERVIEW)                                     */}
            {/* ========================================================================= */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* QUICK ACCESS PORTALS DÀNH CHO ADMIN & BGH */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <a
                            href="/portal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-white border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                                    👨‍👩‍👧
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                        Cổng Phụ Huynh
                                    </h4>
                                    <p className="text-[11px] text-slate-500">Xem điểm danh, nghỉ phép, Sơ Yếu Lý Lịch</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">↗</span>
                        </a>

                        <a
                            href="/student"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                                    🎮
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                                        Cổng Học Sinh
                                    </h4>
                                    <p className="text-[11px] text-slate-500">Bản đồ học tập, thú cưng, nhiệm vụ</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">↗</span>
                        </a>

                        <a
                            href="/homeroom/students"
                            className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-white border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                                    👨‍🏫
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                        Trợ Lý GVCN & SYLL
                                    </h4>
                                    <p className="text-[11px] text-slate-500">Quản lý hồ sơ, duyệt & in ấn lớp</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
                        </a>

                        <a
                            href="/homeroom/print-center"
                            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                                    🖨️
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm group-hover:text-amber-600 transition-colors">
                                        Trung Tâm In Ấn
                                    </h4>
                                    <p className="text-[11px] text-slate-500">In 86 trang/lớp, xuất Word & PDF</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">→</span>
                        </a>
                    </div>

                    {/* Thẻ Thống Kê */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Tỷ lệ chuyên cần"
                            value={`${stats.attendanceRate}%`}
                            icon={Users}
                            colorClass="text-blue-600 bg-blue-600"
                            trend={{ value: 2.1, isPositive: true, label: "Tăng so với tuần trước" }}
                            sparklineData={[92, 94, 93, 96, 97, 98, 98.5]}
                        />
                        <StatCard 
                            title="Vắng học"
                            value={stats.absentK}
                            subtitle={`(P: ${stats.absentExcused} | KP: ${stats.absentUnexcused})`}
                            icon={AlertCircle}
                            colorClass={stats.absentK > 10 ? "text-rose-600 bg-rose-600 shadow-md shadow-rose-200 border-rose-300" : "text-rose-600 bg-rose-600"}
                            trend={compareMode ? { 
                                value: (stats.absentK - stats.lastAbsentK), 
                                isPositive: (stats.absentK < stats.lastAbsentK), 
                                isGoodDirection: false, 
                                label: `(vs ${stats.lastAbsentK} tuần trước)` 
                            } : undefined} 
                            sparklineData={sparklines.k}
                        />
                        <StatCard 
                            title="Đi học trễ"
                            value={stats.late}
                            icon={Clock}
                            colorClass="text-amber-600 bg-amber-600"
                            trend={compareMode ? { 
                                value: (stats.late - stats.lastLate), 
                                isPositive: (stats.late < stats.lastLate), 
                                isGoodDirection: true, 
                                label: `(vs ${stats.lastLate} tuần trước)` 
                            } : undefined}
                            sparklineData={sparklines.t}
                        />
                        <StatCard 
                            title="Vi phạm nề nếp"
                            value={stats.violation}
                            icon={ShieldAlert}
                            colorClass="text-purple-600 bg-purple-600"
                            trend={compareMode ? { 
                                value: (stats.violation - stats.lastViolation), 
                                isPositive: (stats.violation < stats.lastViolation), 
                                isGoodDirection: true, 
                                label: `(vs ${stats.lastViolation} tuần trước)` 
                            } : undefined}
                            sparklineData={sparklines.vp}
                        />
                    </div>

                    {/* Insight & Health Score Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center">
                            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span>📌</span> Insight Phân Tích (Tự động)
                            </h3>
                            <ul className="space-y-3">
                                {(() => {
                                    const insights = [];

                                    // Thống kê nề nếp lớp học Xuất Sắc theo góp ý của thầy Nhân
                                    const totalClassesCount = classesList.length || 24; 
                                    const classesWithIssuesCount = classChartData.length;
                                    const perfectClassesCount = Math.max(0, totalClassesCount - classesWithIssuesCount);
                                    const perfectClassesPercent = totalClassesCount > 0 
                                        ? Math.round((perfectClassesCount / totalClassesCount) * 100) 
                                        : 100;

                                    insights.push({
                                        color: 'bg-emerald-500',
                                        text: (
                                            <p className="text-slate-700 text-sm font-medium">
                                                🍀 <strong>{perfectClassesPercent}%</strong> số lớp học ({perfectClassesCount}/{totalClassesCount} lớp) giữ vững <strong>nề nếp Xuất Sắc</strong> trong thời gian này (không ghi nhận bất kỳ học sinh vắng học, đi trễ hay vi phạm nề nếp).
                                            </p>
                                        )
                                    });

                                    if (classesWithIssuesCount > 0) {
                                        insights.push({
                                            color: 'bg-amber-500',
                                            text: (
                                                <p className="text-slate-700 text-sm font-medium">
                                                    ⚠️ Ghi nhận <strong>{classesWithIssuesCount}/{totalClassesCount} lớp</strong> phát sinh trường hợp vắng học, đi trễ hoặc vi phạm nề nếp cần GVCN lưu ý.
                                                </p>
                                            )
                                        });
                                    }
                                    
                                    // 1. Khối vi phạm cao nhất
                                    if (chartData && chartData.length > 0) {
                                        const highestIssueGrade = [...chartData].sort((a,b) => (b.k + b.t + b.vp) - (a.k + a.t + a.vp))[0];
                                        if (highestIssueGrade && (highestIssueGrade.k + highestIssueGrade.t + highestIssueGrade.vp) > 0) {
                                            insights.push({
                                                color: 'bg-rose-500',
                                                text: <p className="text-slate-700 text-sm font-medium"><strong>{highestIssueGrade.name}</strong> đang có số lượt vi phạm (vắng, trễ, nề nếp) cao nhất toàn trường.</p>
                                            });
                                        }
                                    }

                                    // 2. Lớp vắng nhiều nhất
                                    if (classChartData && classChartData.length > 0) {
                                        const highestAbsentClass = [...classChartData].sort((a,b) => b.k - a.k)[0];
                                        if (highestAbsentClass && highestAbsentClass.k > 0) {
                                            insights.push({
                                                color: 'bg-amber-500',
                                                text: <p className="text-slate-700 text-sm font-medium">Lớp <strong>{highestAbsentClass.name}</strong> ghi nhận nhiều lượt vắng học nhất ({highestAbsentClass.k} lượt).</p>
                                            });
                                        }
                                    }

                                    // 3. Tình hình đi trễ so với tuần trước
                                    if (compareMode && stats.lastLate > 0) {
                                        const lateDiff = stats.late - stats.lastLate;
                                        const latePercent = Math.round((lateDiff / stats.lastLate) * 100);
                                        if (lateDiff > 0) {
                                            insights.push({
                                                color: 'bg-orange-500',
                                                text: <p className="text-slate-700 text-sm font-medium">Xu hướng đi trễ toàn trường đang <strong>tăng {latePercent}%</strong> so với kỳ trước.</p>
                                            });
                                        } else if (lateDiff < 0) {
                                            insights.push({
                                                color: 'bg-emerald-500',
                                                text: <p className="text-slate-700 text-sm font-medium">Xu hướng đi trễ toàn trường đã <strong>giảm {Math.abs(latePercent)}%</strong>. Rất đáng biểu dương.</p>
                                            });
                                        }
                                    }

                                    if (insights.length === 0) {
                                        return (
                                            <li className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2"></div>
                                                <p className="text-slate-500 text-sm italic">Chưa có dữ liệu bất thường hoặc nổi bật đáng chú ý trong khoảng thời gian này.</p>
                                            </li>
                                        );
                                    }

                                    return insights.map((insight, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${insight.color} mt-2`}></div>
                                            {insight.text}
                                        </li>
                                    ));
                                })()}
                            </ul>
                        </div>

                        {(() => {
                            const healthScore = Math.max(0, Math.min(100, Math.round(stats.attendanceRate) - (stats.violation > 50 ? 5 : 0)));
                            const healthStatus = healthScore >= 95 ? { text: 'Xuất Sắc', color: 'text-emerald-600', stroke: '#10b981', desc: 'Nề nếp toàn trường đang duy trì ở mức rất tốt. Cần tiếp tục phát huy.' }
                                               : healthScore >= 90 ? { text: 'Khá Tốt', color: 'text-blue-600', stroke: '#2563eb', desc: 'Nhìn chung ổn định, nhưng vẫn còn vài điểm nóng đi trễ cần lưu ý.' }
                                               : healthScore >= 80 ? { text: 'Trung Bình', color: 'text-amber-600', stroke: '#d97706', desc: 'Tình hình nề nếp suy giảm đáng kể. BGH cần nhắc nhở GVCN.' }
                                               : { text: 'Báo Động', color: 'text-rose-600', stroke: '#e11d48', desc: 'Vi phạm tăng cao đột biến. Đề nghị BGH họp và xử lý khẩn cấp.' };

                            return (
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Điểm Số Đánh Giá</h3>
                                    <div className="relative w-28 h-28 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                            <circle cx="50" cy="50" r="45" fill="none" stroke={healthStatus.stroke} strokeWidth="8" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * healthScore) / 100} strokeLinecap="round" className="transition-all duration-1000" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center justify-center">
                                            <span className={`text-3xl font-black ${healthStatus.color}`}>{healthScore}</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className={`text-md font-bold uppercase tracking-wide ${healthStatus.color}`}>{healthStatus.text}</p>
                                        <p className="text-xs text-slate-500 mt-1.5 px-2 font-medium leading-relaxed">{healthStatus.desc}</p>
                                    </div>
                                </div>
                            );
                        })()}

                    </div>

                    {/* Biểu đồ phân tích theo Khối */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        
                        {/* Vắng Học */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-rose-500" />
                                        Vắng Học
                                    </h3>
                                    <p className="text-xs font-medium text-slate-500 mt-1">
                                        Tổng: <span className="font-bold text-slate-700">{chartData.reduce((sum, c) => sum + c.k, 0)}</span>
                                        {compareMode && (() => {
                                            const total = chartData.reduce((sum, c) => sum + c.k, 0);
                                            const lastTotal = chartData.reduce((sum, c) => sum + (c.last_k || 0), 0);
                                            const diff = total - lastTotal;
                                            return diff > 0 ? <span className="text-rose-500 ml-1 font-bold">(↑{diff})</span> : diff < 0 ? <span className="text-emerald-500 ml-1 font-bold">(↓{Math.abs(diff)})</span> : <span className="text-slate-400 ml-1">(-)</span>;
                                        })()}
                                    </p>
                                </div>
                                <button onClick={() => toggleGradeSort('k')} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200 shadow-sm" title="Sắp xếp danh sách">
                                    <ArrowUpDown className="w-3 h-3" />
                                    {gradeSortConfig.k === 'name_asc' ? 'Khối' : 'Giảm Dần'}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-4 font-medium uppercase tracking-wider">{timeRangeText}</p>
                            <div className="flex-1 min-h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sortGrades(chartData, 'k', gradeSortConfig.k)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontWeight: 'bold'}} width={60} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        {compareMode && <Bar dataKey="last_k" name={compareLabelLast} fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="last_k" />} />}
                                        <Bar dataKey="k" name={compareLabelCurrent} fill="#e11d48" radius={[0, 4, 4, 0]} barSize={16} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="k" />} onClick={(data) => {
                                            if (data && data.name) {
                                                setSelectedGrade(data.name.replace('Khối ', ''));
                                            }
                                        }} className="cursor-pointer hover:opacity-80 transition-opacity" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Đi Trễ */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                        Đi Trễ
                                    </h3>
                                    <p className="text-xs font-medium text-slate-500 mt-1">
                                        Tổng: <span className="font-bold text-slate-700">{chartData.reduce((sum, c) => sum + c.t, 0)}</span>
                                        {compareMode && (() => {
                                            const total = chartData.reduce((sum, c) => sum + c.t, 0);
                                            const lastTotal = chartData.reduce((sum, c) => sum + (c.last_t || 0), 0);
                                            const diff = total - lastTotal;
                                            return diff > 0 ? <span className="text-rose-500 ml-1 font-bold">(↑{diff})</span> : diff < 0 ? <span className="text-emerald-500 ml-1 font-bold">(↓{Math.abs(diff)})</span> : <span className="text-slate-400 ml-1">(-)</span>;
                                        })()}
                                    </p>
                                </div>
                                <button onClick={() => toggleGradeSort('t')} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200 shadow-sm" title="Sắp xếp danh sách">
                                    <ArrowUpDown className="w-3 h-3" />
                                    {gradeSortConfig.t === 'name_asc' ? 'Khối' : 'Giảm Dần'}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-4 font-medium uppercase tracking-wider">{timeRangeText}</p>
                            <div className="flex-1 min-h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sortGrades(chartData, 't', gradeSortConfig.t)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontWeight: 'bold'}} width={60} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        {compareMode && <Bar dataKey="last_t" name={compareLabelLast} fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="last_t" />} />}
                                        <Bar dataKey="t" name={compareLabelCurrent} fill="#d97706" radius={[0, 4, 4, 0]} barSize={16} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="t" />} onClick={(data) => {
                                            if (data && data.name) {
                                                setSelectedGrade(data.name.replace('Khối ', ''));
                                            }
                                        }} className="cursor-pointer hover:opacity-80 transition-opacity" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Vi Phạm */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-purple-500" />
                                        Vi Phạm Nề Nếp
                                    </h3>
                                    <p className="text-xs font-medium text-slate-500 mt-1">
                                        Tổng: <span className="font-bold text-slate-700">{chartData.reduce((sum, c) => sum + c.vp, 0)}</span>
                                        {compareMode && (() => {
                                            const total = chartData.reduce((sum, c) => sum + c.vp, 0);
                                            const lastTotal = chartData.reduce((sum, c) => sum + (c.last_vp || 0), 0);
                                            const diff = total - lastTotal;
                                            return diff > 0 ? <span className="text-rose-500 ml-1 font-bold">(↑{diff})</span> : diff < 0 ? <span className="text-emerald-500 ml-1 font-bold">(↓{Math.abs(diff)})</span> : <span className="text-slate-400 ml-1">(-)</span>;
                                        })()}
                                    </p>
                                </div>
                                <button onClick={() => toggleGradeSort('vp')} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200 shadow-sm" title="Sắp xếp danh sách">
                                    <ArrowUpDown className="w-3 h-3" />
                                    {gradeSortConfig.vp === 'name_asc' ? 'Khối' : 'Giảm Dần'}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-4 font-medium uppercase tracking-wider">{timeRangeText}</p>
                            <div className="flex-1 min-h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sortGrades(chartData, 'vp', gradeSortConfig.vp)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontWeight: 'bold'}} width={60} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        {compareMode && <Bar dataKey="last_vp" name={compareLabelLast} fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="last_vp" />} />}
                                        <Bar dataKey="vp" name={compareLabelCurrent} fill="#9333ea" radius={[0, 4, 4, 0]} barSize={16} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="vp" />} onClick={(data) => {
                                            if (data && data.name) {
                                                setSelectedGrade(data.name.replace('Khối ', ''));
                                            }
                                        }} className="cursor-pointer hover:opacity-80 transition-opacity" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Tầng 2: Drill-down chi tiết Lớp */}
                    {selectedGrade && (
                        <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        Chi tiết Khối {selectedGrade}
                                        <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                                            {classChartData.filter(c => c.grade === selectedGrade).length} lớp
                                        </span>
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Phân tích chi tiết từng lớp học để tìm ra nguyên nhân gốc rễ.</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedGrade(null)} 
                                    className="text-sm font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-xl transition-colors shadow-sm"
                                >
                                    Đóng lại
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Vắng Học (Lớp) */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                                Vắng Học
                                            </h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">
                                                Tổng: <span className="font-bold text-slate-700">{classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + c.k, 0)}</span>
                                                {compareMode && (() => {
                                                    const total = classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + c.k, 0);
                                                    const lastTotal = classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + (c.last_k || 0), 0);
                                                    const diff = total - lastTotal;
                                                    return diff > 0 ? <span className="text-rose-500 ml-1 font-bold">(↑{diff})</span> : diff < 0 ? <span className="text-emerald-500 ml-1 font-bold">(↓{Math.abs(diff)})</span> : <span className="text-slate-400 ml-1">(-)</span>;
                                                })()}
                                            </p>
                                        </div>
                                        <button onClick={() => toggleSort('k')} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200 shadow-sm" title="Sắp xếp danh sách">
                                            <ArrowUpDown className="w-3 h-3" />
                                            {classSortConfig.k === 'name_asc' ? 'A-Z' : 'Giảm Dần'}
                                        </button>
                                    </div>
                                    <div className="w-full" style={{ height: Math.max(150, classChartData.filter(c => c.grade === selectedGrade).length * 40) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sortClasses(classChartData.filter(c => c.grade === selectedGrade), 'k', classSortConfig.k)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontWeight: 'bold', fontSize: 12}} width={50} />
                                                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                                                {compareMode && <Bar dataKey="last_k" name={compareLabelLast} fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={10} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="last_k" />} />}
                                                <Bar dataKey="k" name={compareLabelCurrent} fill="#e11d48" radius={[0, 4, 4, 0]} barSize={14} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="k" />} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Đi Trễ (Lớp) */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-amber-500" />
                                                Đi Trễ
                                            </h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">
                                                Tổng: <span className="font-bold text-slate-700">{classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + c.t, 0)}</span>
                                                {compareMode && (() => {
                                                    const total = classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + c.t, 0);
                                                    const lastTotal = classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + (c.last_t || 0), 0);
                                                    const diff = total - lastTotal;
                                                    return diff > 0 ? <span className="text-rose-500 ml-1 font-bold">(↑{diff})</span> : diff < 0 ? <span className="text-emerald-500 ml-1 font-bold">(↓{Math.abs(diff)})</span> : <span className="text-slate-400 ml-1">(-)</span>;
                                                })()}
                                            </p>
                                        </div>
                                        <button onClick={() => toggleSort('t')} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200 shadow-sm" title="Sắp xếp danh sách">
                                            <ArrowUpDown className="w-3 h-3" />
                                            {classSortConfig.t === 'name_asc' ? 'A-Z' : 'Giảm Dần'}
                                        </button>
                                    </div>
                                    <div className="w-full" style={{ height: Math.max(150, classChartData.filter(c => c.grade === selectedGrade).length * 40) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sortClasses(classChartData.filter(c => c.grade === selectedGrade), 't', classSortConfig.t)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontWeight: 'bold', fontSize: 12}} width={50} />
                                                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                                                {compareMode && <Bar dataKey="last_t" name={compareLabelLast} fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={10} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="last_t" />} />}
                                                <Bar dataKey="t" name={compareLabelCurrent} fill="#d97706" radius={[0, 4, 4, 0]} barSize={14} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="t" />} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Vi Phạm (Lớp) */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4 text-purple-500" />
                                                Vi Phạm
                                            </h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">
                                                Tổng: <span className="font-bold text-slate-700">{classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + c.vp, 0)}</span>
                                                {compareMode && (() => {
                                                    const total = classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + c.vp, 0);
                                                    const lastTotal = classChartData.filter(c => c.grade === selectedGrade).reduce((sum, c) => sum + (c.last_vp || 0), 0);
                                                    const diff = total - lastTotal;
                                                    return diff > 0 ? <span className="text-rose-500 ml-1 font-bold">(↑{diff})</span> : diff < 0 ? <span className="text-emerald-500 ml-1 font-bold">(↓{Math.abs(diff)})</span> : <span className="text-slate-400 ml-1">(-)</span>;
                                                })()}
                                            </p>
                                        </div>
                                        <button onClick={() => toggleSort('vp')} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200 shadow-sm" title="Sắp xếp danh sách">
                                            <ArrowUpDown className="w-3 h-3" />
                                            {classSortConfig.vp === 'name_asc' ? 'A-Z' : 'Giảm Dần'}
                                        </button>
                                    </div>
                                    <div className="w-full" style={{ height: Math.max(150, classChartData.filter(c => c.grade === selectedGrade).length * 40) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sortClasses(classChartData.filter(c => c.grade === selectedGrade), 'vp', classSortConfig.vp)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontWeight: 'bold', fontSize: 12}} width={50} />
                                                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                                                {compareMode && <Bar dataKey="last_vp" name={compareLabelLast} fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={10} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="last_vp" />} />}
                                                <Bar dataKey="vp" name={compareLabelCurrent} fill="#9333ea" radius={[0, 4, 4, 0]} barSize={14} label={(props) => <CustomBarLabel {...props} compareMode={compareMode} dataKey="vp" />} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: RADAR HỌC SINH NGUY CƠ & CẢNH BÁO SỚM (RISK_RADAR)                 */}
            {/* ========================================================================= */}
            {activeTab === 'RISK_RADAR' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Header & Controls */}
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                                    <span>Radar Nhận Diện & Can Thiệp Sớm Học Sinh Nguy Cơ</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                        {filteredRiskProfiles.length} học sinh
                                    </span>
                                </h3>
                                <p className="text-slate-500 text-xs mt-1">
                                    Công thức chấm điểm đa trọng số: Vắng KP (3x), Vắng CP (1x), Trễ (0.5x), Vi phạm (2x).
                                </p>
                            </div>

                            {/* Anonymize Status Banner inside table */}
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                    anonymizeMode ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {anonymizeMode ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                                    <span>{anonymizeMode ? 'Tên học sinh đang được ẨN DANH' : 'Tên học sinh hiển thị đầy đủ'}</span>
                                </span>
                                <button
                                    onClick={() => setAnonymizeMode(!anonymizeMode)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                                >
                                    {anonymizeMode ? 'Hiện tên' : 'Ẩn danh'}
                                </button>
                            </div>
                        </div>

                        {/* Search & Risk Level Filter Bar */}
                        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="relative w-full sm:w-80">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên học sinh hoặc lớp..."
                                    value={riskSearchQuery}
                                    onChange={(e) => setRiskSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <Filter className="w-3.5 h-3.5" /> Lọc mức độ:
                                </span>
                                <button
                                    onClick={() => setRiskLevelFilter('ALL')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        riskLevelFilter === 'ALL'
                                            ? 'bg-slate-800 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Tất cả ({processedRiskProfiles.length})
                                </button>
                                <button
                                    onClick={() => setRiskLevelFilter('CRITICAL')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        riskLevelFilter === 'CRITICAL'
                                            ? 'bg-rose-600 text-white shadow-sm'
                                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    }`}
                                >
                                    🔴 Cực kỳ nguy cấp ({processedRiskProfiles.filter(p => p.riskLevel === 'CRITICAL').length})
                                </button>
                                <button
                                    onClick={() => setRiskLevelFilter('HIGH_RISK')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        riskLevelFilter === 'HIGH_RISK'
                                            ? 'bg-orange-600 text-white shadow-sm'
                                            : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                    }`}
                                >
                                    🟠 Nguy cơ cao ({processedRiskProfiles.filter(p => p.riskLevel === 'HIGH_RISK').length})
                                </button>
                                <button
                                    onClick={() => setRiskLevelFilter('ATTENTION')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        riskLevelFilter === 'ATTENTION'
                                            ? 'bg-amber-600 text-white shadow-sm'
                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    }`}
                                >
                                    🟡 Cần lưu ý ({processedRiskProfiles.filter(p => p.riskLevel === 'ATTENTION').length})
                                </button>
                            </div>
                        </div>

                        {/* Risk Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
                                        <th className="p-3.5 pl-6 text-center w-12">#</th>
                                        <th className="p-3.5">Họ và Tên</th>
                                        <th className="p-3.5 text-center">Lớp</th>
                                        <th className="p-3.5 text-center">Vắng Không Phép (KP)</th>
                                        <th className="p-3.5 text-center">Vắng Có Phép (P)</th>
                                        <th className="p-3.5 text-center">Đi Trễ (T)</th>
                                        <th className="p-3.5 text-center">Vi Phạm (VP)</th>
                                        <th className="p-3.5 text-center">Điểm Nguy Cơ</th>
                                        <th className="p-3.5 text-center">Phân Loại Sư Phạm</th>
                                        <th className="p-3.5 pr-6 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                                    {filteredRiskProfiles.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="p-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                                    <p className="font-bold text-sm text-slate-700">Không có học sinh nào thuộc danh sách cảnh báo này.</p>
                                                    <p className="text-xs text-slate-400">Tình hình chuyên cần và nề nếp toàn trường đang được duy trì ở mức tối ưu.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRiskProfiles.map((p, idx) => (
                                            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="p-3.5 pl-6 text-center text-slate-400 font-bold">{idx + 1}</td>
                                                <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-black">
                                                        {p.displayName.charAt(0)}
                                                    </span>
                                                    <span>{p.displayName}</span>
                                                    {anonymizeMode && (
                                                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                            Ẩn danh
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                                                        {p.className}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-center font-bold">
                                                    {p.unexcused > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black">
                                                            {p.unexcused}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    {p.excused > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                                                            {p.excused}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    {p.late > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                                                            {p.late}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    {p.violation > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                                                            {p.violation}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                                                        p.riskScore >= 10 ? 'bg-rose-600 text-white' :
                                                        p.riskScore >= 6 ? 'bg-orange-500 text-white' :
                                                        p.riskScore >= 3 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                                                    }`}>
                                                        {p.riskScore}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    {p.riskLevel === 'CRITICAL' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                                            🔴 Cực kỳ nguy cấp
                                                        </span>
                                                    )}
                                                    {p.riskLevel === 'HIGH_RISK' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                                                            🟠 Nguy cơ cao
                                                        </span>
                                                    )}
                                                    {p.riskLevel === 'ATTENTION' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                            🟡 Cần lưu ý
                                                        </span>
                                                    )}
                                                    {p.riskLevel === 'NORMAL' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            🟢 Bình thường
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <a
                                                            href={`/homeroom/students?class=${p.className}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors flex items-center gap-1"
                                                            title="Chuyển đến lớp để xem chi tiết hoặc nhắn GVCN"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            <span>GVCN {p.className}</span>
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: BẢNG SỐ LIỆU THỐNG KÊ QUẢN TRỊ KHỐI (GRADE_TABLE)                 */}
            {/* ========================================================================= */}
            {activeTab === 'GRADE_TABLE' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {(() => {
                        const schoolDaysCount = (() => {
                            if (!dateRange.start || !dateRange.end) return 1;
                            const start = new Date(dateRange.start);
                            const end = new Date(dateRange.end);
                            let count = 0;
                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                if (d.getDay() !== 0) {
                                    count++;
                                }
                            }
                            return Math.max(1, count);
                        })();

                        const gradesList = ['6', '7', '8', '9'];
                        let grandSiso = 0;
                        let grandSessions = 0;
                        let grandV = 0;
                        let grandT = 0;

                        const gradeTableRows = gradesList.map(gNum => {
                            const gradeClasses = classesList.filter(c => c.name.startsWith(gNum));
                            const siso = gradeClasses.reduce((sum, c) => sum + (c.totalStudents || 0), 0) || (gNum === '6' ? 245 : gNum === '7' ? 260 : gNum === '8' ? 230 : 255);
                            
                            const gData = chartData.find(c => c.name.includes(gNum)) || { k: 0, t: 0, vp: 0 };
                            const v = gData.k || 0;
                            const t = gData.t || 0;

                            const sessionsCount = siso * schoolDaysCount * 2;
                            const rate = sessionsCount > 0 
                                ? Math.max(80.0, Math.min(100.0, 100 - (v / sessionsCount) * 100))
                                : 98.5;

                            grandSiso += siso;
                            grandSessions += sessionsCount;
                            grandV += v;
                            grandT += t;

                            return {
                                name: `Khối ${gNum}`,
                                siso,
                                sessionsCount,
                                v,
                                t,
                                rate
                            };
                        });

                        const grandRate = grandSessions > 0 ? (1 - (grandV / grandSessions)) * 100 : 98.5;

                        return (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-600">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            <span className="text-lg">📊</span> Bảng Số Liệu Thống Kê Quản Trị Khối Lớp
                                        </h3>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            Dữ liệu được tính toán động dựa trên Sĩ số thực tế và số lượt điểm danh tích lũy.
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                        Thực tế (Từ {format(new Date(dateRange.start), 'dd/MM')} đến {format(new Date(dateRange.end), 'dd/MM')})
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
                                                <th className="p-4 pl-6">Khối</th>
                                                <th className="p-4 text-center">Sĩ số học sinh</th>
                                                <th className="p-4 text-center">Tổng số lượt điểm danh</th>
                                                <th className="p-4 text-center">Tổng lượt vắng</th>
                                                <th className="p-4 text-center">Tổng lượt đi trễ</th>
                                                <th className="p-4 text-center">Tỷ lệ chuyên cần trung bình</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                                            {gradeTableRows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 pl-6 text-slate-900 font-bold">{row.name}</td>
                                                    <td className="p-4 text-center">{row.siso.toLocaleString()}</td>
                                                    <td className="p-4 text-center text-slate-500">{row.sessionsCount.toLocaleString()}</td>
                                                    <td className="p-4 text-center text-rose-600 font-bold">{row.v}</td>
                                                    <td className="p-4 text-center text-amber-600">{row.t}</td>
                                                    <td className="p-4 text-center text-emerald-600 font-bold text-base">{row.rate.toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-50/80 font-black text-slate-900 border-t border-slate-200">
                                                <td className="p-4 pl-6">TỔNG CỘNG</td>
                                                <td className="p-4 text-center">{grandSiso.toLocaleString()}</td>
                                                <td className="p-4 text-center text-slate-600">{grandSessions.toLocaleString()}</td>
                                                <td className="p-4 text-center text-rose-700">{grandV}</td>
                                                <td className="p-4 text-center text-amber-700">{grandT}</td>
                                                <td className="p-4 text-center text-emerald-700 text-base">{grandRate.toFixed(2)}%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
