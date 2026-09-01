'use client';

import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    Save,
    Send,
    Sparkles,
    Check,
    X,
    Plus,
    Trash2,
    Calendar,
    AlertTriangle,
    Bot,
    Share2,
    Clock,
    RefreshCw
} from 'lucide-react';
import {
    DailyHomeworkReport,
    HomeworkSubjectEntry,
    COMMON_SUBJECT_PRESETS,
    SubjectSmartPreset
} from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { zaloGateway } from '@/lib/zalo-gateway-client';

interface DailyHomeworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
    studentName?: string;
    isReporterOrTeacher?: boolean;
}

export function DailyHomeworkModal({
    isOpen,
    onClose,
    classId,
    className,
    studentName = 'Ban Cán Sự Lớp',
    isReporterOrTeacher = true
}: DailyHomeworkModalProps) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [report, setReport] = useState<DailyHomeworkReport | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingZalo, setIsSendingZalo] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && classId) {
            loadReport(selectedDate);
        }
    }, [isOpen, classId, selectedDate]);

    const loadReport = async (dateStr: string) => {
        const data = await HomeworkService.getDailyHomeworkReport(classId, dateStr, className);
        setReport(data);
    };

    if (!isOpen || !report) return null;

    const handleEntryChange = (index: number, field: keyof HomeworkSubjectEntry, value: any) => {
        const newEntries = [...report.entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setReport({ ...report, entries: newEntries });
    };

    const handleAddSubject = (subjectName: string) => {
        const preset = COMMON_SUBJECT_PRESETS.find(p => p.subject.toLowerCase() === subjectName.toLowerCase());
        const newEntry: HomeworkSubjectEntry = {
            subject_name: subjectName,
            homework_tasks: preset?.quick_tasks[0] || 'Làm bài tập trong SGK',
            notes_and_tools: preset?.quick_tools[0] || 'Mang đầy đủ SGK và vở ghi',
            is_test_scheduled: false
        };
        setReport({ ...report, entries: [...report.entries, newEntry] });
    };

    const handleRemoveSubject = (index: number) => {
        const newEntries = report.entries.filter((_, idx) => idx !== index);
        setReport({ ...report, entries: newEntries });
    };

    const handleApplyPreset = (entryIndex: number, text: string, type: 'TASK' | 'TOOL') => {
        const newEntries = [...report.entries];
        const target = newEntries[entryIndex];
        if (type === 'TASK') {
            target.homework_tasks = target.homework_tasks ? `${target.homework_tasks}; ${text}` : text;
        } else {
            target.notes_and_tools = target.notes_and_tools ? `${target.notes_and_tools}; ${text}` : text;
        }
        setReport({ ...report, entries: newEntries });
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await HomeworkService.saveDailyHomeworkReport({
            ...report,
            created_by_name: studentName,
            is_published: true
        });
        setIsSaving(false);
        if (res.ok) {
            showToast('✅ Đã lưu và công bố Báo Bài lên Cổng Học Sinh thành công!');
        }
    };

    const handleSendZalo = async () => {
        setIsSendingZalo(true);
        // Save first
        await HomeworkService.saveDailyHomeworkReport({
            ...report,
            created_by_name: studentName,
            is_published: true,
            sent_to_zalo_group: true
        });

        const formattedText = HomeworkService.formatHomeworkReportForZalo(report);
        const res = await zaloGateway.sendTextMessage({
            thread_id: 'sample_group_id', // Group ID
            thread_type: 1, // Group
            text: formattedText
        });

        setIsSendingZalo(false);
        showToast('🚀 Đã gửi Báo Bài thành công vào Nhóm Zalo Lớp!');
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-slate-900/95 backdrop-blur border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                            <BookOpen size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                Sổ Báo Bài & Dặn Dò Lớp {className}
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Zero-Touch Gợi Ý
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                Ban Cán Sự & GVCN ghi báo bài hằng ngày • Tự động đồng bộ lên Cổng Học Sinh & Zalo
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Date Selector & Info Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block font-medium">Ngày Báo Bài</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>Người ghi:</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-semibold border border-slate-700">
                                {studentName}
                            </span>
                        </div>
                    </div>

                    {/* Quick Subject Adder (1-Click) */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-emerald-400" />
                            Thêm Môn Học (Bấm 1-chạm để thêm dặn dò môn mới):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_SUBJECT_PRESETS.map(preset => (
                                <button
                                    key={preset.subject}
                                    onClick={() => handleAddSubject(preset.subject)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1 transition-all"
                                >
                                    <Plus size={12} className="text-emerald-400" />
                                    {preset.subject}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject Entries List */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-200">
                            Chi Tiết Dặn Dò Từng Môn Học ({report.entries.length} môn)
                        </h4>

                        {report.entries.length === 0 ? (
                            <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-slate-400 text-xs">
                                Chưa có môn học nào. Hãy bấm vào các môn ở trên để thêm dặn dò báo bài.
                            </div>
                        ) : (
                            report.entries.map((entry, idx) => {
                                const preset = COMMON_SUBJECT_PRESETS.find(p => p.subject.toLowerCase() === entry.subject_name.toLowerCase());

                                return (
                                    <div
                                        key={idx}
                                        className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                                    {idx + 1}
                                                </span>
                                                <h5 className="text-sm font-bold text-slate-100">{entry.subject_name}</h5>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-1.5 text-xs text-amber-400 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!entry.is_test_scheduled}
                                                        onChange={e => handleEntryChange(idx, 'is_test_scheduled', e.target.checked)}
                                                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                                                    />
                                                    <span>Có kiểm tra 15p/1T</span>
                                                </label>
                                                <button
                                                    onClick={() => handleRemoveSubject(idx)}
                                                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Task Input & Smart Suggestions */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] text-slate-400 block font-medium">
                                                Bài tập về nhà / Nhiệm vụ học tập:
                                            </label>
                                            <input
                                                type="text"
                                                value={entry.homework_tasks}
                                                onChange={e => handleEntryChange(idx, 'homework_tasks', e.target.value)}
                                                placeholder="VD: Làm bài 1,2,3 trang 45 SGK..."
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
                                            />

                                            {/* Smart Preset Chips for Tasks */}
                                            {preset && preset.quick_tasks.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1">
                                                        <Sparkles size={10} className="text-emerald-400" /> Gợi ý:
                                                    </span>
                                                    {preset.quick_tasks.map((task, tIdx) => (
                                                        <button
                                                            key={tIdx}
                                                            onClick={() => handleApplyPreset(idx, task, 'TASK')}
                                                            className="px-2 py-0.5 bg-slate-900/80 hover:bg-slate-700 border border-slate-700/70 rounded text-[10px] text-slate-300 transition-all hover:text-emerald-300"
                                                        >
                                                            + {task}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Tools & Dặn Dò Input & Suggestions */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] text-slate-400 block font-medium">
                                                Dặn dò mang dụng cụ / Chuẩn bị bài:
                                            </label>
                                            <input
                                                type="text"
                                                value={entry.notes_and_tools || ''}
                                                onChange={e => handleEntryChange(idx, 'notes_and_tools', e.target.value)}
                                                placeholder="VD: Mang com-pa, thước ê-ke, máy tính Casio..."
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
                                            />

                                            {/* Smart Preset Chips for Tools */}
                                            {preset && preset.quick_tools.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1">
                                                        <Sparkles size={10} className="text-blue-400" /> Dụng cụ:
                                                    </span>
                                                    {preset.quick_tools.map((tool, toolIdx) => (
                                                        <button
                                                            key={toolIdx}
                                                            onClick={() => handleApplyPreset(idx, tool, 'TOOL')}
                                                            className="px-2 py-0.5 bg-slate-900/80 hover:bg-slate-700 border border-slate-700/70 rounded text-[10px] text-slate-300 transition-all hover:text-blue-300"
                                                        >
                                                            + {tool}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* General Announcement */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-200">
                            Dặn Dò Chung Của GVCN / Ban Cán Sự (Thông báo nề nếp, đồng phục, dã ngoại):
                        </label>
                        <textarea
                            value={report.general_announcement || ''}
                            onChange={e => setReport({ ...report, general_announcement: e.target.value })}
                            rows={2}
                            placeholder="VD: Ngày mai nhớ mặc đúng đồng phục thể dục và đi học trước 07:00 để chào cờ..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 flex items-center justify-between p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800">
                    <div className="flex items-center gap-2">
                        {toastMessage && (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                                {toastMessage}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors"
                        >
                            Đóng
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            Lưu & Đăng Lên Cổng Học Sinh
                        </button>

                        <button
                            onClick={handleSendZalo}
                            disabled={isSendingZalo}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/30"
                        >
                            {isSendingZalo ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            🚀 Gửi Ngay Vào Group Zalo Lớp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
