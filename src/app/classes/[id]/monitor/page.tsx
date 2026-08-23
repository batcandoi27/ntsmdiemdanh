'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCustomColumns, getExpiredColumns, archiveColumn } from '@/services/column-service';
import { Column } from '@/types/models';
import { ArrowLeft, Clock, CheckSquare, ChevronRight, Loader2, Calendar, Archive, Eye, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBookTheme } from '@/lib/book-themes';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export default function ClassMonitorPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;
    const { appUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [periodColumns, setPeriodColumns] = useState<Column[]>([]);
    const [oneTimeColumns, setOneTimeColumns] = useState<Column[]>([]);
    const [expiredColumns, setExpiredColumns] = useState<Column[]>([]);

    useEffect(() => {
        loadData();
    }, [classId, appUser]);

    const loadData = async () => {
        try {
            const [allColumns, expired] = await Promise.all([
                getCustomColumns(classId, appUser?.uid),
                getExpiredColumns(classId, appUser?.uid)
            ]);
            setPeriodColumns(allColumns.filter(c => c.frequency === 'period' && !c.archived));
            setOneTimeColumns(allColumns.filter(c => c.frequency === 'one_time' && !c.archived));
            setExpiredColumns(expired);
        } catch (error) {
            console.error('Error loading monitor data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (col: Column) => {
        if (!confirm(`Bạn có chắc muốn lưu trữ cột "${col.name}"? Nó sẽ ẩn khỏi màn hình theo dõi.`)) return;
        try {
            await archiveColumn(col.id);
            await loadData();
        } catch (error) {
            console.error('Error archiving column:', error);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/70 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 p-4 flex items-center gap-3 shadow-sm">
                <button
                    onClick={() => router.push(`/classes/${classId}`)}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-black text-lg text-gray-800 tracking-tight">Theo Dõi & Thu Phí</h1>
            </div>

            <div className="p-4 space-y-6 max-w-5xl mx-auto">
                {/* Expired Banner */}
                {expiredColumns.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-1.5">
                            <Archive size={18} className="text-amber-600" />
                            Đề xuất lưu trữ
                        </h3>
                        <p className="text-xs text-amber-800 mb-3">
                            Các cột sau đã kết thúc thời gian theo dõi. Bạn có muốn chuyển vào kho lưu trữ?
                        </p>
                        <div className="space-y-2">
                            {expiredColumns.map(col => (
                                <div key={col.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{col.name}</div>
                                        <div className="text-xs text-gray-500">
                                            Hết hạn: {col.periodConfig ? new Date(col.periodConfig.endDate).toLocaleDateString('vi-VN') : 'N/A'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleArchive(col)}
                                        className="text-xs bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-200 font-bold transition-colors shadow-xs"
                                    >
                                        Lưu trữ ngay
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Period Columns Section */}
                <div className="space-y-3">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
                        <Clock size={15} className="text-indigo-600" />
                        <span>Sổ Theo Giai Đoạn (Tháng / Học Kỳ)</span>
                        <span className="text-[11px] font-bold text-slate-400">({periodColumns.length})</span>
                    </h2>

                    {periodColumns.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">Chưa có sổ theo dõi giai đoạn nào.</p>
                            <Link href="/settings" className="text-blue-600 text-xs font-bold hover:underline mt-2 inline-block">
                                + Tạo sổ mới trong Cài đặt
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {periodColumns.map((col, idx) => {
                                const theme = getBookTheme(idx, col.id || col.name);
                                return (
                                    <Link
                                        key={col.id}
                                        href={`/classes/${classId}/monitor/${col.id}`}
                                        className={cn(
                                            "block rounded-2xl border p-4 shadow-sm active:scale-[0.99] transition-all hover:shadow-md",
                                            theme.bgGradient,
                                            theme.borderColor,
                                            theme.borderLeftAccent
                                        )}
                                    >
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="space-y-1.5 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className={cn("font-black text-base sm:text-lg tracking-tight", theme.titleColor)}>
                                                        {col.name}
                                                    </h3>
                                                    {col.isSharedWithParents && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                                            <Eye size={11} />
                                                            <span>Portal PH</span>
                                                        </span>
                                                    )}
                                                    {col.paymentConfig?.enabled && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                                                            <CreditCard size={11} />
                                                            <span>VietQR ({col.paymentConfig.recipientType === 'teacher' ? 'GV' : 'Trường'})</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                                                    <Calendar size={13} className={theme.iconColor} />
                                                    <span>
                                                        {col.periodConfig
                                                            ? `${new Date(col.periodConfig.startDate).toLocaleDateString('vi-VN')} - ${new Date(col.periodConfig.endDate).toLocaleDateString('vi-VN')}`
                                                            : 'Chưa cấu hình thời gian'}
                                                    </span>
                                                </div>

                                                {col.subPeriods && col.subPeriods.length > 0 && (
                                                    <div className="pt-1 flex gap-1.5 flex-wrap">
                                                        {col.subPeriods.slice(0, 4).map(sub => (
                                                            <span
                                                                key={sub.id}
                                                                className={cn(
                                                                    "text-[11px] px-2.5 py-0.5 rounded-lg border shadow-2xs",
                                                                    theme.badgeBg,
                                                                    theme.badgeText,
                                                                    theme.badgeBorder
                                                                )}
                                                            >
                                                                {sub.label}
                                                            </span>
                                                        ))}
                                                        {col.subPeriods.length > 4 && (
                                                            <span className="text-[11px] bg-white/90 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 font-bold shadow-2xs">
                                                                +{col.subPeriods.length - 4} kỳ khác
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={cn("p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs shrink-0 transition-transform group-hover:translate-x-1", theme.iconColor)}>
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* One-Time Columns Section */}
                <div className="space-y-3 pt-2">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
                        <CheckSquare size={15} className="text-emerald-600" />
                        <span>Sổ Nhiệm Vụ Một Lần & Thu Phí Khác</span>
                        <span className="text-[11px] font-bold text-slate-400">({oneTimeColumns.length})</span>
                    </h2>

                    {oneTimeColumns.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">Chưa có sổ nhiệm vụ một lần nào.</p>
                            <Link href="/settings" className="text-blue-600 text-xs font-bold hover:underline mt-2 inline-block">
                                + Tạo sổ mới trong Cài đặt
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {oneTimeColumns.map((col, idx) => {
                                // Offset index to ensure different colors from period columns
                                const theme = getBookTheme(idx + 3, col.id || col.name);
                                return (
                                    <Link
                                        key={col.id}
                                        href={`/classes/${classId}/monitor/${col.id}`}
                                        className={cn(
                                            "block rounded-2xl border p-4 shadow-sm active:scale-[0.99] transition-all hover:shadow-md",
                                            theme.bgGradient,
                                            theme.borderColor,
                                            theme.borderLeftAccent
                                        )}
                                    >
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="space-y-1.5 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className={cn("font-black text-base sm:text-lg tracking-tight", theme.titleColor)}>
                                                        {col.name}
                                                    </h3>
                                                    {col.isSharedWithParents && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                                            <Eye size={11} />
                                                            <span>Portal PH</span>
                                                        </span>
                                                    )}
                                                    {col.paymentConfig?.enabled && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                                                            <CreditCard size={11} />
                                                            <span>VietQR ({col.paymentConfig.recipientType === 'teacher' ? 'GV' : 'Trường'})</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-xs text-slate-600 font-medium">
                                                    {col.suggestions.length > 0
                                                        ? `${col.suggestions.length} tùy chọn ghi nhận nhanh (${col.suggestions.slice(0, 3).join(', ')}...)`
                                                        : 'Check hoàn thành / chưa hoàn thành (Một lần)'}
                                                </div>
                                            </div>

                                            <div className={cn("p-2 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs shrink-0 transition-transform group-hover:translate-x-1", theme.iconColor)}>
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

