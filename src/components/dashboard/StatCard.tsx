import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
        isGoodDirection?: boolean; // Tăng vắng là xấu, giảm vắng là tốt
    };
    sparklineData?: number[];
    colorClass: string;
    className?: string;
}

export function StatCard({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    sparklineData,
    colorClass,
    className 
}: StatCardProps) {
    return (
        <div className={cn("bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group", className)}>
            {/* Background Decoration */}
            <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150", colorClass)} />
            
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-xl", colorClass, "bg-opacity-10 text-opacity-100")}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center space-x-1 text-sm font-semibold px-2 py-1 rounded-full",
                        trend.isGoodDirection ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                    )}>
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{Math.abs(trend.value)}{trend.value.toString().includes('.') ? '' : ''}</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-slate-500 font-medium text-sm mb-1">{title}</h3>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-black text-slate-800 tracking-tight">{value}</span>
                        {subtitle && (
                            <span className="text-sm text-slate-500 font-medium">{subtitle}</span>
                        )}
                    </div>
                    {trend?.label && (
                        <p className="text-xs text-slate-400 mt-2 font-medium">
                            {trend.label}
                        </p>
                    )}
                </div>
                
                {/* Tiny Sparkline */}
                {sparklineData && sparklineData.length > 1 && (
                    <div className="w-20 h-10 mb-2 opacity-50 grayscale group-hover:grayscale-0 transition-all duration-300">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                            <polyline 
                                fill="none" 
                                stroke={trend?.isGoodDirection ? "#10b981" : "#f43f5e"} 
                                strokeWidth="4" 
                                points={sparklineData.map((d, i) => {
                                    const max = Math.max(...sparklineData);
                                    const min = Math.min(...sparklineData);
                                    const range = max - min || 1;
                                    const x = (i / (sparklineData.length - 1)) * 100;
                                    const y = 100 - ((d - min) / range) * 80 - 10; // margin top/bottom 10
                                    return `${x},${y}`;
                                }).join(' ')}
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                            />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
