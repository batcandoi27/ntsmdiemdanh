'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Upload, Edit, Copy, Download, Save, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/services/db';
import { getTimetableForClass, getAllTimetables } from '@/services/timetable-service';
import { Class } from '@/types/models';
import { Timetable, DAY_ORDER, DAY_LABELS, SESSION_LABELS } from '@/types/timetable';
import { cn } from '@/lib/utils';
import { TimetableEditorModal } from './timetable-editor-modal';
import { TimetableImportModal } from './timetable-import-modal';

export function TimetableTab() {
    const { appUser, loading: authLoading } = useAuth();
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [timetable, setTimetable] = useState<Timetable | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            loadTimetable(selectedClassId);
        } else {
            setTimetable(null);
        }
    }, [selectedClassId]);

    const loadClasses = async () => {
        setLoading(true);
        try {
            const classList = await db.getClasses();
            setClasses(classList);
            if (classList.length > 0) {
                setSelectedClassId(classList[0].id);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách lớp:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTimetable = async (classId: string) => {
        setLoading(true);
        try {
            const data = await getTimetableForClass(classId);
            setTimetable(data);
        } catch (error) {
            console.error('Lỗi tải TKB:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        setIsEditing(false);
        setIsImporting(false);
        if (selectedClassId) {
            loadTimetable(selectedClassId);
        }
    };

    if (authLoading) return null;

    if (appUser?.role !== 'admin' && appUser?.role !== 'principal') {
        return <div className="p-8 text-center text-gray-500">Bạn không có quyền truy cập chức năng này.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <CalendarDays className="text-blue-600" size={20} />
                        Thời Khoá Biểu
                    </h2>
                    <p className="text-sm text-gray-500">Thiết lập thời khoá biểu cho các lớp</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImporting(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors text-sm shadow-sm"
                    >
                        <Upload size={16} />
                        Nhập từ Excel
                    </button>
                    <button
                        onClick={() => alert('Download template feature coming soon')}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm shadow-sm"
                    >
                        <Download size={16} />
                        Tải Mẫu Excel
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[500px]">
                {/* Left Sidebar: Class List */}
                <div className="w-full md:w-64 border-r border-gray-200 bg-gray-50/50 flex flex-col">
                    <div className="p-4 border-b border-border-subtle bg-surface-card">
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Chọn Lớp</label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none text-sm font-bold text-text-primary hover:bg-surface-hover transition-colors shadow-xs cursor-pointer"
                        >
                            <option value="">-- Chọn lớp --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id} className="text-text-primary bg-surface-card">{c.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Optionally list all classes here for easy switching instead of just select */}
                    <div className="flex-1 overflow-y-auto hidden md:block">
                        {classes.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedClassId(c.id)}
                                className={cn(
                                    "w-full text-left px-4 py-3 border-b border-gray-100 text-sm font-medium transition-colors",
                                    selectedClassId === c.id
                                        ? "bg-blue-50 text-blue-700 border-l-4 border-l-blue-600"
                                        : "text-gray-600 hover:bg-white"
                                )}
                            >
                                Lớp {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Area: Timetable Display */}
                <div className="flex-1 flex flex-col">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <RefreshCw className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : !selectedClassId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <CalendarDays size={48} className="mb-4 opacity-50" />
                            <p>Vui lòng chọn lớp để xem thời khoá biểu</p>
                        </div>
                    ) : !timetable ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/30">
                            <CalendarDays size={48} className="mb-4 opacity-30 text-gray-400" />
                            <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có thời khoá biểu</h3>
                            <p className="text-sm mb-6">Lớp {classes.find(c => c.id === selectedClassId)?.name} chưa được thiết lập thời khoá biểu.</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-sm"
                            >
                                <Plus size={18} /> {/* Note: Plus missing in imports, using Edit instead */}
                                Tạo TKB Thủ Công
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {/* Toolbar */}
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="font-bold text-gray-800">
                                        TKB Lớp {timetable.className}
                                    </h3>
                                    <p className="text-xs text-green-600 font-medium">
                                        Đang áp dụng (từ {new Date(timetable.effectiveFrom).toLocaleDateString()})
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => alert('Chưa hỗ trợ copy')}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                                        title="Copy sang lớp khác"
                                    >
                                        <Copy size={18} />
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors text-sm"
                                    >
                                        <Edit size={16} />
                                        Chỉnh sửa
                                    </button>
                                </div>
                            </div>

                            {/* Grid View */}
                            <div className="flex-1 p-4 overflow-auto bg-gray-50/30">
                                <div className="min-w-[700px]">
                                    {/* Header Row */}
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        <div className="col-span-1"></div>
                                        {DAY_ORDER.map(day => (
                                            <div key={day} className="bg-gray-800 text-white text-center py-2 rounded-t-lg font-bold text-sm">
                                                {DAY_LABELS[day]}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Body */}
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                                        {/* Sáng */}
                                        <div className="flex border-b border-gray-200">
                                            <div className="w-[80px] sm:w-[100px] shrink-0 bg-orange-50/50 border-r border-gray-200 flex items-center justify-center p-2 font-bold text-orange-700 text-sm">
                                                SÁNG
                                            </div>
                                            <div className="flex-1 grid grid-cols-6 divide-x divide-gray-200">
                                                {DAY_ORDER.map(day => {
                                                    const slots = timetable.schedule[day].morning;
                                                    return (
                                                        <div key={`m_${day}`} className="p-2 min-h-[120px]">
                                                            {slots.length > 0 ? (
                                                                <div className="space-y-1.5 align-top">
                                                                    {slots.map((slot, idx) => (
                                                                        <div key={idx} className="bg-orange-50 border border-orange-100 rounded px-2 py-1 text-xs">
                                                                            <div className="flex justify-between font-bold text-gray-800 mb-0.5">
                                                                                <span className="text-orange-600">T{slot.period}</span>
                                                                                <span>{slot.subject}</span>
                                                                            </div>
                                                                            {slot.teacherName && <div className="text-gray-500 truncate">{slot.teacherName}</div>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-text-disabled text-xs font-bold">-</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Chiều */}
                                        <div className="flex">
                                            <div className="w-[80px] sm:w-[100px] shrink-0 bg-blue-50/50 border-r border-gray-200 flex items-center justify-center p-2 font-bold text-blue-700 text-sm">
                                                CHIỀU
                                            </div>
                                            <div className="flex-1 grid grid-cols-6 divide-x divide-gray-200">
                                                {DAY_ORDER.map(day => {
                                                    const slots = timetable.schedule[day].afternoon;
                                                    return (
                                                        <div key={`a_${day}`} className="p-2 min-h-[120px]">
                                                            {slots.length > 0 ? (
                                                                <div className="space-y-1.5 align-top">
                                                                    {slots.map((slot, idx) => (
                                                                        <div key={idx} className="bg-blue-50 border border-blue-100 rounded px-2 py-1 text-xs">
                                                                            <div className="flex justify-between font-bold text-gray-800 mb-0.5">
                                                                                <span className="text-blue-600">T{slot.period}</span>
                                                                                <span>{slot.subject}</span>
                                                                            </div>
                                                                            {slot.teacherName && <div className="text-gray-500 truncate">{slot.teacherName}</div>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-text-disabled text-xs font-bold">-</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {isEditing && selectedClassId && (
                <TimetableEditorModal
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    onSuccess={handleSuccess}
                    classId={selectedClassId}
                    className={classes.find(c => c.id === selectedClassId)?.name || ''}
                    existingTimetable={timetable}
                />
            )}

            {isImporting && (
                <TimetableImportModal
                    isOpen={isImporting}
                    onClose={() => setIsImporting(false)}
                    onSuccess={handleSuccess}
                    classes={classes}
                />
            )}
        </div>
    );
}
