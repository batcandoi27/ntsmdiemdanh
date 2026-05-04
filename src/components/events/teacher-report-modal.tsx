'use client';

import React, { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import { 
  Copy, 
  Download, 
  MessageSquare, 
  X, 
  Check,
  ExternalLink,
  Loader2,
  Share2,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeacherAttendance, TeacherAttendanceStatus } from '@/types/teacher';

interface TeacherReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    title: string;
    start_time: string;
  };
  attendance: TeacherAttendance[];
}

const STATUS_LABELS: Record<TeacherAttendanceStatus, string> = {
  present: 'Có mặt',
  absent: 'Vắng',
  on_duty: 'Công tác',
  substitute: 'Họp thay',
  leave: 'Nghỉ chế độ'
};

export function TeacherAttendanceReportModal({ 
  isOpen, 
  onClose, 
  event, 
  attendance 
}: TeacherReportModalProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportData = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const exceptions = attendance.filter(a => a.status !== 'present');
    
    const startTime = new Date(event.start_time);
    const dateStr = format(startTime, 'dd/MM/yyyy', { locale: vi });
    const timeStr = format(startTime, 'HH:mm');

    // --- Tạo Template Tin Nhắn ---
    let template = `📢 BÁO CÁO ĐIỂM DANH: ${event.title.toUpperCase()}\n⏰ Thời gian: ${timeStr} - Ngày ${dateStr}\n\n📊 TỔNG HỢP:\n- Tổng số GV: ${total}\n- Có mặt: ${present}\n- Vắng/Ngoại lệ: ${total - present}\n`;

    if (exceptions.length > 0) {
      template += `\n📌 CHI TIẾT NGOẠI LỆ:\n`;
      exceptions.forEach((a, idx) => {
        template += `${idx + 1}. ${a.teacher?.full_name} (${STATUS_LABELS[a.status]}${a.note ? ` - ${a.note}` : ''})\n`;
      });
    }

    template += `\nTrân trọng báo cáo!`;

    return {
      template,
      stats: { total, present, absent: total - present },
      exceptions
    };
  }, [attendance, event]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportData.template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    setImageLoading(true);
    try {
      const dataUrl = await toPng(reportRef.current, { quality: 0.95, cacheBust: true });
      const link = document.createElement('a');
      link.download = `Bao-cao-diem-danh-${event.title}-${format(new Date(), 'dd-MM')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Không thể tạo ảnh báo cáo.');
    } finally {
      setImageLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
              <Share2 className="w-7 h-7 text-orange-500" />
              Báo cáo nhanh
            </h2>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">{event.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 pt-4 gap-6 border-b">
          <button 
            onClick={() => setActiveTab('text')}
            className={cn(
              "pb-4 px-2 text-sm font-black transition-all relative",
              activeTab === 'text' ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Nội dung văn bản
            {activeTab === 'text' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('image')}
            className={cn(
              "pb-4 px-2 text-sm font-black transition-all relative",
              activeTab === 'image' ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Ảnh báo cáo (PNG)
            {activeTab === 'image' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-t-full" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          {activeTab === 'text' ? (
            <div className="space-y-6">
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 font-medium text-gray-700 whitespace-pre-wrap shadow-inner min-h-[200px] text-sm leading-relaxed">
                {reportData.template}
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-xl",
                    copied ? "bg-emerald-500 text-white" : "bg-orange-500 text-white hover:bg-orange-600"
                  )}
                >
                  {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  {copied ? "Đã copy nội dung" : "Copy nội dung"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div 
                ref={reportRef}
                className="w-full max-w-[400px] bg-white shadow-2xl p-8 border border-gray-100 text-gray-800 rounded-2xl"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-orange-200">
                    <Users className="w-9 h-9" />
                  </div>
                  <h1 className="text-2xl font-black uppercase text-gray-800 leading-tight">Báo cáo<br/>Điểm danh</h1>
                  <div className="h-1.5 w-12 bg-orange-500 mx-auto mt-4 rounded-full" />
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Sự kiện</span>
                      <span className="text-gray-800 text-right">{event.title}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-200 pt-2">
                      <span>Thời gian</span>
                      <span className="text-gray-800">{format(new Date(event.start_time), 'HH:mm - dd/MM/yyyy')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border-2 border-gray-50 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tổng</p>
                      <p className="text-xl font-black text-gray-800">{reportData.stats.total}</p>
                    </div>
                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Có mặt</p>
                      <p className="text-xl font-black text-emerald-700">{reportData.stats.present}</p>
                    </div>
                    <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-3 text-center">
                      <p className="text-[10px] font-black text-red-600 uppercase mb-1">Vắng</p>
                      <p className="text-xl font-black text-red-700">{reportData.stats.absent}</p>
                    </div>
                  </div>

                  {reportData.exceptions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Chi tiết ngoại lệ</p>
                      <div className="space-y-2">
                        {reportData.exceptions.map((a, i) => (
                          <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <div className="flex-1 text-xs">
                              <span className="font-bold text-gray-800">{a.teacher?.full_name}</span>
                              <p className="text-gray-500 mt-0.5">{STATUS_LABELS[a.status]}{a.note ? `: ${a.note}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-10 pt-6 border-t border-dashed text-center">
                   <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Tạo bởi Hệ thống TAS v2.0</p>
                </div>
              </div>

              <button 
                onClick={handleDownloadImage}
                disabled={imageLoading}
                className="w-full max-w-[400px] py-4 rounded-2xl font-black bg-orange-500 text-white shadow-xl shadow-orange-200 transition-all flex items-center justify-center gap-2"
              >
                {imageLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                {imageLoading ? "Đang xử lý..." : "Tải ảnh báo cáo"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
