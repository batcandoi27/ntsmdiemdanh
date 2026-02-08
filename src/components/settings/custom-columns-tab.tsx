'use client';

import { useState, useEffect } from 'react';
import { Column, ColumnFrequency, PeriodConfig } from '@/types/models';
import { getCustomColumns, createColumn, updateColumn, deleteColumn } from '@/services/column-service';
import { Plus, Trash2, Edit2, Loader2, X, Save, Calendar, Clock, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

interface Props {
    classId: string;
}

const FREQUENCY_OPTIONS: { value: ColumnFrequency; label: string; icon: any; desc: string }[] = [
    { value: 'daily', label: 'Theo ngày', icon: Calendar, desc: 'Ghi nhận mỗi ngày (VD: Tham gia hoạt động)' },
    { value: 'period', label: 'Theo giai đoạn', icon: Clock, desc: 'Ghi nhận theo kỳ (VD: Học phí tháng)' },
    { value: 'one_time', label: 'Một lần', icon: CheckSquare, desc: 'Hoàn thành một lần (VD: Nộp hồ sơ)' },
];

export function CustomColumnsTab({ classId }: Props) {
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formFrequency, setFormFrequency] = useState<ColumnFrequency>('daily');
    const [formSuggestions, setFormSuggestions] = useState<string[]>([]);
    const [formNewSuggestion, setFormNewSuggestion] = useState('');
    const [formPeriodType, setFormPeriodType] = useState<'month' | 'semester' | 'custom'>('month');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');

    useEffect(() => {
        loadColumns();
    }, [classId]);

    const loadColumns = async () => {
        try {
            const cols = await getCustomColumns(classId);
            setColumns(cols);
        } catch (error) {
            console.error('Error loading custom columns:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormFrequency('daily');
        setFormSuggestions([]);
        setFormNewSuggestion('');
        setFormPeriodType('month');
        setFormStartDate('');
        setFormEndDate('');
        setEditingColumn(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (column: Column) => {
        setEditingColumn(column);
        setFormName(column.name);
        setFormFrequency(column.frequency);
        setFormSuggestions([...column.suggestions]);
        if (column.periodConfig) {
            setFormPeriodType(column.periodConfig.type);
            setFormStartDate(column.periodConfig.startDate);
            setFormEndDate(column.periodConfig.endDate);
        }
        setShowModal(true);
    };

    const handleAddSuggestion = () => {
        const text = formNewSuggestion.trim();
        if (!text) return;
        setFormSuggestions(prev => [...prev, text]);
        setFormNewSuggestion('');
    };

    const handleRemoveSuggestion = (index: number) => {
        setFormSuggestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            alert('Vui lòng nhập tên cột');
            return;
        }

        if (formFrequency === 'period' && (!formStartDate || !formEndDate)) {
            alert('Vui lòng chọn ngày bắt đầu và kết thúc cho giai đoạn');
            return;
        }

        setSaving(true);
        try {
            const periodConfig: PeriodConfig | undefined = formFrequency === 'period' ? {
                type: formPeriodType,
                startDate: formStartDate,
                endDate: formEndDate,
            } : undefined;

            if (editingColumn) {
                await updateColumn(editingColumn.id, {
                    name: formName,
                    suggestions: formSuggestions,
                    periodConfig,
                });
            } else {
                const newId = `${classId}_custom_${Date.now()}`;
                await createColumn({
                    id: newId,
                    classId,
                    name: formName,
                    scope: 'custom',
                    frequency: formFrequency,
                    periodConfig,
                    suggestions: formSuggestions,
                    allowFreeText: true,
                    archived: false,
                    order: columns.length + 10,
                });
            }

            await loadColumns();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving column:', error);
            alert('Có lỗi xảy ra khi lưu');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (columnId: string) => {
        if (!confirm('Bạn có chắc muốn xóa cột này? Dữ liệu liên quan cũng sẽ bị xóa.')) return;

        try {
            await deleteColumn(columnId);
            await loadColumns();
        } catch (error) {
            console.error('Error deleting column:', error);
        }
    };

    const getFrequencyLabel = (freq: ColumnFrequency) => {
        return FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || freq;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    Tạo các cột theo dõi tùy chỉnh theo nhu cầu của bạn.
                </p>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    <Plus size={18} />
                    Thêm cột mới
                </button>
            </div>

            {columns.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 mb-4">Chưa có cột tùy chỉnh nào</p>
                    <button
                        onClick={openCreateModal}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        + Tạo cột đầu tiên
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {columns.map(column => (
                        <div
                            key={column.id}
                            className={cn(
                                "bg-white rounded-xl border p-4 flex items-center justify-between",
                                column.archived ? "border-gray-200 opacity-60" : "border-gray-200"
                            )}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-800">{column.name}</h3>
                                    {column.archived && (
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                            Đã archive
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    {getFrequencyLabel(column.frequency)}
                                    {column.suggestions.length > 0 && ` • ${column.suggestions.length} gợi ý`}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openEditModal(column)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(column.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingColumn ? 'Chỉnh sửa cột' : 'Tạo cột mới'}>
                <div className="space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên cột</label>
                        <input
                            type="text"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            placeholder="VD: Học thêm, Đóng phí..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Frequency (only for new) */}
                    {!editingColumn && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Loại theo dõi</label>
                            <div className="space-y-2">
                                {FREQUENCY_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormFrequency(opt.value)}
                                        className={cn(
                                            "w-full p-3 rounded-lg border-2 text-left transition-all",
                                            formFrequency === opt.value
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <opt.icon size={20} className={formFrequency === opt.value ? "text-blue-600" : "text-gray-400"} />
                                            <div>
                                                <div className="font-medium">{opt.label}</div>
                                                <div className="text-xs text-gray-500">{opt.desc}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Period Config */}
                    {formFrequency === 'period' && (
                        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700">Cấu hình giai đoạn</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={formStartDate}
                                        onChange={e => setFormStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={formEndDate}
                                        onChange={e => setFormEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gợi ý (tùy chọn)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {formSuggestions.map((s, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm"
                                >
                                    {s}
                                    <button onClick={() => handleRemoveSuggestion(i)} className="text-gray-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formNewSuggestion}
                                onChange={e => setFormNewSuggestion(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSuggestion())}
                                placeholder="Thêm gợi ý..."
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <button onClick={handleAddSuggestion} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            onClick={() => setShowModal(false)}
                            className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {editingColumn ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
