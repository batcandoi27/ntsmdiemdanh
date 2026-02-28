'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCustomColumns, getExpiredColumns, archiveColumn } from '@/services/column-service';
import { Column } from '@/types/models';
import { ArrowLeft, Clock, CheckSquare, ChevronRight, Loader2, Calendar, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 p-4 flex items-center gap-3 shadow-sm">
                <button
                    onClick={() => router.push(`/classes/${classId}`)}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-bold text-lg text-gray-800">Theo Dõi & Thu Phí</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Expired Banner */}
                {expiredColumns.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-2">
                            <Archive size={18} />
                            Đề xuất lưu trữ
                        </h3>
                        <p className="text-sm text-yellow-700 mb-3">
                            Các cột sau đã kết thúc thời gian theo dõi. Bạn có muốn lưu trữ?
                        </p>
                        <div className="space-y-2">
                            {expiredColumns.map(col => (
                                <div key={col.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-100">
                                    <div>
                                        <div className="font-bold text-gray-800">{col.name}</div>
                                        <div className="text-xs text-gray-500">
                                            Hết hạn: {col.periodConfig ? new Date(col.periodConfig.endDate).toLocaleDateString('vi-VN') : 'N/A'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleArchive(col)}
                                        className="text-xs bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg hover:bg-yellow-200 font-bold transition-colors"
                                    >
                                        Lưu trữ ngay
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Period Columns Section */}
                <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Clock size={16} />
                        Theo Giai Đoạn (Tháng/Kỳ)
                    </h2>

                    {periodColumns.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">Chưa có cột theo dõi giai đoạn nào.</p>
                            <Link href="/settings" className="text-blue-600 text-sm font-medium hover:underline mt-2 inline-block">
                                + Tạo trong Cài đặt
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {periodColumns.map(col => (
                                <Link
                                    key={col.id}
                                    href={`/classes/${classId}/monitor/${col.id}`}
                                    className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm active:scale-[0.98] transition-all hover:border-blue-200 hover:shadow-md"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg mb-1">{col.name}</h3>
                                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                                <Calendar size={14} />
                                                {col.periodConfig
                                                    ? `${new Date(col.periodConfig.startDate).toLocaleDateString('vi-VN')} - ${new Date(col.periodConfig.endDate).toLocaleDateString('vi-VN')}`
                                                    : 'Chưa cấu hình thời gian'}
                                            </div>
                                            {col.subPeriods && col.subPeriods.length > 0 && (
                                                <div className="mt-2 flex gap-1 flex-wrap">
                                                    {col.subPeriods.slice(0, 3).map(sub => (
                                                        <span key={sub.id} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                                                            {sub.label}
                                                        </span>
                                                    ))}
                                                    {col.subPeriods.length > 3 && (
                                                        <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                                                            +{col.subPeriods.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight className="text-gray-400" size={20} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* One-Time Columns Section */}
                <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckSquare size={16} />
                        Nhiệm Vụ Một Lần
                    </h2>

                    {oneTimeColumns.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">Chưa có cột nhiệm vụ một lần nào.</p>
                            <Link href="/settings" className="text-blue-600 text-sm font-medium hover:underline mt-2 inline-block">
                                + Tạo trong Cài đặt
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {oneTimeColumns.map(col => (
                                <Link
                                    key={col.id}
                                    href={`/classes/${classId}/monitor/${col.id}`}
                                    className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm active:scale-[0.98] transition-all hover:border-blue-200 hover:shadow-md"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg mb-1">{col.name}</h3>
                                            <div className="text-sm text-gray-500">
                                                {col.suggestions.length > 0
                                                    ? `${col.suggestions.length} tùy chọn trạng thái`
                                                    : 'Check hoàn thành / chưa hoàn thành'}
                                            </div>
                                        </div>
                                        <ChevronRight className="text-gray-400" size={20} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
