'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Class, Student, Column } from '@/types/models';
import { getCompositeActivitiesForClass, addChildColumnToActivity, updateColumn } from '@/services/column-service';
import { getRecordsForColumns, batchSaveMatrixRecords, MatrixCellChange } from '@/services/record-service';
import { getActiveStudents } from '@/services/student-service';
import { CreateCompositeActivityModal } from './create-composite-activity-modal';
import { EditCompositeActivityModal } from './edit-composite-activity-modal';
import { ExportColumnSelectorModal } from './export-column-selector-modal';
import { MonitorMessageModal } from './monitor-message-modal';
import { MonitorExportData } from '@/lib/export-utils';
import { Plus, FileSpreadsheet, Loader2, Check, X, MoreHorizontal, Layers, CheckSquare, Square, Trash2, Eye, EyeOff, Sparkles, RefreshCw, Edit2, ChevronDown, ArrowLeft, Share2, FileDown } from 'lucide-react';
import { cn, formatStudentCode } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
    classId: string;
    classInfo: Class | null;
    students: Student[];
    activityId?: string;
    onBack?: () => void;
}

export interface ChildColumnMeta {
    isNotRegisteredCol: boolean;
    isRegisteredCol: boolean;
    isAmountCol: boolean;
    suggestions: string[];
    isCheckbox: boolean;
    hasSuggestions: boolean;
    isNote: boolean;
}

export function getChildColumnMeta(child: Column): ChildColumnMeta {
    const lowerName = (child.name || '').toLowerCase().trim();
    const isNotRegisteredCol = lowerName.includes('không') || lowerName.includes('ko đăng ký');
    const isRegisteredCol = (lowerName.includes('đăng ký') || lowerName.includes('tham gia')) && !isNotRegisteredCol;
    const isAmountCol = lowerName.includes('tiền') || lowerName.includes('mức phí') || lowerName.includes('số tiền');

    let suggestions = child.suggestions && child.suggestions.length > 0 ? [...child.suggestions] : [];
    if (isAmountCol && suggestions.length === 0) {
        suggestions = ['30.000', '60.000', 'Miễn'];
    }

    const isCheckbox = child.activityConfig?.inputMode === 'checkbox' || isNotRegisteredCol || isRegisteredCol;
    const hasSuggestions = !isCheckbox && (suggestions.length > 0 || isAmountCol);
    const isNote = !isCheckbox && !hasSuggestions && (child.displayConfig?.isNotesColumn || child.activityConfig?.inputMode === 'inline_text');

    return {
        isNotRegisteredCol,
        isRegisteredCol,
        isAmountCol,
        suggestions,
        isCheckbox,
        hasSuggestions,
        isNote,
    };
}

export interface ValueBadgeStyle {
    bg: string;
    dot: string;
    border: string;
    text: string;
    dropdownBg: string;
}

export function getValueBadgeStyle(val: string, isAmount?: boolean): ValueBadgeStyle {
    if (!val || val.trim() === '') {
        return {
            bg: "bg-slate-50/70 text-slate-400 border-dashed border-slate-200 hover:bg-slate-100 hover:text-slate-600",
            dot: "bg-slate-300",
            border: "border-slate-200",
            text: "text-slate-400",
            dropdownBg: "text-slate-700 hover:bg-slate-100 border-transparent",
        };
    }
    const clean = val.toLowerCase().replace(/[\s.,_đ]/g, '');

    // 1. Phổ biến: 30k / 30.000 / 30 -> Xanh lá (Emerald)
    if (clean === '30' || clean === '30000' || clean === '30k') {
        return {
            bg: "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs font-black",
            dot: "bg-emerald-500",
            border: "border-emerald-300",
            text: "text-emerald-800",
            dropdownBg: "bg-emerald-50 text-emerald-900 border-emerald-300",
        };
    }

    // 2. 60k / 60.000 / 60 -> Tím nổi bật (Purple)
    if (clean === '60' || clean === '60000' || clean === '60k') {
        return {
            bg: "bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100 shadow-2xs font-black",
            dot: "bg-purple-500",
            border: "border-purple-300",
            text: "text-purple-800",
            dropdownBg: "bg-purple-50 text-purple-900 border-purple-300",
        };
    }

    // 3. Miễn / Free / 0 -> Vàng cam (Amber)
    if (clean.includes('miễn') || clean === 'free' || clean === '0') {
        return {
            bg: "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs font-black",
            dot: "bg-amber-500",
            border: "border-amber-300",
            text: "text-amber-900",
            dropdownBg: "bg-amber-50 text-amber-900 border-amber-300",
        };
    }

    // 4. 90k / 90.000 / 90 -> Xanh biển (Sky)
    if (clean === '90' || clean === '90000' || clean === '90k') {
        return {
            bg: "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 shadow-2xs font-black",
            dot: "bg-sky-500",
            border: "border-sky-300",
            text: "text-sky-800",
            dropdownBg: "bg-sky-50 text-sky-900 border-sky-300",
        };
    }

    // 5. 100k / 120k / 150k -> Đỏ hồng (Rose)
    if (clean === '100' || clean === '100000' || clean === '100k' || clean === '120' || clean === '120000' || clean === '150' || clean === '150000') {
        return {
            bg: "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 shadow-2xs font-black",
            dot: "bg-rose-500",
            border: "border-rose-300",
            text: "text-rose-800",
            dropdownBg: "bg-rose-50 text-rose-900 border-rose-300",
        };
    }

    // Dynamic hash palette for other custom amounts or text
    const palette: ValueBadgeStyle[] = [
        { bg: "bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100 shadow-2xs font-black", dot: "bg-teal-500", border: "border-teal-300", text: "text-teal-800", dropdownBg: "bg-teal-50 text-teal-900 border-teal-300" },
        { bg: "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100 shadow-2xs font-black", dot: "bg-indigo-500", border: "border-indigo-300", text: "text-indigo-800", dropdownBg: "bg-indigo-50 text-indigo-900 border-indigo-300" },
        { bg: "bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 shadow-2xs font-black", dot: "bg-blue-500", border: "border-blue-300", text: "text-blue-800", dropdownBg: "bg-blue-50 text-blue-900 border-blue-300" },
        { bg: "bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100 shadow-2xs font-black", dot: "bg-orange-500", border: "border-orange-300", text: "text-orange-900", dropdownBg: "bg-orange-50 text-orange-900 border-orange-300" },
        { bg: "bg-pink-50 text-pink-800 border-pink-300 hover:bg-pink-100 shadow-2xs font-black", dot: "bg-pink-500", border: "border-pink-300", text: "text-pink-800", dropdownBg: "bg-pink-50 text-pink-900 border-pink-300" },
    ];
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
        hash = (hash << 5) - hash + val.charCodeAt(i);
        hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
}

