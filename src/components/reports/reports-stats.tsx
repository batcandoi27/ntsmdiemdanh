"use client";

import { ReportResult } from "@/app/actions/report";
import { CheckCircle, AlertTriangle, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ReportsStatsProps {
    stats: { P?: number, K?: number, V?: number, T?: number, VP?: number, KH?: number, Total?: number };
    loading?: boolean;
}

export function ReportsStats({ stats, loading }: ReportsStatsProps) {
    if (loading) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>;

    const chartData = [
        { name: 'P', value: stats.P || 0, color: '#EAB308' },
        { name: 'K', value: stats.K || 0, color: '#EF4444' },
        { name: 'T', value: stats.T || 0, color: '#3B82F6' },
        { name: 'VP', value: stats.VP || 0, color: '#A855F7' },
        { name: 'KH', value: stats.KH || 0, color: '#F97316' },
    ].filter(d => d.value > 0);

    const hasData = chartData.length > 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {/* Total Card */}
            <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-start">
                <span className="text-gray-500 text-xs font-bold uppercase mb-1">Tổng Lượt</span>
                <div className="text-3xl font-black text-gray-800">{stats.Total}</div>
            </div>

            <StatCard label="Phép (P)" value={stats.P ?? 0} color="yellow" icon={<Clock size={16} />} />
            <StatCard label="Không (K)" value={stats.K ?? 0} color="red" icon={<Ban size={16} />} />
            <StatCard label="Trễ (T)" value={stats.T ?? 0} color="blue" icon={<AlertTriangle size={16} />} />
            <StatCard label="Khen (KH)" value={stats.KH ?? 0} color="orange" icon={<CheckCircle size={16} />} />
            <StatCard label="Vi Phạm (VP)" value={stats.VP ?? 0} color="purple" icon={<Ban size={16} />} />

            {/* Chart */}
            <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm relative h-[100px] min-w-0">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                            />
                            <Bar 
                                dataKey="value" 
                                radius={[0, 4, 4, 0]} 
                                barSize={12}
                                label={{ position: 'right', fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-300 text-[10px] font-bold uppercase tracking-widest">No Data</div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color, icon }: any) {
    const colors = {
        yellow: "text-yellow-600 bg-yellow-50 border-yellow-100",
        red: "text-red-600 bg-red-50 border-red-100",
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
    };

    return (
        <div className={cn("p-4 rounded-xl border shadow-sm flex flex-col justify-center items-start", colors[color as keyof typeof colors])}>
            <span className="text-[10px] font-bold uppercase mb-1 opacity-80 flex items-center gap-1">
                {icon} {label}
            </span>
            <div className="text-2xl font-black">{value}</div>
        </div>
    );
}
