"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Award,
  CalendarCheck,
  PlusCircle,
  ArrowRight,
  Printer,
  Grid,
  CheckCircle2,
  Circle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { getHomeroomDashboardData, saveHomeroomPlan } from '@/services/homeroom-service';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function HomeroomDashboard() {
  const [classId, setClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [todayStr, setTodayStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>({
    totalStudents: 0,
    presentCount: 0,
    lateCount: 0,
    excusedAbsenceCount: 0,
    unexcusedAbsenceCount: 0,
    attentionEvents: [],
    positiveEvents: [],
    weeklyPlan: null,
    students: []
  });

  // Lắng nghe sự kiện đổi lớp từ layout
  useEffect(() => {
    const saved = localStorage.getItem('homeroom_selected_class') || '';
    setClassId(saved);

    const handleClassChange = (e: any) => {
      if (e.detail?.classId) {
        setClassId(e.detail.classId);
      }
    };

    window.addEventListener('homeroom:class_changed', handleClassChange);
    return () => window.removeEventListener('homeroom:class_changed', handleClassChange);
  }, []);

  // Tải dữ liệu dashboard
  useEffect(() => {
    if (!classId) return;

    async function load() {
      setLoading(true);
      try {
        const res = await getHomeroomDashboardData(classId, todayStr);
        setData(res);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [classId, todayStr]);

  // Toggle checklist item trong kế hoạch tuần
  const handleToggleTask = async (taskId: string) => {
    if (!data.weeklyPlan) return;

    const currentTasks = data.weeklyPlan.content?.checklist || [];
    const updatedTasks = currentTasks.map((t: any) =>
      t.id === taskId ? { ...t, is_completed: !t.is_completed } : t
    );

    const updatedPlan = {
      ...data.weeklyPlan,
      content: {
        ...data.weeklyPlan.content,
        checklist: updatedTasks
      }
    };

    setData((prev: any) => ({ ...prev, weeklyPlan: updatedPlan }));

    try {
      await saveHomeroomPlan({
        id: data.weeklyPlan.id,
        class_id: classId,
        academic_year: data.weeklyPlan.academic_year || '2025-2026',
        plan_type: 'weekly',
        period_key: data.weeklyPlan.period_key || 'week_current',
        content: updatedPlan.content
      });
      toast.success('Đã cập nhật tiến độ công việc!');
    } catch (err) {
      toast.error('Lỗi khi lưu tiến độ');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/90 via-slate-900 to-slate-950 p-6 sm:p-8 border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                TRUNG TÂM ĐIỀU HÀNH
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {format(new Date(), "EEEE, 'ngày' dd 'tháng' MM 'năm' yyyy", { locale: vi })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bảng Tổng Quan Lớp {classId}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Nắm bắt sĩ số, chuyên cần hôm nay, phát hiện các trường hợp cần can thiệp sớm và theo dõi tiến bộ của học sinh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/homeroom/events"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ghi nhận sự việc</span>
            </Link>
            <Link
              href="/quick-attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 active:scale-95 transition-all"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              <span>Điểm danh ngay</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sĩ số lớp</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{data.totalStudents}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Đang học chính thức</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Có mặt hôm nay</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{data.presentCount}</div>
          <p className="text-[11px] text-emerald-500/80 font-medium mt-1">
            Tỷ lệ: {data.totalStudents > 0 ? Math.round((data.presentCount / data.totalStudents) * 100) : 100}%
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Vắng hôm nay</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400">
            {data.excusedAbsenceCount + data.unexcusedAbsenceCount}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            {data.excusedAbsenceCount} có phép, {data.unexcusedAbsenceCount} không phép
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đi muộn</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{data.lateCount}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Ghi nhận tiết đầu</p>
        </div>
      </div>

      {/* 2 MAIN COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: CẦN XỬ LÝ HÔM NAY & TIẾN BỘ ĐÁNG KHEN (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* CẦN XỬ LÝ HÔM NAY */}
          <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">CẦN THEO DÕI & XỬ LÝ</h2>
                  <p className="text-xs text-slate-400">Các vấn đề nề nếp, chuyên cần chưa được đóng hoặc cần can thiệp</p>
                </div>
              </div>
              <Link
                href="/homeroom/events"
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.attentionEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-slate-300">Lớp hiện tại không có sự việc tồn đọng!</p>
                <p className="text-xs text-slate-500 mt-1">Các học sinh đều duy trì nền nếp ổn định.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.attentionEvents.map((evt: any) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          HS ID: {evt.student_id?.substring(0, 8)}...
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          evt.severity === 'urgent' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        )}>
                          {evt.category}
                        </span>
                        <span className="text-[11px] text-slate-400">{evt.date}</span>
                      </div>
                      <p className="text-xs text-slate-300">{evt.description}</p>
                      {evt.action_taken && (
                        <p className="text-[11px] text-indigo-300 font-medium">
                          ↳ Biện pháp: {evt.action_taken}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/homeroom/events`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 shrink-0 border border-slate-700"
                    >
                      Xử lý
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TIẾN BỘ ĐÁNG GHI NHẬN */}
          <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">TIẾN BỘ & VIỆC TỐT NỔI BẬT</h2>
                  <p className="text-xs text-slate-400">Ghi nhận gương sáng, thành tích và điểm cộng rèn luyện</p>
                </div>
              </div>
              <Link
                href="/homeroom/events"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Thêm tuyên dương</span>
                <PlusCircle className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.positiveEvents.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Chưa có ghi nhận việc tốt trong tuần. Hãy tạo động lực cho học sinh bằng việc biểu dương các tiến bộ nhỏ!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.positiveEvents.map((evt: any) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/20 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300">{evt.category}</span>
                      {evt.points_delta > 0 && (
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          +{evt.points_delta}đ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{evt.description}</p>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                      <span>{evt.date}</span>
                      <span className="text-emerald-400 font-semibold">★ Gương sáng</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: KẾ HOẠCH TUẦN & QUICK SHORTCUTS (1 COL) */}
        <div className="space-y-6">
          {/* KẾ HOẠCH & NHIỆM VỤ TUẦN */}
          <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Trọng tâm tuần</h3>
              </div>
              <Link
                href="/homeroom/handbook"
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                Sửa
              </Link>
            </div>

            <div className="space-y-2">
              {data.weeklyPlan?.content?.checklist && data.weeklyPlan.content.checklist.length > 0 ? (
                data.weeklyPlan.content.checklist.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleTask(item.id)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-900/80 transition-colors text-left group"
                  >
                    {item.is_completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 group-hover:text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className={cn(
                      "text-xs font-medium",
                      item.is_completed ? "line-through text-slate-500" : "text-slate-200"
                    )}>
                      {item.task}
                    </span>
                  </button>
                ))
              ) : (
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60">
                    <Circle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Kiểm tra đồng phục & nề nếp 15 phút đầu giờ</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60">
                    <Circle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Đôn đốc học sinh tham gia phong trào thi đua tuần</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60">
                    <Circle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Liên hệ phụ huynh học sinh vắng không phép</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60">
                    <Circle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Chuẩn bị nội dung sinh hoạt lớp cuối tuần</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LỐI TẮT NHANH (QUICK ACTIONS) */}
          <div className="rounded-3xl bg-slate-950/60 border border-slate-800/80 p-5 sm:p-6 backdrop-blur-md space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Công cụ nghiệp vụ</h3>
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/homeroom/organization"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-xs font-bold text-slate-200 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Grid className="w-4 h-4 text-purple-400" />
                  <span>Sơ đồ chỗ ngồi & Ban cán sự</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/homeroom/print-center"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-xs font-bold text-slate-200 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Trung tâm in ấn biểu mẫu</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/portal"
                target="_blank"
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-900/30 border border-emerald-500/20 text-xs font-bold text-emerald-300 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Tra cứu Cổng Phụ huynh</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400/60" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
