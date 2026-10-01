'use client';

import { useState } from 'react';
import { Student, Column } from '@/types/models';
import { exportCompositeMatrixToExcel, exportBHTNStandardExcel } from '@/services/composite-export-service';
import { Modal } from '@/components/ui/modal';
import { FileSpreadsheet, Check, CheckSquare, Square, Loader2, Sparkles, Shield, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    classInfo: { id: string; name: string; academicYear?: string; teacherName?: string; totalStudents?: number };
    students: Student[];
    activities: Column[];
    records: Record<string, Record<string, { value: unknown; note?: string }>>;
}

export function ExportColumnSelectorModal({
    isOpen,
    onClose,
    classInfo,
    students,
    activities,
    records,
}: Props) {
    // Determine default mode: if an activity has 'bảo hiểm' or 'bhtn', default to bhtn_standard
    const defaultBHTNActivity = activities.find(a => 
        a.name.toLowerCase().includes('bảo hiểm') || a.name.toLowerCase().includes('bhtn')
    ) || activities[0];

    const [exportMode, setExportMode] = useState<'bhtn_standard' | 'consolidated_matrix'>(
        defaultBHTNActivity ? 'bhtn_standard' : 'consolidated_matrix'
    );
    const [selectedBHTNActivityId, setSelectedBHTNActivityId] = useState<string>(
        defaultBHTNActivity ? defaultBHTNActivity.id : (activities[0]?.id || '')
    );
    const [bhtnUnitPrice, setBhtnUnitPrice] = useState<number>(30000);

    // Selected child column IDs for matrix mode
    const allChildIds = activities.flatMap(a => (a.children || []).map(c => c.id));
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>(allChildIds);
    const [markSymbol, setMarkSymbol] = useState<'✓' | 'X'>('X');
    const [title, setTitle] = useState('BẢNG TỔNG HỢP DANH SÁCH ĐĂNG KÝ CÁC HOẠT ĐỘNG');
    const [exporting, setExporting] = useState(false);

    const toggleChild = (childId: string) => {
        setSelectedChildIds(prev =>
            prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
        );
    };

    const toggleActivity = (act: Column) => {
        const childIds = (act.children || []).map(c => c.id);
        const allSelected = childIds.every(id => selectedChildIds.includes(id));

        if (allSelected) {
            setSelectedChildIds(prev => prev.filter(id => !childIds.includes(id)));
        } else {
            const newSet = new Set([...selectedChildIds, ...childIds]);
            setSelectedChildIds(Array.from(newSet));
        }
    };

    const selectAll = () => {
        setSelectedChildIds(allChildIds);
    };

    const deselectAll = () => {
        setSelectedChildIds([]);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            if (exportMode === 'bhtn_standard') {
                const targetAct = activities.find(a => a.id === selectedBHTNActivityId);
                if (!targetAct) {
                    toast.error('Vui lòng chọn hoạt động Bảo hiểm tai nạn để xuất');
                    setExporting(false);
                    return;
                }

                await exportBHTNStandardExcel({
                    classInfo,
                    students,
                    activity: targetAct,
                    records,
                    academicYear: classInfo.academicYear || '2026-2027',
                    unitPrice: Number(bhtnUnitPrice) || 30000,
                    customTitle: `DANH SÁCH HỌC SINH ĐĂNG KÝ THAM GIA BHTN NĂM HỌC ${classInfo.academicYear || '2026-2027'}`,
                });
                toast.success('Đã xuất file Excel mẫu chuẩn BHTN Trường (giống bản in thực tế)!');
            } else {
                if (selectedChildIds.length === 0) {
                    toast.error('Vui lòng chọn ít nhất một cột hoạt động để xuất');
                    setExporting(false);
                    return;
                }

                const filteredActivities = activities
                    .map(act => ({
                        ...act,
                        children: (act.children || []).filter(c => selectedChildIds.includes(c.id)),
                    }))
                    .filter(act => act.children.length > 0);

                await exportCompositeMatrixToExcel({
                    classInfo,
                    students,
                    activities: filteredActivities,
                    records,
                    markSymbol,
                    customTitle: title.trim() || undefined,
                });
                toast.success('Đã xuất file Excel Ma Trận Tổng Hợp thành công!');
            }
            onClose();
        } catch (error: any) {
            console.error('Error exporting excel:', error);
            toast.error(error.message || 'Lỗi khi tạo file Excel');
        } finally {
            setExporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tùy Chọn Xuất Báo Cáo & In Excel">
            <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1 py-1">
                {/* 1. Chọn định dạng xuất biểu mẫu */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Định dạng biểu mẫu xuất Excel
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setExportMode('bhtn_standard')}
                            className={cn(
                                "p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between",
                                exportMode === 'bhtn_standard'
                                    ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-emerald-300 text-slate-700"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className={cn("w-4 h-4", exportMode === 'bhtn_standard' ? "text-emerald-700" : "text-slate-400")} />
                                <span className="text-xs font-extrabold">Mẫu Chuẩn BHTN Trường</span>
                            </div>
                            <span className="text-[11px] text-slate-500 leading-relaxed">
                                Khớp 100% bản in giấy thực tế (STT, Lớp, Họ tên, Số tiền, Không ĐK, Đăng ký X, Ký xác nhận)
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setExportMode('consolidated_matrix')}
                            className={cn(
                                "p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between",
                                exportMode === 'consolidated_matrix'
                                    ? "bg-blue-50 border-blue-600 text-blue-950 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-blue-300 text-slate-700"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Layers className={cn("w-4 h-4", exportMode === 'consolidated_matrix' ? "text-blue-700" : "text-slate-400")} />
                                <span className="text-xs font-extrabold">Ma Trận Đa Hoạt Động</span>
                            </div>
                            <span className="text-[11px] text-slate-500 leading-relaxed">
                                Bảng tổng hợp nhiều hoạt động gộp chung (BHTN, Bán trú, Hội thao...) 2 tầng tiêu đề
                            </span>
                        </button>
                    </div>
                </div>

                {/* 2. Cấu hình chi tiết theo từng chế độ */}
                {exportMode === 'bhtn_standard' ? (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950">
                            <Sparkles size={16} className="text-emerald-700" />
                            <span>Xem trước cấu trúc 7 cột chuẩn của bản in (Hình 1):</span>
                        </div>

                        {/* Cột preview */}
                        <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2 text-xs">
                            <div className="font-bold text-center text-slate-800 uppercase pb-1 border-b border-slate-100">
                                DANH SÁCH HỌC SINH ĐĂNG KÝ THAM GIA BHTN NĂM HỌC {classInfo.academicYear || '2026-2027'}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-center text-slate-600 bg-slate-100 p-1.5 rounded-lg">
                                <div>STT</div>
                                <div>Lớp</div>
                                <div>Họ tên</div>
                                <div>Số tiền</div>
                                <div>Không ĐK</div>
                                <div>Đăng ký</div>
                                <div>Ký xác nhận</div>
                            </div>
                            <div className="pt-1 text-[11px] text-emerald-800 font-semibold space-y-0.5">
                                <p>• Tự động tính: <strong>Tổng số học sinh tham gia</strong></p>
                                <p>• Tự động tính: <strong>Thành tiền ({new Intl.NumberFormat('vi-VN').format(bhtnUnitPrice)} đ × số HS đăng ký)</strong></p>
                                <p>• Tự động có: <strong>Khối ký tên Giáo viên chủ nhiệm & Người lập bảng</strong></p>
                            </div>
                        </div>

                        {/* Cấu hình chọn hoạt động & mức thu */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-1">
                                    Hoạt động BHTN trong hệ thống
                                </label>
                                <select
                                    value={selectedBHTNActivityId}
                                    onChange={e => setSelectedBHTNActivityId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                                >
                                    {activities.map(act => (
                                        <option key={act.id} value={act.id}>{act.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-emerald-950 mb-1">
                                    Mức thu BHTN (đ/học sinh)
                                </label>
                                <input
                                    type="number"
                                    value={bhtnUnitPrice}
                                    onChange={e => setBhtnUnitPrice(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tiêu đề bảng */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Tiêu đề trên bảng Excel
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Ký hiệu tick */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                                Ký hiệu đánh dấu khi học sinh tham gia
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMarkSymbol('X')}
                                    className={cn(
                                        "p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition",
                                        markSymbol === 'X'
                                            ? "bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20 shadow-xs"
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="text-base text-blue-600 font-black">X</span>
                                    <span>Dấu X (như bản in giấy thực tế)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMarkSymbol('✓')}
                                    className={cn(
                                        "p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition",
                                        markSymbol === '✓'
                                            ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs"
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="text-base text-emerald-600 font-black">✓</span>
                                    <span>Dấu tích chuẩn (✓)</span>
                                </button>
                            </div>
                        </div>

                        {/* Cây hoạt động */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Chọn Hoạt Động & Cột Con Muốn Xuất ({selectedChildIds.length} cột con)
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAll}
                                        className="text-xs font-bold text-blue-600 hover:underline"
                                    >
                                        Chọn tất cả
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        type="button"
                                        onClick={deselectAll}
                                        className="text-xs font-bold text-slate-500 hover:underline"
                                    >
                                        Bỏ chọn
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                {activities.map(act => {
                                    const children = act.children || [];
                                    const childIds = children.map(c => c.id);
                                    const allChecked = children.length > 0 && childIds.every(id => selectedChildIds.includes(id));
                                    const someChecked = childIds.some(id => selectedChildIds.includes(id)) && !allChecked;

                                    return (
                                        <div
                                            key={act.id}
                                            className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs"
                                        >
                                            <div
                                                onClick={() => toggleActivity(act)}
                                                className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 select-none hover:text-blue-600"
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                                                    allChecked ? "bg-blue-600 border-blue-600 text-white" :
                                                    someChecked ? "bg-blue-100 border-blue-400 text-blue-700" :
                                                    "border-slate-300 bg-white"
                                                )}>
                                                    {allChecked && <Check size={12} strokeWidth={3} />}
                                                    {someChecked && <div className="w-2 h-0.5 bg-blue-600 rounded" />}
                                                </div>
                                                <span className="uppercase tracking-tight">{act.name}</span>
                                                <span className="text-[11px] font-normal text-slate-500">({children.length} cột con)</span>
                                            </div>

                                            {/* Children checkboxes */}
                                            <div className="pl-6 grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/60">
                                                {children.map(child => {
                                                    const checked = selectedChildIds.includes(child.id);
                                                    return (
                                                        <div
                                                            key={child.id}
                                                            onClick={() => toggleChild(child.id)}
                                                            className="flex items-center gap-2 cursor-pointer py-0.5 select-none hover:text-blue-600"
                                                        >
                                                            {checked ? (
                                                                <CheckSquare size={14} className="text-blue-600" />
                                                            ) : (
                                                                <Square size={14} className="text-slate-400" />
                                                            )}
                                                            <span className={cn("text-xs", checked ? "font-semibold text-slate-800" : "text-slate-500")}>
                                                                {child.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={exporting}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {exporting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Đang xuất file Excel...</span>
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={14} />
                                <span>{exportMode === 'bhtn_standard' ? 'Xuất Excel Chuẩn BHTN (Hình 1)' : 'Tải Xuất Excel Ma Trận'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
