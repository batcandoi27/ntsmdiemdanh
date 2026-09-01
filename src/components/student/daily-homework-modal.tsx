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
    SubjectSmartPreset,
    getSubjectBadgeStyle
} from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { zaloGateway } from '@/lib/zalo-gateway-client';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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
            period: report.entries.length + 1,
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

    const handleSave = async (closeAfterSave = false) => {
        setIsSaving(true);
        try {
            const res = await HomeworkService.saveDailyHomeworkReport(report);
            if (res.ok) {
                toast.success('✅ Đã lưu sổ báo bài thành công!');
                if (closeAfterSave) onClose();
            } else {
                toast.error('❌ Lỗi khi lưu sổ báo bài: ' + res.error);
            }
        } catch (err: any) {
            toast.error('❌ Lỗi kết nối: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendZaloGroup = async () => {
        setIsSendingZalo(true);
        try {
            const formattedMsg = HomeworkService.formatHomeworkReportForZalo(report);
            // Broadcast via Gateway
            await zaloGateway.sendTextMessage({
                thread_id: '3201958921355249241',
                thread_type: 0,
                text: formattedMsg
            });
            toast.success('🚀 Đã đồng bộ & gửi báo bài vào Zalo thành công!');
        } catch (err: any) {
            toast.error('❌ Gửi Zalo thất bại: ' + err.message);
        } finally {
            setIsSendingZalo(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-900 font-sans">
                
                {/* Header (Light Theme) */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white/95 backdrop-blur border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl">
                            <BookOpen size={22} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                Ghi Sổ Báo Bài & Dặn Dò Lớp {className}
                                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    Zero-Touch Gợi Ý
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Ban Cán Sự & GVCN nhập dặn dò • Tự động hiển thị trên Cổng Học Sinh, Phụ Huynh & Zalo
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* Date Selector & Reporter Info */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-2xs">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block font-bold">Ngày Báo Bài</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-2">
                            <span className="font-medium">Người ghi:</span>
                            <span className="px-3 py-1 rounded-xl bg-white text-slate-800 font-bold border border-slate-200 shadow-2xs">
                                ✍️ {studentName}
                            </span>
                        </div>
                    </div>

                    {/* Quick Subject Adder (1-Click Smart Chips) */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-blue-600" />
                            Thêm Môn Học (Bấm 1-chạm để thêm dặn dò môn mới):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_SUBJECT_PRESETS.map(preset => {
                                const badge = getSubjectBadgeStyle(preset.subject);
                                return (
                                    <button
                                        key={preset.subject}
                                        onClick={() => handleAddSubject(preset.subject)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-2xs",
                                            badge.bg, badge.text, badge.border
                                        )}
                                    >
                                        <Plus size={12} className="stroke-3" />
                                        <span>{badge.icon}</span>
                                        <span>{preset.subject}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subject Entries List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-extrabold text-slate-900">
                                Chi Tiết Dặn Dò Từng Môn ({report.entries.length} môn)
                            </h4>
                        </div>

                        {report.entries.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
                                <p className="text-2xl">📝</p>
                                <p className="font-bold">Chưa có môn học nào trong ngày này.</p>
                                <p>Hãy bấm vào các nút môn học ở trên để thêm dặn dò bài tập nhanh 1-chạm.</p>
                            </div>
                        ) : (
                            report.entries.map((entry, idx) => {
                                const preset = COMMON_SUBJECT_PRESETS.find(p => p.subject.toLowerCase() === entry.subject_name.toLowerCase());
                                const badge = getSubjectBadgeStyle(entry.subject_name);

                                return (
                                    <div
                                        key={idx}
                                        className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black border border-slate-200">
                                                    {idx + 1}
                                                </span>
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-xl text-xs font-extrabold border flex items-center gap-1.5",
                                                    badge.bg, badge.text, badge.border
                                                )}>
                                                    <span>{badge.icon}</span>
                                                    <span>{entry.subject_name}</span>
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-1.5 text-xs text-amber-700 font-bold cursor-pointer bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!entry.is_test_scheduled}
                                                        onChange={e => handleEntryChange(idx, 'is_test_scheduled', e.target.checked)}
                                                        className="rounded border-amber-300 text-amber-600 focus:ring-0 cursor-pointer"
                                                    />
                                                    <AlertTriangle size={13} className="text-amber-600" />
                                                    <span>Có kiểm tra 15p / 1T</span>
                                                </label>

                                                <button
                                                    onClick={() => handleRemoveSubject(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa môn này"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Task text area */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                <span>📖 Nội dung bài tập về nhà:</span>
                                                <span className="text-[10px] text-slate-400 font-normal">Gõ hoặc bấm gợi ý bên dưới</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={entry.homework_tasks}
                                                onChange={e => handleEntryChange(idx, 'homework_tasks', e.target.value)}
                                                placeholder="Ví dụ: Làm bài 1, 2, 3 trang 45 SGK..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />

                                            {/* Quick task suggestions */}
                                            {preset && preset.quick_tasks.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                    {preset.quick_tasks.map((taskStr, tIdx) => (
                                                        <button
                                                            key={tIdx}
                                                            type="button"
                                                            onClick={() => handleApplyPreset(idx, taskStr, 'TASK')}
                                                            className="text-[11px] px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors"
                                                        >
                                                            + {taskStr}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes & Tools */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                <span>🧰 Dụng cụ, sách vở cần chuẩn bị:</span>
                                                <span className="text-[10px] text-slate-400 font-normal">Gợi ý 1-chạm</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={entry.notes_and_tools || ''}
                                                onChange={e => handleEntryChange(idx, 'notes_and_tools', e.target.value)}
                                                placeholder="Ví dụ: Mang máy tính Casio, thước kẻ ê-ke..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />

                                            {/* Quick tool suggestions */}
                                            {preset && preset.quick_tools.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                    {preset.quick_tools.map((toolStr, tIdx) => (
                                                        <button
                                                            key={tIdx}
                                                            type="button"
                                                            onClick={() => handleApplyPreset(idx, toolStr, 'TOOL')}
                                                            className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors"
                                                        >
                                                            + {toolStr}
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
                        <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            📢 Lời Dặn Dò Chung Của Giáo Viên / Ban Cán Sự (Tùy chọn):
                        </label>
                        <textarea
                            rows={2}
                            value={report.general_announcement || ''}
                            onChange={e => setReport({ ...report, general_announcement: e.target.value })}
                            placeholder="Ví dụ: Ngày mai nhớ nộp tiền quỹ lớp và mang theo áo đồng phục thể dục..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Footer Controls (Light Theme) */}
                <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 p-5 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
                    <button
                        onClick={handleSendZaloGroup}
                        disabled={isSendingZalo}
                        className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                        <Share2 size={15} />
                        <span>{isSendingZalo ? 'Đang gửi...' : 'Gửi Sang Zalo Bot'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                        >
                            Đóng
                        </button>

                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                            <span>Lưu & Ghi Tiếp</span>
                        </button>

                        <button
                            onClick={() => handleSave(true)}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                        >
                            <Save size={15} />
                            <span>{isSaving ? 'Đang lưu...' : 'Hoàn Tất & Lưu Báo Bài'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
