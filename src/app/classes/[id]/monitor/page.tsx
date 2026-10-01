'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCustomColumns, getExpiredColumns, archiveColumn, getCompositeActivitiesForClass } from '@/services/column-service';
import { getActiveStudents } from '@/services/student-service';
import { db } from '@/services/db';
import { Column, ColumnFrequency, Class, Student } from '@/types/models';
import { 
    ArrowLeft, 
    Clock, 
    CheckSquare, 
    ChevronRight, 
    Loader2, 
    Calendar, 
    Archive, 
    Eye, 
    CreditCard, 
    Plus, 
    Settings, 
    Layers, 
    ChevronDown, 
    Sparkles,
    TableProperties
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBookTheme } from '@/lib/book-themes';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { CreateMonitorColumnModal } from '@/components/monitor/create-monitor-column-modal';
import { CreateCompositeActivityModal } from '@/components/monitor/create-composite-activity-modal';

type FilterType = 'all' | 'composite' | 'daily' | 'period' | 'one_time';

export default function ClassMonitorPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;
    const { appUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [classInfo, setClassInfo] = useState<Class | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [dailyColumns, setDailyColumns] = useState<Column[]>([]);
    const [periodColumns, setPeriodColumns] = useState<Column[]>([]);
    const [oneTimeColumns, setOneTimeColumns] = useState<Column[]>([]);
    const [compositeActivities, setCompositeActivities] = useState<Column[]>([]);
    const [expiredColumns, setExpiredColumns] = useState<Column[]>([]);

    // Dropdown and Modals
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateCompositeModal, setShowCreateCompositeModal] = useState(false);
    const [createFrequency, setCreateFrequency] = useState<ColumnFrequency>('one_time');

    useEffect(() => {
        loadData();
    }, [classId, appUser]);

    const loadData = async () => {
        try {
            const [allColumns, expired, cls, studList, compositeActs] = await Promise.all([
                getCustomColumns(classId, appUser?.uid),
                getExpiredColumns(classId, appUser?.uid),
                db.getClass(classId),
                getActiveStudents(classId),
                getCompositeActivitiesForClass(classId, appUser?.uid)
            ]);

            // 1. Sổ Theo Ngày (daily)
            setDailyColumns(allColumns.filter(c => c.frequency === 'daily' && !c.archived && !c.parentColumnId));

            // 2. Sổ Theo Giai Đoạn (period)
            setPeriodColumns(allColumns.filter(c => c.frequency === 'period' && !c.archived && !c.parentColumnId));
            
            // 3. Sổ Một Lần (one_time - đơn cột)
            setOneTimeColumns(allColumns.filter(c => 
                c.frequency === 'one_time' && 
                !c.archived && 
                !c.parentColumnId &&
                c.activityConfig?.type !== 'composite'
            ));

            // 4. Nhiều hoạt động (composite - ma trận)
            setCompositeActivities(compositeActs);

            setExpiredColumns(expired);
            setClassInfo(cls);
            setStudents(studList);
        } catch (error) {
            console.error('Error loading monitor data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateSingle = (freq: ColumnFrequency = 'one_time') => {
        setCreateFrequency(freq);
        setShowCreateModal(true);
        setShowCreateDropdown(false);
    };

    const handleOpenCreateComposite = () => {
        setShowCreateCompositeModal(true);
        setShowCreateDropdown(false);
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

    if (appUser?.role === 'class_monitor') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md">
                    <p className="text-red-600 font-bold mb-2">Không có quyền truy cập</p>
                    <p className="text-sm text-gray-600 mb-4">Học sinh và Ban Cán Sự không được quyền truy cập Sổ theo dõi.</p>
                    <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition">
                        Về Trang Chủ
                    </Link>
                </div>
            </div>
        );
    }

    const totalActiveBooks = compositeActivities.length + dailyColumns.length + periodColumns.length + oneTimeColumns.length;

    return (
        <div className="min-h-screen bg-slate-50/70 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/classes/${classId}`)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="Quay lại chi tiết lớp"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-black text-lg text-gray-800 tracking-tight flex items-center gap-2">
                            <span>Sổ Theo Dõi & Thu Phí</span>
                            {classInfo && (
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    Lớp {classInfo.name}
                                </span>
                            )}
                        </h1>
                        <p className="text-[11px] text-gray-400 font-medium">
                            Hỗ trợ 4 loại sổ: Nhiều hoạt động (Ma trận), Theo ngày, Theo giai đoạn và Một lần
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative">
                    <Link
                        href="/settings?tab=custom-columns"
                        className="px-3 py-2 text-gray-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition text-xs font-bold flex items-center gap-1.5 border border-slate-200"
                        title="Quản lý nâng cao trong Cài Đặt"
                    >
                        <Settings size={15} />
                        <span className="hidden sm:inline">Cài đặt sổ</span>
                    </Link>

                    {/* "+ Tạo Sổ Mới" Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5"
                        >
                            <Plus size={16} />
                            <span>+ Tạo Sổ Mới</span>
                            <ChevronDown size={14} className={cn("transition-transform", showCreateDropdown && "rotate-180")} />
                        </button>

                        {showCreateDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-20"
                                    onClick={() => setShowCreateDropdown(false)} 
                                />
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-30 animate-in fade-in zoom-in-95">
                                    <div className="px-3 py-2 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        Chọn loại sổ muốn tạo
                                    </div>
                                    
                                    <div className="space-y-1 pt-1.5">
                                        {/* 1. Nhiều hoạt động (Ma trận) */}
                                        <button
                                            onClick={handleOpenCreateComposite}
                                            className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 transition flex items-start gap-2.5 group"
                                        >
                                            <div className="p-2 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200 transition shrink-0">
                                                <Layers size={16} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                    <span>Nhiều hoạt động (Ma trận)</span>
                                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-black">Nổi bật</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                                    Bảo hiểm tai nạn, bán trú, hội thao (gồm nhiều cột con liên kết)
                                                </p>
                                            </div>
                                        </button>

                                        {/* 2. Theo ngày */}
                                        <button
                                            onClick={() => handleOpenCreateSingle('daily')}
                                            className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 transition flex items-start gap-2.5 group"
                                        >
                                            <div className="p-2 rounded-lg bg-sky-100 text-sky-700 group-hover:bg-sky-200 transition shrink-0">
                                                <Calendar size={16} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800">
                                                    Sổ theo ngày
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                                    Ghi nhận mỗi ngày (VD: Tham gia hoạt động, trực nhật...)
                                                </p>
                                            </div>
                                        </button>

                                        {/* 3. Theo giai đoạn */}
                                        <button
                                            onClick={() => handleOpenCreateSingle('period')}
                                            className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 transition flex items-start gap-2.5 group"
                                        >
                                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200 transition shrink-0">
                                                <Clock size={16} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800">
                                                    Sổ theo giai đoạn (Tháng / Kỳ)
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                                    Tiền học thêm, học phí, tiền ăn định kỳ lặp lại theo tháng
                                                </p>
                                            </div>
                                        </button>

                                        {/* 4. Một lần */}
                                        <button
                                            onClick={() => handleOpenCreateSingle('one_time')}
                                            className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 transition flex items-start gap-2.5 group"
                                        >
                                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition shrink-0">
                                                <CheckSquare size={16} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800">
                                                    Sổ nhiệm vụ một lần
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                                    Kiểm tra nộp CCCD, giấy khai sinh, đăng ký đơn lẻ
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Tabs for the 4 Types */}
            <div className="bg-white border-b px-4 py-2 sticky top-[57px] z-10 shadow-2xs overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 min-w-max">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                            activeFilter === 'all'
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100"
                        )}
                    >
                        <span>Tất cả sổ</span>
                        <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-black", activeFilter === 'all' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700")}>
                            {totalActiveBooks}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFilter('composite')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                            activeFilter === 'composite'
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-purple-50 hover:text-purple-700"
                        )}
                    >
                        <Layers size={14} className={activeFilter === 'composite' ? "text-white" : "text-purple-600"} />
                        <span>Nhiều hoạt động (Ma trận)</span>
                        <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-black", activeFilter === 'composite' ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800")}>
                            {compositeActivities.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFilter('daily')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                            activeFilter === 'daily'
                                ? "bg-sky-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                        )}
                    >
                        <Calendar size={14} className={activeFilter === 'daily' ? "text-white" : "text-sky-600"} />
                        <span>Theo ngày</span>
                        <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-black", activeFilter === 'daily' ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800")}>
                            {dailyColumns.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFilter('period')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                            activeFilter === 'period'
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                        )}
                    >
                        <Clock size={14} className={activeFilter === 'period' ? "text-white" : "text-indigo-600"} />
                        <span>Theo giai đoạn</span>
                        <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-black", activeFilter === 'period' ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800")}>
                            {periodColumns.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFilter('one_time')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
                            activeFilter === 'one_time'
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                        )}
                    >
                        <CheckSquare size={14} className={activeFilter === 'one_time' ? "text-white" : "text-emerald-600"} />
                        <span>Một lần</span>
                        <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-black", activeFilter === 'one_time' ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800")}>
                            {oneTimeColumns.length}
                        </span>
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-7xl mx-auto">
                {/* Expired Columns Proposal */}
                {expiredColumns.length > 0 && (activeFilter === 'all' || activeFilter === 'period') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
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

                {/* 1. SỔ NHIỀU HOẠT ĐỘNG (BẢNG MA TRẬN NHIỀU CỘT) */}
                {(activeFilter === 'all' || activeFilter === 'composite') && (
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Layers size={15} className="text-purple-600" />
                                <span>1. Sổ Nhiều Hoạt Động (Bảng Ma Trận Nhiều Cột)</span>
                                <span className="text-[11px] font-bold text-slate-400">({compositeActivities.length})</span>
                            </h2>
                            <button
                                onClick={handleOpenCreateComposite}
                                className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <Plus size={14} />
                                <span>Tạo hoạt động nhiều cột</span>
                            </button>
                        </div>

                        {compositeActivities.length === 0 ? (
                            <div className="text-center py-7 bg-white rounded-2xl border border-dashed border-purple-200 p-6 shadow-2xs">
                                <Layers className="w-10 h-10 text-purple-300 mx-auto mb-2" />
                                <p className="text-gray-700 font-bold text-sm">Chưa có hoạt động phức hợp nhiều cột nào</p>
                                <p className="text-gray-400 text-xs mt-1 mb-4">
                                    Dùng cho Bảo hiểm tai nạn, Bán trú, Hội thao gồm nhiều cột: Số tiền, Đăng ký, Không đăng ký, Ký nhận...
                                </p>
                                <button
                                    onClick={handleOpenCreateComposite}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition inline-flex items-center gap-1.5"
                                >
                                    <Plus size={15} />
                                    <span>+ Tạo Hoạt Động Nhiều Cột Ngay</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {compositeActivities.map((act) => {
                                    const subColCount = act.children?.length || 0;
                                    return (
                                        <div
                                            key={act.id}
                                            onClick={() => router.push(`/classes/${classId}/monitor/${act.id}`)}
                                            className="block rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/30 border-l-[6px] border-l-purple-600 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start sm:items-center gap-3">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-black text-base sm:text-lg text-slate-800 tracking-tight group-hover:text-purple-700 transition-colors">
                                                            {act.name}
                                                        </h3>
                                                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 shadow-2xs">
                                                            <Sparkles size={11} className="text-purple-600" />
                                                            <span>Hoạt động nhiều cột (Ma trận)</span>
                                                        </span>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                            {subColCount} cột liên kết
                                                        </span>
                                                    </div>

                                                    {/* Danh sách các cột con được tự động gộp */}
                                                    {act.children && act.children.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                            <span className="text-[11px] text-slate-400 font-bold mr-1">Các cột con:</span>
                                                            {act.children.map(child => (
                                                                <span
                                                                    key={child.id}
                                                                    className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white/95 text-slate-700 border border-purple-200/80 font-bold shadow-2xs flex items-center gap-1"
                                                                >
                                                                    <TableProperties size={11} className="text-purple-500" />
                                                                    <span>{child.name}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-2.5 rounded-xl bg-purple-100/70 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-2xs shrink-0 flex items-center gap-1 font-bold text-xs">
                                                    <span className="hidden sm:inline">Mở ma trận</span>
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. SỔ THEO NGÀY (GHI NHẬN MỖI NGÀY - DAILY) */}
                {(activeFilter === 'all' || activeFilter === 'daily') && (
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={15} className="text-sky-600" />
                                <span>2. Sổ Theo Ngày (Ghi Nhận Mỗi Ngày)</span>
                                <span className="text-[11px] font-bold text-slate-400">({dailyColumns.length})</span>
                            </h2>
                            <button
                                onClick={() => handleOpenCreateSingle('daily')}
                                className="text-xs text-sky-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <Plus size={14} />
                                <span>Thêm sổ theo ngày</span>
                            </button>
                        </div>

                        {dailyColumns.length === 0 ? (
                            <div className="text-center py-7 bg-white rounded-2xl border border-dashed border-sky-200 p-6 shadow-2xs">
                                <Calendar className="w-10 h-10 text-sky-300 mx-auto mb-2" />
                                <p className="text-gray-700 font-bold text-sm">Chưa có sổ theo dõi theo ngày nào</p>
                                <p className="text-gray-400 text-xs mt-1 mb-4">
                                    Dùng để ghi nhận các mục thực hiện mỗi ngày (VD: Tham gia hoạt động, trực nhật, chấm điểm nề nếp hàng ngày...)
                                </p>
                                <button
                                    onClick={() => handleOpenCreateSingle('daily')}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
                                >
                                    + Tạo Sổ Theo Ngày Ngay
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {dailyColumns.map((col, idx) => {
                                    const theme = getBookTheme(idx + 5, col.id || col.name);
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
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                                            Theo ngày
                                                        </span>
                                                        {col.isSharedWithParents && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                                                <Eye size={11} />
                                                                <span>Portal PH</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-600 font-medium">
                                                        {col.suggestions && col.suggestions.length > 0
                                                            ? `Gợi ý ghi nhận hàng ngày: ${col.suggestions.join(', ')}`
                                                            : 'Ghi nhận check trạng thái hàng ngày'}
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
                )}

                {/* 3. SỔ THEO GIAI ĐOẠN (THÁNG / HỌC KỲ) */}
                {(activeFilter === 'all' || activeFilter === 'period') && (
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={15} className="text-indigo-600" />
                                <span>3. Sổ Theo Giai Đoạn (Tháng / Học Kỳ)</span>
                                <span className="text-[11px] font-bold text-slate-400">({periodColumns.length})</span>
                            </h2>
                            <button
                                onClick={() => handleOpenCreateSingle('period')}
                                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <Plus size={14} />
                                <span>Thêm sổ giai đoạn</span>
                            </button>
                        </div>

                        {periodColumns.length === 0 ? (
                            <div className="text-center py-7 bg-white rounded-2xl border border-dashed border-gray-200 p-6 shadow-2xs">
                                <Clock className="w-10 h-10 text-indigo-300 mx-auto mb-2" />
                                <p className="text-gray-700 font-bold text-sm">Chưa có sổ theo dõi giai đoạn nào cho lớp {classInfo?.name || ''}</p>
                                <p className="text-gray-400 text-xs mt-1 mb-4">Dùng để quản lý các khoản thu học phí theo tháng, tiền ăn bán trú hoặc các khoản định kỳ.</p>
                                <button
                                    onClick={() => handleOpenCreateSingle('period')}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
                                >
                                    + Tạo Sổ Định Kỳ Ngay
                                </button>
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
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                            Theo giai đoạn
                                                        </span>
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
                )}

                {/* 4. SỔ NHIỆM VỤ MỘT LẦN (1 CỘT) */}
                {(activeFilter === 'all' || activeFilter === 'one_time') && (
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <CheckSquare size={15} className="text-emerald-600" />
                                <span>4. Sổ Nhiệm Vụ Một Lần (1 Cột)</span>
                                <span className="text-[11px] font-bold text-slate-400">({oneTimeColumns.length})</span>
                            </h2>
                            <button
                                onClick={() => handleOpenCreateSingle('one_time')}
                                className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <Plus size={14} />
                                <span>Thêm sổ một lần</span>
                            </button>
                        </div>

                        {oneTimeColumns.length === 0 ? (
                            <div className="text-center py-7 bg-white rounded-2xl border border-dashed border-gray-200 p-6 shadow-2xs">
                                <CheckSquare className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                                <p className="text-gray-700 font-bold text-sm">Chưa có sổ nhiệm vụ một lần nào</p>
                                <p className="text-gray-400 text-xs mt-1 mb-4">Dùng để kiểm tra nộp hồ sơ CCCD, giấy khai sinh hoặc các đăng ký 1 lần duy nhất.</p>
                                <button
                                    onClick={() => handleOpenCreateSingle('one_time')}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
                                >
                                    + Tạo Sổ Một Lần Ngay
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {oneTimeColumns.map((col, idx) => {
                                    const theme = getBookTheme(idx + 2, col.id || col.name);
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
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            Một lần
                                                        </span>
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
                                                        {col.suggestions && col.suggestions.length > 0
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
                )}
            </div>

            {/* Modal Tạo Sổ Đơn Cột (Một lần / Theo ngày / Theo giai đoạn) */}
            <CreateMonitorColumnModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                classId={classId}
                className={classInfo?.name || ''}
                students={students}
                initialFrequency={createFrequency}
                onSuccess={loadData}
            />

            {/* Modal Tạo Hoạt Động Nhiều Cột (Ma Trận) */}
            <CreateCompositeActivityModal
                isOpen={showCreateCompositeModal}
                onClose={() => setShowCreateCompositeModal(false)}
                classId={classId}
                className={classInfo?.name || ''}
                students={students}
                onSuccess={loadData}
            />
        </div>
    );
}
