'use client';

import { useState, useEffect } from 'react';
import { Column } from '@/types/models';
import { getFixedColumns, updateColumn } from '@/services/column-service';
import { Save, CheckCircle, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    classId: string;
}

export function FixedColumnsTab({ classId }: Props) {
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingSuggestions, setEditingSuggestions] = useState<Record<string, string[]>>({});
    const [newSuggestion, setNewSuggestion] = useState<Record<string, string>>({});

    useEffect(() => {
        loadColumns();
    }, [classId]);

    const loadColumns = async () => {
        try {
            const cols = await getFixedColumns(classId);
            setColumns(cols);
            // Initialize editing state
            const initial: Record<string, string[]> = {};
            cols.forEach(c => {
                initial[c.id] = [...c.suggestions];
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

    const handleSave = async (columnId: string) => {
        setSaving(columnId);
        try {
            await updateColumn(columnId, {
                suggestions: editingSuggestions[columnId],
            });
            await loadColumns();
        } catch (error) {
            console.error('Error saving column:', error);
        } finally {
            setSaving(null);
        }
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
            <p className="text-sm text-gray-500">
                Các cột cố định không thể xóa. Bạn chỉ có thể chỉnh sửa danh sách gợi ý.
            </p>

            {columns.map(column => (
                <div key={column.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-gray-800">{column.name}</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                Cột cố định • Theo ngày
                            </span>
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

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Danh sách gợi ý:</label>
                        <div className="flex flex-wrap gap-2">
                            {editingSuggestions[column.id]?.map((s, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm group"
                                >
                                    {s}
                                    <button
                                        onClick={() => handleRemoveSuggestion(column.id, i)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-3">
                            <input
                                type="text"
                                value={newSuggestion[column.id] || ''}
                                onChange={e => setNewSuggestion(prev => ({ ...prev, [column.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleAddSuggestion(column.id)}
                                placeholder="Thêm gợi ý mới..."
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => handleAddSuggestion(column.id)}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {columns.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                    Chưa có cột cố định nào. Vui lòng khởi tạo cho lớp học.
                </div>
            )}
        </div>
    );
}
