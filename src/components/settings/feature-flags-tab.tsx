'use client';

import { useState, useMemo } from 'react';
import { useFeatureFlags } from '@/context/feature-flags-context';
import { usePrivacy } from '@/context/privacy-context';
import { 
    ToggleRight, CheckCircle2, AlertCircle, Loader2, Search, RotateCcw, 
    CheckCheck, Ban, Sparkles, ShieldCheck, EyeOff, Eye, Video, Lock
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import toast from 'react-hot-toast';

interface FeatureModule {
    key: string;
    name: string;
    description: string;
    category: 'portals' | 'teaching' | 'admin' | 'privacy';
    badge: string;
    impact: string;
}

const MODULES_METADATA: FeatureModule[] = [
    // Special Privacy Mode
    {
        key: 'privacyDemoMode',
        name: 'Chế Độ Ẩn Danh (Privacy Mode)',
        description: 'Tự động che tên trường thành *****, tên học sinh thành Ng**** V** A*, che SĐT và nick đăng nhập.',
        category: 'privacy',
        badge: 'Bảo Mật',
        impact: 'Mã hóa ***** tên trường và thông tin nhạy cảm toàn hệ thống.'
    },

    // Category 1: Cổng Kết Nối & Đời Sống Học Đường
    {
        key: 'curriculumVitae',
        name: 'Sơ Yếu Lý Lịch Học Sinh (SYLL)',
        description: 'Cho phép phụ huynh điền hồ sơ 3 bước trực tuyến và GVCN quản lý, duyệt, trích xuất hồ sơ.',
        category: 'portals',
        badge: 'Hồ sơ số',
        impact: 'Ẩn/hiện tính năng nộp và duyệt SYLL trên Cổng Phụ Huynh & Trợ lý GVCN.'
    },
    {
        key: 'parentPortal',
        name: 'Cổng Tra Cứu Phụ Huynh',
        description: 'Cổng trực tuyến cho phụ huynh xem điểm danh, nộp đơn nghỉ phép có phép/không phép, liên lạc nhà trường.',
        category: 'portals',
        badge: 'Phụ huynh',
        impact: 'Khi tắt, phụ huynh truy cập /portal sẽ nhận thông báo hệ thống đang bảo trì.'
    },
    {
        key: 'studentPortal',
        name: 'Cổng Học Sinh 2.5D & Nuôi Thú Cưng',
        description: 'Thế giới học tập ảo, bản đồ thị trấn 2.5D, phòng nuôi thú cưng SVG, phi thuyền co-op.',
        category: 'portals',
        badge: 'Gamification',
        impact: 'Ẩn/hiện link truy cập Cổng Học Sinh /student trên thanh điều hướng.'
    },

    // Category 2: Tác Nghiệp Sư Phạm & Chủ Nhiệm
    {
        key: 'homeroomAssistant',
        name: 'Trợ Lý Giáo Viên Chủ Nhiệm',
        description: 'Phân hệ quản lý toàn diện dành cho GVCN: Sơ đồ lớp, sổ chủ nhiệm, theo dõi nề nếp.',
        category: 'teaching',
        badge: 'GVCN',
        impact: 'Quản lý quyền truy cập phân hệ /homeroom/students.'
    },
    {
        key: 'printCenter',
        name: 'Trung Tâm In Ấn & Biểu Mẫu',
        description: 'Tự động xuất 8 bộ biểu mẫu chuẩn THCS và in Batch PDF 86 trang không vỡ layout.',
        category: 'teaching',
        badge: 'In ấn 86 trang',
        impact: 'Bật/tắt phân hệ /homeroom/print-center.'
    },
    {
        key: 'quickAttendance',
        name: 'Điểm Danh Nhanh',
        description: 'Tính năng điểm danh sĩ số hàng ngày tại lớp theo tiết/buổi của giáo viên bộ môn và GVCN.',
        category: 'teaching',
        badge: 'Cốt lõi',
        impact: 'Bật/tắt thanh điều hướng và trang /quick-attendance.'
    },
    {
        key: 'monitor',
        name: 'Sổ Theo Dõi Nề Nếp',
        description: 'Quản lý chi tiết các cột chuyên cần, vi phạm và ghi chú tác nghiệp theo từng Lớp.',
        category: 'teaching',
        badge: 'Sổ sách',
        impact: 'Bật/tắt trang /monitor trên toàn hệ thống.'
    },

    // Category 3: Quản Trị & Điều Hành
    {
        key: 'adminDashboard',
        name: 'Bàn Điều Hành BGH & Radar Cảnh Báo',
        description: 'Trang tổng quan nề nếp toàn trường, Radar Z-score phát hiện học sinh nguy cơ và chế độ chiếu hội nghị.',
        category: 'admin',
        badge: 'BGH Điều hành',
        impact: 'Bật/tắt trang /admin/dashboard.'
    },
    {
        key: 'reports',
        name: 'Báo Cáo & Thống Kê Chuyên Cần',
        description: 'Tổng hợp báo cáo tuần, tháng, học kỳ và xuất Excel đa chiều.',
        category: 'admin',
        badge: 'Báo cáo',
        impact: 'Bật/tắt trang /reports.'
    },
    {
        key: 'import',
        name: 'Import Danh Sách Từ Excel',
        description: 'Nhập dữ liệu học sinh, danh sách lớp học từ file Excel mẫu của Bộ GD&ĐT.',
        category: 'admin',
        badge: 'Dữ liệu',
        impact: 'Bật/tắt trang /import.'
    },
    {
        key: 'timetables',
        name: 'Thời Khóa Biểu',
        description: 'Quản lý và phân phối thời khóa biểu các khối lớp.',
        category: 'admin',
        badge: 'Lịch học',
        impact: 'Bật/tắt phân hệ thời khóa biểu.'
    },
];

export function FeatureFlagsTab() {
    const { flags, loading, updateFlag, setAllFlags, resetDefaults } = useFeatureFlags();
    const { isPrivacyMode, togglePrivacyMode, setPrivacyMode, maskSchoolName, maskStudentName, maskPhone } = usePrivacy();
    const { appUser, loading: authLoading } = useAuth();
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'portals' | 'teaching' | 'admin' | 'privacy'>('all');
    const [isBatchUpdating, setIsBatchUpdating] = useState(false);

    const handleToggle = async (key: string, currentValue: boolean) => {
        if (appUser?.role !== 'admin' && appUser?.role !== 'principal') {
            toast.error('Bạn không có quyền thay đổi cấu hình tính năng.');
            return;
        }

        if (key === 'privacyDemoMode') {
            togglePrivacyMode();
            return;
        }

        setUpdatingKey(key);
        try {
            const nextValue = !currentValue;
            const res = await updateFlag(key, nextValue, appUser?.role);
            if (res.success) {
                toast.success(`Đã ${nextValue ? 'bật' : 'tắt'} tính năng thành công!`);
            } else {
                toast.error(res.message || 'Không thể lưu thay đổi.');
            }
        } catch (error: any) {
            console.error('Lỗi khi cập nhật tính năng:', error);
            toast.error('Lỗi kết nối cơ sở dữ liệu.');
        } finally {
            setUpdatingKey(null);
        }
    };

    const handleBatchEnableAll = async () => {
        if (!confirm('Bạn có chắc chắn muốn BẬT TẤT CẢ tính năng trong hệ thống không?')) return;
        setIsBatchUpdating(true);
        const newFlags: Record<string, boolean> = {};
        MODULES_METADATA.forEach(m => { newFlags[m.key] = true; });
        const res = await setAllFlags({ ...flags, ...newFlags } as any, appUser?.role);
        if (res.success) toast.success('Đã BẬT tất cả tính năng!');
        else toast.error(res.message || 'Lỗi cập nhật.');
        setIsBatchUpdating(false);
    };

    const handleBatchDisableAll = async () => {
        if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn TẮT TẤT CẢ các module phụ trợ không?')) return;
        setIsBatchUpdating(true);
        const newFlags: Record<string, boolean> = {};
        MODULES_METADATA.forEach(m => { 
            if (m.key !== 'privacyDemoMode') newFlags[m.key] = false; 
        });
        const res = await setAllFlags({ ...flags, ...newFlags } as any, appUser?.role);
        if (res.success) toast.success('Đã TẮT tất cả tính năng!');
        else toast.error(res.message || 'Lỗi cập nhật.');
        setIsBatchUpdating(false);
    };

    const handleResetDefaults = async () => {
        if (!confirm('Bạn có muốn khôi phục toàn bộ tính năng về trạng thái mặc định của nhà trường?')) return;
        setIsBatchUpdating(true);
        const res = await resetDefaults(appUser?.role);
        if (res.success) toast.success('Đã khôi phục cài đặt mặc định thành công!');
        else toast.error(res.message || 'Lỗi khôi phục.');
        setIsBatchUpdating(false);
    };

    const filteredModules = useMemo(() => {
        return MODULES_METADATA.filter(m => {
            const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  m.badge.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, selectedCategory]);

    const activeCount = useMemo(() => {
        return MODULES_METADATA.filter(m => {
            if (m.key === 'privacyDemoMode') return isPrivacyMode;
            return flags[m.key] ?? true;
        }).length;
    }, [flags, isPrivacyMode]);

    if (authLoading) return null;

    if (appUser?.role !== 'admin' && appUser?.role !== 'principal') {
        return (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Quyền Truy Cập Bị Giới Hạn</h3>
                <p className="text-sm text-slate-500 mt-1">Chỉ Quản trị viên (Admin) hoặc Ban Giám Hiệu mới có quyền cấu hình tính năng hệ thống.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500 flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-100">
                <Loader2 className="animate-spin mr-2 text-blue-600" /> Đang tải cấu hình tính năng...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* VIP HERO CARD: CHẾ ĐỘ QUAY PHIM DEMO & ẨN DANH TOÀN HỆ THỐNG */}
            <div className={`p-6 rounded-3xl border transition-all shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                isPrivacyMode 
                    ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white border-amber-500/50 ring-4 ring-amber-400/20' 
                    : 'bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white border-indigo-700/50'
            }`}>
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                        isPrivacyMode ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-indigo-500/20 border border-indigo-400/40 text-indigo-200'
                    }`}>
                        {isPrivacyMode ? <EyeOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                                Chế Độ Ẩn Danh (Privacy Mode)
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPrivacyMode ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300' : 'bg-slate-700 text-slate-300'
                            }`}>
                                {isPrivacyMode ? '🔒 Đang Bật' : '👁️ Đang Tắt'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                            Khi bật: Tên trường ẩn thành <strong className="text-amber-300">THCS *****</strong>, số điện thoại và nick đăng nhập được che tự động để bảo vệ quyền riêng tư (giữ nguyên họ tên học sinh).
                        </p>

                        {/* Live Example Box */}
                        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono">
                            <span className="text-slate-400">Xem trước:</span>
                            <span className="bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-amber-200">
                                Trường: {maskSchoolName('THCS TRẦN BỘI CƠ')}
                            </span>
                            <span className="bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-cyan-200">
                                Học sinh: {maskStudentName('Nguyễn Văn An')}
                            </span>
                            <span className="bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-emerald-200">
                                SĐT: {maskPhone('0901234567')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Big Switch Button */}
                <div className="flex flex-col items-center gap-2 self-stretch sm:self-center">
                    <button
                        type="button"
                        onClick={togglePrivacyMode}
                        className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2.5 ${
                            isPrivacyMode 
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'
                        }`}
                    >
                        {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{isPrivacyMode ? 'TẮT ẨN DANH' : 'BẬT ẨN DANH'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">
                        {isPrivacyMode ? 'Bấm để hiển thị tên thật' : 'Bấm 1 chạm để ẩn danh toàn bộ'}
                    </span>
                </div>
            </div>

            {/* Header & Overview Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100">
                <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <ToggleRight className="text-blue-600 w-6 h-6" />
                        Quản lý Tính năng Hệ thống (Feature Flags)
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                        Bật/tắt linh hoạt các phân hệ theo thời gian thực. Trạng thái được đồng bộ tức thì trên mọi thiết bị.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="px-3 py-1.5 rounded-xl bg-white text-xs font-black text-blue-700 shadow-sm border border-blue-200">
                        Đang kích hoạt: {activeCount}/{MODULES_METADATA.length} Modules
                    </span>
                </div>
            </div>

            {/* Quick Action Toolbar & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                {/* Search box */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tính năng theo tên, mô tả hoặc phân hệ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                </div>

                {/* Category filter buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedCategory === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả ({MODULES_METADATA.length})
                    </button>
                    <button
                        onClick={() => setSelectedCategory('privacy')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedCategory === 'privacy' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                    >
                        🔒 Ẩn Danh Demo
                    </button>
                    <button
                        onClick={() => setSelectedCategory('portals')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedCategory === 'portals' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                    >
                        👨‍👩‍👧 Cổng Kết Nối
                    </button>
                    <button
                        onClick={() => setSelectedCategory('teaching')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedCategory === 'teaching' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        👨‍🏫 Sư Phạm
                    </button>
                    <button
                        onClick={() => setSelectedCategory('admin')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedCategory === 'admin' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        📊 Quản Trị
                    </button>
                </div>

                {/* Batch Actions */}
                <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
                    <button
                        onClick={handleBatchEnableAll}
                        disabled={isBatchUpdating}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        title="Bật tất cả tính năng"
                    >
                        <CheckCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Bật tất cả</span>
                    </button>
                    <button
                        onClick={handleBatchDisableAll}
                        disabled={isBatchUpdating}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        title="Tắt tất cả tính năng"
                    >
                        <Ban className="w-4 h-4" />
                        <span className="hidden sm:inline">Tắt tất cả</span>
                    </button>
                    <button
                        onClick={handleResetDefaults}
                        disabled={isBatchUpdating}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        title="Khôi phục cài đặt mặc định"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Mặc định</span>
                    </button>
                </div>
            </div>

            {/* Grid of Feature Flag Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                {filteredModules.map(module => {
                    const isEnabled = module.key === 'privacyDemoMode' ? isPrivacyMode : (flags[module.key] ?? true);
                    const isUpdating = updatingKey === module.key || isBatchUpdating;

                    return (
                        <div
                            key={module.key}
                            className={`p-5 bg-white border rounded-2xl shadow-xs transition-all flex flex-col justify-between gap-3 ${
                                isEnabled 
                                    ? (module.key === 'privacyDemoMode' ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 hover:border-blue-300 hover:shadow-md') 
                                    : 'border-slate-200 bg-slate-50/60 opacity-80'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-sm">{module.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                            module.key === 'privacyDemoMode' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {module.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{module.description}</p>
                                </div>

                                {/* Custom Toggle Button */}
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isEnabled}
                                    onClick={() => handleToggle(module.key, isEnabled)}
                                    disabled={isUpdating}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        isEnabled 
                                            ? (module.key === 'privacyDemoMode' ? 'bg-amber-600' : 'bg-blue-600') 
                                            : 'bg-slate-300'
                                    } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    >
                                        {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
                                    </span>
                                </button>
                            </div>

                            {/* Footer info: Live State + Impact */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5">
                                    {isEnabled ? (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${
                                            module.key === 'privacyDemoMode' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                                        }`}>
                                            <CheckCircle2 size={12} /> Đang bật
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-600">
                                            <AlertCircle size={12} /> Đang tắt
                                        </span>
                                    )}
                                </div>
                                <span className="text-slate-400 truncate max-w-[220px]" title={module.impact}>
                                    {module.impact}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