export function CompositeMatrixGrid({ classId, classInfo, students, activityId, onBack }: Props) {
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Column[]>([]);
    const [records, setRecords] = useState<Record<string, Record<string, { value: unknown; note?: string }>>>({});
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [studentList, setStudentList] = useState<Student[]>(students || []);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Column | null>(null);
    const [addingChildToParentId, setAddingChildToParentId] = useState<string | null>(null);
    const [newChildName, setNewChildName] = useState('');
    const [newChildMode, setNewChildMode] = useState<'checkbox' | 'suggestions' | 'inline_text'>('checkbox');
    const [newChildSuggestions, setNewChildSuggestions] = useState('');

    // Active menu popup
    const [activeMenuActivityId, setActiveMenuActivityId] = useState<string | null>(null);
    const [openDropdownCell, setOpenDropdownCell] = useState<string | null>(null); // studentCode_childId

    // Debounce save timer
    const saveQueueRef = useRef<MatrixCellChange[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Export Data for Zalo Report Modal
    const currentExportData = useMemo<MonitorExportData | null>(() => {
        const act = activities[0];
        if (!act) return null;
        const subPeriods = (act.children || []).map(c => ({
            id: c.id,
            label: c.name
        }));
        const mappedStudents = studentList.map(s => {
            const sc = s.code || s.id;
            const recs: Record<string, any> = {};
            (act.children || []).forEach(c => {
                const cellVal = records[sc]?.[c.id]?.value;
                if (cellVal !== undefined && cellVal !== null && cellVal !== '') {
                    recs[c.id] = cellVal === true ? 'X' : (cellVal === false ? '' : String(cellVal));
                }
            });
            return {
                id: s.id,
                code: s.code || '',
                name: s.fullName,
                records: recs
            };
        });
        return {
            classId,
            className: classInfo?.name || 'Lớp',
            columnId: act.id,
            columnName: act.name,
            frequency: 'period',
            subPeriods,
            students: mappedStudents
        };
    }, [activities, studentList, records, classId, classInfo]);

    useEffect(() => {
        if (students && students.length > 0) {
            setStudentList(students);
        } else if (classId) {
            getActiveStudents(classId).then(list => {
                if (list && list.length > 0) setStudentList(list);
            });
        }
    }, [students, classId]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [allActs, fetchedStudents] = await Promise.all([
                getCompositeActivitiesForClass(classId),
                students && students.length > 0 ? Promise.resolve(students) : getActiveStudents(classId)
            ]);
            const acts = activityId ? allActs.filter(a => a.id === activityId) : allActs;
            setActivities(acts);
            if (fetchedStudents && fetchedStudents.length > 0) {
                setStudentList(fetchedStudents);
            }

            // Collect all child column IDs
            const childIds = acts.flatMap(a => (a.children || []).map(c => c.id));
            if (childIds.length > 0) {
                const recs = await getRecordsForColumns(childIds);
                setRecords(recs);
            } else {
                setRecords({});
            }
        } catch (error) {
            console.error('Error loading composite matrix:', error);
            toast.error('Lỗi khi tải bảng ma trận hoạt động');
        } finally {
            setLoading(false);
        }
    }, [classId, students, activityId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Close open dropdowns or menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (openDropdownCell) setOpenDropdownCell(null);
            if (activeMenuActivityId) setActiveMenuActivityId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openDropdownCell, activeMenuActivityId]);

    // Dispatch queue to Supabase
    const flushSaveQueue = async () => {
        if (saveQueueRef.current.length === 0) return;
        const changesToSave = [...saveQueueRef.current];
        saveQueueRef.current = [];
        setSaveStatus('saving');

        try {
            await batchSaveMatrixRecords(changesToSave);
            setSaveStatus('saved');
        } catch (error) {
            console.error('Error in debounced batch save:', error);
            setSaveStatus('error');
            toast.error('Lỗi lưu thay đổi lên đám mây');
        }
    };

    const queueChange = (change: MatrixCellChange) => {
        // Update local state immediately (0ms visual latency)
        setRecords(prev => {
            const next = { ...prev };
            if (!next[change.studentCode]) next[change.studentCode] = {};
            next[change.studentCode][change.columnId] = {
                value: change.value,
                note: change.note,
            };
            return next;
        });

        // Add to queue
        saveQueueRef.current.push(change);

        // Reset debounce timer
        if (timerRef.current) clearTimeout(timerRef.current);
        setSaveStatus('saving');
        timerRef.current = setTimeout(flushSaveQueue, 600); // 600ms debounce
    };

    // Toggle Checkbox cell (X or empty) with mutual exclusion between Đăng ký and Không đăng ký
    const handleToggleCell = (childId: string, studentCode: string) => {
        const rawVal = records[studentCode]?.[childId]?.value;
        const isChecked = rawVal === true || rawVal === 'X' || rawVal === 'x' || rawVal === 'Có' || rawVal === 1;
        const nextVal = !isChecked ? 'X' : '';

        // Mutual exclusion between "Đăng ký" and "Không đăng ký"
        const parentActivity = activities.find(a => (a.children || []).some(c => c.id === childId));
        const currentChild = parentActivity?.children?.find(c => c.id === childId);
        const meta = currentChild ? getChildColumnMeta(currentChild) : null;

        queueChange({
            columnId: childId,
            classId,
            studentCode,
            value: nextVal,
            note: nextVal,
        });

        // When ticking ON ('X'), clear companion column if any
        if (!isChecked && meta && parentActivity?.children) {
            let companionCol: Column | undefined;
            if (meta.isNotRegisteredCol) {
                companionCol = parentActivity.children.find(c => getChildColumnMeta(c).isRegisteredCol);
            } else if (meta.isRegisteredCol) {
                companionCol = parentActivity.children.find(c => getChildColumnMeta(c).isNotRegisteredCol);
            }

            if (companionCol) {
                const compVal = records[studentCode]?.[companionCol.id]?.value;
                const compChecked = compVal === true || compVal === 'X' || compVal === 'x' || compVal === 'Có' || compVal === 1;
                if (compChecked) {
                    queueChange({
                        columnId: companionCol.id,
                        classId,
                        studentCode,
                        value: '',
                        note: '',
                    });
                }
            }
        }
    };

    // Click-to-Cycle Suggestions (A -> B -> C -> empty -> A)
    const handleCycleSuggestion = (childId: string, studentCode: string, suggestions: string[]) => {
        if (!suggestions || suggestions.length === 0) return;
        const currentVal = String(records[studentCode]?.[childId]?.value ?? '');
        const currentIndex = suggestions.indexOf(currentVal);
        let nextVal = '';
        if (currentIndex === -1) {
            nextVal = suggestions[0];
        } else if (currentIndex < suggestions.length - 1) {
            nextVal = suggestions[currentIndex + 1];
        } else {
            nextVal = ''; // Cycle back to empty (bỏ chọn)
        }
        queueChange({
            columnId: childId,
            classId,
            studentCode,
            value: nextVal,
            note: nextVal,
        });
    };

    // Direct pick from Dropdown popover
    const handleSelectSuggestion = (childId: string, studentCode: string, value: string) => {
        queueChange({
            columnId: childId,
            classId,
            studentCode,
            value,
            note: value,
        });
        setOpenDropdownCell(null);
    };

    const handleNoteChange = (childId: string, studentCode: string, noteText: string) => {
        queueChange({
            columnId: childId,
            classId,
            studentCode,
            value: noteText,
            note: noteText,
        });
    };

    const handleOpenExport = async () => {
        // Flush any pending debounced saves before opening export modal
        if (saveQueueRef.current.length > 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            await flushSaveQueue();
        }
        setShowExportModal(true);
    };

    // Quick-Fill all students for a child column (X or empty)
    const handleQuickFill = async (childId: string, value: boolean) => {
        if (saveQueueRef.current.length > 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            await flushSaveQueue();
        }

        const parentActivity = activities.find(a => (a.children || []).some(c => c.id === childId));
        const currentChild = parentActivity?.children?.find(c => c.id === childId);
        const meta = currentChild ? getChildColumnMeta(currentChild) : null;

        let companionCol: Column | undefined;
        if (value && meta && parentActivity?.children) {
            if (meta.isNotRegisteredCol) {
                companionCol = parentActivity.children.find(c => getChildColumnMeta(c).isRegisteredCol);
            } else if (meta.isRegisteredCol) {
                companionCol = parentActivity.children.find(c => getChildColumnMeta(c).isNotRegisteredCol);
            }
        }

        const cellValue = value ? 'X' : '';
        const changes: MatrixCellChange[] = [];

        studentList.forEach(s => {
            const sc = s.code || s.id;
            changes.push({
                columnId: childId,
                classId,
                studentCode: sc,
                value: cellValue,
                note: cellValue,
            });
            if (companionCol) {
                changes.push({
                    columnId: companionCol.id,
                    classId,
                    studentCode: sc,
                    value: '',
                    note: '',
                });
            }
        });

        setRecords(prev => {
            const next = { ...prev };
            studentList.forEach(s => {
                const sc = s.code || s.id;
                if (!next[sc]) next[sc] = {};
                next[sc][childId] = { value: cellValue, note: cellValue };
                if (companionCol) {
                    next[sc][companionCol.id] = { value: '', note: '' };
                }
            });
            return next;
        });

        setSaveStatus('saving');
        try {
            await batchSaveMatrixRecords(changes);
            setSaveStatus('saved');
            toast.success(value ? `Đã đánh dấu X tất cả học sinh (${currentChild?.name || 'Cột'})` : `Đã bỏ chọn tất cả (${currentChild?.name || 'Cột'})`);
        } catch (error) {
            setSaveStatus('error');
            toast.error('Lỗi khi lưu đồng loạt');
        }
    };

    // Quick-Fill a suggestion value for all students
    const handleQuickFillSuggestion = async (childId: string, sugVal: string) => {
        if (saveQueueRef.current.length > 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            await flushSaveQueue();
        }

        const changes: MatrixCellChange[] = studentList.map(s => ({
            columnId: childId,
            classId,
            studentCode: s.code || s.id,
            value: sugVal,
            note: sugVal,
        }));

        setRecords(prev => {
            const next = { ...prev };
            studentList.forEach(s => {
                const sc = s.code || s.id;
                if (!next[sc]) next[sc] = {};
                next[sc][childId] = { value: sugVal, note: sugVal };
            });
            return next;
        });

        setSaveStatus('saving');
        try {
            await batchSaveMatrixRecords(changes);
            setSaveStatus('saved');
            toast.success(`Đã áp dụng "${sugVal}" cho cả lớp`);
        } catch (error) {
            setSaveStatus('error');
            toast.error('Lỗi khi điền dữ liệu đồng loạt');
        }
    };

    const handleQuickFillText = async (childId: string, textVal: string) => {
        if (saveQueueRef.current.length > 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            await flushSaveQueue();
        }

        const changes: MatrixCellChange[] = studentList.map(s => ({
            columnId: childId,
            classId,
            studentCode: s.code || s.id,
            value: textVal,
            note: textVal,
        }));

        setRecords(prev => {
            const next = { ...prev };
            studentList.forEach(s => {
                const sc = s.code || s.id;
                if (!next[sc]) next[sc] = {};
                next[sc][childId] = { value: textVal, note: textVal };
            });
            return next;
        });

        setSaveStatus('saving');
        try {
            await batchSaveMatrixRecords(changes);
            setSaveStatus('saved');
            toast.success(`Đã điền "${textVal}" cho cả lớp`);
        } catch (error) {
            setSaveStatus('error');
            toast.error('Lỗi khi điền dữ liệu đồng loạt');
        }
    };

    // Add sub-column inline
    const handleAddSubColumn = async (parentId: string) => {
        if (!newChildName.trim()) {
            toast.error('Vui lòng nhập tên cột con');
            return;
        }

        try {
            const isNote = newChildMode === 'inline_text';
            const parsedSuggestions = newChildMode === 'suggestions'
                ? newChildSuggestions.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            await addChildColumnToActivity(parentId, {
                name: newChildName.trim(),
                isNotesColumn: isNote,
                dataType: isNote ? 'text' : (newChildMode === 'checkbox' ? 'boolean' : 'text'),
                inputMode: newChildMode === 'suggestions' ? 'select' : (isNote ? 'inline_text' : 'checkbox'),
                suggestions: parsedSuggestions,
            });
            toast.success(`Đã thêm cột "${newChildName}"`);
            setAddingChildToParentId(null);
            setNewChildName('');
            setNewChildMode('checkbox');
            setNewChildSuggestions('');
            await loadData();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi thêm cột con');
        }
    };

    // Archive activity
    const handleArchiveActivity = async (activity: Column) => {
        if (!confirm(`Bạn có chắc muốn ẩn hoạt động "${activity.name}"? Dữ liệu đã nhập sẽ vẫn được bảo toàn nguyên vẹn.`)) return;
        try {
            await updateColumn(activity.id, { archived: true });
            toast.success(`Đã ẩn hoạt động "${activity.name}"`);
            setActiveMenuActivityId(null);
            await loadData();
        } catch (error: any) {
            toast.error('Lỗi khi ẩn hoạt động: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="py-24 text-center space-y-3">
                <Loader2 className="animate-spin text-blue-600 w-8 h-8 mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Đang tải ma trận hoạt động lớp {classInfo?.name}...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                            title="Quay lại danh sách sổ theo dõi"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                        <Layers size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <span>{activityId && activities[0] ? activities[0].name : 'Sổ Ma Trận Hoạt Động & Đăng Ký Tổng Hợp'}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {activityId && activities[0] ? `Lớp ${classInfo?.name || ''}` : `${activities.length} Hoạt động`}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            {saveStatus === 'saving' && (
                                <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                                    <Loader2 size={11} className="animate-spin" />
                                    <span>Đang đồng bộ lên đám mây...</span>
                                </span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                    <Check size={12} />
                                    <span>Đã lưu tự động</span>
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="text-[11px] text-red-600 font-bold flex items-center gap-1">
                                    <X size={12} />
                                    <span>Lỗi lưu, vui lòng thử lại</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition text-xs font-bold"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw size={15} />
                    </button>

                    {activityId && activities[0] && (
                        <>
                            <button
                                onClick={() => setEditingActivity(activities[0])}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                title="Chỉnh sửa tên và cấu hình cột"
                            >
                                <Edit2 size={14} />
                                <span className="hidden sm:inline">Quản lý cột</span>
                            </button>
                            <button
                                onClick={() => setAddingChildToParentId(activities[0].id)}
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                title="Thêm cột con mới"
                            >
                                <Plus size={14} />
                                <span className="hidden sm:inline">Thêm cột con</span>
                            </button>
                        </>
                    )}

                    {/* Nút Báo cáo Zalo (Teal/Emerald Green - Giống hình 2) */}
                    <button
                        onClick={() => setIsMessageModalOpen(true)}
                        disabled={activities.length === 0}
                        className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Báo cáo nhanh cho phụ huynh qua Zalo"
                    >
                        <Share2 size={15} />
                        <span>Báo cáo Zalo</span>
                    </button>

                    {/* Nút Xuất Excel (Indigo/Purple - Giống hình 2) */}
                    <button
                        onClick={handleOpenExport}
                        disabled={activities.length === 0}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Xuất Báo cáo / Excel"
                    >
                        <FileDown size={15} />
                        <span>Xuất Excel</span>
                    </button>

                    {!activityId && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5"
                        >
                            <Plus size={15} />
                            <span>+ Thêm Hoạt Động</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Matrix Table */}
            {activities.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-xs space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                        <Layers size={28} />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-slate-800">Chưa có hoạt động phức hợp nào</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                            Tạo bảng theo dõi để gộp nhiều hoạt động như Bảo hiểm tai nạn, Bán trú, Hội thao... vào cùng một bảng và xuất chung 1 lần báo cáo Excel.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center gap-2"
                    >
                        <Plus size={16} />
                        <span>+ Tạo Hoạt Động Đầu Tiên Ngay</span>
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="overflow-x-auto max-h-[70vh]">
                        <table className="w-full border-collapse text-left">
                            {/* Multi-Header */}
                            <thead className="sticky top-0 z-20 bg-slate-100 shadow-2xs">
                                {/* Row 1: Parent Activities */}
                                <tr className="border-b border-slate-200">
                                    {/* Base Student Headers (Rowspan 2) */}
                                    <th rowSpan={2} className="sticky left-0 z-30 bg-slate-100 p-3 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider w-12 text-center border-r border-slate-200">
                                        STT
                                    </th>
                                    <th rowSpan={2} className="sticky left-12 z-30 bg-slate-100 p-3 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider w-24 text-center border-r border-slate-200">
                                        Mã HS
                                    </th>
                                    <th rowSpan={2} className="sticky left-36 z-30 bg-slate-100 p-3 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider min-w-[180px] border-r border-slate-300">
                                        Họ và tên học sinh
                                    </th>

                                    {/* Parent Activity Headers */}
                                    {activities.map(act => {
                                        const children = act.children || [];
                                        return (
                                            <th
                                                key={act.id}
                                                colSpan={Math.max(1, children.length)}
                                                className="p-2.5 bg-blue-50/80 border-r border-slate-200 text-center"
                                            >
                                                <div className="flex items-center justify-center px-2 py-0.5">
                                                    <span className="text-xs font-black text-blue-900 tracking-tight uppercase truncate">
                                                        {act.name}
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>

                                {/* Row 2: Sub-columns */}
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    {activities.map(act => {
                                        const children = act.children || [];
                                        if (children.length === 0) {
                                            return (
                                                <th key={`${act.id}_empty`} className="p-2 text-[11px] text-slate-400 font-normal italic border-r border-slate-200 text-center">
                                                    Chưa có cột con
                                                </th>
                                            );
                                        }

                                        return children.map(child => {
                                            const meta = getChildColumnMeta(child);
                                            const suggestions = meta.suggestions;
                                            const hasSuggestions = meta.hasSuggestions;
                                            const isNote = meta.isNote;
                                            const isCheckbox = meta.isCheckbox;

                                            return (
                                                <th
                                                    key={child.id}
                                                    className={cn(
                                                        "p-2 text-[11px] font-bold border-r border-slate-200 text-center whitespace-nowrap",
                                                        isNote ? "bg-slate-100 text-slate-600 min-w-[150px]" : "text-slate-700 min-w-[105px]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-1 px-1">
                                                        <span className="truncate max-w-[100px]" title={child.name}>{child.name}</span>

                                                        {/* Quick Fill Actions in Header */}
                                                        {hasSuggestions && suggestions.length > 0 && (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickFillSuggestion(child.id, suggestions[0])}
                                                                    className="text-[9px] font-black text-blue-700 hover:bg-blue-100 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-300 transition shrink-0"
                                                                    title={`Điền nhanh "${suggestions[0]}" cho cả lớp`}
                                                                >
                                                                    {suggestions[0]} cả lớp
                                                                </button>
                                                                {suggestions.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQuickFillSuggestion(child.id, suggestions[1])}
                                                                        className="text-[9px] font-black text-purple-700 hover:bg-purple-100 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-300 transition shrink-0"
                                                                        title={`Điền nhanh "${suggestions[1]}" cho cả lớp`}
                                                                    >
                                                                        {suggestions[1]}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {isCheckbox && (
                                                            <div className="flex gap-0.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickFill(child.id, true)}
                                                                    className={cn(
                                                                        "p-0.5 rounded transition",
                                                                        meta.isNotRegisteredCol ? "text-slate-400 hover:text-amber-600" : "text-slate-400 hover:text-emerald-600"
                                                                    )}
                                                                    title={`Đánh dấu X tất cả học sinh (${child.name})`}
                                                                >
                                                                    <CheckSquare size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickFill(child.id, false)}
                                                                    className="p-0.5 text-slate-400 hover:text-red-500 rounded transition"
                                                                    title="Bỏ chọn tất cả"
                                                                >
                                                                    <Square size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        });
                                    })}
                                </tr>
                            </thead>

                            {/* Body Rows */}
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {studentList.length === 0 ? (
                                    <tr>
                                        <td colSpan={20} className="py-12 text-center text-slate-400 font-semibold italic">
                                            Đang tải danh sách học sinh của lớp...
                                        </td>
                                    </tr>
                                ) : (
                                    studentList.map((stud, idx) => {
                                    const studentCode = stud.code || stud.id;

                                    return (
                                        <tr key={stud.id} className="hover:bg-blue-50/30 transition-colors">
                                            {/* STT */}
                                            <td className="sticky left-0 z-10 bg-white p-2.5 text-center text-slate-500 font-semibold border-r border-slate-100">
                                                {idx + 1}
                                            </td>

                                            {/* Code */}
                                            <td 
                                                className="sticky left-12 z-10 bg-white p-2.5 text-center text-slate-600 font-mono text-[11px] border-r border-slate-100"
                                                title={stud.code || undefined}
                                            >
                                                {formatStudentCode(stud.code) || '-'}
                                            </td>

                                            {/* Full Name */}
                                            <td className="sticky left-36 z-10 bg-white p-2.5 font-bold text-slate-800 border-r border-slate-200">
                                                <span>{stud.fullName}</span>
                                            </td>

                                            {/* Data Cells */}
                                            {activities.map(act => {
                                                const children = act.children || [];
                                                if (children.length === 0) {
                                                    return <td key={`${act.id}_no_child`} className="border-r border-slate-100" />;
                                                }

                                                return children.map(child => {
                                                    const meta = getChildColumnMeta(child);
                                                    const suggestions = meta.suggestions;
                                                    const hasSuggestions = meta.hasSuggestions;
                                                    const isNote = meta.isNote;
                                                    const isCheckbox = meta.isCheckbox;
                                                    const cellVal = records[studentCode]?.[child.id]?.value;
                                                    const cellKey = `${studentCode}_${child.id}`;
                                                    const isDropdownOpen = openDropdownCell === cellKey;

                                                    // 1. Gợi ý xoay vòng & Dropbox (Bấm nhảy gợi ý hoặc mở menu chọn trực tiếp)
                                                    if (hasSuggestions) {
                                                        const strVal = String(cellVal ?? '');
                                                        const valStyle = getValueBadgeStyle(strVal, meta.isAmountCol);
                                                        return (
                                                            <td key={child.id} className="p-1 border-r border-slate-100 relative group/cell">
                                                                <div className="flex items-center gap-0.5 w-full">
                                                                    {/* Bấm vào ô -> Tự nhảy gợi ý kế tiếp (Cycle) */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCycleSuggestion(child.id, studentCode, suggestions)}
                                                                        className={cn(
                                                                            "flex-1 h-7 px-1.5 rounded-lg text-xs font-bold text-center transition-all truncate border active:scale-95 flex items-center justify-center gap-1",
                                                                            strVal
                                                                                ? valStyle.bg
                                                                                : "bg-slate-50/70 text-slate-400 border-dashed border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                                                                        )}
                                                                        title="Bấm để nhảy gợi ý tiếp theo (hoặc bấm mũi tên để chọn nhanh)"
                                                                    >
                                                                        {strVal ? (
                                                                            <>
                                                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", valStyle.dot)} />
                                                                                <span className="truncate">{strVal}</span>
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-[10px] font-normal italic text-slate-400">-</span>
                                                                        )}
                                                                    </button>

                                                                    {/* Nút Dropbox mũi tên xổ xuống -> Mở menu chọn trực tiếp */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenDropdownCell(isDropdownOpen ? null : cellKey);
                                                                        }}
                                                                        className={cn(
                                                                            "p-1 h-7 rounded-lg border transition shrink-0",
                                                                            isDropdownOpen
                                                                                ? "bg-blue-600 text-white border-blue-600"
                                                                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-slate-200"
                                                                        )}
                                                                        title="Mở dropbox danh sách để chọn nhanh"
                                                                    >
                                                                        <ChevronDown size={11} />
                                                                    </button>
                                                                </div>

                                                                {/* Dropbox Popover Menu */}
                                                                {isDropdownOpen && (
                                                                    <div
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="absolute left-1 top-9 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 min-w-[155px] text-xs space-y-1.5 animate-in fade-in zoom-in-95"
                                                                    >
                                                                        <div className="px-1 py-0.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                                            Chọn giá trị ({child.name}):
                                                                        </div>
                                                                        {suggestions.map((sug, sIdx) => {
                                                                            const sugStyle = getValueBadgeStyle(sug, meta.isAmountCol);
                                                                            const isSelected = strVal === sug;
                                                                            return (
                                                                                <button
                                                                                    key={sIdx}
                                                                                    type="button"
                                                                                    onClick={() => handleSelectSuggestion(child.id, studentCode, sug)}
                                                                                    className={cn(
                                                                                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition border",
                                                                                        isSelected
                                                                                            ? `${sugStyle.dropdownBg} ring-2 ring-blue-400 shadow-2xs`
                                                                                            : "text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-200"
                                                                                    )}
                                                                                >
                                                                                    <div className="flex items-center gap-2 truncate">
                                                                                        <span className={cn("w-2 h-2 rounded-full shrink-0 shadow-2xs", sugStyle.dot)} />
                                                                                        <span className={isSelected ? "font-black truncate" : "font-semibold truncate"}>{sug}</span>
                                                                                    </div>
                                                                                    {isSelected && <Check size={13} className="text-current shrink-0 ml-1" />}
                                                                                </button>
                                                                            );
                                                                        })}

                                                                        {/* Nhập tay giá trị khác nếu cần */}
                                                                        <div className="pt-1 border-t border-slate-100">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Giá trị khác..."
                                                                                defaultValue={suggestions.includes(strVal) ? '' : strVal}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        handleSelectSuggestion(child.id, studentCode, e.currentTarget.value);
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (e.target.value && !suggestions.includes(e.target.value)) {
                                                                                        handleSelectSuggestion(child.id, studentCode, e.target.value);
                                                                                    }
                                                                                }}
                                                                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            />
                                                                        </div>

                                                                        <div className="pt-0.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSelectSuggestion(child.id, studentCode, '')}
                                                                                className="w-full text-left px-2 py-1 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md font-medium"
                                                                            >
                                                                                ✕ Bỏ chọn / Để trống
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    }

                                                    // 2. Tự điền tự do / Ghi chú (Nhập phím)
                                                    if (isNote) {
                                                        return (
                                                            <td key={child.id} className="p-1 border-r border-slate-100 bg-slate-50/40">
                                                                <input
                                                                    type="text"
                                                                    defaultValue={String(cellVal || '')}
                                                                    onBlur={e => handleNoteChange(child.id, studentCode, e.target.value)}
                                                                    placeholder="Ghi chú..."
                                                                    className="w-full px-2 py-1 bg-white/80 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded-lg text-xs transition outline-none"
                                                                />
                                                            </td>
                                                        );
                                                    }

                                                    // 3. Ô đánh dấu X (Checkbox)
                                                    const isChecked = cellVal === true || cellVal === 'X' || cellVal === 'x' || cellVal === 'Có' || cellVal === 1;
                                                    return (
                                                        <td
                                                            key={child.id}
                                                            onClick={() => handleToggleCell(child.id, studentCode)}
                                                            className={cn(
                                                                "p-1.5 text-center border-r border-slate-100 cursor-pointer select-none transition-colors",
                                                                meta.isNotRegisteredCol ? "hover:bg-amber-50/50" : "hover:bg-emerald-50/50"
                                                            )}
                                                            title={meta.isNotRegisteredCol ? "Bấm để đánh dấu Không đăng ký (X)" : "Bấm để đánh dấu Đăng ký tham gia (X)"}
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                <div className={cn(
                                                                    "w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs transition-all shadow-2xs",
                                                                    isChecked
                                                                        ? (meta.isNotRegisteredCol
                                                                            ? "bg-amber-600 text-white shadow-amber-200 scale-105"
                                                                            : "bg-emerald-600 text-white shadow-emerald-200 scale-105")
                                                                        : "bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400"
                                                                )}>
                                                                    {isChecked ? 'X' : ''}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                });
                                            })}
                                        </tr>
                                    );
                                }))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Add Subcolumn Modal */}
            {addingChildToParentId && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-sm text-slate-800">Thêm Cột Con Vào Hoạt Động</h4>
                            <button
                                onClick={() => setAddingChildToParentId(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Tên cột con</label>
                            <input
                                type="text"
                                value={newChildName}
                                onChange={e => setNewChildName(e.target.value)}
                                placeholder="VD: Mức phí, Ký xác nhận, Môn thi đấu, Chế độ ăn..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Kiểu cột</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewChildMode('checkbox')}
                                    className={cn(
                                        "p-2.5 rounded-xl border text-left transition flex flex-col gap-1",
                                        newChildMode === 'checkbox'
                                            ? "border-blue-500 bg-blue-50/60 text-blue-900 font-bold"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="text-xs">☑️ Ô đánh dấu (X)</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Đăng ký, Có/Không</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewChildMode('suggestions');
                                        if (!newChildSuggestions) setNewChildSuggestions('30.000, 60.000, Miễn');
                                    }}
                                    className={cn(
                                        "p-2.5 rounded-xl border text-left transition flex flex-col gap-1",
                                        newChildMode === 'suggestions'
                                            ? "border-blue-500 bg-blue-50/60 text-blue-900 font-bold"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="text-xs">🔄 Gợi ý & Dropbox</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Bấm nhảy gợi ý xoay vòng</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setNewChildMode('inline_text')}
                                    className={cn(
                                        "p-2.5 rounded-xl border text-left transition flex flex-col gap-1",
                                        newChildMode === 'inline_text'
                                            ? "border-blue-500 bg-blue-50/60 text-blue-900 font-bold"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="text-xs">✏️ Nhập chữ tự do</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Số tiền, ghi chú, ký tên</span>
                                </button>
                            </div>
                        </div>

                        {newChildMode === 'suggestions' && (
                            <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
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
                                <div className="flex gap-1.5 flex-wrap pt-1">
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
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setAddingChildToParentId(null)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleAddSubColumn(addingChildToParentId)}
                                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-blue-700"
                            >
                                Thêm Cột
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Activity Modal */}
            <CreateCompositeActivityModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                classId={classId}
                className={classInfo?.name || ''}
                students={studentList}
                onSuccess={loadData}
            />

            {/* Edit Activity & Manage Sub-columns Modal */}
            <EditCompositeActivityModal
                isOpen={!!editingActivity}
                onClose={() => setEditingActivity(null)}
                activity={editingActivity}
                classId={classId}
                studentCount={studentList.length}
                students={studentList}
                onSuccess={loadData}
            />

            {/* Export Modal */}
            <ExportColumnSelectorModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                classInfo={classInfo || { id: classId, name: 'Lớp', totalStudents: studentList.length }}
                students={studentList}
                activities={activities}
                records={records}
            />

            {/* Zalo Message / Report Image Modal */}
            {isMessageModalOpen && currentExportData && (
                <MonitorMessageModal
                    isOpen={isMessageModalOpen}
                    onClose={() => setIsMessageModalOpen(false)}
                    data={currentExportData}
                />
            )}
        </div>
    );
}
