'use client';

import { useState, useEffect, useTransition } from 'react';
import { generateMockData, clearAttendance } from '@/app/actions/settings';
import { Settings, Database, Trash2, CheckCircle, AlertTriangle, RefreshCw, Lock, Sliders, BookOpen, Users, CalendarDays, Archive, Download, Key, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { FixedColumnsTab } from '@/components/settings/fixed-columns-tab';
import { CustomColumnsTab } from '@/components/settings/custom-columns-tab';
import { MyClassesTab } from '@/components/settings/my-classes-tab';
import { UserManagementTab } from '@/components/settings/user-management-tab';
import { TimetableTab } from '@/components/settings/timetable-tab';
import { YearTab } from '@/components/settings/year-tab';
import { ExportTab } from '@/components/settings/export-tab';
import { ApiTab } from '@/components/settings/api-tab';
import { FeatureFlagsTab } from '@/components/settings/feature-flags-tab';
import { ClassSizeTab } from '@/components/settings/class-size-tab';
import { useAuth } from '@/context/auth-context';
import { db } from '@/services/db';
import { Class } from '@/types/models';

type TabType = 'data' | 'fixed-columns' | 'custom-columns' | 'my-classes' | 'users' | 'timetable' | 'year' | 'export' | 'api' | 'feature-flags' | 'class-size';

export default function SettingsPage() {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('data');
    const [myClassIds, setMyClassIds] = useState<string[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);

    // States cho tính năng xoá dữ liệu mở rộng
    const [deleteStartDate, setDeleteStartDate] = useState('');
    const [deleteEndDate, setDeleteEndDate] = useState('');
    const [quickDeleteMode, setQuickDeleteMode] = useState<'this_week' | 'this_month' | 'all' | 'custom'>('this_month');

    const router = useRouter();
    const { appUser } = useAuth();

    useEffect(() => {
        // Initial load
        if (appUser) {
            loadMyClasses();
            loadClasses();
        }

        // Listen for updates from MyClassesTab
        const handleMyClassesUpdate = () => {
            loadMyClasses();
        };
        window.addEventListener('myClassesUpdated', handleMyClassesUpdate);
        return () => window.removeEventListener('myClassesUpdated', handleMyClassesUpdate);
    }, [appUser]);

    const loadClasses = async () => {
        try {
            const classList = await db.getClasses();
            setClasses(classList);
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    };

    const loadMyClasses = () => {
        const saved = localStorage.getItem(`myClasses_${appUser?.uid || 'guest'}`);
        if (saved) {
            try {
                setMyClassIds(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing myClasses', e);
                setMyClassIds([]);
            }
        } else {
            setMyClassIds([]);
        }
    };

    const selectedClasses = classes.filter(c => myClassIds.includes(c.id));

    // ... handleGenerate, handleClear ...
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

    // Initial setup cho ngày xoá mặc định
    useEffect(() => {
        handleQuickSelect('this_month');
    }, []);

    const handleQuickSelect = (mode: 'this_week' | 'this_month' | 'all') => {
        setQuickDeleteMode(mode);
        const today = new Date();

        if (mode === 'all') {
            setDeleteStartDate('');
            setDeleteEndDate('');
            return;
        }

        if (mode === 'this_week') {
            const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));
            const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 7));
            setDeleteStartDate(firstDay.toISOString().split('T')[0]);
            setDeleteEndDate(lastDay.toISOString().split('T')[0]);
        }

        if (mode === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setDeleteStartDate(firstDay.toISOString().split('T')[0]);
            setDeleteEndDate(lastDay.toISOString().split('T')[0]);
        }
    };

    const handleClear = () => {
        let confirmMsg = 'CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu điểm danh. Không thể khôi phục. Bạn có chắc chắn không?';

        if (quickDeleteMode !== 'all') {
            if (!deleteStartDate || !deleteEndDate) {
                setMessage({ type: 'error', text: 'Vui lòng chọn Từ ngày và Đến ngày hợp lệ.' });
                return;
            }
            confirmMsg = `XÁC NHẬN: Bạn sắp xoá dữ liệu điểm danh từ ngày ${deleteStartDate} đến ngày ${deleteEndDate}. Bạn có chắc chắn không?`;
        }

        if (!confirm(confirmMsg)) return;

        startTransition(async () => {
            const sd = quickDeleteMode === 'all' ? undefined : deleteStartDate;
            const ed = quickDeleteMode === 'all' ? undefined : deleteEndDate;

            const res = await clearAttendance(sd, ed, undefined);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        });
    };

    const tabs: { id: TabType; label: string; icon: any }[] = [];

    if (appUser?.role === 'admin' || appUser?.role === 'principal') {
        tabs.push({ id: 'data' as TabType, label: 'Dữ liệu', icon: Database });
        tabs.push({ id: 'timetable' as TabType, label: 'Thời khoá biểu', icon: CalendarDays });
        tabs.push({ id: 'year' as TabType, label: 'Năm học', icon: Archive });
        tabs.push({ id: 'export' as TabType, label: 'Xuất báo cáo', icon: Download });
        tabs.push({ id: 'class-size' as TabType, label: 'Sĩ số lớp', icon: Users });
        tabs.push({ id: 'feature-flags' as TabType, label: 'Tính năng', icon: ToggleRight });
    }

    tabs.push(
        { id: 'my-classes' as TabType, label: 'Lớp của tôi', icon: BookOpen },
        { id: 'fixed-columns' as TabType, label: 'Cột cố định', icon: Lock },
        { id: 'custom-columns' as TabType, label: 'Cột tùy chỉnh', icon: Sliders }
    );

    if (appUser?.role === 'admin' || appUser?.role === 'principal') {
        tabs.push({ id: 'users' as TabType, label: 'Người dùng', icon: Users });
    }

    if (appUser?.role === 'admin') {
        tabs.push({ id: 'api' as TabType, label: 'API Keys', icon: Key });
    }

    // Set default active tab efficiently if 'data' is not available
    useEffect(() => {
        if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [tabs, activeTab]);

    return (
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
                <div className="flex flex-wrap border-b border-gray-100 p-2 gap-1.5 bg-gray-50/50">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 py-2 px-3 rounded-xl font-bold transition-all text-xs md:text-sm",
                                activeTab === tab.id
                                    ? "text-blue-700 bg-white shadow-sm ring-1 ring-gray-200"
                                    : "text-gray-500 hover:text-gray-800 hover:bg-white/50"
                            )}
                        >
                            <tab.icon size={16} className={cn(activeTab === tab.id ? "text-blue-600" : "text-gray-400")} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Tab Content */}
                    {activeTab === 'data' && (
                        <div className="grid grid-cols-1 gap-6">
                            {/* Data Management Card */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                        <Database size={24} />
                                    </div>
                                    <h2 className="font-bold text-lg text-gray-800">Dữ Liệu Điểm Danh</h2>
                                </div>
                                <p className="text-gray-500 text-sm mb-6">
                                    Công cụ hỗ trợ tạo dữ liệu mẫu để kiểm thử hoặc xóa toàn bộ/một phần dữ liệu để làm mới hệ thống.
                                </p>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isPending}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-blue-200 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isPending ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
                                        Tạo Dữ Liệu Giả (Hôm nay)
                                    </button>

                                    <div className="bg-white p-4 rounded-xl border border-red-100 flex flex-col gap-4">
                                        <div className="flex items-center gap-2 text-red-600 font-semibold mb-1">
                                            <Trash2 size={18} />
                                            Xoá Dữ Liệu Điểm Danh
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className="flex-1">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Từ ngày</label>
                                                <input
                                                    type="date"
                                                    value={deleteStartDate}
                                                    onChange={e => {
                                                        setDeleteStartDate(e.target.value);
                                                        setQuickDeleteMode('custom');
                                                    }}
                                                    className="w-full text-sm border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Đến ngày</label>
                                                <input
                                                    type="date"
                                                    value={deleteEndDate}
                                                    onChange={e => {
                                                        setDeleteEndDate(e.target.value);
                                                        setQuickDeleteMode('custom');
                                                    }}
                                                    className="w-full text-sm border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 w-full">
                                            <button
                                                onClick={() => handleQuickSelect('this_week')}
                                                className={cn("flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-center whitespace-nowrap", quickDeleteMode === 'this_week' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                                            >Tuần này</button>
                                            <button
                                                onClick={() => handleQuickSelect('this_month')}
                                                className={cn("flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-center whitespace-nowrap", quickDeleteMode === 'this_month' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                                            >Tháng này</button>
                                            <button
                                                onClick={() => handleQuickSelect('all')}
                                                className={cn("flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-center whitespace-nowrap", quickDeleteMode === 'all' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                                            >Tất cả</button>
                                        </div>

                                        <button
                                            onClick={handleClear}
                                            disabled={isPending}
                                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-4 rounded-xl border border-red-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isPending ? <RefreshCw className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                            <span className="truncate">{quickDeleteMode === 'all' ? 'XÓA TOÀN BỘ' : 'Xóa Dữ Liệu'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'my-classes' && (
                        <MyClassesTab />
                    )}

                    {activeTab === 'users' && (
                        <UserManagementTab />
                    )}

                    {activeTab === 'timetable' && (
                        <TimetableTab />
                    )}

                    {activeTab === 'year' && (
                        <YearTab />
                    )}

                    {activeTab === 'export' && (
                        <ExportTab />
                    )}

                    {activeTab === 'api' && (
                        <ApiTab />
                    )}

                    {activeTab === 'fixed-columns' && (
                        <FixedColumnsTab classIds={myClassIds} selectedClasses={selectedClasses} />
                    )}

                    {activeTab === 'custom-columns' && (
                        <CustomColumnsTab classIds={myClassIds} selectedClasses={selectedClasses} />
                    )}

                    {activeTab === 'class-size' && (
                        <ClassSizeTab />
                    )}

                    {activeTab === 'feature-flags' && (
                        <FeatureFlagsTab />
                    )}

                    {(activeTab === 'fixed-columns' || activeTab === 'custom-columns') && myClassIds.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            Vui lòng chọn ít nhất một lớp trong tab "Lớp của tôi" để xem cài đặt.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
