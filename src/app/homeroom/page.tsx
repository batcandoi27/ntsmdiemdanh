"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Plus,
  CalendarCheck2,
  BookOpen,
  ArrowUpRight,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getHomeroomDashboardData, saveHomeroomPlan } from '@/services/homeroom-service';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HomeroomTooltip } from '@/components/homeroom/homeroom-tooltip';
import { PresetPicker } from '@/components/homeroom/preset-picker';
import { HomeroomPresetItem } from '@/types/homeroom-presets';
import { ThemedStatCard, ThemedCard } from '@/design-system';
import toast from 'react-hot-toast';

export default function HomeroomDashboard() {
  const [classId, setClassId] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Weekly checklist state
  const [weeklyTasks, setWeeklyTasks] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi });

  useEffect(() => {
    const activeId = localStorage.getItem('homeroom_active_class_id') || '';
    setClassId(activeId);

    async function loadData() {
      if (!activeId) return;
      setLoading(true);
      try {
        // Lấy tên lớp
        const { data: clsData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', activeId)
          .maybeSingle();
        if (clsData) setClassName(clsData.name);

        const data = await getHomeroomDashboardData(activeId, today);
        setDashboardData(data);

        // Load tasks from weekly plan if any
        if (data.weeklyPlan?.content?.tasks) {
          setWeeklyTasks(data.weeklyPlan.content.tasks);
        } else {
          setWeeklyTasks([
            { id: '1', text: 'Sinh hoạt chủ nhiệm đầu tuần & phổ biến nội quy', done: true },
            { id: '2', text: 'Kiểm tra sĩ số, rà soát học sinh vắng không phép', done: false },
            { id: '3', text: 'Giao ban với Ban cán sự lớp & 4 Tổ trưởng', done: false },
            { id: '4', text: 'Cập nhật sổ chủ nhiệm điện tử tuần này', done: false },
          ]);
        }
      } catch (err) {
        console.error('Error loading homeroom dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const handleClassChange = () => {
      const newId = localStorage.getItem('homeroom_active_class_id') || '';
      setClassId(newId);
      loadData();
    };

    window.addEventListener('homeroom_class_changed', handleClassChange);
    return () => window.removeEventListener('homeroom_class_changed', handleClassChange);
  }, [classId]);

  // Toggle Task Checklist
  const handleToggleTask = async (taskId: string) => {
    const updated = weeklyTasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    setWeeklyTasks(updated);
    if (!classId) return;

    try {
      await saveHomeroomPlan({
        class_id: classId,
        academic_year: '2025-2026',
        plan_type: 'weekly',
        period_key: 'weekly',
        title: `Kế hoạch tuần ${format(new Date(), 'w')}`,
        content: { tasks: updated }
      });
    } catch (err) {
      console.error('Error saving weekly tasks:', err);
    }
  };

  // Add Task with Preset
  const handleSelectPresetTask = (item: HomeroomPresetItem) => {
    if (!item.label) return;
    const cleanText = item.label.replace(/^[^a-zA-ZÀ-ỹ0-9]+/, '');
    const newTask = { id: Date.now().toString(), text: cleanText, done: false };
    const updated = [...weeklyTasks, newTask];
    setWeeklyTasks(updated);
    toast.success('Đã thêm việc cần làm từ mẫu gợi ý!');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = { id: Date.now().toString(), text: newTaskText.trim(), done: false };
    const updated = [...weeklyTasks, newTask];
    setWeeklyTasks(updated);
    setNewTaskText('');
    toast.success('Đã thêm việc cần làm!');
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Đang tải bảng tổng quan lớp học...
      </div>
    );
  }

  const total = dashboardData?.totalStudents || 0;
  const present = dashboardData?.presentCount || 0;
  const late = dashboardData?.lateCount || 0;
  const absent = (dashboardData?.excusedAbsenceCount || 0) + (dashboardData?.unexcusedAbsenceCount || 0);
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS BAR (Light Theme Cards) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Bảng Tổng Quan Lớp {className ? `Lớp ${className}` : ''}
            </h1>
            <HomeroomTooltip content="Tổng hợp dữ liệu chuyên cần thực tế hôm nay kết hợp các sự việc và tiến bộ cần lưu ý của lớp." />
          </div>
          <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">
            {todayFormatted} • Năm học 2025 - 2026
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/quick-attendance"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Điểm Danh Lớp Ngay</span>
          </Link>
        </div>
      </div>

      {/* 2. 4 THẺ THỐNG KÊ CHUYÊN CẦN THỜI GIAN THỰC (Tự động lên màu Pastel theo index) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ThemedStatCard
          index={0}
          label="Sĩ số lớp"
          value={total}
          subtext="học sinh"
          icon={Users}
        />
        <ThemedStatCard
          index={1}
          label="Có mặt hôm nay"
          value={present}
          subtext={`(${rate}%)`}
          icon={UserCheck}
        />
        <ThemedStatCard
          index={2}
          label="Đi muộn"
          value={late}
          subtext="lượt hôm nay"
          icon={Clock}
        />
        <ThemedStatCard
          index={3}
          label="Vắng hôm nay"
          value={absent}
          subtext={`(${dashboardData?.excusedAbsenceCount || 0} phép / ${dashboardData?.unexcusedAbsenceCount || 0} KP)`}
          icon={UserX}
        />
      </div>

      {/* 3. GRID 2 CỘT: CẦN THEO DÕI & TIẾN BỘ NỔI BẬT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CỘT TRÁI: CẦN THEO DÕI & XỬ LÝ HÔM NAY */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Cần Theo Dõi & Xử Lý Hôm Nay
              </h2>
            </div>
            <Link
              href="/homeroom/events"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!dashboardData?.attentionEvents || dashboardData.attentionEvents.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 border border-slate-100">
                🎉 Nề nếp ổn định! Không có sự việc tồn đọng cần xử lý.
              </div>
            ) : (
              dashboardData.attentionEvents.map((evt: any) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-indigo-50/40 transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {evt.category}
                      </span>
                      <span className="text-[11px] text-slate-400">{evt.date}</span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium">{evt.description}</p>
                    {evt.action_taken && (
                      <p className="text-[11px] text-indigo-600">↳ Xử lý: {evt.action_taken}</p>
                    )}
                  </div>
                  <Link
                    href={`/homeroom/events`}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI: TIẾN BỘ & VIỆC TỐT NỔI BẬT */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Tiến Bộ & Việc Tốt Nổi Bật
              </h2>
            </div>
            <Link
              href="/homeroom/events"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Ghi nhận thêm</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!dashboardData?.positiveEvents || dashboardData.positiveEvents.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 border border-slate-100">
                Chưa có sự việc khen thưởng nào được ghi nhận tuần này.
              </div>
            ) : (
              dashboardData.positiveEvents.map((evt: any) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {evt.category}
                      </span>
                      {evt.points_delta > 0 && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          +{evt.points_delta}đ
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">{evt.date}</span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium">{evt.description}</p>
                    {evt.result && (
                      <p className="text-[11px] text-emerald-700 font-medium">↳ Tuyên dương: {evt.result}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. CHECKLIST TRỌNG TÂM TUẦN (Có Preset Gợi Ý 1 Chạm) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Trọng Tâm Công Việc Tuần Của GVCN
            </h2>
            <HomeroomTooltip content="Danh mục các công việc nề nếp cần thực hiện trong tuần. Bấm vào ô vuông để đánh dấu hoàn thành." />
          </div>

          <PresetPicker
            applicableForm="weekly_plan"
            onSelect={handleSelectPresetTask}
          />
        </div>

        {/* Form thêm task mới */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập đầu việc cần làm trong tuần..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium placeholder-slate-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </form>

        {/* Task List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
          {weeklyTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => handleToggleTask(t.id)}
              className={cn(
                "w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3",
                t.done
                  ? "bg-slate-50/60 border-slate-200 text-slate-400 line-through"
                  : "bg-white border-slate-200 hover:border-indigo-300 text-slate-800 font-medium shadow-sm"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0",
                t.done ? "bg-emerald-600 text-white" : "border-2 border-slate-300"
              )}>
                {t.done && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs">{t.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
