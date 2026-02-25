"use client";

import { ReportResult } from "@/app/actions/report";
import { CheckCircle, AlertTriangle, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ReportsStatsProps {
    stats: ReportResult['summary'] | { P: 0, K: 0, V: 0, T: 0, VP: 0, KH: 0, Total: 0 };
    loading?: boolean;
}

export function ReportsStats({ stats, loading }: ReportsStatsProps) {
    if (loading) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>;

    const chartData = [
        { name: 'Phép', value: stats.P, color: '#EAB308' },
        { name: 'Không', value: stats.K, color: '#EF4444' },
        { name: 'Trễ', value: stats.T, color: '#3B82F6' },
        { name: 'Khen', value: stats.KH || 0, color: '#F97316' }, // Orange
        // { name: 'Vi Phạm', value: stats.VP, color: '#A855F7' }, 
    ].filter(d => d.value > 0);

    return (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {/* Total Card */}
            <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-start">
                <span className="text-gray-500 text-xs font-bold uppercase mb-1">Tổng Lượt</span>
                <div className="text-3xl font-black text-gray-800">{stats.Total}</div>
            </div>

            <StatCard label="Phép (P)" value={stats.P} color="yellow" icon={<Clock size={16} />} />
            <StatCard label="Không (K)" value={stats.K} color="red" icon={<Ban size={16} />} />
            <StatCard label="Trễ (T)" value={stats.T} color="blue" icon={<AlertTriangle size={16} />} />
            <StatCard label="Khen (KH)" value={stats.KH || 0} color="orange" icon={<CheckCircle size={16} />} />
            <StatCard label="Vi Phạm (VP)" value={stats.VP} color="purple" icon={<Ban size={16} />} />

            {/* Chart */}
            <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm relative h-[100px]">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={40}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-300 text-xs">No Data</div>
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
