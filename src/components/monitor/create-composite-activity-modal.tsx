'use client';

import { useState } from 'react';
import { createCompositeActivityWithChildren, CreateChildColumnDto } from '@/services/column-service';
import { batchSaveMatrixRecords, MatrixCellChange } from '@/services/record-service';
import { Student } from '@/types/models';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/context/auth-context';
import { Plus, X, Save, CheckSquare, Layers, FileText, Loader2, Shield, Utensils, Trophy, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
    students?: Student[];
    onSuccess: () => void;
}

type TemplateType = 'bhtn' | 'ban_tru' | 'hoi_thao' | 'custom';

export function CreateCompositeActivityModal({
    isOpen,
    onClose,
    classId,
    className,
    students = [],
    onSuccess,
}: Props) {
    const { appUser } = useAuth();
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('bhtn');
    const [name, setName] = useState('BẢO HIỂM TAI NẠN');
    const [bhtnAmount, setBhtnAmount] = useState('30.000');
    const [prefillAmount, setPrefillAmount] = useState(true);

    // Custom subcolumns
    const [customColumns, setCustomColumns] = useState<string[]>(['Cờ tướng', 'Cờ vua', 'Kéo co']);
    const [newCustomCol, setNewCustomCol] = useState('');
    const [hasNotes, setHasNotes] = useState(true);

    const [saving, setSaving] = useState(false);

    // Template selection handler
    const handleSelectTemplate = (template: TemplateType) => {
        setSelectedTemplate(template);
        if (template === 'bhtn') {
            setName('BẢO HIỂM TAI NẠN');
        } else if (template === 'ban_tru') {
            setName('BÁN TRÚ');
        } else if (template === 'hoi_thao') {
            setName('HỘI THAO');
        } else {
            setName('');
        }
    };

    const handleAddCustomCol = () => {
        if (!newCustomCol.trim()) return;
        if (!customColumns.includes(newCustomCol.trim())) {
            setCustomColumns([...customColumns, newCustomCol.trim()]);
        }
        setNewCustomCol('');
    };

    const handleRemoveCustomCol = (index: number) => {
        setCustomColumns(customColumns.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Vui lòng nhập tên hoạt động');
            return;
        }

        setSaving(true);
        try {
            const childDtos: CreateChildColumnDto[] = [];
            let amountColumnIndex = -1;

            if (selectedTemplate === 'bhtn') {
                // Biểu mẫu chuẩn BHTN Trường THCS (4 cột chuẩn khớp 100% bản in giấy Hình 1)
                childDtos.push({
                    name: 'Số tiền',
                    dataType: 'text',
                    inputMode: 'select',
                    isNotesColumn: false,
                    suggestions: ['30.000', '60.000', 'Miễn'],
                    order: 1,
                });
                amountColumnIndex = 0;

                childDtos.push({
                    name: 'Không đăng ký',
                    dataType: 'boolean',
                    inputMode: 'checkbox',
                    isNotesColumn: false,
                    suggestions: [],
                    order: 2,
                });

                childDtos.push({
                    name: 'Đăng ký tham gia',
                    dataType: 'boolean',
                    inputMode: 'checkbox',
                    order: 3,
                });

                childDtos.push({
                    name: 'Ký xác nhận tham gia',
                    dataType: 'text',
                    inputMode: 'select',
                    isNotesColumn: true,
                    suggestions: ['Đã ký', 'PH ký', 'Chưa ký'],
                    order: 4,
                });
            } else if (selectedTemplate === 'ban_tru') {
                // Biểu mẫu Bán Trú
                childDtos.push({
                    name: 'Đăng ký tham gia',
                    dataType: 'boolean',
                    inputMode: 'checkbox',
                    order: 1,
                });
                childDtos.push({
                    name: 'Chế độ ăn / Ngủ',
                    dataType: 'text',
                    inputMode: 'select',
                    isNotesColumn: true,
                    suggestions: ['Ăn mặn', 'Ăn chay', 'Ngủ riêng'],
                    order: 2,
                });
                childDtos.push({
                    name: 'Ghi chú',
                    dataType: 'text',
                    inputMode: 'inline_text',
                    isNotesColumn: true,
                    order: 3,
                });
            } else if (selectedTemplate === 'hoi_thao') {
                // Biểu mẫu Hội Thao
                customColumns.forEach((colName, idx) => {
                    childDtos.push({
                        name: colName,
                        dataType: 'boolean',
                        inputMode: 'checkbox',
                        order: idx + 1,
                    });
                });
                if (hasNotes) {
                    childDtos.push({
                        name: 'Ghi chú',
                        dataType: 'text',
                        inputMode: 'inline_text',
                        isNotesColumn: true,
                        order: childDtos.length + 1,
                    });
                }
            } else {
                // Tùy biến tự do
                if (customColumns.length === 0) {
                    toast.error('Vui lòng thêm ít nhất một cột con');
                    setSaving(false);
                    return;
                }
                customColumns.forEach((colName, idx) => {
                    childDtos.push({
                        name: colName,
                        dataType: 'boolean',
                        inputMode: 'checkbox',
                        order: idx + 1,
                    });
                });
                if (hasNotes) {
                    childDtos.push({
                        name: 'Ghi chú',
                        dataType: 'text',
                        inputMode: 'inline_text',
                        isNotesColumn: true,
                        order: childDtos.length + 1,
                    });
                }
            }

            // Tạo cột cha và các cột con
            const created = await createCompositeActivityWithChildren(
                {
                    classId,
                    userId: appUser?.uid || 'unknown',
                    name: name.trim(),
                    scope: 'custom',
                    frequency: 'one_time',
                    allowFreeText: true,
                    archived: false,
                    order: 10,
                    suggestions: [],
                    applicableScope: 'all',
                },
                childDtos
            );

            // Nếu là BHTN và bật điền sẵn mức phí cho cả lớp:
            if (selectedTemplate === 'bhtn' && prefillAmount && students.length > 0 && created.children) {
                const amountCol = created.children[amountColumnIndex];
                if (amountCol) {
                    const changes: MatrixCellChange[] = students.map(s => ({
                        columnId: amountCol.id,
                        classId,
                        studentCode: s.code || s.id,
                        value: bhtnAmount.trim() || '30.000',
                        note: bhtnAmount.trim() || '30.000',
                    }));
                    await batchSaveMatrixRecords(changes);
                }
            }

            toast.success(`Đã tạo thành công hoạt động "${name}" với ${childDtos.length} cột con`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating composite activity:', error);
            toast.error(error.message || 'Lỗi khi tạo hoạt động');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Thêm Hoạt Động Mới – Lớp ${className}`}>
            <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1 py-1">
                {/* 1. Chọn Mẫu Gợi Ý In Nhanh */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Chọn Mẫu Gợi Ý In Nhanh / Nghiệp Vụ
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        <button
                            type="button"
                            onClick={() => handleSelectTemplate('bhtn')}
                            className={cn(
                                "p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 relative",
                                selectedTemplate === 'bhtn'
                                    ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-emerald-300 text-slate-700"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full",
                                selectedTemplate === 'bhtn' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            )}>
                                <Shield size={18} />
                            </div>
                            <span className="font-extrabold text-xs">Bảo Hiểm (BHTN)</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">Chuẩn bản in trường</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSelectTemplate('ban_tru')}
                            className={cn(
                                "p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 relative",
                                selectedTemplate === 'ban_tru'
                                    ? "bg-blue-50 border-blue-600 text-blue-950 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-blue-300 text-slate-700"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full",
                                selectedTemplate === 'ban_tru' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                            )}>
                                <Utensils size={18} />
                            </div>
                            <span className="font-extrabold text-xs">Bán Trú</span>
                            <span className="text-[10px] text-slate-500">ĐK + Chế độ ăn</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSelectTemplate('hoi_thao')}
                            className={cn(
                                "p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 relative",
                                selectedTemplate === 'hoi_thao'
                                    ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-indigo-300 text-slate-700"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full",
                                selectedTemplate === 'hoi_thao' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                            )}>
                                <Trophy size={18} />
                            </div>
                            <span className="font-extrabold text-xs">Hội Thao</span>
                            <span className="text-[10px] text-slate-500">Nhiều môn thi</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSelectTemplate('custom')}
                            className={cn(
                                "p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 relative",
                                selectedTemplate === 'custom'
                                    ? "bg-slate-100 border-slate-600 text-slate-900 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-slate-400 text-slate-700"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full",
                                selectedTemplate === 'custom' ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-500"
                            )}>
                                <Sliders size={18} />
                            </div>
                            <span className="font-extrabold text-xs">Tùy Biến</span>
                            <span className="text-[10px] text-slate-500">Tự do cấu hình</span>
                        </button>
                    </div>
                </div>

                {/* 2. Tên hoạt động */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        Tên hoạt động / Sổ theo dõi <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="VD: BẢO HIỂM TAI NẠN, BÁN TRÚ NĂM HỌC 2026-2027..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                </div>

                {/* 3. Chi tiết cột con theo từng mẫu */}
                {selectedTemplate === 'bhtn' && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                            <Shield size={16} className="text-emerald-700" />
                            <span>Cấu trúc 4 cột chuẩn theo Mẫu in Trường THCS Trần Bội Cơ:</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                                <span className="font-bold text-slate-700">1. Cột Số tiền</span>
                                <p className="text-[11px] text-slate-500 mt-0.5">Mức thu BHTN học sinh</p>
                            </div>
                            <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                                <span className="font-bold text-slate-700">2. Không đăng ký</span>
                                <p className="text-[11px] text-slate-500 mt-0.5">Lý do / Số tiền BHYT khác</p>
                            </div>
                            <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                                <span className="font-bold text-slate-700">3. Đăng ký tham gia</span>
                                <p className="text-[11px] text-slate-500 mt-0.5">Đánh dấu X học sinh tham gia</p>
                            </div>
                            <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                                <span className="font-bold text-slate-700">4. Ký xác nhận tham gia</span>
                                <p className="text-[11px] text-slate-500 mt-0.5">Ký tên học sinh / phụ huynh</p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-emerald-900">Mức phí thu BHTN:</label>
                                <input
                                    type="text"
                                    value={bhtnAmount}
                                    onChange={e => setBhtnAmount(e.target.value)}
                                    placeholder="30.000"
                                    className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 text-center"
                                />
                                <span className="text-xs text-emerald-800">đ/học sinh</span>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-emerald-900">
                                <input
                                    type="checkbox"
                                    checked={prefillAmount}
                                    onChange={e => setPrefillAmount(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <span>Tự động điền cho cả lớp ({students.length} HS)</span>
                            </label>
                        </div>
                    </div>
                )}

                {selectedTemplate === 'ban_tru' && (
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 text-xs">
                        <span className="font-bold text-blue-950">Bao gồm 3 cột con:</span>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 bg-white rounded-lg border border-blue-200 font-semibold text-slate-700 text-center">
                                1. Đăng ký tham gia
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-blue-200 font-semibold text-slate-700 text-center">
                                2. Chế độ ăn / Ngủ
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-blue-200 font-semibold text-slate-700 text-center">
                                3. Ghi chú tùy ý
                            </div>
                        </div>
                    </div>
                )}

                {(selectedTemplate === 'hoi_thao' || selectedTemplate === 'custom') && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Danh sách các môn / Cột con ({customColumns.length})
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {customColumns.map((col, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-800 rounded-lg text-xs font-bold border border-slate-200 shadow-2xs"
                                >
                                    <span>{col}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCustomCol(idx)}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <X size={13} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCustomCol}
                                onChange={e => setNewCustomCol(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCol(); } }}
                                placeholder="Thêm cột con mới..."
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddCustomCol}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition"
                            >
                                Thêm
                            </button>
                        </div>

                        {/* Kèm cột ghi chú */}
                        <label className="flex items-center gap-2 pt-2 border-t border-slate-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasNotes}
                                onChange={e => setHasNotes(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-xs font-semibold text-slate-700">Tự động thêm cột Ghi chú kế bên</span>
                        </label>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Đang khởi tạo...</span>
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>Tạo Hoạt Động Ngay</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
