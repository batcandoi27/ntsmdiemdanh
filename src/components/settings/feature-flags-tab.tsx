'use client';

import { useState } from 'react';
import { useFeatureFlags } from '@/context/feature-flags-context';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ToggleRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function FeatureFlagsTab() {
    const { flags, loading } = useFeatureFlags();
    const { appUser, loading: authLoading } = useAuth();
    const [updating, setUpdating] = useState<string | null>(null);

    const handleToggle = async (key: string, currentValue: boolean) => {
        if (appUser?.role !== 'admin' && appUser?.role !== 'principal') return;

        setUpdating(key);
        try {
            await setDoc(doc(db, 'sys_config', 'features'), {
                [key]: !currentValue
            }, { merge: true });
        } catch (error) {
            console.error('Lỗi khi cập nhật tính năng:', error);
            alert('Không thể lưu thay đổi. Có lỗi xảy ra với CSDL Firebase.');
        } finally {
            setUpdating(null);
        }
    };

    if (authLoading) return null;

    if (appUser?.role !== 'admin' && appUser?.role !== 'principal') {
        return <div className="p-8 text-center text-gray-500">Bạn không có quyền truy cập chức năng này.</div>;
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500 flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin mr-2" /> Đang tải...</div>;
    }

    const modules = [
        { key: 'quickAttendance', name: 'Điểm Danh Nhanh', description: 'Tính năng điểm danh hàng ngày tại lớp của giáo viên' },
        { key: 'reports', name: 'Báo Cáo Thống Kê', description: 'Xem và xuất các báo cáo chuyên cần' },
        { key: 'monitor', name: 'Sổ Theo Dõi', description: 'Quản lý chi tiết và các cột tùy chỉnh theo Lớp' },
        { key: 'import', name: 'Import Dữ Liệu', description: 'Nhập danh sách học sinh từ file Excel' },
        { key: 'timetables', name: 'Thời Khóa Biểu', description: 'Quản lý thời khóa biểu của trường' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ToggleRight className="text-blue-600" size={20} />
                    Quản lý Tính năng (Feature Flags)
                </h2>
                <p className="text-sm text-gray-500">Bật hoặc tắt các module trong hệ thống theo thời gian thực (Cần quyền Admin / Hiệu trưởng)</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {modules.map(module => {
                    const isEnabled = flags[module.key] ?? false;
                    return (
                        <div key={module.key} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-start justify-between gap-4 hover:border-blue-100 transition-colors">
                            <div>
                                <h3 className="font-bold text-gray-900 mb-1">{module.name}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{module.description}</p>

                                <div className="mt-3 flex items-center gap-2">
                                    {isEnabled ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-50 text-green-700 uppercase tracking-wide">
                                            <CheckCircle2 size={12} /> Đang bật
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wide">
                                            <AlertCircle size={12} /> Đang tắt
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => handleToggle(module.key, isEnabled)}
                                disabled={updating === module.key}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'} ${updating === module.key ? 'opacity-50' : ''}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}>
                                    {updating === module.key && <Loader2 className="absolute inset-x-0 inset-y-0 h-5 w-5 animate-spin text-gray-400 p-1" />}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
