'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, BookOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { getAllGroups } from '@/services/teacher-service';
import { createEventAction } from '@/app/actions/event-actions';
import { TeacherGroup } from '@/types/teacher';
import { cn } from '@/lib/utils';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizerId: string;
}

export default function CreateEventModal({ isOpen, onClose, organizerId }: CreateEventModalProps) {
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    recurrence: 'once' as const
  });

  useEffect(() => {
    if (isOpen) {
      setIsLoadingGroups(true);
      getAllGroups().then(data => {
        setGroups(data);
        setIsLoadingGroups(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await createEventAction(
        { ...formData, created_by: organizerId },
        selectedGroupIds
      );
      if (result) onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <form 
        onSubmit={handleSubmit}
        className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-gray-800 tracking-tight">Tạo Sự Kiện Mới</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Hội họp & Điểm danh</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-3 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-100">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-black text-gray-700 ml-1 uppercase tracking-wider">Tên sự kiện / Cuộc họp</span>
              <input
                required
                type="text"
                placeholder="Ví dụ: Họp Hội đồng Sư phạm tháng 10"
                className="mt-2 w-full px-5 py-3.5 rounded-2xl border border-border-default focus:border-border-focus focus:ring-4 focus:ring-sky-500/15 transition-all outline-none font-bold text-text-primary placeholder:text-text-disabled bg-surface-card shadow-xs"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-text-primary ml-1 uppercase tracking-wider">Mô tả chi tiết</span>
              <textarea
                placeholder="Nội dung tóm tắt buổi họp..."
                rows={3}
                className="mt-2 w-full px-5 py-3.5 rounded-2xl border border-border-default focus:border-border-focus focus:ring-4 focus:ring-sky-500/15 transition-all outline-none font-medium text-text-primary placeholder:text-text-disabled bg-surface-card shadow-xs resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="text-sm font-black text-gray-700 ml-1 uppercase tracking-wider">Thời gian bắt đầu</span>
              <div className="relative mt-2">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  required
                  type="datetime-local"
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-orange-500 transition-all outline-none font-bold text-gray-800"
                  value={formData.start_time}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-black text-gray-700 ml-1 uppercase tracking-wider">Thời gian kết thúc</span>
              <div className="relative mt-2">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="datetime-local"
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-orange-500 transition-all outline-none font-bold text-gray-800"
                  value={formData.end_time}
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </label>
          </div>

          <div className="space-y-4">
            <span className="text-sm font-black text-gray-700 ml-1 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Chọn nhóm tham gia
            </span>
            <div className="flex flex-wrap gap-2">
              {isLoadingGroups ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách nhóm...
                </div>
              ) : groups.map(group => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "px-5 py-3 rounded-xl font-bold text-sm transition-all border-2",
                    selectedGroupIds.includes(group.id)
                      ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200"
                      : "bg-white border-gray-100 text-gray-500 hover:border-orange-200"
                  )}
                >
                  {group.name}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-1">
              * Để trống nếu dành cho toàn bộ giáo viên
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-black text-gray-500 hover:bg-white transition-all border border-gray-200 hover:border-gray-300"
          >
            HỦY BỎ
          </button>
          <button 
            disabled={isSubmitting}
            type="submit"
            className="flex-[2] py-4 rounded-2xl font-black text-white bg-orange-500 hover:bg-orange-600 shadow-2xl shadow-orange-200 transition-all flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:shadow-none"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
            {isSubmitting ? "ĐANG TẠO..." : "TẠO SỰ KIỆN NGAY"}
          </button>
        </div>
      </form>
    </div>
  );
}
