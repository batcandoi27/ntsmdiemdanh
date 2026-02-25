'use client';

import { useState, useEffect } from 'react';
import { Column, Class } from '@/types/models';
import { getFixedColumns, updateColumn, initializeFixedColumns } from '@/services/column-service';
import { Save, CheckCircle, Loader2, Plus, X, Users, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSettings } from '@/hooks/use-settings';
import { FIXED_COLUMN_IDS, createFixedColumnsForClass, isFixedColumn } from '@/lib/defaults';

interface Props {
    classIds: string[];
    selectedClasses?: Class[];
}

export function FixedColumnsTab({ classIds, selectedClasses = [] }: Props) {
    const { settings, toggleDefaultColumn, loaded } = useAppSettings();
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingSuggestions, setEditingSuggestions] = useState<Record<string, string[]>>({});
    const [newSuggestion, setNewSuggestion] = useState<Record<string, string>>({});

    useEffect(() => {
        if (classIds.length > 0) {
            loadColumns();
        } else {
            setColumns([]);
            setLoading(false);
        }
    }, [classIds]);

    const loadColumns = async () => {
        setLoading(true);
        try {
            // Load settings from the first class to display as "template"
            const firstClassId = classIds[0];
            let cols = await getFixedColumns(firstClassId);

            // If no columns found in DB, use defaults template visually
            if (cols.length === 0) {
                // Cast to Column[] because createFixedColumnsForClass returns Omit<Column, 'createdAt'...>
                // We add dummy createdAt/updatedAt for display purposes
                const defaults = createFixedColumnsForClass(firstClassId);
                cols = defaults.map(d => ({
                    ...d,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as Column));
            }

            setColumns(cols);

            // Initialize editing state
            const initial: Record<string, string[]> = {};
            cols.forEach(c => {
                initial[c.id] = [...(c.suggestions || [])];
            });
            setEditingSuggestions(initial);
        } catch (error) {
            console.error('Error loading fixed columns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSuggestion = (columnId: string) => {
        const text = newSuggestion[columnId]?.trim();
        if (!text) return;

        setEditingSuggestions(prev => ({
            ...prev,
            [columnId]: [...(prev[columnId] || []), text],
        }));
        setNewSuggestion(prev => ({ ...prev, [columnId]: '' }));
    };

    const handleRemoveSuggestion = (columnId: string, index: number) => {
        setEditingSuggestions(prev => ({
            ...prev,
            [columnId]: prev[columnId].filter((_, i) => i !== index),
        }));
    };

    const handleSave = async (sampleColumnId: string) => {
        setSaving(sampleColumnId);
        try {
            // Determine the suffix (e.g., fixed_attendance) from the sample column ID
            // Sample ID format: may contain classId prefix, or be a default template ID
            // We need to robustly extract the fixed type.
            let suffix = '';

            // Check if it's a known fixed column type
            for (const fixedId of Object.values(FIXED_COLUMN_IDS)) {
                if (sampleColumnId.endsWith(fixedId)) {
                    suffix = fixedId;
                    break;
                }
            }

            if (!suffix) {
                // Fallback extraction
                const firstClassId = classIds[0];
                suffix = sampleColumnId.replace(`${firstClassId}_`, '');
            }

            const suggestions = editingSuggestions[sampleColumnId];

            // Apply to ALL selected classes
            // Lazy initialization: Ensure columns exist before updating
            await Promise.all(classIds.map(id => initializeFixedColumns(id)));

            const updates = classIds.map(classId => {
                const targetColumnId = `${classId}_${suffix}`;
                return updateColumn(targetColumnId, { suggestions });
            });

            await Promise.all(updates);

            alert(`Đã lưu cấu hình cho ${classIds.length} lớp đã chọn.`);
            await loadColumns();
        } catch (error) {
            console.error('Error saving column:', error);
            alert('Có lỗi khi lưu.');
        } finally {
            setSaving(null);
        }
    };

    if (loading && classIds.length > 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    if (classIds.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                Vui lòng chọn ít nhất một lớp trong tab "Lớp của tôi" để cấu hình.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Visibility Settings - Global App Settings (LocalStorage) */}
            <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="text-blue-600" size={20} />
                    Hiển thị mặc định (Điểm danh nhanh)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Chọn các cột bạn muốn hiển thị trong màn hình điểm danh nhanh.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { key: 'P', label: 'Có phép (P)', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                        { key: 'K', label: 'Không phép (K)', color: 'text-red-700 bg-red-50 border-red-200' },
                        { key: 'T', label: 'Đi trễ (T)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
                        { key: 'VP', label: 'Vi phạm (VP)', color: 'text-purple-700 bg-purple-50 border-purple-200' },
                        { key: 'KH', label: 'Khen thưởng (KH)', color: 'text-orange-700 bg-orange-50 border-orange-200' },
                    ].map((item) => (
                        <button
                            key={item.key}
                            onClick={() => toggleDefaultColumn(item.key as any)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
                                settings.visibleDefaultColumns[item.key as keyof typeof settings.visibleDefaultColumns]
                                    ? `border-transparent ${item.color} shadow-sm font-bold`
                                    : "bg-gray-50 border-gray-200 text-gray-400 grayscale"
                            )}
                        >
                            <div className={cn(
                                "w-5 h-5 rounded flex items-center justify-center border",
                                settings.visibleDefaultColumns[item.key as keyof typeof settings.visibleDefaultColumns]
                                    ? "bg-white border-current"
                                    : "bg-gray-200 border-gray-300"
                            )}>
                                {settings.visibleDefaultColumns[item.key as keyof typeof settings.visibleDefaultColumns] && <CheckCircle size={12} />}
                            </div>
                            <span className="text-sm">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-100 my-4" />

            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Users size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm">Các lớp đang cấu hình ({classIds.length})</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedClasses.length > 0 ? selectedClasses.map(cls => (
                                <span key={cls.id} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-700 text-xs font-medium shadow-sm">
                                    {cls.name}
                                </span>
                            )) : (
                                <span className="text-gray-500 text-xs italic">Đang tải tên lớp...</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {columns.map(column => {
                // Rename 'Điểm danh' to 'Theo ngày' if it's the attendance column
                const isAttendance = column.id.endsWith(FIXED_COLUMN_IDS.ATTENDANCE);
                const displayName = isAttendance ? 'Theo ngày' : column.name;

                return (
                    <div key={column.id} className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800">{displayName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                        Cột cố định
                                    </span>
                                    {isAttendance && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
                                            Điểm danh hàng ngày
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleSave(column.id)}
                                disabled={saving === column.id}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                                    saving === column.id
                                        ? "bg-gray-100 text-gray-400"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                )}
                            >
                                {saving === column.id ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <Save size={16} />
                                )}
                                Lưu
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600 mb-2 block">Danh sách gợi ý:</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {editingSuggestions[column.id]?.map((s, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg text-sm group"
                                        >
                                            {s}
                                            <button
                                                onClick={() => handleRemoveSuggestion(column.id, i)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                                title="Xóa"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSuggestion[column.id] || ''}
                                        onChange={e => setNewSuggestion(prev => ({ ...prev, [column.id]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSuggestion(column.id)}
                                        placeholder="Thêm gợi ý mới..."
                                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={() => handleAddSuggestion(column.id)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Nhấn Enter hoặc nút "+" để thêm. Nhấn "Lưu" để áp dụng cho tất cả lớp đã chọn.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}

            {columns.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                    Chưa có cột cố định nào. Vui lòng chọn ít nhất một lớp học.
                </div>
            )}
        </div>
    );
}
