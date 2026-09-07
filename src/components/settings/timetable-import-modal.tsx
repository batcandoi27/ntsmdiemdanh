'use client';

import { useState } from 'react';
import {
    X,
    Upload,
    FileType2,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Sparkles,
    Check,
    Layers,
    BookOpen,
    Building2,
    ChevronDown,
    ChevronUp,
    Search,
    RefreshCw,
    PlusCircle,
    Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/auth-context';
import {
    parseSchoolMatrixWorkbook,
    MatrixParseResult,
    ParsedClassTimetable,
    DAY_KEYS,
} from '@/services/school-matrix-timetable-parser';
import { batchSaveSchoolMatrixTimetables, BatchImportStats } from '@/services/timetable-service';
import { Class } from '@/types/models';
import { DAY_LABELS } from '@/types/timetable';
import { cn } from '@/lib/utils';

interface TimetableImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classes: Class[];
}

export function TimetableImportModal({ isOpen, onClose, onSuccess, classes }: TimetableImportModalProps) {
    const { appUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedData, setParsedData] = useState<MatrixParseResult | null>(null);
    const [selectedPreviewClass, setSelectedPreviewClass] = useState<string | null>(null);
    const [classSearch, setClassSearch] = useState('');
    const [saveStats, setSaveStats] = useState<BatchImportStats | null>(null);

    // Form states
    const [effectiveFrom, setEffectiveFrom] = useState('2026-09-07');
    const [effectiveTo, setEffectiveTo] = useState('2027-05-31');
    const [autoCreateClasses, setAutoCreateClasses] = useState(true);
    const [deactivatePrevious, setDeactivatePrevious] = useState(true);

    if (!isOpen) return null;

    const existingClassNames = new Set(classes.map(c => c.name.toLowerCase()));

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !appUser) return;

        setLoading(true);
        setParsedData(null);
        setSaveStats(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const res = parseSchoolMatrixWorkbook(workbook);
                setParsedData(res);

                if (res.metadata.effectiveDate) {
                    setEffectiveFrom(res.metadata.effectiveDate);
                }
                if (res.classes.length > 0) {
                    setSelectedPreviewClass(res.classes[0].className);
                }
            } catch (err: any) {
                console.error('Lỗi phân tích file:', err);
                alert('Lỗi xử lý file Excel: ' + (err?.message || err));
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExecuteImport = async () => {
        if (!appUser || !parsedData || parsedData.classes.length === 0) return;

        setIsSaving(true);
        try {
            const stats = await batchSaveSchoolMatrixTimetables(
                appUser,
                parsedData.classes,
                {
                    autoCreateMissingClasses: autoCreateClasses,
                    deactivatePrevious: deactivatePrevious,
                    effectiveFrom: effectiveFrom,
                    effectiveTo: effectiveTo,
                }
            );

            setSaveStats(stats);
            if (stats.success) {
                setTimeout(() => {
                    onSuccess();
                }, 2500);
            }
        } catch (err: any) {
            console.error('Lỗi lưu TKB hàng loạt:', err);
            alert('Lỗi lưu thời khóa biểu: ' + (err?.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    // Xác định các lớp chưa có trong hệ thống
    const missingClasses = parsedData
        ? parsedData.classes.filter(c => !existingClassNames.has(c.className.toLowerCase()))
        : [];

    const previewClassItem = parsedData?.classes.find(c => c.className === selectedPreviewClass);

    const filteredClasses = parsedData?.classes.filter(c =>
        c.className.toLowerCase().includes(classSearch.toLowerCase())
    ) || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Nhập Hàng Loạt Thời Khóa Biểu Toàn Trường</h2>
                            <p className="text-xs text-slate-300">
                                Hỗ trợ Mẫu Ma Trận Excel Trường Học (TKB Lớp Sáng/Chiều) & Danh sách phẳng
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Success State */}
                    {saveStats?.success && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 animate-in fade-in">
                            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                                <CheckCircle2 size={36} />
                            </div>
                            <h3 className="text-xl font-bold text-emerald-900">Nhập Thời Khóa Biểu Thành Công!</h3>
                            <p className="text-sm text-emerald-700 max-w-md mx-auto">
                                Đã cập nhật thành công TKB cho <span className="font-bold text-emerald-950">{saveStats.totalClasses}</span> lớp với tổng cộng <span className="font-bold text-emerald-950">{saveStats.totalSlots}</span> tiết học.
                            </p>
                            {saveStats.classesCreated > 0 && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100/80 border border-emerald-300 text-emerald-800 rounded-full text-xs font-semibold">
                                    <PlusCircle size={14} />
                                    Đã tự động khởi tạo {saveStats.classesCreated} lớp mới ({saveStats.createdClassNames.join(', ')})
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 1: Upload Box (If no file parsed yet or if re-uploading) */}
                    {!parsedData && !saveStats?.success && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 hover:bg-emerald-50/40 hover:border-emerald-500 transition-all bg-slate-50/60 text-center cursor-pointer relative group">
                                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                                    {loading ? (
                                        <div className="space-y-4 py-6">
                                            <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
                                            <p className="font-bold text-emerald-800 text-base">Đang phân tích file Excel toàn trường...</p>
                                            <p className="text-xs text-slate-500">Đang quét các sheet SÁNG, CHIỀU và đối soát 50+ lớp học</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                                                <FileType2 size={32} />
                                            </div>
                                            <span className="font-bold text-slate-800 text-lg">Click để chọn file hoặc Kéo thả file Excel vào đây</span>
                                            <span className="text-slate-500 text-sm mt-1">Hỗ trợ file định dạng <span className="font-semibold text-emerald-700">TKB LỚP.xlsx</span> (2 Sheet Sáng/Chiều) hoặc file danh sách</span>
                                            <span className="mt-4 px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-full shadow-xs">
                                                Chọn tệp .xlsx, .xls
                                            </span>
                                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                        </>
                                    )}
                                </label>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-xs text-blue-800">
                                <Info className="shrink-0 text-blue-600 mt-0.5" size={18} />
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">Cơ chế tự nhận diện thông minh:</p>
                                    <p>• Tự động ghép nối buổi <strong>SÁNG</strong> và <strong>CHIỀU</strong> của cùng 1 lớp thành 1 TKB hoàn chỉnh.</p>
                                    <p>• Tự động trích xuất thông tin Trường, Học kỳ, Năm học và ngày có hiệu lực từ file.</p>
                                    <p>• Tự động chuẩn hóa tên các môn học (Văn học ➔ Ngữ văn, LS&ĐL ➔ Lịch sử & Địa lý, Nhạc ➔ Âm nhạc,...).</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Analysis & Preview Dashboard */}
                    {parsedData && !saveStats?.success && (
                        <div className="space-y-6">
                            {/* Summary Metrics Banner */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-md">
                                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="text-emerald-400" size={18} />
                                            <h3 className="text-base font-bold">
                                                {parsedData.metadata.schoolName || 'THCS TRẦN BỘI CƠ'}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-300 mt-0.5">
                                            Học kỳ {parsedData.metadata.semester || '1'} • Năm học {parsedData.metadata.academicYear || '2026-2027'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer border border-slate-700 transition-colors flex items-center gap-1.5">
                                            <Upload size={14} />
                                            Chọn file khác
                                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Tổng số lớp</span>
                                        <p className="text-2xl font-black text-emerald-400 mt-1">{parsedData.totalClasses}</p>
                                        <span className="text-[11px] text-slate-400">Đầy đủ các khối</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Tổng tiết học</span>
                                        <p className="text-2xl font-black text-sky-400 mt-1">{parsedData.totalSlots}</p>
                                        <span className="text-[11px] text-slate-400">Thứ 2 ➔ Thứ 7</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Môn học</span>
                                        <p className="text-2xl font-black text-amber-400 mt-1">{parsedData.uniqueSubjects.length}</p>
                                        <span className="text-[11px] text-slate-400">Đã chuẩn hóa</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Lớp mới</span>
                                        <p className="text-2xl font-black text-purple-400 mt-1">{missingClasses.length}</p>
                                        <span className="text-[11px] text-slate-400">
                                            {missingClasses.length > 0 ? missingClasses.map(m => m.className).join(', ') : 'Khớp 100%'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Configuration Options */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={15} className="text-slate-500" />
                                    Cấu Hình Áp Dụng
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Áp dụng từ ngày</label>
                                        <input
                                            type="date"
                                            value={effectiveFrom}
                                            onChange={e => setEffectiveFrom(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Đến ngày</label>
                                        <input
                                            type="date"
                                            value={effectiveTo}
                                            onChange={e => setEffectiveTo(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoCreateClasses}
                                            onChange={e => setAutoCreateClasses(e.target.checked)}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 rounded-sm"
                                        />
                                        <span>Tự động tạo các lớp mới chưa có trong CSDL (ví dụ: {missingClasses.map(m => m.className).join(', ') || 'lớp mới'})</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={deactivatePrevious}
                                            onChange={e => setDeactivatePrevious(e.target.checked)}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 rounded-sm"
                                        />
                                        <span>Vô hiệu hóa đợt TKB cũ của các lớp này</span>
                                    </label>
                                </div>
                            </div>

                            {/* Class List & Single Class Preview */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                                <div className="p-3.5 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={16} className="text-slate-600" />
                                        <span className="text-xs font-bold text-slate-800 uppercase">Xem Trước TKB Từng Lớp ({parsedData.classes.length} Lớp)</span>
                                    </div>
                                    <div className="relative w-full sm:w-48">
                                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Tìm lớp (vd: 6A1)..."
                                            value={classSearch}
                                            onChange={e => setClassSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Class Tabs */}
                                <div className="p-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto bg-slate-50/50">
                                    {filteredClasses.slice(0, 30).map(c => {
                                        const isMissing = !existingClassNames.has(c.className.toLowerCase());
                                        return (
                                            <button
                                                key={c.className}
                                                onClick={() => setSelectedPreviewClass(c.className)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                                                    selectedPreviewClass === c.className
                                                        ? "bg-emerald-600 text-white shadow-xs"
                                                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                                )}
                                            >
                                                <span>Lớp {c.className}</span>
                                                {isMissing && (
                                                    <span className="w-2 h-2 rounded-full bg-purple-500" title="Lớp mới" />
                                                )}
                                            </button>
                                        );
                                    })}
                                    {filteredClasses.length > 30 && (
                                        <span className="text-xs text-slate-400 self-center px-2">+{filteredClasses.length - 30} lớp khác...</span>
                                    )}
                                </div>

                                {/* Schedule Matrix for Selected Class */}
                                {previewClassItem && (
                                    <div className="p-4 overflow-x-auto">
                                        <div className="min-w-[620px] border border-slate-200 rounded-xl overflow-hidden text-xs">
                                            {/* Days header */}
                                            <div className="grid grid-cols-7 bg-slate-800 text-white font-bold text-center py-2">
                                                <div>Buổi / Tiết</div>
                                                {DAY_KEYS.map(d => (
                                                    <div key={d}>{DAY_LABELS[d]}</div>
                                                ))}
                                            </div>

                                            {/* Sáng */}
                                            <div className="divide-y divide-slate-100">
                                                {[1, 2, 3, 4, 5].map(p => (
                                                    <div key={`m_${p}`} className="grid grid-cols-7 divide-x divide-slate-100 items-center">
                                                        <div className="bg-orange-50/70 p-1.5 font-bold text-orange-800 text-center">
                                                            Sáng - T{p}
                                                        </div>
                                                        {DAY_KEYS.map(d => {
                                                            const slot = previewClassItem.schedule[d].morning.find(s => s.period === p);
                                                            return (
                                                                <div key={d} className="p-1.5 text-center truncate">
                                                                    {slot ? (
                                                                        <span className="font-semibold text-slate-800 bg-orange-50/50 px-1.5 py-0.5 rounded">
                                                                            {slot.subject}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">-</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}

                                                {/* Chiều */}
                                                {[1, 2, 3, 4].map(p => (
                                                    <div key={`a_${p}`} className="grid grid-cols-7 divide-x divide-slate-100 items-center bg-blue-50/20">
                                                        <div className="bg-sky-50/70 p-1.5 font-bold text-sky-800 text-center">
                                                            Chiều - T{p}
                                                        </div>
                                                        {DAY_KEYS.map(d => {
                                                            const slot = previewClassItem.schedule[d].afternoon.find(s => s.period === p);
                                                            return (
                                                                <div key={d} className="p-1.5 text-center truncate">
                                                                    {slot ? (
                                                                        <span className="font-semibold text-slate-800 bg-sky-50 px-1.5 py-0.5 rounded">
                                                                            {slot.subject}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">-</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl font-bold text-sm transition-colors"
                    >
                        Đóng
                    </button>

                    {parsedData && !saveStats?.success && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setParsedData(null)}
                                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                            >
                                Hủy & Chọn file khác
                            </button>
                            <button
                                onClick={handleExecuteImport}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Đang nhập {parsedData.totalClasses} lớp...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Nhập Hàng Loạt Vào Hệ Thống ({parsedData.totalClasses} Lớp)
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
