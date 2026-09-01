'use client';

import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    Calendar,
    Sparkles,
    Send,
    Edit3,
    AlertCircle,
    CheckCircle2,
    Clock,
    Share2,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { DailyHomeworkReport } from '@/types/homework';
import { HomeworkService } from '@/services/homework-service';
import { DailyHomeworkModal } from '@/components/student/daily-homework-modal';
import { usePrivacy } from '@/context/privacy-context';

export default function StudentHomeworkPage() {
    const { maskSchoolName } = usePrivacy();
    const todayStr = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [report, setReport] = useState<DailyHomeworkReport | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isBCS, setIsBCS] = useState(true); // Default true for demo/BCS roles

    const sampleClassId = 'class_9a1';
    const sampleClassName = '9A1';

    useEffect(() => {
        loadReport(selectedDate);
    }, [selectedDate]);

    const loadReport = async (dateStr: string) => {
        const data = await HomeworkService.getDailyHomeworkReport(sampleClassId, dateStr, sampleClassName);
        setReport(data);
    };

    const dateFormatted = new Date(selectedDate).toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Top Nav */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/portal"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-xl bg-slate-900 border border-slate-800"
                    >
                        <ArrowLeft size={14} /> Quay lại Cổng Học Sinh
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Đồng bộ Zalo Bot 24/7
                        </span>
                    </div>
                </div>

                {/* Hero Header */}
                <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950">
                                    Lớp {sampleClassName}
                                </span>
                                <span className="text-xs text-slate-400">{maskSchoolName('THCS Trần Bội Cơ')}</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-100">
                                Sổ Báo Bài & Dặn Dò Hằng Ngày
                            </h1>
                            <p className="text-xs text-slate-400">
                                Theo dõi bài tập về nhà, chuẩn bị sách vở và lịch kiểm tra 15 phút từng tiết học
                            </p>
                        </div>

                        {isBCS && (
                            <button
                                onClick={() => setIsEditorOpen(true)}
                                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 shrink-0"
                            >
                                <Edit3 size={16} />
                                Ghi Báo Bài Hôm Nay (Zero-Touch)
                            </button>
                        )}
                    </div>
                </div>

                {/* Date Filter & Status */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 text-emerald-400 rounded-xl">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Chọn Ngày Xem</p>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-200 capitalize">{dateFormatted}</p>
                        <p className="text-[11px] text-slate-400">
                            Người ghi: {report?.created_by_name || 'Ban Cán Sự Lớp'}
                        </p>
                    </div>
                </div>

                {/* Homework Cards List */}
                <div className="space-y-4">
                    {report && report.entries && report.entries.length > 0 ? (
                        report.entries.map((entry, idx) => (
                            <div
                                key={idx}
                                className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-colors shadow-lg"
                            >
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-100">{entry.subject_name}</h3>
                                            {entry.period && <p className="text-xs text-slate-400">Tiết {entry.period}</p>}
                                        </div>
                                    </div>

                                    {entry.is_test_scheduled && (
                                        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                                            <Clock size={13} /> Có Kiểm Tra 15 Phút
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            📝 Bài Tập Về Nhà:
                                        </p>
                                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                                            {entry.homework_tasks || 'Không có bài tập về nhà'}
                                        </p>
                                    </div>

                                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            🎒 Dặn Dò & Dụng Cụ:
                                        </p>
                                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                            {entry.notes_and_tools || 'Mang đầy đủ SGK và vở ghi'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                            <BookOpen size={36} className="mx-auto text-slate-600" />
                            <h3 className="text-base font-bold text-slate-300">Chưa Có Báo Bài Cho Ngày Này</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Ban Cán Sự hoặc Giáo Viên Chủ Nhiệm chưa nhập báo bài cho ngày {dateFormatted}.
                            </p>
                            {isBCS && (
                                <button
                                    onClick={() => setIsEditorOpen(true)}
                                    className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                                >
                                    + Nhập Báo Bài Ngay
                                </button>
                            )}
                        </div>
                    )}

                    {/* General Announcement */}
                    {report && report.general_announcement && (
                        <div className="p-5 bg-gradient-to-r from-blue-950/30 to-slate-900 border border-blue-500/20 rounded-2xl space-y-2">
                            <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={14} /> Dặn Dò Chung Của Ban Cán Sự / GVCN:
                            </h4>
                            <p className="text-xs text-slate-200 leading-relaxed font-medium">
                                {report.general_announcement}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Editor */}
            <DailyHomeworkModal
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false);
                    loadReport(selectedDate);
                }}
                classId={sampleClassId}
                className={sampleClassName}
                studentName="Lớp Phó Học Tập"
            />
        </div>
    );
}
