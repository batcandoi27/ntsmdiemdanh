'use client';

import { useState, useEffect } from 'react';
import { Column, ColumnFrequency, PeriodConfig, SubPeriod, Student, Class } from '@/types/models';
import { getCustomColumns, createColumn, updateColumn, deleteColumn } from '@/services/column-service';
import { getStudentsAction } from '@/app/actions/student-actions';
import { Plus, Trash2, Edit2, Loader2, X, Save, Calendar, Clock, CheckSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

interface Props {
    classIds: string[];
    selectedClasses?: Class[];
}

const FREQUENCY_OPTIONS: { value: ColumnFrequency; label: string; icon: any; desc: string }[] = [
    { value: 'daily', label: 'Theo ngày', icon: Calendar, desc: 'Ghi nhận mỗi ngày (VD: Tham gia hoạt động)' },
    { value: 'period', label: 'Theo giai đoạn', icon: Clock, desc: 'Ghi nhận theo kỳ (VD: Học phí tháng)' },
    { value: 'one_time', label: 'Một lần', icon: CheckSquare, desc: 'Hoàn thành một lần (VD: Nộp hồ sơ)' },
];

export function CustomColumnsTab({ classIds, selectedClasses = [] }: Props) {
    const [columns, setColumns] = useState<Column[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formFrequency, setFormFrequency] = useState<ColumnFrequency>('one_time');
    const [formSuggestions, setFormSuggestions] = useState<string[]>([]);
    const [formNewSuggestion, setFormNewSuggestion] = useState('');
    const [formSelectedClassIds, setFormSelectedClassIds] = useState<string[]>([]);

    // Period Config
    const [formPeriodType, setFormPeriodType] = useState<'month' | 'semester' | 'custom'>('month');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formSubPeriods, setFormSubPeriods] = useState<SubPeriod[]>([]);

    // Scope Config
    const [formScope, setFormScope] = useState<'all' | 'subset'>('all');
    const [formStudentIds, setFormStudentIds] = useState<string[]>([]);

    useEffect(() => {
        if (classIds.length > 0) {
            loadData();
        } else {
            setColumns([]);
            setLoading(false);
        }
    }, [classIds]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load data from the first class (template)
            const firstClassId = classIds[0];
            const [cols, studList] = await Promise.all([
                getCustomColumns(firstClassId),
                getStudentsAction(firstClassId)
            ]);
            setColumns(cols);

            // Only load students if we are selecting a single class
            // If multiple classes, we restrict scope to 'all' and don't show student list
            if (classIds.length === 1) {
                setStudents(studList);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormFrequency('one_time');
        setFormSuggestions([]);
        setFormNewSuggestion('');
        setFormPeriodType('month');
        setFormStartDate(new Date().toISOString().slice(0, 10)); // Default today
        setFormEndDate(new Date().toISOString().slice(0, 10));
        setFormSubPeriods([]);
        setFormScope('all');
        setFormStudentIds([]);
        setFormSelectedClassIds(classIds);
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
        if (column.subPeriods) {
            setFormSubPeriods([...column.subPeriods]);
        }

        setFormScope(column.applicableScope || 'all');
        setFormStudentIds(column.applicableStudentIds || []);
        setFormSelectedClassIds([column.classId]); // Editing single column

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

    const generateSubPeriods = () => {
        if (!formStartDate || !formEndDate) return;

        const start = new Date(formStartDate);
        const end = new Date(formEndDate);
        const periods: SubPeriod[] = [];

        if (formPeriodType === 'month') {
            let current = new Date(start.getFullYear(), start.getMonth(), 1);
            while (current <= end) {
                const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const label = `Tháng ${current.getMonth() + 1}/${current.getFullYear()}`;
                // Determine boundaries
                const pStart = new Date(current);
                const pEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

                periods.push({
                    id,
                    label,
                    startDate: pStart.toISOString().slice(0, 10),
                    endDate: pEnd.toISOString().slice(0, 10)
                });
                current.setMonth(current.getMonth() + 1);
            }
        }
        setFormSubPeriods(periods);
    };

    const handleAddSubPeriod = () => {
        const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setFormSubPeriods(prev => [
            ...prev,
            { id, label: 'Giai đoạn mới', startDate: formStartDate, endDate: formEndDate }
        ]);
    };

    const handleUpdateSubPeriod = (index: number, field: keyof SubPeriod, value: string) => {
        setFormSubPeriods(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    const handleRemoveSubPeriod = (index: number) => {
        setFormSubPeriods(prev => prev.filter((_, i) => i !== index));
    };

    const toggleStudentSelection = (studentId: string) => {
        setFormStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const toggleClassSelection = (clsId: string) => {
        setFormSelectedClassIds(prev =>
            prev.includes(clsId)
                ? prev.filter(id => id !== clsId)
                : [...prev, clsId]
        );
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            alert('Vui lòng nhập tên cột');
            return;
        }

        if (formFrequency === 'period') {
            if (!formStartDate || !formEndDate) {
                alert('Vui lòng chọn ngày bắt đầu và kết thúc');
                return;
            }
            if (formSubPeriods.length === 0) {
                if (!confirm("Bạn chưa tạo giai đoạn con nào. Cột này sẽ chỉ ghi nhận 1 giá trị tổng cho cả kỳ. Tiếp tục?")) return;
            }
        }

        if (formScope === 'subset' && formStudentIds.length === 0 && classIds.length === 1) {
            alert('Vui lòng chọn ít nhất một học sinh');
            return;
        }

        if (!editingColumn && formSelectedClassIds.length === 0) {
            alert('Vui lòng chọn ít nhất một lớp để áp dụng');
            return;
        }

        setSaving(true);
        try {
            // Helper to clean undefined values
            const cleanUndefined = (obj: any) => {
                Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
                return obj;
            };

            const periodConfig = formFrequency === 'period' ? {
                type: formPeriodType,
                startDate: formStartDate,
                endDate: formEndDate,
            } : undefined;

            const subPeriods = formFrequency === 'period' ? formSubPeriods : undefined;
            const applicableStudentIds = formScope === 'subset' ? formStudentIds : undefined;

            // Construct common data with strictly no undefined fields for critical paths
            const commonData: any = {
                name: formName,
                suggestions: formSuggestions,
                applicableScope: formScope,
            };

            if (periodConfig) commonData.periodConfig = periodConfig;
            if (subPeriods) commonData.subPeriods = subPeriods;
            if (applicableStudentIds) commonData.applicableStudentIds = applicableStudentIds;

            if (editingColumn) {
                // Editing: Only apply to the specific column (single class context)
                await updateColumn(editingColumn.id, commonData);
            } else {
                // Creating: Apply to ALL selected classes
                // Warning: If multiple classes selected, we force scope to 'all' to avoid ID mismatches
                const useSelectedClasses = formSelectedClassIds;

                const finalScope = useSelectedClasses.length > 1 ? 'all' : formScope;

                // Only include IDs if scope is subset AND single class
                const finalStudentIds = (useSelectedClasses.length === 1 && formScope === 'subset') ? formStudentIds : undefined;

                const createPromises = useSelectedClasses.map(cid => {
                    const newId = `${cid}_custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                    const columnData = {
                        id: newId,
                        classId: cid,
                        scope: 'custom' as const,
                        frequency: formFrequency,
                        allowFreeText: true,
                        archived: false,
                        order: columns.length + 10,
                        ...commonData,
                        applicableScope: finalScope,
                    };

                    // Add student IDs only if valid
                    if (finalStudentIds) {
                        columnData.applicableStudentIds = finalStudentIds;
                    }

                    // Remove any remaining undefined keys just in case
                    cleanUndefined(columnData);

                    return createColumn(columnData);
                });
                await Promise.all(createPromises);
            }

            await loadData();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving column:', error);
            alert('Có lỗi xảy ra khi lưu: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (columnId: string) => {
        if (!confirm('Bạn có chắc muốn xóa cột này? Dữ liệu liên quan cũng sẽ bị xóa. (Lưu ý: Chỉ xóa cột của lớp đầu tiên hiển thị)')) return;

        try {
            await deleteColumn(columnId);
            await loadData();
        } catch (error) {
            console.error('Error deleting column:', error);
        }
    };

    const getFrequencyLabel = (freq: ColumnFrequency) => {
        return FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || freq;
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
                Vui lòng chọn lớp trong tab "Lớp của tôi".
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-4">
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

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">Cột Tuỳ Chỉnh</h3>
                    <p className="text-sm text-gray-500">
                        {classIds.length > 1
                            ? `Quản lý cột cho ${classIds.length} lớp đã chọn.`
                            : 'Quản lý các cột theo dõi điểm danh, thu tiền, hoặc hoạt động khác.'}
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
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
                <div className="grid gap-4 md:grid-cols-2">
                    {columns.map(column => (
                        <div
                            key={column.id}
                            className={cn(
                                "bg-white rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-md",
                                column.archived ? "border-gray-200 opacity-60 bg-gray-50" : "border-gray-200"
                            )}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{column.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full font-medium border",
                                            column.frequency === 'daily' ? "bg-green-50 text-green-700 border-green-200" :
                                                column.frequency === 'period' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                    "bg-orange-50 text-orange-700 border-orange-200"
                                        )}>
                                            {getFrequencyLabel(column.frequency)}
                                        </span>
                                        {column.archived && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                                                Lưu trữ
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEditModal(column)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(column.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-700">
                                {column.frequency === 'period' && column.periodConfig && (
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-gray-500" />
                                        <span>
                                            {new Date(column.periodConfig.startDate).toLocaleDateString('vi-VN')} - {new Date(column.periodConfig.endDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-gray-500" />
                                    <span>
                                        {column.applicableScope === 'subset'
                                            ? `Áp dụng cho ${column.applicableStudentIds?.length || 0} học sinh`
                                            : 'Áp dụng cho tất cả học sinh'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingColumn ? 'Chỉnh sửa cột' : 'Tạo cột mới'}>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên cột <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            placeholder="VD: Học phí tháng 9, Tiền ăn..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                    </div>

                    {/* Frequency (only for new) */}
                    {!editingColumn && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Loại theo dõi</label>
                            <div className="grid grid-cols-3 gap-3">
                                {FREQUENCY_OPTIONS.map(option => (
                                    <div
                                        key={option.value}
                                        onClick={() => setFormFrequency(option.value)}
                                        className={cn(
                                            "cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 relative overflow-hidden",
                                            formFrequency === option.value
                                                ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                                                : "bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-full mb-1",
                                            formFrequency === option.value ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                                        )}>
                                            <option.icon size={24} />
                                        </div>
                                        <span className="font-bold text-sm">{option.label}</span>
                                        <span className={cn(
                                            "text-xs leading-relaxed",
                                            formFrequency === option.value ? "text-blue-700" : "text-gray-500"
                                        )}>{option.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Period Config */}
                    {formFrequency === 'period' && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Clock size={16} />
                                Cấu hình thời gian
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={formStartDate}
                                        onChange={e => setFormStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={formEndDate}
                                        onChange={e => setFormEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-gray-500">Các giai đoạn con (Sub-periods)</label>
                                    <button onClick={generateSubPeriods} className="text-xs text-blue-600 hover:underline font-medium">
                                        Tạo tự động (Tháng)
                                    </button>
                                </div>

                                {formSubPeriods.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {formSubPeriods.map((sub, idx) => (
                                            <div key={sub.id} className="flex gap-2 items-center">
                                                <input
                                                    value={sub.label}
                                                    onChange={e => handleUpdateSubPeriod(idx, 'label', e.target.value)}
                                                    className="flex-1 text-xs px-2 py-1 border rounded bg-white"
                                                    placeholder="Tên giai đoạn"
                                                />
                                                <button onClick={() => handleRemoveSubPeriod(idx)} className="text-gray-400 hover:text-red-500">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-white rounded border border-dashed text-xs text-gray-400">
                                        Chưa có giai đoạn con
                                    </div>
                                )}
                                <button onClick={handleAddSubPeriod} className="w-full mt-2 py-1.5 text-xs font-medium text-gray-600 bg-white border rounded hover:bg-gray-50">
                                    + Thêm thủ công
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scope Config */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Phạm vi áp dụng</label>

                        {/* Class Selection for Multi-Class Mode */}
                        {!editingColumn && classIds.length > 1 && (
                            <div className="mb-3 space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <label className="text-xs font-bold text-gray-700 uppercase">Áp dụng cho các lớp:</label>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {selectedClasses.map(cls => (
                                        <label key={cls.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={formSelectedClassIds.includes(cls.id)}
                                                onChange={() => toggleClassSelection(cls.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{cls.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 italic mt-1">
                                    * Chế độ "Chỉ định nhóm học sinh" chỉ khả dụng khi chọn duy nhất 1 lớp.
                                </p>
                            </div>
                        )}

                        {(classIds.length === 1 || formSelectedClassIds.length === 1) ? (
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                {(['all', 'subset'] as const).map(scope => (
                                    <button
                                        key={scope}
                                        onClick={() => setFormScope(scope)}
                                        className={cn(
                                            "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                                            formScope === scope ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        {scope === 'all' ? 'Tất cả học sinh' : 'Chỉ định nhóm'}
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        {formScope === 'subset' && (classIds.length === 1 || formSelectedClassIds.length === 1) && (
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                                {students.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-4">Lớp chưa có học sinh</p>
                                ) : (
                                    <div className="space-y-1">
                                        {students.map(std => (
                                            <label key={std.id} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 cursor-pointer hover:border-blue-300">
                                                <input
                                                    type="checkbox"
                                                    checked={formStudentIds.includes(std.id)}
                                                    onChange={() => toggleStudentSelection(std.id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 flex-1 truncate">{std.fullName}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Suggestions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gợi ý nhập liệu nhanh</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {formSuggestions.map((s, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-800 border border-yellow-200 px-3 py-1.5 rounded-full text-xs font-medium"
                                >
                                    {s}
                                    <button onClick={() => handleRemoveSuggestion(i)} className="text-yellow-600 hover:text-red-600">
                                        <X size={12} />
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
                                placeholder="Thêm gợi ý (VD: Đã đóng, Chưa đóng)..."
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <button onClick={handleAddSuggestion} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white pb-1">
                        <button
                            onClick={() => setShowModal(false)}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {editingColumn ? 'Lưu thay đổi' : 'Tạo cột mới'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
