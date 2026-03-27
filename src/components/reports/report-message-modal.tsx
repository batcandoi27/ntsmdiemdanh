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
  visibleColumns?: string[];
}

export function ReportMessageModal({ 
  isOpen, 
  onClose, 
  className, 
  dateRange, 
  absences,
  totalStudents = 0,
  visibleColumns = ['P', 'K', 'T', 'VP', 'KH']
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

    // DEBUG: Kiểm tra absences đầu vào
    console.log("[ReportMessageModal] Absences input:", absences);

    absences.forEach(record => {
      const dateStr = record.date;
      const status = record.status || '';
      // Một record status của PresenceDetail có thể chứa nhiều lượt vi phạm đã được server gộp bằng "; "
      const statuses = status.split('; ').filter(Boolean);
      
      // Tập hợp các chi tiết của học sinh này trong ngày này
      const currentDetails: string[] = [];
      const codesInRecord = new Set<string>();

      statuses.forEach(statusStr => {
        const s = statusStr.trim();
        if (!s) return;
        
        const codeMatch = s.match(/^([A-Z]+)/);
        if (!codeMatch) return;
        const code = codeMatch[1].toUpperCase();
        codesInRecord.add(code);
        
        const bracketMatch = s.match(/\[(.*?)\]/);
        if (bracketMatch) {
          currentDetails.push(bracketMatch[1].trim());
        } else {
          let d = s.substring(code.length).trim();
          d = d.replace(/^\[(.*)\]$/, '$1').replace(/^\((.*)\)$$/, '$1').trim();
          if (d) currentDetails.push(d);
        }
      });

      // Với mỗi mã trạng thái xuất hiện trong record này (thường chỉ 1 loại như VP hoặc T)
      codesInRecord.forEach(code => {
        const processList = (list: Record<string, string[]>, currentCode: string) => {
          if (code !== currentCode) return;
          if (!list[dateStr]) list[dateStr] = [];
          
          const existingIdx = list[dateStr].findIndex(item => item.startsWith(record.studentName));
          const detailStr = currentDetails.join(', ');

          if (existingIdx > -1) {
            if (detailStr) {
                const currentItem = list[dateStr][existingIdx];
                if (currentItem.includes('(')) {
                    // Nếu đã có chú thích, nối thêm các chi tiết mới nếu chưa có
                    const existingNote = currentItem.match(/\((.*?)\)/)?.[1] || '';
                    const newNotes = currentDetails.filter(d => !existingNote.toLowerCase().includes(d.toLowerCase()));
                    if (newNotes.length > 0) {
                        list[dateStr][existingIdx] = currentItem.replace(/\)$/, `, ${newNotes.join(', ')})`);
                    }
                } else {
                    list[dateStr][existingIdx] = `${record.studentName} (${detailStr})`;
                }
            }
          } else {
            const entry = detailStr ? `${record.studentName} (${detailStr})` : record.studentName;
            list[dateStr].push(entry);
          }

          if (currentCode === 'P') count_P++;
          else if (currentCode === 'K') count_K++;
          else if (currentCode === 'T') count_T++;
          else if (currentCode === 'VP') count_VP++;
          else if (currentCode === 'KH') count_KH++;
        };

        processList(list_P, 'P');
        processList(list_K, 'K');
        processList(list_T, 'T');
        processList(list_VP, 'VP');
        processList(list_KH, 'KH');
      });
    });

    // DEBUG: Kiểm tra danh sách sau khi gộp
    console.log("[ReportMessageModal] Final Lists:", { list_VP, list_T, list_K, list_P });

    const formatListText = (dict: Record<string, string[]>) => {
      return Object.entries(dict)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, names]) => {
          const formattedDate = format(parseISO(date), 'dd/MM');
          // Gộp các học sinh cùng ngày, mỗi người một dòng có dấu gạch đầu dòng
          return `${formattedDate}:\n- ${names.join('\n- ')}`;
        })
        .join('\n\n');
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

    template += `\n📊 TỔNG KẾT:\n- Sĩ số: ${totalStudents || '?'}\n- Vắng: ${count_K}K | ${count_P}P`;
    if (count_T > 0 && visibleColumns.includes('T')) template += `\n- Trễ: ${count_T}`;
    if (count_VP > 0 && visibleColumns.includes('VP')) template += `\n- Vi phạm: ${count_VP}`;
    if (count_KH > 0 && visibleColumns.includes('KH')) template += `\n- Khen thưởng: ${count_KH}`;
    
    template += `\n\n⚠️ Đề nghị Quý Phụ huynh phối hợp nhắc nhở các em đi học đầy đủ và đúng quy định.\n\nTrân trọng, GVCN lớp ${className}`;

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
                  {(() => {
                    let currentColorClass = "text-slate-700";
                    return messageTemplate.split('\n').map((line, i) => {
                      if (line.startsWith('📢')) {
                        currentColorClass = "text-slate-700";
                        return <div key={i} className="text-slate-800 font-black mb-4 border-b pb-2">{line}</div>;
                      }
                      if (line.startsWith('📊')) {
                        currentColorClass = "text-slate-700";
                        return <div key={i} className="text-slate-800 font-black mt-6 border-t pt-4 mb-2">{line}</div>;
                      }
                      if (line.startsWith('- Sĩ số:')) {
                        return (
                          <div key={i} className="flex flex-col gap-1 text-[13px] mt-2 bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm">
                            <div className="flex justify-between border-b border-slate-50 pb-2 mb-1">
                              <span className="text-slate-500 font-bold">Sĩ số lớp:</span>
                              <span className="font-black text-slate-900 text-base">{line.split(': ')[1]}</span>
                            </div>
                            {(() => {
                              const lines = messageTemplate.split('\n');
                              // Tìm tất cả các dòng thống kê bắt đầu bằng "- " sau dòng "📊 TỔNG KẾT"
                              const statsStartIndex = lines.findIndex(l => l.startsWith('📊 TỔNG KẾT'));
                              if (statsStartIndex === -1) return null;
                              
                              const statsLines = lines.slice(statsStartIndex + 1).filter(l => l.trim().startsWith('- '));
                              // Dòng Sĩ số đã hiện ở trên, nên bỏ qua
                              const targetLines = statsLines.filter(l => !l.includes('Sĩ số:'));

                              return targetLines.map((l, li) => {
                                let label = "", val = "", colorClass = "text-slate-700", bgClass="bg-transparent";
                                if (l.includes('Vắng:')) { 
                                    label = "Vắng (K|P)"; val = l.split(': ')[1]; colorClass = "text-red-600"; bgClass="bg-red-50/30";
                                } else if (l.includes('Trễ:')) { 
                                    label = "Đi trễ (T)"; val = l.split(': ')[1]; colorClass = "text-blue-600"; bgClass="bg-blue-50/30";
                                } else if (l.includes('Vi phạm:')) { 
                                    label = "Vi phạm nền nếp"; val = l.split(': ')[1]; colorClass = "text-purple-600"; bgClass="bg-purple-50/30";
                                } else if (l.includes('Khen thưởng:')) { 
                                    label = "Khen thưởng"; val = l.split(': ')[1]; colorClass = "text-amber-600"; bgClass="bg-amber-50/30";
                                }
                                
                                if (!label) return null;
                                return (
                                  <div key={li} className={cn("flex justify-between items-center px-2 py-2 rounded-lg border-b border-slate-50 last:border-0", bgClass)}>
                                    <span className="text-slate-500 font-bold text-xs uppercase tracking-tight">{label}:</span>
                                    <span className={cn("font-black text-sm", colorClass)}>{val}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        );
                      }
                      if (line.includes('Vắng:') || line.includes('Trễ:') || line.includes('Vi phạm:') || line.includes('Khen thưởng:')) return null;
                      if (line.startsWith('📌')) {
                        if (line.includes('(K)')) currentColorClass = "text-red-700";
                        else if (line.includes('(P)')) currentColorClass = "text-yellow-700";
                        else if (line.includes('(T)')) currentColorClass = "text-blue-700";
                        else if (line.includes('(VP)')) currentColorClass = "text-purple-700";
                        else if (line.includes('(KH)')) currentColorClass = "text-orange-700";
                        else currentColorClass = "text-slate-700";
                        return <div key={i} className={cn(currentColorClass, "font-black mt-6 mb-1 text-base")}>{line}</div>;
                      }
                      if (line.startsWith('⚠️')) {
                        currentColorClass = "text-orange-800";
                        return <div key={i} className="text-orange-800 font-bold mt-6 bg-orange-50 p-2 rounded-lg border border-orange-100">{line}</div>;
                      }
                      
                      // Student lines or content
                      const isStudentLine = line.trim().startsWith('- ');
                      const isDateLine = line.trim().match(/^\d{2}\/\d{2}:$/);
                      
                      if (isDateLine) {
                         return <div key={i} className={cn(currentColorClass, "font-bold mt-2 opacity-80 underline decoration-dotted")}>{line}</div>;
                      }
                      
                      return (
                        <div key={i} className={cn(currentColorClass, isStudentLine ? "pl-2 py-0.5" : "")}>
                          {line}
                        </div>
                      );
                    });
                  })()}
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
                                    <div key={date} className="space-y-1.5 pt-1">
                                      {/* Date Header for group */}
                                      <div className={cn("text-[11px] font-black pb-0.5 border-b border-dashed", `text-${section.color}-600`, `border-${section.color}-200`)}>
                                        Ngày {format(parseISO(date), 'dd/MM')}:
                                      </div>
                                      {/* Students List - Each on separate line */}
                                      {names.map((entry, nIdx) => (
                                        <div key={nIdx} className="flex gap-1.5 text-[11px] leading-snug pl-1.5 ">
                                          <span className={cn("shrink-0", `text-${section.color}-500`)}>•</span>
                                          <span className="font-medium">
                                              {(() => {
                                                const namePart = entry.split(' (')[0];
                                                const notePart = entry.includes(' (') ? ` (${entry.split(' (')[1]}` : '';
                                                return (
                                                  <>
                                                    <span className={cn("font-black", `text-${section.color}-700`)}>{namePart}</span>
                                                    <span className={cn("text-[10px] font-medium italic leading-tight", `text-${section.color}-700`)}>{notePart}</span>
                                                  </>
                                                );
                                              })()}
                                          </span>
                                        </div>
                                      ))}
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
                        <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100 flex flex-col justify-center min-h-[50px]">
                          <div className="text-[9px] uppercase font-black text-gray-400 mb-0.5">Sĩ số</div>
                          <div className="text-base font-black text-gray-800">{totalStudents}</div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-2 text-center border border-red-100 min-h-[50px]">
                          <div className="text-[9px] uppercase font-black text-red-500 mb-0.5">Vắng KP</div>
                          <div className="text-base font-black text-red-700">{stats.K}</div>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-2 text-center border border-yellow-100 min-h-[50px]">
                          <div className="text-[9px] uppercase font-black text-yellow-600 mb-0.5">Có Phép</div>
                          <div className="text-base font-black text-yellow-700">{stats.P}</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-2 text-center border border-blue-100 min-h-[50px]">
                          <div className="text-[9px] uppercase font-black text-blue-500 mb-0.5">Đi trễ</div>
                          <div className="text-base font-black text-blue-700">{stats.T}</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-2 text-center border border-purple-100 min-h-[50px]">
                          <div className="text-[9px] uppercase font-black text-purple-600 mb-0.5">Vi phạm</div>
                          <div className="text-base font-black text-purple-700">{stats.VP}</div>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-2 text-center border border-orange-100 min-h-[50px]">
                          <div className="text-[9px] uppercase font-black text-orange-600 mb-0.5">Khen thưởng</div>
                          <div className="text-base font-black text-orange-700">{stats.KH}</div>
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
