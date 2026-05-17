"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Trophy, AlertOctagon } from 'lucide-react';
import { GlobalDataFilter } from '@/components/dashboard/GlobalDataFilter';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function TrendsPage() {
    const [loading, setLoading] = useState(true);
    const [classMetrics, setClassMetrics] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
    });
    const [filterMode, setFilterMode] = useState<'WEEK' | 'MONTH' | 'CUSTOM'>('MONTH');

    useEffect(() => {
        fetchClassMetrics();
    }, [dateRange]);

    const fetchClassMetrics = async () => {
        setLoading(true);
        try {
            // 1. Fetch Class Metrics
            const { data: metricsData, error: metricsError } = await supabase.from('view_class_metrics').select('*');
            
            if (!metricsError && metricsData && metricsData.length > 0) {
                // Fetch class names to map UUIDs
                const { data: classes } = await supabase.from('classes').select('id, name');
                
                const mappedMetrics = metricsData.map(m => {
                    const cls = classes?.find(c => c.id === m.class_id);
                    return {
                        ...m,
                        class_name: cls?.name || m.class_id
                    };
                });
                setClassMetrics(mappedMetrics);
            } else {
                setClassMetrics([]);
            }

            // 2. Fetch Daily Summary for Heatmap
            const { data: dailyData, error: dailyError } = await supabase
                .from('view_attendance_daily_summary')
                .select('date, absent_k_count')
                .gte('date', dateRange.start)
                .lte('date', dateRange.end);

            if (!dailyError && dailyData) {
                // Group by Day of Week (0 = Sunday, 1 = Monday...)
                const dayMap: Record<string, number> = { 'T2': 0, 'T3': 0, 'T4': 0, 'T5': 0, 'T6': 0, 'T7': 0 };
                
                dailyData.forEach(row => {
                    const d = new Date(row.date);
                    const day = d.getDay(); // 0 is Sunday, 1 is Monday
                    if (day >= 1 && day <= 6) {
                        const dayLabel = `T${day + 1}`; // T2 to T7
                        dayMap[dayLabel] += (row.absent_k_count || 0);
                    }
                });
                
                setHeatmapData(dayMap);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Tính toán Top Lớp tốt và Top Lớp vi phạm
    const sortedByGood = [...classMetrics].sort((a, b) => 
        (a.total_absent_k + a.total_late + a.total_violation) - (b.total_absent_k + b.total_late + b.total_violation)
    );
    const topGoodClasses = sortedByGood.slice(0, 3);
    
    const sortedByBad = [...classMetrics].sort((a, b) => 
        (b.total_absent_k + b.total_late + b.total_violation) - (a.total_absent_k + a.total_late + a.total_violation)
    );
    const topBadClasses = sortedByBad.slice(0, 3);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Phân tích & Thi đua</h2>
                    <p className="text-slate-500">Đánh giá mức độ hoàn thành chuyên cần giữa các lớp.</p>
                </div>
            </div>

            <GlobalDataFilter 
                dateRange={dateRange}
                setDateRange={setDateRange}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lớp thực hiện tốt */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center space-x-2 mb-6">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h3 className="text-lg font-bold text-slate-800">Top Lớp Nề Nếp Tốt</h3>
                    </div>
                    <div className="space-y-4">
                        {topGoodClasses.map((c, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 flex items-center justify-center bg-yellow-100 text-yellow-700 font-bold rounded-full text-sm">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <Link href={`/classes/${c.class_id}/dashboard`} className="font-bold text-slate-700 hover:text-blue-600 hover:underline transition-colors">{c.class_name}</Link>
                                        {/* Mock Ranking Change */}
                                        <span className="text-[10px] font-bold text-emerald-600 animate-in slide-in-from-bottom-2 fade-in duration-500">
                                            {idx === 0 ? '↑ +2 bậc' : idx === 2 ? '↑ +1 bậc' : '— giữ hạng'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-500 flex space-x-4">
                                    <span>Vắng: <strong className="text-slate-700">{c.total_absent_k}</strong></span>
                                    <span>Trễ: <strong className="text-slate-700">{c.total_late}</strong></span>
                                </div>
                            </div>
                        ))}
                        {loading && <div className="text-center text-slate-400 py-4">Đang tải...</div>}
                    </div>
                </div>

                {/* Lớp vi phạm nhiều */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center space-x-2 mb-6">
                        <AlertOctagon className="w-5 h-5 text-rose-500" />
                        <h3 className="text-lg font-bold text-slate-800">Lớp Cần Cải Thiện</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                                    <th className="p-3 font-semibold rounded-tl-xl">Lớp</th>
                                    <th className="p-3 font-semibold text-center">Vắng KP</th>
                                    <th className="p-3 font-semibold text-center">Trễ</th>
                                    <th className="p-3 font-semibold text-right rounded-tr-xl">So với Tuần Trước</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {topBadClasses.map((c, idx) => (
                                    <tr key={idx} className="hover:bg-rose-50 transition-colors group">
                                        <td className="p-3 font-medium">
                                            <Link href={`/classes/${c.class_id}/dashboard`} className="text-slate-800 font-bold group-hover:text-blue-600 transition-colors">
                                                {c.class_name}
                                            </Link>
                                        </td>
                                        <td className="p-3 text-center text-rose-600 font-bold">{c.total_absent_k}</td>
                                        <td className="p-3 text-center text-amber-600 font-bold">{c.total_late}</td>
                                        <td className="p-3 text-right">
                                            <span className="inline-flex items-center space-x-1 text-rose-600 bg-rose-100 px-2 py-1 rounded-md text-xs font-bold">
                                                ↑ +{Math.floor(Math.random() * 20) + 10}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-slate-400">Đang tải...</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Heatmap đơn giản */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Bản Đồ Nhiệt Vắng Học (KP)</h3>
                 <p className="text-sm text-slate-500 mb-6">Mức độ vắng học Không Phép theo các thứ trong tuần.</p>
                 <div className="flex flex-wrap gap-2">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => {
                        const count = heatmapData[day] || 0;
                        // Logic tô màu đơn giản: càng vắng nhiều màu càng đỏ đậm, ít thì xanh
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
                                    <div className="flex justify-between mb-1"><span>Vắng KP:</span> <span className="font-bold">{count}</span></div>
                                    <div className="flex justify-between mb-1"><span>Đi trễ:</span> <span className="font-bold">~</span></div>
                                    <div className="w-full h-px bg-slate-700 my-2"></div>
                                    <div className={cn("font-semibold text-right", count > 10 ? "text-rose-400" : "text-emerald-400")}>
                                        {count > 10 ? `↑ Cao hơn TB tuần` : `↓ Thấp hơn TB tuần`}
                                    </div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>
    );
}
