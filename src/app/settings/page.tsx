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
import { SubjectsTab } from '@/components/settings/subjects-tab';
import { TeacherGroupsTab } from '@/components/settings/teacher-groups-tab';
import { TenantSetupTab } from '@/components/settings/tenant-setup-tab';
import { DataBackupTab } from '@/components/settings/data-backup-tab';
import { School } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/services/db';
import { Class } from '@/types/models';
import { TeacherGroup } from '@/types/teacher';
import { getAllGroups } from '@/services/teacher-service';

type TabType = 'tenant-setup' | 'data' | 'subjects' | 'teacher-groups' | 'fixed-columns' | 'custom-columns' | 'my-classes' | 'users' | 'timetable' | 'year' | 'export' | 'api' | 'feature-flags' | 'class-size';

export default function SettingsPage() {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('data');
    const [myClassIds, setMyClassIds] = useState<string[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);

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
            if (appUser.role === 'admin' || appUser.role === 'principal') {
                loadTeacherGroups();
            }
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

    const loadTeacherGroups = async () => {
        try {
            const groups = await getAllGroups();
            setTeacherGroups(groups);
        } catch (error) {
            console.error('Error loading teacher groups:', error);
        }
    };

    const loadMyClasses = () => {
        const saved = localStorage.getItem(`myClasses_${appUser?.uid || 'guest'}`) || localStorage.getItem('my-classes');
        if (saved) {
            try {
                setMyClassIds(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing myClasses', e);
                setMyClassIds(appUser?.assignedClassIds || []);
            }
        } else if (appUser?.assignedClassIds && appUser.assignedClassIds.length > 0) {
            setMyClassIds(appUser.assignedClassIds);
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
        tabs.push({ id: 'tenant-setup' as TabType, label: 'Trường học & Bot Zalo', icon: School });
        tabs.push({ id: 'data' as TabType, label: 'Dữ liệu', icon: Database });
        tabs.push({ id: 'timetable' as TabType, label: 'Thời khoá biểu', icon: CalendarDays });
        tabs.push({ id: 'year' as TabType, label: 'Năm học', icon: Archive });
        tabs.push({ id: 'export' as TabType, label: 'Xuất báo cáo', icon: Download });
        tabs.push({ id: 'class-size' as TabType, label: 'Sĩ số lớp', icon: Users });
        tabs.push({ id: 'feature-flags' as TabType, label: 'Tính năng', icon: ToggleRight });
        tabs.push({ id: 'subjects' as TabType, label: 'Môn học', icon: BookOpen });
        tabs.push({ id: 'teacher-groups' as TabType, label: 'Nhóm Giáo viên', icon: Users });
    }

    tabs.push(
        { id: 'my-classes' as TabType, label: 'Lớp của tôi', icon: BookOpen },
        { id: 'fixed-columns' as TabType, label: 'Gợi ý điểm danh', icon: Lock },
        { id: 'custom-columns' as TabType, label: 'Sổ Theo dõi', icon: Sliders }
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
                    {activeTab === 'tenant-setup' && (
                        <TenantSetupTab />
                    )}

                    {activeTab === 'data' && (
                        <DataBackupTab />
                    )}

                    {activeTab === 'my-classes' && (
                        <MyClassesTab />
                    )}

                    {activeTab === 'subjects' && (
                        <SubjectsTab />
                    )}

                    {activeTab === 'teacher-groups' && (
                        <TeacherGroupsTab initialGroups={teacherGroups} />
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
