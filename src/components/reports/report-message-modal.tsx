"use client";

import React, { useState, useRef, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { toPng } from 'html-to-image';
import { 
  Copy, 
  Download, 
  Image as ImageIcon, 
  MessageSquare, 
  X, 
  Check,
  ExternalLink,
  Loader2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AbsenceDetail } from '@/app/actions/report';

interface ReportMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  dateRange: { start: string, end: string };
  absences: AbsenceDetail[];
  totalStudents?: number;
}

export function ReportMessageModal({ 
  isOpen, 
  onClose, 
  className, 
  dateRange, 
  absences,
  totalStudents = 0
}: ReportMessageModalProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportData = useMemo(() => {
    const list_P: Record<string, string[]> = {};
    const list_K: Record<string, string[]> = {};
    const list_T: Record<string, string[]> = {};
    const list_VP: Record<string, string[]> = {};
    const list_KH: Record<string, string[]> = {};

    let count_P = 0;
    let count_K = 0;
    let count_T = 0;
    let count_VP = 0;
    let count_KH = 0;

    absences.forEach(record => {
      const dateStr = record.date;
      const status = record.status || '';
      const statuses = status.split(' | ').filter(Boolean);
      
      statuses.forEach(statusStr => {
        if (!statusStr) return;
        
        // Trích xuất mã gốc (P, K, T, VP, KH) từ chuỗi P(S), K(C)...
        const code = statusStr.split('(')[0].trim().toUpperCase();
        const note = statusStr.includes('(') ? statusStr.substring(statusStr.indexOf('(') + 1, statusStr.lastIndexOf(')')) : '';
        const entry = note ? `${record.studentName} (${note})` : record.studentName;

        if (code === 'P') {
          if (!list_P[dateStr]) list_P[dateStr] = [];
          if (!list_P[dateStr].includes(record.studentName)) list_P[dateStr].push(record.studentName);
          count_P++;
        } else if (code === 'K') {
          if (!list_K[dateStr]) list_K[dateStr] = [];
          if (!list_K[dateStr].includes(record.studentName)) list_K[dateStr].push(record.studentName);
          count_K++;
        } else if (code === 'T') {
          if (!list_T[dateStr]) list_T[dateStr] = [];
          if (!list_T[dateStr].includes(entry)) list_T[dateStr].push(entry);
          count_T++;
        } else if (code === 'VP') {
          if (!list_VP[dateStr]) list_VP[dateStr] = [];
          if (!list_VP[dateStr].includes(entry)) list_VP[dateStr].push(entry);
          count_VP++;
        } else if (code === 'KH') {
          if (!list_KH[dateStr]) list_KH[dateStr] = [];
          if (!list_KH[dateStr].includes(entry)) list_KH[dateStr].push(entry);
          count_KH++;
        }
      });
    });

    const formatListText = (dict: Record<string, string[]>) => {
      return Object.entries(dict)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, names]) => `${format(parseISO(date), 'dd/MM')}: ${names.join(', ')}`)
        .join('\n');
    };

    const lists = { K: list_K, P: list_P, T: list_T, VP: list_VP, KH: list_KH };
    
    // --- Tạo Template Tin Nhắn ---
    let template = `📢 BÁO CÁO TUẦN - LỚP ${className}\n📅 Từ ${format(parseISO(dateRange.start), 'dd/MM')} đến ${format(parseISO(dateRange.end), 'dd/MM')}\n\nKính gửi Quý Phụ huynh, tình hình chuyên cần và nền nếp của lớp tuần qua như sau:\n`;

    if (Object.keys(list_K).length > 0) {
      template += `\n📌 NGHỈ KHÔNG PHÉP (K):\n${formatListText(list_K)}\n`;
    }
    if (Object.keys(list_P).length > 0) {
      template += `\n📌 NGHỈ CÓ PHÉP (P):\n${formatListText(list_P)}\n`;
    }
    if (Object.keys(list_T).length > 0) {
      template += `\n📌 ĐI TRỄ (T):\n${formatListText(list_T)}\n`;
    }
    if (Object.keys(list_VP).length > 0) {
      template += `\n📌 VI PHẠM NỀN NẾP (VP):\n${formatListText(list_VP)}\n`;
    }
    if (Object.keys(list_KH).length > 0) {
      template += `\n📌 KHEN THƯỞNG (KH):\n${formatListText(list_KH)}\n`;
    }

    template += `\n📊 TỔNG KẾT:\n- Sĩ số: ${totalStudents || '?'}\n- Vắng: ${count_K}K | ${count_P}P\n- Trễ: ${count_T}\n- Vi phạm: ${count_VP} | Khen thưởng: ${count_KH}\n\n⚠️ Đề nghị Quý Phụ huynh phối hợp nhắc nhở các em đi học đầy đủ và đúng quy định.\n\nTrân trọng, GVCN lớp ${className}`;

    return {
      messageTemplate: template,
      lists,
      stats: { K: count_K, P: count_P, T: count_T, VP: count_VP, KH: count_KH }
    };
  }, [absences, className, dateRange, totalStudents]);

  const { messageTemplate, lists, stats } = reportData;

  const handleCopy = () => {
    try {
        navigator.clipboard.writeText(messageTemplate);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        alert("Không thể copy. Vui lòng chọn text và copy thủ công.");
    }
  };

  const handleCopyImage = async () => {
    if (!reportRef.current) return;
    setImageLoading(true);
    try {
      const dataUrl = await toPng(reportRef.current, { 
        quality: 0.95, 
        cacheBust: true,
        style: { transform: 'scale(1)' }
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (err) {
      console.error('Lỗi khi copy ảnh:', err);
      alert('Trình duyệt của bạn không hỗ trợ copy ảnh trực tiếp. Vui lòng sử dụng nút Tải ảnh.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    setImageLoading(true);
    try {
      const dataUrl = await toPng(reportRef.current, { 
          quality: 0.95, 
          cacheBust: true,
          style: {
              transform: 'scale(1)',
          }
      });
      const link = document.createElement('a');
      link.download = `Bao-cao-tuan-${className}-${format(new Date(), 'dd-MM')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi tạo ảnh:', err);
      alert('Không thể tạo ảnh báo cáo. Vui lòng thử lại.');
    } finally {
      setImageLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-teal-600" />
              Soạn báo cáo phụ huynh
            </h2>
            <p className="text-sm text-gray-500 font-bold mt-0.5">Lớp {className} • Tuần {format(parseISO(dateRange.start), 'dd/MM')} - {format(parseISO(dateRange.end), 'dd/MM')}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-4 border-b">
          <button 
            onClick={() => setActiveTab('text')}
            className={cn(
              "pb-3 px-2 text-sm font-black transition-all relative",
              activeTab === 'text' ? "text-teal-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Tin nhắn Zalo
            {activeTab === 'text' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('image')}
            className={cn(
              "pb-3 px-2 text-sm font-black transition-all relative",
              activeTab === 'image' ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Ảnh báo cáo
            {activeTab === 'image' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {activeTab === 'text' ? (
            <div className="flex flex-col h-full gap-4">
              <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-5 font-mono text-sm leading-relaxed shadow-inner whitespace-pre-wrap select-text overflow-auto min-h-[300px] text-slate-800">
                <div className="space-y-1">
                  {messageTemplate.split('\n').map((line, i) => {
                    if (line.startsWith('📢') || line.startsWith('📊')) return <div key={i} className="text-teal-700 font-black mb-2">{line}</div>;
                    if (line.startsWith('📌')) return <div key={i} className="text-blue-700 font-bold mt-4 mb-1">{line}</div>;
                    if (line.startsWith('⚠️')) return <div key={i} className="text-orange-700 font-bold mt-4">{line}</div>;
                    if (line.includes(':')) {
                        const [label, rest] = line.split(':');
                        if (label.match(/\d{2}\/\d{2}/)) {
                            return <div key={i}><span className="text-teal-600 font-bold">{label}:</span>{rest}</div>
                        }
                    }
                    return <div key={i}>{line}</div>;
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95",
                    copied ? "bg-teal-100 text-teal-700 border border-teal-200" : "bg-teal-600 text-white hover:bg-teal-700"
                  )}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? "Đã chép nội dung" : "Copy nội dung"}
                </button>
                <a 
                  href="https://chat.zalo.me" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-3 bg-white border border-teal-200 text-teal-600 rounded-xl font-black hover:bg-teal-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  Mở Zalo <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-6 items-center w-full">
              {/* Report Image */}
              <div className="overflow-auto w-full flex justify-center p-0">
                <div 
                  ref={reportRef}
                  className="w-full max-w-[380px] bg-white shadow-2xl p-6 border border-gray-100 text-gray-800"
                  style={{ 
                    backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
                    backgroundSize: '20px 20px',
                    minHeight: '600px'
                  }}
                >
                  <div className="text-center mb-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Hệ thống Quản lý Chuyên cần</p>
                    <h1 className="text-xl font-black uppercase text-teal-800 tracking-tight leading-tight">Báo cáo Chuyên cần<br/>Tuần học</h1>
                    <div className="h-1 w-12 bg-teal-500 mx-auto mt-2 rounded-full" />
                    <div className="mt-3 inline-block px-4 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-black border border-teal-100">
                      LỚP: {className}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 border-b pb-2 uppercase tracking-wide">
                      <div className="flex justify-between uppercase">
                        <span>Thời gian</span>
                        <span className="text-gray-800">{format(parseISO(dateRange.start), 'dd/MM')} ➔ {format(parseISO(dateRange.end), 'dd/MM')}</span>
                      </div>
                    </div>

                    {/* Data Sections - Hidden if empty */}
                    <div className="space-y-4">
                      {[
                        { id: 'K', label: 'NGHỈ KHÔNG PHÉP (K)', color: 'red', data: lists.K },
                        { id: 'P', label: 'NGHỈ CÓ PHÉP (P)', color: 'yellow', data: lists.P },
                        { id: 'T', label: 'ĐI TRỄ (T)', color: 'blue', data: lists.T },
                        { id: 'VP', label: 'VI PHẠM NỀN NẾP (VP)', color: 'purple', data: lists.VP },
                        { id: 'KH', label: 'KHEN THƯỞNG (KH)', color: 'orange', data: lists.KH }
                      ].map(section => {
                        if (Object.keys(section.data).length === 0) return null;
                        
                        return (
                          <div key={section.id} className="relative">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", `bg-${section.color}-500`)} />
                              <h3 className="text-[10px] font-black uppercase tracking-wider">{section.label}</h3>
                            </div>
                            <div className={cn("border rounded-xl p-3 space-y-2", `bg-${section.color}-50/50 border-${section.color}-100`)}>
                              {Object.entries(section.data)
                                .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                                .map(([date, names]) => (
                                  <div key={date} className="flex gap-2 text-[11px] leading-tight text-slate-700">
                                    <span className={cn("font-black shrink-0 w-[35px]", `text-${section.color}-600`)}>{format(parseISO(date), 'dd/MM')}:</span>
                                    <span className="font-bold">{names.join(', ')}</span>
                                  </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                          <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Sĩ số</div>
                          <div className="text-xl font-black text-gray-800">{totalStudents}</div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                          <div className="text-[10px] uppercase font-black text-red-400 mb-1">Vắng KP</div>
                          <div className="text-xl font-black text-red-700">{stats.K}</div>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
                          <div className="text-[10px] uppercase font-black text-yellow-600 mb-1">Vắng phép</div>
                          <div className="text-xl font-black text-yellow-700">{stats.P}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-12 pb-2">
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">Tạo bởi App Điểm Danh</div>
                      <div className="text-center px-4">
                        <p className="text-[10px] font-black uppercase mb-10 text-gray-500">Giáo viên chủ nhiệm</p>
                        <p className="text-xs font-black text-gray-800 border-b border-gray-800 pb-1">LỚP {className}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full max-w-[380px]">
                <button 
                  onClick={handleCopyImage}
                  disabled={imageLoading}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-50",
                    copiedImage ? "bg-teal-100 text-teal-700 border border-teal-200" : "bg-teal-600 text-white hover:bg-teal-700"
                  )}
                >
                  {imageLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (copiedImage ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />)}
                  {imageLoading ? "Đang xử lý..." : (copiedImage ? "Đã copy ảnh" : "Copy ảnh")}
                </button>
                <button 
                  onClick={handleDownloadImage}
                  disabled={imageLoading}
                  className="px-6 bg-white border border-teal-200 text-teal-600 py-4 rounded-2xl font-black transition-all flex items-center justify-center shadow-md hover:bg-teal-50 active:scale-95 disabled:opacity-50"
                >
                  {imageLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex justify-between border-t shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <span>Hỗ trợ gửi Zalo Group Phụ huynh</span>
          <span>Version 1.0 (Beta)</span>
        </div>
      </div>
    </div>
  );
}
