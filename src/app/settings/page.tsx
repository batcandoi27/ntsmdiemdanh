'use client';

import { useState, useEffect, useTransition } from 'react';
import { generateMockData, clearAttendance } from '@/app/actions/settings';
import { Settings, Database, Trash2, CheckCircle, AlertTriangle, RefreshCw, Lock, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { PasswordGuard } from '@/components/auth/password-guard';
import { FixedColumnsTab } from '@/components/settings/fixed-columns-tab';
import { CustomColumnsTab } from '@/components/settings/custom-columns-tab';
import { FirebaseAdapter } from '@/services/firebase-adapter';
import { Class } from '@/types/models';
import { initializeFixedColumns } from '@/services/column-service';

type TabType = 'data' | 'fixed-columns' | 'custom-columns';

export default function SettingsPage() {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('data');
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        try {
            const adapter = new FirebaseAdapter();
            const classList = await adapter.getClasses();
            setClasses(classList);
            if (classList.length > 0 && !selectedClassId) {
                setSelectedClassId(classList[0].id);
                // Auto-initialize fixed columns for the class
                await initializeFixedColumns(classList[0].id);
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    };

    const handleClassChange = async (classId: string) => {
        setSelectedClassId(classId);
        // Initialize fixed columns for this class if needed
        await initializeFixedColumns(classId);
    };

    const handleGenerate = () => {
        if (!confirm('Bạn có chắc muốn tạo dữ liệu giả? Dữ liệu cũ (nếu có trùng ngày) có thể bị ghi đè.')) return;

        startTransition(async () => {
            const startDate = new Date().toISOString().slice(0, 10);
            const endDate = startDate;
            const res = await generateMockData(startDate, endDate, []);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        });
    };

    const handleClear = () => {
        if (!confirm('CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu điểm danh. Không thể khôi phục. Bạn có chắc chắn không?')) return;

        startTransition(async () => {
            const res = await clearAttendance(undefined, undefined, undefined);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        });
    };

    const tabs = [
        { id: 'data' as TabType, label: 'Dữ liệu', icon: Database },
        { id: 'fixed-columns' as TabType, label: 'Cột cố định', icon: Lock },
        { id: 'custom-columns' as TabType, label: 'Cột tùy chỉnh', icon: Sliders },
    ];

    return (
        <PasswordGuard>
            <div className="p-6 md:p-8 min-h-screen bg-gray-50/50 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="text-gray-700" size={28} />
                        Cài Đặt Hệ Thống
                    </h1>
                    <p className="text-gray-500 text-sm">Quản lý dữ liệu và cấu hình ứng dụng</p>
                </div>

                {/* Notification */}
                {message && (
                    <div className={cn(
                        "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                        message.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                    )}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <span className="font-medium">{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-auto text-sm underline opacity-70 hover:opacity-100">Đóng</button>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex border-b border-gray-100">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-4 px-4 font-medium transition-all",
                                    activeTab === tab.id
                                        ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                )}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* Class Selector for Column Tabs */}
                        {(activeTab === 'fixed-columns' || activeTab === 'custom-columns') && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn lớp</label>
                                <select
                                    value={selectedClassId}
                                    onChange={e => handleClassChange(e.target.value)}
                                    className="w-full md:w-64 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Tab Content */}
                        {activeTab === 'data' && (
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Data Management Card */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                            <Database size={24} />
                                        </div>
                                        <h2 className="font-bold text-lg text-gray-800">Dữ Liệu Điểm Danh</h2>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">
                                        Công cụ hỗ trợ tạo dữ liệu mẫu để kiểm thử hoặc xóa toàn bộ dữ liệu để làm mới hệ thống.
                                    </p>

                                    <div className="space-y-3">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={isPending}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-blue-200 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isPending ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
                                            Tạo Dữ Liệu Giả (Hôm nay)
                                        </button>

                                        <button
                                            onClick={handleClear}
                                            disabled={isPending}
                                            className="w-full bg-white hover:bg-red-50 text-red-600 font-bold py-3 px-4 rounded-xl border-2 border-red-100 hover:border-red-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} />
                                            Xóa Tất Cả Dữ Liệu
                                        </button>
                                    </div>
                                </div>

                                {/* System Info Card */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 opacity-60">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                                            <Settings size={24} />
                                        </div>
                                        <h2 className="font-bold text-lg text-gray-800">Cấu Hình Chung</h2>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">
                                        Các cài đặt về năm học, học kỳ và thông tin trường học.
                                    </p>

                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-500">Năm học</span>
                                            <span className="font-medium">2025 - 2026</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-500">Học kỳ</span>
                                            <span className="font-medium">Học kỳ 2</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-gray-100">
                                            <span className="text-gray-500">Phiên bản</span>
                                            <span className="font-medium">v2.0.0 (Custom Columns)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'fixed-columns' && selectedClassId && (
                            <FixedColumnsTab classId={selectedClassId} />
                        )}

                        {activeTab === 'custom-columns' && selectedClassId && (
                            <CustomColumnsTab classId={selectedClassId} />
                        )}

                        {(activeTab === 'fixed-columns' || activeTab === 'custom-columns') && classes.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                Chưa có lớp học nào. Vui lòng tạo lớp học trước.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PasswordGuard>
    );
}
