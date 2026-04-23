'use client';

import { useState, useEffect } from 'react';
import { Archive, Plus, AlertTriangle, ArrowRight, PlayCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { getAppSettings, createNewYear, purgeYear, getActiveYear, switchActiveYear } from '@/services/year-service';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export function YearTab() {
    const { appUser, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeYear, setActiveYear] = useState<string>('2025-2026');
    const [availableYears, setAvailableYears] = useState<string[]>(['2025-2026']);

    // New year form
    const [showNewYearForm, setShowNewYearForm] = useState(false);
    const [newYearInput, setNewYearInput] = useState('');
    const [optAutoGraduate, setOptAutoGraduate] = useState(true);
    const [optCopyClasses, setOptCopyClasses] = useState(true);

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const settings = await getAppSettings();
            if (settings) {
                setActiveYear(settings.activeYear || '2025-2026');
                setAvailableYears((settings as any).availableYears || [settings.activeYear || '2025-2026']);
            }

            // Suggest next year
            if (settings?.activeYear) {
                const parts = settings.activeYear.split('-');
                if (parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
                    const y1 = parseInt(parts[0]) + 1;
                    const y2 = parseInt(parts[1]) + 1;
                    setNewYearInput(`${y1}-${y2}`);
                }
            }
        } catch (error) {
            console.error('Lỗi tải cài đặt năm học:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNewYear = async () => {
        if (!appUser) return;

        // Basic validation
        if (!newYearInput.match(/^\d{4}-\d{4}$/)) {
            setMessage({ type: 'error', text: 'Định dạng năm học không hợp lệ. Vui lòng sử dụng định dạng YYYY-YYYY (Vd: 2026-2027)' });
            return;
        }

        if (availableYears.includes(newYearInput)) {
            setMessage({ type: 'error', text: 'Năm học này đã tồn tại trong hệ thống!' });
            return;
        }

        if (!confirm(`CẢNH BÁO: Bạn đang chuẩn bị tạo năm học mới ${newYearInput} và chuyển sang năm học này. Các thay đổi bao gồm cập nhật danh sách lớp và trạng thái học sinh (nếu chọn). Bạn có chắc chắn không?`)) {
            return;
        }

        setActionLoading(true);
        setMessage(null);

        try {
            const res = await createNewYear(
                appUser,
                newYearInput,
                activeYear,
                { autoGraduateGrade12: optAutoGraduate, copyClassStructure: optCopyClasses }
            );

            setMessage({
                type: 'success',
                text: `Chuyển năm học thành công! Đã tự động tốt nghiệp ${res.graduatedCount} học sinh. Năm học hiện tại là ${newYearInput}.`
            });
            setShowNewYearForm(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi tạo năm học mới' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSwitchYear = async (year: string) => {
        if (!confirm(`Bạn có muốn đổi năm học hiện tại sang ${year} không? Mọi dữ liệu hiển thị sẽ dựa trên năm này.`)) return;

        setActionLoading(true);
        try {
            await switchActiveYear(year);
            setMessage({ type: 'success', text: `Đã đổi năm học sang ${year} thành công!` });
            loadData();
            // Force reload to update context
            window.location.reload();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi đổi năm học.' });
        } finally {
            setActionLoading(false);
        }
    };

    if (authLoading) return null;

    if (appUser?.role !== 'admin' && appUser?.role !== 'principal') {
        return <div className="p-8 text-center text-gray-500">Bạn không có quyền truy cập chức năng này.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Archive className="text-blue-600" size={20} />
                        Quản lý Năm học
                    </h2>
                    <p className="text-sm text-gray-500">Thiết lập năm học hiện tại và chuẩn bị dữ liệu năm mới</p>
                </div>
            </div>

            {message && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                    message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    <span className="font-medium text-sm">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto text-xs underline opacity-70 hover:opacity-100">Đóng</button>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Current Year Card */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-10" />

                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Năm Học Hiện Tại</h3>

                    {loading ? (
                        <div className="h-16 flex items-center">
                            <Loader2 className="animate-spin text-blue-500" size={24} />
                        </div>
                    ) : (
                        <div className="flex items-end gap-3 mb-6">
                            <span className="text-4xl font-black text-gray-900 leading-none">{activeYear}</span>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-1 flex items-center gap-1">
                                <PlayCircle size={14} /> ACTIVE
                            </span>
                        </div>
                    )}

                    <p className="text-sm text-gray-600 mb-6">
                        Tất cả các chức năng điểm danh, quản lý học sinh và thống kê đang áp dụng cho năm học này.
                    </p>

                    <div className="pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-bold text-gray-800 mb-3">Chuyển sang năm học khác</h4>
                        <div className="flex flex-wrap gap-2">
                            {availableYears.map(year => (
                                <button
                                    key={year}
                                    disabled={year === activeYear || actionLoading}
                                    onClick={() => handleSwitchYear(year)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                        year === activeYear
                                            ? "bg-blue-50 text-blue-700 border-blue-200 cursor-default"
                                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50"
                                    )}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Create New Year Card */}
                <div className={cn(
                    "bg-white rounded-xl p-6 border shadow-sm transition-colors",
                    showNewYearForm ? "border-emerald-300 ring-1 ring-emerald-100" : "border-gray-200"
                )}>
                    {!showNewYearForm ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                <Archive size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Kết thúc Năm Học</h3>
                            <p className="text-sm text-gray-500 mb-6 max-w-[250px]">
                                Chuẩn bị hệ thống cho năm học mới. Cấu trúc lớp và học sinh có thể được chuyển sang tự động.
                            </p>
                            <button
                                onClick={() => setShowNewYearForm(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={18} />
                                Tạo Năm Học Mới
                            </button>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Plus className="text-emerald-600" size={20} />
                                Thiết lập Năm Học mới
                            </h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên năm học mới</label>
                                    <input
                                        type="text"
                                        value={newYearInput}
                                        onChange={e => setNewYearInput(e.target.value)}
                                        placeholder="Ví dụ: 2026-2027"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium"
                                    />
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Tuỳ chọn Chuyển Mạch</label>

                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <div className="flex items-center h-5">
                                            <input
                                                type="checkbox"
                                                checked={optCopyClasses}
                                                onChange={e => setOptCopyClasses(e.target.checked)}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Hiệu chỉnh Tên Lớp</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Tự động tăng khối (vd: 10A1 → 11A1, 11A2 → 12A2).</p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <div className="flex items-center h-5">
                                            <input
                                                type="checkbox"
                                                checked={optAutoGraduate}
                                                onChange={e => setOptAutoGraduate(e.target.checked)}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Tốt nghiệp Khối 12</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Tự động chuyển trạng thái học sinh khối 12 sang "Tốt nghiệp".</p>
                                        </div>
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setShowNewYearForm(false)}
                                        className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Huỷ bỏ
                                    </button>
                                    <button
                                        onClick={handleCreateNewYear}
                                        disabled={actionLoading || !newYearInput}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                        Thực thi
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
