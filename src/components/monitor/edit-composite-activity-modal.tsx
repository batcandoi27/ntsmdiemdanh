'use client';

import { useState, useEffect } from 'react';
import { Column } from '@/types/models';
import { updateColumn, deleteColumn, addChildColumnToActivity } from '@/services/column-service';
import { batchSaveMatrixRecords, MatrixCellChange } from '@/services/record-service';
import { Modal } from '@/components/ui/modal';
import { Plus, Trash2, Edit2, Check, X, Shield, Sparkles, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    activity: Column | null;
    classId: string;
    studentCount: number;
    students: { id: string; code?: string; fullName: string }[];
    onSuccess: () => void;
}

export function EditCompositeActivityModal({
    isOpen,
    onClose,
    activity,
    classId,
    studentCount,
    students,
    onSuccess,
}: Props) {
    const [name, setName] = useState(activity?.name || '');
    const [children, setChildren] = useState<Column[]>(activity?.children || []);
    const [editingChildId, setEditingChildId] = useState<string | null>(null);
    const [editingChildName, setEditingChildName] = useState('');
    const [editingChildSuggestions, setEditingChildSuggestions] = useState('');
    const [newChildName, setNewChildName] = useState('');
    const [newChildMode, setNewChildMode] = useState<'checkbox' | 'suggestions' | 'inline_text'>('checkbox');
    const [newChildSuggestions, setNewChildSuggestions] = useState('');
    const [saving, setSaving] = useState(false);

    // Sync state when activity prop updates
    useEffect(() => {
        if (activity) {
            setName(activity.name);
            setChildren(activity.children || []);
        }
    }, [activity]);

    if (!isOpen || !activity) return null;

    // Save activity name change
    const handleSaveActivityName = async () => {
        if (!name.trim()) {
            toast.error('Tên hoạt động không được để trống');
            return;
        }
        setSaving(true);
        try {
            await updateColumn(activity.id, { name: name.trim() });
            toast.success('Đã đổi tên hoạt động thành công');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi cập nhật tên hoạt động');
        } finally {
            setSaving(false);
        }
    };

    // Rename & edit suggestions of a sub-column
    const handleSaveChildEdit = async (childId: string) => {
        if (!editingChildName.trim()) {
            toast.error('Tên cột con không được để trống');
            return;
        }
        setSaving(true);
        try {
            const parsedSuggestions = editingChildSuggestions
                ? editingChildSuggestions.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            await updateColumn(childId, {
                name: editingChildName.trim(),
                suggestions: parsedSuggestions,
            });
            setChildren(prev => prev.map(c => c.id === childId ? {
                ...c,
                name: editingChildName.trim(),
                suggestions: parsedSuggestions,
            } : c));
            setEditingChildId(null);
            setEditingChildName('');
            setEditingChildSuggestions('');
            toast.success('Đã cập nhật cột con');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi cập nhật cột con');
        } finally {
            setSaving(false);
        }
    };

    // Delete a sub-column
    const handleDeleteChild = async (childId: string, childName: string) => {
        if (!confirm(`Bạn có chắc muốn xóa cột "${childName}"? Dữ liệu của cột này sẽ bị xóa khỏi bảng.`)) {
            return;
        }
        setSaving(true);
        try {
            await deleteColumn(childId);
            setChildren(prev => prev.filter(c => c.id !== childId));
            toast.success(`Đã xóa cột con "${childName}"`);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi xóa cột con');
        } finally {
            setSaving(false);
        }
    };

    // Add a new sub-column
    const handleAddNewChild = async () => {
        if (!newChildName.trim()) {
            toast.error('Vui lòng nhập tên cột con mới');
            return;
        }
        setSaving(true);
        try {
            const isNote = newChildMode === 'inline_text';
            const parsedSuggestions = newChildMode === 'suggestions'
                ? newChildSuggestions.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const created = await addChildColumnToActivity(activity.id, {
                name: newChildName.trim(),
                dataType: isNote ? 'text' : (newChildMode === 'checkbox' ? 'boolean' : 'text'),
                inputMode: newChildMode === 'suggestions' ? 'select' : (isNote ? 'inline_text' : 'checkbox'),
                isNotesColumn: isNote,
                suggestions: parsedSuggestions,
                order: children.length + 1,
            });
            setChildren(prev => [...prev, created]);
            setNewChildName('');
            setNewChildMode('checkbox');
            setNewChildSuggestions('');
            toast.success(`Đã thêm cột "${created.name}"`);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi khi thêm cột con');
        } finally {
            setSaving(false);
        }
    };

    // One-click upgrade to 4-column BHTN Standard (Số tiền, Không đăng ký, Đăng ký tham gia, Ký xác nhận tham gia)
    const handleConvertToBHTNStandard = async () => {
        if (!confirm('Hệ thống sẽ cập nhật hoạt động này theo đúng biểu mẫu BHTN chuẩn của Trường (gồm 4 cột: Số tiền [30.000], Không đăng ký, Đăng ký tham gia, Ký xác nhận). Tiếp tục?')) {
            return;
        }

        setSaving(true);
        try {
            // 1. Rename parent activity to standard if needed
            await updateColumn(activity.id, { name: 'BẢO HIỂM TAI NẠN' });
            setName('BẢO HIỂM TAI NẠN');

            // 2. Determine existing columns by name
            const existingNames = children.map(c => c.name.toLowerCase().trim());

            // Needed columns:
            // 1. "Số tiền" (inline_text)
            // 2. "Không đăng ký" (inline_text)
            // 3. "Đăng ký tham gia" (checkbox)
            // 4. "Ký xác nhận tham gia" (inline_text)
            let amountCol = children.find(c => c.name.toLowerCase().includes('tiền'));
            if (!amountCol) {
                amountCol = await addChildColumnToActivity(activity.id, {
                    name: 'Số tiền',
                    dataType: 'text',
                    inputMode: 'select',
                    isNotesColumn: true,
                    suggestions: ['30.000', '60.000', 'Miễn'],
                    order: 1,
                });
            } else if (!amountCol.suggestions || amountCol.suggestions.length === 0) {
                await updateColumn(amountCol.id, { suggestions: ['30.000', '60.000', 'Miễn'] });
            }

            let notRegCol = children.find(c => c.name.toLowerCase().includes('không'));
            if (!notRegCol) {
                notRegCol = await addChildColumnToActivity(activity.id, {
                    name: 'Không đăng ký',
                    dataType: 'text',
                    inputMode: 'inline_text',
                    isNotesColumn: true,
                    suggestions: ['Không tham gia', 'Đã mua BHYT ngoài'],
                    order: 2,
                });
            }

            let regCol = children.find(c => c.name.toLowerCase().includes('đăng ký') && !c.name.toLowerCase().includes('không'));
            if (!regCol) {
                regCol = await addChildColumnToActivity(activity.id, {
                    name: 'Đăng ký tham gia',
                    dataType: 'boolean',
                    inputMode: 'checkbox',
                    order: 3,
                });
            } else {
                // Standardize name
                if (regCol.name !== 'Đăng ký tham gia') {
                    await updateColumn(regCol.id, { name: 'Đăng ký tham gia' });
                }
            }

            let sigCol = children.find(c => c.name.toLowerCase().includes('ký') && c.name.toLowerCase().includes('nhận'));
            if (!sigCol) {
                sigCol = await addChildColumnToActivity(activity.id, {
                    name: 'Ký xác nhận tham gia',
                    dataType: 'text',
                    inputMode: 'select',
                    isNotesColumn: true,
                    suggestions: ['Đã ký', 'PH ký', 'Chưa ký'],
                    order: 4,
                });
            } else if (!sigCol.suggestions || sigCol.suggestions.length === 0) {
                await updateColumn(sigCol.id, { suggestions: ['Đã ký', 'PH ký', 'Chưa ký'] });
            }

            // Fill default 30.000 for all students into amount column
            if (amountCol && students.length > 0) {
                const amountChanges: MatrixCellChange[] = students.map(s => ({
                    columnId: amountCol!.id,
                    classId,
                    studentCode: s.code || s.id,
                    value: '30.000',
                    note: '30.000',
                }));
                await batchSaveMatrixRecords(amountChanges);
            }

            toast.success('Đã chuẩn hóa thành công 4 cột BHTN chuẩn trường!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error converting to BHTN standard:', error);
            toast.error(error.message || 'Lỗi khi chuẩn hóa biểu mẫu BHTN');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Chỉnh Sửa Hoạt Động & Quản Lý Cột Con">
            <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1 py-1">
                {/* 1. Tên Hoạt động cha */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        Tên hoạt động
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={handleSaveActivityName}
                            disabled={saving || name.trim() === activity.name}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                            <Save size={13} />
                            <span>Lưu tên</span>
                        </button>
                    </div>
                </div>

                {/* 2. Nút chuyển đổi nhanh sang Chuẩn BHTN Trường (Hình 1) */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                            <div className="text-xs font-bold text-emerald-950">Biểu mẫu chuẩn BHTN Trường (Hình 1)</div>
                            <div className="text-[11px] text-emerald-700">
                                Tự động chuẩn hóa 4 cột: <strong>Số tiền (30.000)</strong>, <strong>Không ĐK</strong>, <strong>Đăng ký tham gia (X)</strong>, <strong>Ký xác nhận</strong>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleConvertToBHTNStandard}
                        disabled={saving}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition shrink-0 flex items-center gap-1 active:scale-95"
                    >
                        <Sparkles size={13} />
                        <span>Áp dụng chuẩn BHTN</span>
                    </button>
                </div>

                {/* 3. Danh sách các cột con hiện có (Thầy cô có thể đổi tên, sửa gợi ý hoặc xóa cột) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Các cột con hiện tại ({children.length})
                        </label>
                        <span className="text-[11px] text-slate-400">Thầy cô có thể sửa tên, gợi ý hoặc xóa bớt cột</span>
                    </div>

                    <div className="space-y-2">
                        {children.map((child, idx) => {
                            const hasSuggestions = child.suggestions && child.suggestions.length > 0;
                            const isNote = child.displayConfig?.isNotesColumn || child.activityConfig?.inputMode === 'inline_text';

                            return (
                                <div
                                    key={child.id}
                                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="w-5 text-center text-slate-400 font-mono font-bold">{idx + 1}</span>
                                            {editingChildId === child.id ? (
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={editingChildName}
                                                            onChange={e => setEditingChildName(e.target.value)}
                                                            placeholder="Tên cột"
                                                            className="flex-1 px-2.5 py-1 bg-white border border-blue-400 rounded-lg text-xs font-bold focus:outline-none"
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveChildEdit(child.id)}
                                                            className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"
                                                            title="Lưu thay đổi"
                                                        >
                                                            <Check size={13} />
                                                            <span>Lưu</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingChildId(null)}
                                                            className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"
                                                            title="Hủy"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                                            Danh sách gợi ý xoay vòng & Dropbox (cách nhau dấu phẩy):
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editingChildSuggestions}
                                                            onChange={e => setEditingChildSuggestions(e.target.value)}
                                                            placeholder="VD: 30.000, 60.000, Miễn (để trống nếu không dùng)"
                                                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                                    <span className="font-extrabold text-slate-800">{child.name}</span>
                                                    {hasSuggestions ? (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                            🔄 Gợi ý ({child.suggestions!.length}): {child.suggestions!.join(', ')}
                                                        </span>
                                                    ) : isNote ? (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                            ✏️ Văn bản / Số
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                            ☑️ Ô đánh dấu (X)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {editingChildId !== child.id && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingChildId(child.id);
                                                        setEditingChildName(child.name);
                                                        setEditingChildSuggestions((child.suggestions || []).join(', '));
                                                    }}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Sửa tên & gợi ý cột này"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteChild(child.id, child.name)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Xóa cột con này"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 4. Thêm cột con mới */}
                <div className="p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Plus size={14} className="text-blue-600" />
                        <span>Thêm cột con mới vào hoạt động</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Tên cột con</label>
                        <input
                            type="text"
                            value={newChildName}
                            onChange={e => setNewChildName(e.target.value)}
                            placeholder="VD: Mức phí, Ký xác nhận, Môn thi đấu, Chế độ ăn..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Kiểu cột</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setNewChildMode('checkbox')}
                                className={cn(
                                    "p-2 rounded-xl border text-left transition flex flex-col gap-0.5",
                                    newChildMode === 'checkbox'
                                        ? "border-blue-500 bg-blue-50 text-blue-900 font-bold"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <span className="text-xs">☑️ Đánh dấu (X)</span>
                                <span className="text-[10px] text-slate-400 font-normal">Đăng ký, Tham gia</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setNewChildMode('suggestions');
                                    if (!newChildSuggestions) setNewChildSuggestions('30.000, 60.000, Miễn');
                                }}
                                className={cn(
                                    "p-2 rounded-xl border text-left transition flex flex-col gap-0.5",
                                    newChildMode === 'suggestions'
                                        ? "border-blue-500 bg-blue-50 text-blue-900 font-bold"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <span className="text-xs">🔄 Gợi ý & Dropbox</span>
                                <span className="text-[10px] text-slate-400 font-normal">Nhảy gợi ý xoay vòng</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewChildMode('inline_text')}
                                className={cn(
                                    "p-2 rounded-xl border text-left transition flex flex-col gap-0.5",
                                    newChildMode === 'inline_text'
                                        ? "border-blue-500 bg-blue-50 text-blue-900 font-bold"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <span className="text-xs">✏️ Nhập chữ tự do</span>
                                <span className="text-[10px] text-slate-400 font-normal">Số tiền, ghi chú</span>
                            </button>
                        </div>
                    </div>

                    {newChildMode === 'suggestions' && (
                        <div className="space-y-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                            <label className="block text-xs font-bold text-blue-950">
                                Danh sách gợi ý (ngăn cách bằng dấu phẩy)
                            </label>
                            <input
                                type="text"
                                value={newChildSuggestions}
                                onChange={e => setNewChildSuggestions(e.target.value)}
                                placeholder="VD: 30.000, 60.000, Miễn hoặc Cờ vua, Cờ tướng"
                                className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-semibold focus:outline-none"
                            />
                            <div className="flex gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[10px] text-slate-400">Gợi ý mẫu:</span>
                                <button
                                    type="button"
                                    onClick={() => setNewChildSuggestions('30.000, 60.000, Miễn')}
                                    className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-600 hover:bg-blue-100"
                                >
                                    30k, 60k, Miễn
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewChildSuggestions('Đã nộp, Chưa nộp')}
                                    className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-600 hover:bg-blue-100"
                                >
                                    Đã nộp, Chưa nộp
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewChildSuggestions('Cờ vua, Kéo co, Điền kinh')}
                                    className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-600 hover:bg-blue-100"
                                >
                                    Hội thao
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewChildSuggestions('Ăn chay, Ngủ riêng')}
                                    className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-600 hover:bg-blue-100"
                                >
                                    Bán trú
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleAddNewChild}
                        disabled={saving || !newChildName.trim()}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                    >
                        <Plus size={14} />
                        <span>Thêm cột này vào hoạt động</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </Modal>
    );
}
