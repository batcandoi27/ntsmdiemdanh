'use client';

import { useState, useEffect } from 'react';
import { Class } from '@/types/models';
import { Modal } from '@/components/ui/modal';
import { ClassForm } from '@/components/class-form';
import { createClass, updateClass, deleteClass } from '@/app/classes/actions';
import { Plus, Pencil, Trash2, Users, School, ArrowRight, UserCheck, Upload, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useViewMode } from '@/context/view-mode-context';
import { useAuth } from '@/context/auth-context';
import { FirebaseAdapter } from '@/services/firebase-adapter';

interface ClassListProps {
    initialClasses: Class[];
}

export function ClassList({ initialClasses }: ClassListProps) {
    const router = useRouter();
    const { viewDevice } = useViewMode();
    const { appUser } = useAuth();

    const [viewType, setViewType] = useState<'school' | 'personal'>('school');
    const [personalClasses, setPersonalClasses] = useState<Class[]>([]);

    const [classes, setClasses] = useState<Class[]>(initialClasses);
    const [selectedGrade, setSelectedGrade] = useState<number | 'ALL'>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>(''); // Hydration fix
    const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);

    useEffect(() => {
        // Chỉ cập nhật danh sách base nếu đang ở tab Trường
        if (viewType === 'school') {
            setClasses(initialClasses);
            fetchStats();
        }
    }, [initialClasses, viewType]);

    useEffect(() => {
        if (viewType === 'personal' && appUser) {
            fetchPersonalClasses();
        }
    }, [viewType, appUser]);

    useEffect(() => {
        setLastUpdated(new Date().toLocaleTimeString()); // Set time on client
    }, [classes, selectedGrade]);

    const fetchPersonalClasses = async () => {
        setIsLoadingPersonal(true);
        try {
            const adapter = new FirebaseAdapter();
            const list = await adapter.getClasses({ isPersonal: true, ownerId: appUser?.uid });
            setPersonalClasses(list);
            setClasses(list); // Replace view with personal classes
            fetchStats(list); // Fetch stats for these specific personal classes
        } catch (error) {
            console.error("Lỗi lấy lớp cá nhân", error);
        } finally {
            setIsLoadingPersonal(false);
        }
    };

    const [statsMap, setStatsMap] = useState<Record<string, any>>({});

    const fetchStats = async (targetClassesList?: Class[]) => {
        const grades = selectedGrade === 'ALL' ? [6, 7, 8, 9] : [selectedGrade];
        const promises = grades.map(g => import('@/app/actions/quick-attendance').then(mod => mod.getGradeAttendanceSummary(g, new Date().toISOString().slice(0, 10))));

        const results = await Promise.all(promises);
        const newStats: Record<string, any> = {};
        results.flat().forEach(item => {
            newStats[item.classId] = item.attendanceCount;
        });
        setStatsMap(newStats);
    };

    const filteredClasses = classes.filter(cls =>
        selectedGrade === 'ALL' ? true : cls.grade === selectedGrade
    );

    const handleCreate = async (data: Class) => {
        if (viewType === 'personal') {
            data.isPersonal = true;
            data.ownerId = appUser?.uid;
            // Generate private ID for personal class to avoid conflict
            data.id = `P_${appUser?.uid?.slice(0, 4)}_${data.id}`;
        } else {
            data.isPersonal = false;
        }

        const res = await createClass(data);
        if (res.success) {
            setIsModalOpen(false);
            if (viewType === 'personal') {
                fetchPersonalClasses();
            } else {
                router.refresh();
            }
        } else {
            alert(res.message);
        }
    };

    const handleUpdate = async (data: Class) => {
        const res = await updateClass(data);
        if (res.success) {
            setIsModalOpen(false);
            setEditingClass(null);
            if (viewType === 'personal') {
                fetchPersonalClasses();
            } else {
                router.refresh();
            }
        } else {
            alert(res.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa lớp ${name}?`)) return;
        const res = await deleteClass(id);
        if (res.success) {
            if (viewType === 'personal') {
                fetchPersonalClasses();
            } else {
                router.refresh();
            }
        } else {
            alert(res.message);
        }
    };

    const openCreateModal = () => {
        setEditingClass(null);
        setIsModalOpen(true);
    };

    const openEditModal = (cls: Class) => {
        // Prevent editing ID even if personal? Handled inside form visually.
        setEditingClass(cls);
        setIsModalOpen(true);
    };

    const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0);

    const getGridClass = () => {
        if (viewDevice === 'mobile') return "grid grid-cols-1 gap-6 mb-12";
        if (viewDevice === 'tablet') return "grid grid-cols-2 gap-6 mb-12";
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12";
    };

    return (
        <div>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <School className="w-8 h-8 text-primary" />
                        Quản Lý Lớp
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={async () => {
                            const { exportSampleClassTemplate } = await import('@/lib/export-utils');
                            await exportSampleClassTemplate();
                        }}
                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Upload size={20} />
                        <span className="hidden md:inline">Tải Mẫu</span>
                    </button>

                    <Link
                        href="/import"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all ml-2"
                    >
                        <Upload size={20} />
                        <span className="hidden md:inline">Import Dữ Liệu</span>
                    </Link>

                    <button
                        onClick={openCreateModal}
                        className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-primary/30 transition-all ml-2"
                    >
                        <Plus size={20} />
                        <span className="hidden md:inline">Thêm Lớp</span>
                    </button>
                </div>
            </div>

            {/* TAB VIEW */}
            <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl mb-6 w-full md:w-max mx-auto md:mx-0">
                <button
                    onClick={() => setViewType('school')}
                    className={`flex-1 md:px-8 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${viewType === 'school'
                        ? 'bg-white shadow-sm text-primary'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <School size={18} />
                    Lớp Chung (Trường)
                </button>
                <button
                    onClick={() => setViewType('personal')}
                    className={`flex-1 md:px-8 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${viewType === 'personal'
                        ? 'bg-white shadow-sm text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <UserCircle size={18} />
                    Lớp Của Tôi
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-4">
                {['ALL', 6, 7, 8, 9].map((g) => (
                    <button
                        key={g}
                        onClick={() => setSelectedGrade(g as any)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${selectedGrade === g
                            ? (viewType === 'personal' ? 'bg-white border-2 border-purple-500 text-purple-600' : 'bg-white border-2 border-primary text-primary')
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {g === 'ALL' ? 'Tất cả' : `Khối ${g}`}
                    </button>
                ))}
            </div>

            {/* LIST */}
            {isLoadingPersonal && viewType === 'personal' ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div></div>
            ) : (
                <div className={getGridClass()}>
                    {filteredClasses.map((cls) => (
                        <div
                            key={cls.id}
                            className={`group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 p-5 transition-all relative flex flex-col ${viewType === 'personal' ? 'hover:border-purple-300 ring-1 ring-transparent hover:ring-purple-100' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`text-xl font-bold transition-colors ${viewType === 'personal' ? 'text-purple-700 group-hover:text-purple-600' : 'text-gray-800 group-hover:text-primary'}`}>
                                        {cls.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">Khối {cls.grade} • {cls.teacherName || 'Chưa có GV'}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal(cls)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Sửa">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(cls.id, cls.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xóa">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 flex-1">
                                <div className="flex items-center gap-1.5" title="Sĩ số">
                                    <Users size={16} className="text-gray-400" />
                                    <span className="font-semibold">{cls.totalStudents}</span>
                                </div>
                                {statsMap[cls.id] ? (
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded shadow-sm border border-green-100 flex items-center gap-1" title="Hiện diện">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            {statsMap[cls.id].Present}
                                        </span>
                                        <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded shadow-sm border border-red-100 flex items-center gap-1" title="Vắng">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                            {(statsMap[cls.id]?.Absent || 0) + (statsMap[cls.id]?.Unexcused || 0) + (statsMap[cls.id]?.Late || 0)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs opacity-60">
                                        <span className="text-pink-500 bg-pink-50 px-2 py-0.5 rounded">Nữ: {cls.femaleCount}</span>
                                        <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Nam: {cls.maleCount}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 mt-auto">
                                <Link
                                    href={`/attendance?classId=${cls.id}`}
                                    className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${viewType === 'personal' ? 'bg-purple-100 hover:bg-purple-600 text-purple-700 hover:text-white' : 'bg-primary/10 hover:bg-primary hover:text-white text-primary'}`}
                                >
                                    <UserCheck size={18} />
                                    ĐIỂM DANH
                                </Link>

                                <Link
                                    href={`/classes/${cls.id}`}
                                    className="w-full py-2 text-sm text-center border border-gray-200 rounded-lg hover:border-gray-300 text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-1 transition-all"
                                >
                                    Xem Danh Sách <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    ))}

                    {classes.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">{viewType === 'personal' ? 'Bạn chưa tạo Lớp Của Tôi nào.' : 'Chưa có lớp học nào.'}</p>
                            <button onClick={openCreateModal} className={`font-medium hover:underline mt-2 ${viewType === 'personal' ? 'text-purple-600' : 'text-primary'}`}>
                                Tạo lớp đầu tiên ngay
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Footer Stats */}
            <div className="bg-gray-100 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center text-gray-600 border border-gray-200 text-sm">
                <div className="font-semibold">
                    Tổng số lớp: <span className="text-gray-900 text-lg">{classes.length}</span>
                </div>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <div className="font-semibold">
                        Tổng học sinh: <span className="text-gray-900 text-lg">{totalStudents}</span>
                    </div>
                    {/* Add more system stats if needed */}
                    <div className="text-gray-400 text-xs mt-1">
                        Cập nhật lần cuối: {lastUpdated}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClass ? `Cập Nhật Lớp ${editingClass.name}` : (viewType === 'personal' ? 'Thêm Lớp Của Tôi Mới' : 'Thêm Lớp Chung Mới')}
            >
                <ClassForm
                    initialData={editingClass}
                    onSubmit={editingClass ? handleUpdate : handleCreate}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
}
