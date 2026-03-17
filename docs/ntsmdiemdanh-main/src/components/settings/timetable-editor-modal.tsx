'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Timetable, DayOfWeek, SessionType, PeriodSlot, DAY_ORDER, DAY_LABELS, SESSION_LABELS, createEmptyWeekSchedule } from '@/types/timetable';
import { saveTimetable } from '@/services/timetable-service';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

interface TimetableEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classId: string;
    className: string;
    existingTimetable?: Timetable | null;
}

export function TimetableEditorModal({ isOpen, onClose, onSuccess, classId, className, existingTimetable }: TimetableEditorModalProps) {
    const { appUser } = useAuth();
    const [schedule, setSchedule] = useState(existingTimetable ? existingTimetable.schedule : createEmptyWeekSchedule());
    const [effectiveFrom, setEffectiveFrom] = useState(existingTimetable ? existingTimetable.effectiveFrom : new Date().toISOString().split('T')[0]);
    const [effectiveTo, setEffectiveTo] = useState(existingTimetable ? existingTimetable.effectiveTo : '2026-05-31');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!appUser) return;
        setLoading(true);
        setError('');

        try {
            await saveTimetable(appUser, {
                classId,
                className,
                effectiveFrom,
                effectiveTo,
                schedule
            });
            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Có lỗi xảy ra khi lưu TKB');
        } finally {
            setLoading(false);
        }
    };

    const updateSlot = (day: DayOfWeek, session: SessionType, idx: number, field: keyof PeriodSlot, value: any) => {
        const newSchedule = { ...schedule };
        newSchedule[day][session][idx] = { ...newSchedule[day][session][idx], [field]: value };
        setSchedule(newSchedule);
    };

    const addSlot = (day: DayOfWeek, session: SessionType) => {
        const newSchedule = { ...schedule };
        const slots = newSchedule[day][session];
        if (slots.length >= 5) return; // Max 5 periods

        // Find next available period
        const usedPeriods = slots.map(s => s.period);
        let nextPeriod = 1;
        while (usedPeriods.includes(nextPeriod) && nextPeriod <= 5) nextPeriod++;

        if (nextPeriod <= 5) {
            slots.push({ period: nextPeriod, subject: '' });
            setSchedule(newSchedule);
        }
    };

    const removeSlot = (day: DayOfWeek, session: SessionType, idx: number) => {
        const newSchedule = { ...schedule };
        newSchedule[day][session].splice(idx, 1);
        setSchedule(newSchedule);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {existingTimetable ? 'Chỉnh sửa' : 'Tạo mới'} Thời Khoá Biểu - {className}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Thiết lập chi tiết các môn học theo từng buổi</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6 text-sm">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Áp dụng từ ngày</label>
                            <input
                                type="date"
                                value={effectiveFrom}
                                onChange={e => setEffectiveFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Đến ngày</label>
                            <input
                                type="date"
                                value={effectiveTo}
                                onChange={e => setEffectiveTo(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="space-y-8">
                        {DAY_ORDER.map(day => (
                            <div key={day} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-800 text-white px-4 py-2 font-bold uppercase tracking-wide">
                                    {DAY_LABELS[day]}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                                    {/* Morning */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-orange-600">SÁNG</h4>
                                            <button
                                                onClick={() => addSlot(day, 'morning')}
                                                disabled={schedule[day].morning.length >= 5}
                                                className="text-xs flex items-center gap-1 text-orange-600 hover:bg-orange-50 px-2 py-1 rounded font-medium disabled:opacity-50"
                                            >
                                                <Plus size={14} /> Thêm tiết
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {schedule[day].morning.length === 0 ? (
                                                <div className="text-gray-400 italic text-center py-4 text-xs">Không có tiết buổi sáng</div>
                                            ) : (
                                                schedule[day].morning.map((slot, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start bg-orange-50/30 p-2 rounded-lg border border-orange-100/50">
                                                        <input
                                                            type="number" min="1" max="5"
                                                            value={slot.period}
                                                            onChange={e => updateSlot(day, 'morning', idx, 'period', parseInt(e.target.value) || 1)}
                                                            className="w-12 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold text-gray-700"
                                                            title="Tiết"
                                                        />
                                                        <div className="flex-1 space-y-2">
                                                            <input
                                                                type="text" placeholder="Môn học (Vd: Toán)"
                                                                value={slot.subject}
                                                                onChange={e => updateSlot(day, 'morning', idx, 'subject', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                                                            />
                                                            <input
                                                                type="text" placeholder="Giáo viên (Tuỳ chọn)"
                                                                value={slot.teacherName || ''}
                                                                onChange={e => updateSlot(day, 'morning', idx, 'teacherName', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none text-xs"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => removeSlot(day, 'morning', idx)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Afternoon */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-blue-600">CHIỀU</h4>
                                            <button
                                                onClick={() => addSlot(day, 'afternoon')}
                                                disabled={schedule[day].afternoon.length >= 5}
                                                className="text-xs flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium disabled:opacity-50"
                                            >
                                                <Plus size={14} /> Thêm tiết
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {schedule[day].afternoon.length === 0 ? (
                                                <div className="text-gray-400 italic text-center py-4 text-xs">Không có tiết buổi chiều</div>
                                            ) : (
                                                schedule[day].afternoon.map((slot, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start bg-blue-50/30 p-2 rounded-lg border border-blue-100/50">
                                                        <input
                                                            type="number" min="1" max="5"
                                                            value={slot.period}
                                                            onChange={e => updateSlot(day, 'afternoon', idx, 'period', parseInt(e.target.value) || 1)}
                                                            className="w-12 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-gray-700"
                                                            title="Tiết"
                                                        />
                                                        <div className="flex-1 space-y-2">
                                                            <input
                                                                type="text" placeholder="Môn học (Vd: Toán)"
                                                                value={slot.subject}
                                                                onChange={e => updateSlot(day, 'afternoon', idx, 'subject', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                                            />
                                                            <input
                                                                type="text" placeholder="Giáo viên (Tuỳ chọn)"
                                                                value={slot.teacherName || ''}
                                                                onChange={e => updateSlot(day, 'afternoon', idx, 'teacherName', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => removeSlot(day, 'afternoon', idx)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-sm disabled:opacity-50"
                    >
                        {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                        Lưu TKB
                    </button>
                </div>
            </div>
        </div>
    );
}
