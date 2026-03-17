'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { fetchAppSettings, updateAppSettings, updateManualClassSizes, getClassesList } from '@/app/actions/settings';
import { AppSettings, Class } from '@/types/models';
import { Users, Save, RefreshCw, AlertTriangle, CheckCircle, Search, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_YEAR } from '@/config/constants';

export function ClassSizeTab() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [adjustments, setAdjustments] = useState<Record<string, number>>({});
    const [storagePath, setStoragePath] = useState<string | undefined>(undefined);
    const initialLoadDone = useRef(false);

    useEffect(() => {
        if (!initialLoadDone.current) {
            loadInitialData();
            initialLoadDone.current = true;
        }
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const classesRes = await getClassesList();

            if (classesRes.success && classesRes.classes) {
                setClasses(classesRes.classes);
                setStoragePath((classesRes as any).storagePath);
                
                const adj: Record<string, number> = {};
                classesRes.classes.forEach(c => {
                    adj[c.id] = c.adjustmentCount || 0;
                });
                setAdjustments(adj);
            } else if (!classesRes.success) {
                setMessage({ type: 'error', text: classesRes.message || 'Không thể tải danh sách lớp.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi hệ thống khi tải dữ liệu.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAdjustment = (classId: string, value: string) => {
        const numValue = parseInt(value) || 0;
        setAdjustments(prev => ({ ...prev, [classId]: numValue }));
    };

    const handleSaveAdjustments = async () => {
        if (!confirm('Xác nhận lưu thay đổi biến động sĩ số cho toàn bộ các lớp?')) return;

        startTransition(async () => {
            const year = DEFAULT_YEAR;
            const updates = Object.entries(adjustments).map(([id, adj]) => ({
                id,
                adjustmentCount: adj
            }));

            const res = await updateManualClassSizes(year, updates, storagePath);
            if (res.success) {
                setMessage({ type: 'success', text: 'Đã cập nhật biến động sĩ số thành công.' });
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        });
    };

    const filteredClasses = classes.filter(c => {
        const nameMatch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const idMatch = (c.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || idMatch;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <RefreshCw className="animate-spin" size={32} />
                <p>Đang tải dữ liệu sĩ số...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Notification */}
            {message && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-3",
                    message.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span className="font-medium">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto text-sm underline opacity-70">Đóng</button>
                </div>
            )}

            {/* Config Header */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Users className="text-blue-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-800">Cấu Hình Sĩ Số</h2>
                        </div>
                        <p className="text-gray-500 text-sm">Quản lý biến động sĩ số so với danh sách học sinh thực tế.</p>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-800">
                    <HelpCircle className="flex-shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                        <p><strong>Cấu hình Sĩ số:</strong> Hệ thống luôn lấy sĩ số từ danh sách học sinh (active + temporary_leave).</p>
                        <p><strong>Biến động:</strong> Dùng để hiệu chỉnh sĩ số (tăng + hoặc giảm -) khi cần khớp với sổ cái hoặc sĩ số thực tế tại lớp mà không cần thay đổi danh sách học sinh.</p>
                        <p><strong>Công thức:</strong> Sĩ số thực tế = Sĩ số theo danh sách (gồm cả nghỉ học) + Biến động.</p>
                    </div>
                </div>
            </div>

            {/* Adjustment List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-4 bg-gray-50/30">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm lớp (6A1...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSaveAdjustments}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-blue-300 shadow-sm shadow-blue-200"
                    >
                        {isPending ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Lưu Tất Cả
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">Lớp</th>
                                <th className="px-6 py-4">Khối</th>
                                <th className="px-6 py-4">Sĩ số danh sách</th>
                                <th className="px-6 py-4">Biến động (+/-)</th>
                                <th className="px-6 py-4">Sĩ số thực tế</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredClasses.map((cls) => {
                                const adj = adjustments[cls.id] || 0;
                                const listCount = cls.actualStudentCount || 0;
                                const actualSize = listCount + adj;
                                
                                return (
                                    <tr key={cls.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-gray-800">{cls.name}</td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">Khối {cls.grade}</td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            {listCount} HS
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={adj}
                                                    onChange={(e) => handleUpdateAdjustment(cls.id, e.target.value)}
                                                    className={cn(
                                                        "w-24 px-3 py-1.5 rounded-lg border outline-none focus:ring-2 transition-all font-bold text-center text-blue-600",
                                                        adj > 0 ? "border-green-300 bg-green-50 focus:ring-green-100" : 
                                                        adj < 0 ? "border-red-300 bg-red-50 focus:ring-red-100" : 
                                                        "border-gray-200 focus:ring-blue-100 focus:border-blue-300"
                                                    )}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold",
                                                adj !== 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                                            )}>
                                                {actualSize} HS
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                {adj !== 0 ? (
                                                    <span className="text-amber-500 text-[10px] bg-amber-50 px-2 py-1 rounded-full font-bold uppercase border border-amber-100 flex items-center gap-1">
                                                        <AlertTriangle size={12} /> Có điều chỉnh
                                                    </span>
                                                ) : (
                                                    <span className="text-green-500 text-[10px] bg-green-50 px-2 py-1 rounded-full font-bold uppercase border border-green-100 flex items-center gap-1">
                                                        <CheckCircle size={12} /> Khớp danh sách
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredClasses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-400">
                                        Không tìm thấy lớp nào khớp với từ khóa.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
