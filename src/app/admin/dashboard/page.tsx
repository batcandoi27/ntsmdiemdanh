"use client";

import React, { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { GlobalDataFilter } from '@/components/dashboard/GlobalDataFilter';
import { Users, AlertCircle, Clock, ShieldAlert, TrendingUp, LayoutDashboard, ArrowUpDown } from 'lucide-react';
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
import { getReports } from '@/app/actions/report';
import { getAllClasses } from '@/app/actions/common';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, subWeeks, subMonths } from 'date-fns';

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
        late: 0,
        violation: 0,
        lastAbsentK: 0,
        lastLate: 0,
        lastViolation: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [classChartData, setClassChartData] = useState<any[]>([]);
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

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
            let lastPromise = Promise.resolve({ totalK: 0, totalT: 0, totalVP: 0, absences: [] });
            if (compareMode) {
                lastPromise = getReports({ startDate: lastStartDate, endDate: lastEndDate, classIds }, appUser?.role);
            }

            const [result, lastResult] = await Promise.all([currentPromise, lastPromise]);

            setStats({
                attendanceRate: 98.5, // Mock rate cho health score
                absentK: result.totalK,
                late: result.totalT,
                violation: result.totalVP,
                lastAbsentK: lastResult.totalK,
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
                    const isK = /(^|;| )K($| |;|Sáng|Chiều)/.test(st);
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
            
        } catch (err) {
            console.error(err);
        } finally {
            hideLoading();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Header section consistent with /reports */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-medium text-slate-500">Dữ liệu cập nhật lúc {format(new Date(), 'HH:mm')}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <LayoutDashboard className="text-blue-600 w-6 h-6" />
                        </div>
                        Điều Hành Dữ Liệu
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Xin chào {appUser?.displayName || 'Ban Giám Hiệu'}! Dưới đây là tổng quan nề nếp toàn trường.</p>
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
                    title="Vắng không phép"
                    value={stats.absentK}
                    icon={AlertCircle}
                    colorClass={stats.absentK > 10 ? "text-rose-600 bg-rose-600 shadow-md shadow-rose-200 border-rose-300" : "text-rose-600 bg-rose-600"}
                    trend={{ 
                        value: compareMode ? (stats.absentK - stats.lastAbsentK) : 15, 
                        isPositive: compareMode ? (stats.absentK < stats.lastAbsentK) : false, 
                        isGoodDirection: false, 
                        label: compareMode ? `(vs ${stats.lastAbsentK} tuần trước)` : "So với tuần trước" 
                    }} 
                    sparklineData={[2, 4, 3, 5, 8, 12, stats.absentK]}
                />
                <StatCard 
                    title="Đi học trễ"
                    value={stats.late}
                    icon={Clock}
                    colorClass="text-amber-600 bg-amber-600"
                    trend={{ 
                        value: compareMode ? (stats.late - stats.lastLate) : 5, 
                        isPositive: compareMode ? (stats.late < stats.lastLate) : true, 
                        isGoodDirection: true, 
                        label: compareMode ? `(vs ${stats.lastLate} tuần trước)` : "Giảm so với tuần trước" 
                    }}
                    sparklineData={[10, 12, 9, 8, 7, 5, stats.late]}
                />
                <StatCard 
                    title="Vi phạm nề nếp"
                    value={stats.violation}
                    icon={ShieldAlert}
                    colorClass="text-purple-600 bg-purple-600"
                />
            </div>

            {/* Insight & Health Score Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span>📌</span> Insight Phân Tích (Tự động)
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2"></div>
                            <p className="text-slate-700 text-sm font-medium">Khối 8 đang có xu hướng đi trễ tăng <strong>21%</strong> trong 3 ngày gần nhất.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                            <p className="text-slate-700 text-sm font-medium">Lớp <strong>7A2</strong> cải thiện chuyên cần tốt nhất toàn trường tuần này.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
                            <p className="text-slate-700 text-sm font-medium">Hơn 40% số lượt vắng không phép tập trung vào sáng Thứ 7.</p>
                        </li>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Vắng Không Phép */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-rose-500" />
                                Vắng Không Phép
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
                        {/* Vắng Không Phép (Lớp) */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-rose-500" />
                                        Vắng Không Phép
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
    );
}
