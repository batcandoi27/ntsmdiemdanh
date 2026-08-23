'use client';

import { useState, useEffect } from 'react';
import { Class } from '@/types/models';
import { db } from '@/services/db';
import { assignClassesToUser } from '@/services/user-service';
import { Check, Search, Save, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export function MyClassesTab() {
    const { appUser } = useAuth();
    const [classes, setClasses] = useState<Class[]>([]);
    const [myClassIds, setMyClassIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const getStorageKey = () => `myClasses_${appUser?.uid || 'guest'}`;

    useEffect(() => {
        loadData();
    }, [appUser]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Load all classes
            const allClasses = await db.getClasses();

            // Sort by name
            allClasses.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setClasses(allClasses);

            // 2. Load saved preference from Supabase DB first, then fallback to localStorage
            let loadedIds: string[] = [];

            if (appUser?.uid) {
                // Query trực tiếp từ bảng teacher_classes của user
                const { data: assignments } = await supabase
                    .from('teacher_classes')
                    .select('class_id')
                    .eq('teacher_id', appUser.uid);

                if (assignments && assignments.length > 0) {
                    loadedIds = assignments.map(a => a.class_id);
                } else if (appUser.assignedClassIds && appUser.assignedClassIds.length > 0) {
                    loadedIds = appUser.assignedClassIds;
                }
            }

            // Fallback sang localStorage nếu DB chưa có
            if (loadedIds.length === 0) {
                const saved = localStorage.getItem(getStorageKey()) || localStorage.getItem('my-classes');
                if (saved) {
                    try {
                        loadedIds = JSON.parse(saved);
                    } catch (e) {
                        console.error('Error parsing myClasses', e);
                    }
                }
            }

            setMyClassIds(loadedIds);
            // Đồng bộ lại vào localStorage
            if (loadedIds.length > 0) {
                localStorage.setItem(getStorageKey(), JSON.stringify(loadedIds));
            }
        } catch (error) {
            console.error('Lỗi tải danh sách lớp:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleClass = (classId: string) => {
        setMyClassIds(prev => {
            if (prev.includes(classId)) {
                return prev.filter(id => id !== classId);
            } else {
                return [...prev, classId];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Lưu vào localStorage cache
            localStorage.setItem(getStorageKey(), JSON.stringify(myClassIds));
            localStorage.setItem('my-classes', JSON.stringify(myClassIds));

            // 2. Lưu vào Supabase Database (teacher_classes) nếu có user
            if (appUser?.uid) {
                await assignClassesToUser(appUser.uid, myClassIds);
            }

            // 3. Kích hoạt event cập nhật toàn ứng dụng
            window.dispatchEvent(new Event('myClassesUpdated'));

            toast.success(`Đã lưu ${myClassIds.length} lớp học của bạn thành công!`);
        } catch (error: any) {
            console.error('Lỗi khi lưu lớp:', error);
            toast.error('Có lỗi xảy ra khi lưu: ' + (error.message || 'Lỗi không xác định'));
        } finally {
            setSaving(false);
        }
    };

    const filteredClasses = classes.filter(c =>
        c.name.includes(searchTerm) ||
        (c.teacherName && c.teacherName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-sm font-medium">Đang tải danh sách lớp...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="text-blue-600" size={24} />
                        Lớp Của Tôi
                    </h2>
                    <p className="text-gray-500 text-sm">Chọn các lớp bạn giảng dạy hoặc phụ trách để truy cập nhanh trong toàn bộ hệ thống.</p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setMyClassIds(classes.map(c => c.id))}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                    >
                        Chọn Tất Cả ({classes.length})
                    </button>
                    <button
                        onClick={() => setMyClassIds([])}
                        className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                    >
                        Bỏ Chọn
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Lưu Thay Đổi
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm">Các lớp đã chọn ({myClassIds.length})</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {myClassIds.length > 0 ? classes.filter(c => myClassIds.includes(c.id)).map(cls => (
                                <span key={cls.id} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-700 text-xs font-medium shadow-sm">
                                    {cls.name}
                                </span>
                            )) : (
                                <span className="text-gray-500 text-xs italic">Chưa chọn lớp nào... Hãy bấm chọn các lớp bên dưới và bấm "Lưu Thay Đổi".</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Tìm tên lớp hoặc tên giáo viên..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto p-1">
                {filteredClasses.map(cls => {
                    const isSelected = myClassIds.includes(cls.id);
                    return (
                        <div
                            key={cls.id}
                            onClick={() => toggleClass(cls.id)}
                            className={cn(
                                "cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md flex flex-col items-center justify-center text-center gap-2",
                                isSelected
                                    ? "bg-blue-50 border-blue-500 shadow-sm"
                                    : "bg-white border-gray-100 hover:border-blue-200"
                            )}
                        >
                            <span className={cn(
                                "text-xl font-black",
                                isSelected ? "text-blue-700" : "text-gray-600"
                            )}>
                                {cls.name}
                            </span>
                            <span className="text-xs text-gray-400 line-clamp-1">
                                {cls.teacherName || 'Chưa có GV'}
                            </span>

                            {/* Checkmark */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
                                    <Check size={12} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
