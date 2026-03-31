'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Save, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAppSettings, updateAppSettings } from '@/app/actions/settings';

const DEFAULT_SUBJECTS = {
    primary: "Tiếng Việt, Toán, Đạo đức, Tự nhiên, Xã hội, Khoa học, Lịch sử, Địa lí, Tin học, Ngoại ngữ, Công nghệ, Âm nhạc, Mỹ thuật, GDTC, Trải nghiệm",
    secondary: "Ngữ văn, Toán, Ngoại ngữ, GDCD, Lịch sử, Địa lí, Vật lí, Hóa học, Sinh học, Tin học, Công nghệ, Âm nhạc, Mỹ thuật, GDTC, Trải nghiệm",
    high: "Ngữ văn, Toán, Ngoại ngữ, Lịch sử, Địa lí, GDKTPL, Vật lí, Hóa học, Sinh học, Tin học, Công nghệ, Âm nhạc, Mỹ thuật, GDTC, GDQP-AN, Trải nghiệm"
};

const formatToLines = (csv: string) => csv.split(', ').join('\n');
const formatToCsv = (lines: string) => lines.split('\n').map(s => s.trim()).filter(Boolean).join(', ');

export function SubjectsTab() {
    const [subjects, setSubjects] = useState({
        primary: formatToLines(DEFAULT_SUBJECTS.primary),
        secondary: formatToLines(DEFAULT_SUBJECTS.secondary),
        high: formatToLines(DEFAULT_SUBJECTS.high)
    });
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        const res = await fetchAppSettings();
        if (res.success && res.settings?.subjectConfig) {
            setSubjects({
                primary: formatToLines(res.settings.subjectConfig.primary),
                secondary: formatToLines(res.settings.subjectConfig.secondary),
                high: formatToLines(res.settings.subjectConfig.high)
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const config = {
            primary: formatToCsv(subjects.primary),
            secondary: formatToCsv(subjects.secondary),
            high: formatToCsv(subjects.high)
        };

        const res = await updateAppSettings({ subjectConfig: config });
        if (res.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            
            // Cập nhật lại cache local để giáo viên dùng ngay
            localStorage.setItem('app_subjects_config', JSON.stringify(config));
            window.dispatchEvent(new CustomEvent('appSubjectsUpdated'));
        }
        setIsSaving(false);
    };

    if (loading) return (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
            <RefreshCw className="animate-spin" size={32} />
            <p className="italic font-medium">Đang tải cấu hình từ máy chủ...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="text-blue-600" size={24} />
                        Quản lý Danh mục Môn học
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Đồng bộ trực tiếp với hệ thống (mỗi môn một dòng)</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black transition-all shadow-lg active:scale-95",
                        saved ? "bg-green-500 text-white shadow-green-200" : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700",
                        isSaving && "opacity-70 cursor-not-allowed"
                    )}
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={18} /> : (saved ? <CheckCircle size={18} /> : <Save size={18} />)}
                    {saved ? 'ĐÃ ĐỒNG BỘ!' : (isSaving ? 'ĐANG LƯU...' : 'LƯU & ĐỒNG BỘ')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tiểu học */}
                <div className="space-y-2 group">
                    <label className="text-[11px] font-black text-blue-700 uppercase flex items-center gap-2 tracking-wider">
                        <span className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center text-[10px]">1</span>
                        Tiểu Học
                    </label>
                    <textarea
                        value={subjects.primary}
                        onChange={(e) => setSubjects({ ...subjects, primary: e.target.value })}
                        placeholder="Nhập tên môn..."
                        className="w-full h-[320px] p-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none text-sm font-bold text-gray-700 shadow-sm group-hover:shadow-md"
                    />
                </div>

                {/* THCS */}
                <div className="space-y-2 group">
                    <label className="text-[11px] font-black text-green-700 uppercase flex items-center gap-2 tracking-wider">
                        <span className="w-5 h-5 rounded-md bg-green-100 flex items-center justify-center text-[10px]">2</span>
                        THCS (Mặc định)
                    </label>
                    <textarea
                        value={subjects.secondary}
                        onChange={(e) => setSubjects({ ...subjects, secondary: e.target.value })}
                        placeholder="Nhập tên môn..."
                        className="w-full h-[320px] p-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-green-400 focus:ring-4 focus:ring-green-50 outline-none transition-all resize-none text-sm font-bold text-gray-700 shadow-sm group-hover:shadow-md"
                    />
                </div>

                {/* THPT */}
                <div className="space-y-2 group">
                    <label className="text-[11px] font-black text-purple-700 uppercase flex items-center gap-2 tracking-wider">
                        <span className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center text-[10px]">3</span>
                        THPT
                    </label>
                    <textarea
                        value={subjects.high}
                        onChange={(e) => setSubjects({ ...subjects, high: e.target.value })}
                        placeholder="Nhập tên môn..."
                        className="w-full h-[320px] p-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-50 outline-none transition-all resize-none text-sm font-bold text-gray-700 shadow-sm group-hover:shadow-md"
                    />
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start shadow-sm">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div className="text-[11px] text-blue-900 leading-relaxed font-medium">
                    <p className="font-black text-xs mb-1 uppercase tracking-tighter">✨ Cơ chế đồng bộ hóa:</p>
                    <p>• Khi bác bấm <b>LƯU & ĐỒNG BỘ</b>, dữ liệu sẽ được ghi thẳng vào Database và có hiệu lực cho mọi giáo viên.</p>
                    <p>• Hệ thống ưu tiên hiển thị danh sách môn học dựa trên Khối (6-9 là THCS, 10-12 là THPT).</p>
                    <p>• Bác có thể thay đổi tên môn bất cứ lúc nào để báo cáo hiển thị chuyên nghiệp hơn.</p>
                </div>
            </div>
        </div>
    );
}
