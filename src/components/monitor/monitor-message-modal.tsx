"use client";

import React, { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import { 
  Copy, 
  Download, 
  Image as ImageIcon, 
  MessageSquare, 
  X, 
  Check,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonitorExportData } from '@/lib/export-utils';

/** Format số: 100000 → 100 000 */
const formatNum = (v: string | number): string => {
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toLocaleString('fr-FR').replace(/\u202F/g, ' ');
};
const isNumVal = (v: any): boolean => v !== undefined && v !== '' && !isNaN(Number(v));
const fmtVal = (v: any): string => isNumVal(v) ? formatNum(v) : String(v ?? '');

interface MonitorMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MonitorExportData;
}

export function MonitorMessageModal({ 
  isOpen, 
  onClose, 
  data
}: MonitorMessageModalProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportData = useMemo(() => {
    const { className, columnName, frequency, subPeriods, students } = data;
    const nowStr = format(new Date(), 'dd/MM/yyyy');

    // Filter students who have any record
    const studentsWithRecords = students.filter(s => Object.keys(s.records).length > 0);

    // --- Generate Text Template ---
    let template = `📢 BÁO CÁO: ${columnName.toUpperCase()}\n🏫 Lớp: ${className}\n📅 Ngày báo cáo: ${nowStr}\n\nKính gửi Quý Phụ huynh, đây là thông tin cập nhật từ sổ theo dõi của lớp:\n`;

    if (studentsWithRecords.length === 0) {
      template += `\n✅ Hiện tại chưa có ghi nhận đặc biệt nào cho các em trong mục này.\n`;
    } else {
      studentsWithRecords.forEach((s, idx) => {
        let recordStr = "";
        if (frequency === 'period') {
          recordStr = subPeriods?.map(sp => {
            const val = s.records[sp.id];
            return val ? `${sp.label}: ${fmtVal(val)}` : null;
          }).filter(Boolean).join('; ') || "";
        } else {
          recordStr = s.records['status'] === 'done' ? "Hoàn thành" : (s.records['value'] || "");
        }
        
        if (recordStr) {
          template += `${idx + 1}. ${s.name}: ${recordStr}\n`;
        }
      });
    }

    template += `\n📊 TỔNG KẾT:\n- Sĩ số: ${students.length}\n- Số em có ghi nhận: ${studentsWithRecords.length}`;
    template += `\n\nTrân trọng, GVCN lớp ${className}`;

    return {
      messageTemplate: template,
      studentsWithRecords,
      nowStr
    };
  }, [data]);

  const { messageTemplate, studentsWithRecords, nowStr } = reportData;

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
          style: { transform: 'scale(1)' }
      });
      const link = document.createElement('a');
      link.download = `Bao-cao-${data.columnName}-${data.className}.png`;
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
              Báo cáo nhanh cho phụ huynh
            </h2>
            <p className="text-sm text-gray-500 font-bold mt-0.5">{data.columnName} • Lớp {data.className}</p>
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
            Tin nhắn văn bản
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
                {messageTemplate}
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
                  className="w-full max-w-[400px] bg-white shadow-2xl p-8 border border-gray-100 text-gray-800"
                  style={{ 
                    backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
                    backgroundSize: '20px 20px',
                    minHeight: '600px'
                  }}
                >
                  <div className="text-center mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Hệ thống Quản lý Giáo dục</p>
                    <h1 className="text-2xl font-black uppercase text-blue-800 tracking-tight leading-tight">{data.columnName}</h1>
                    <div className="h-1.5 w-16 bg-blue-500 mx-auto mt-3 rounded-full" />
                    <div className="mt-4 inline-block px-5 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-black border border-blue-100">
                      LỚP: {data.className}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 border-b pb-3 uppercase tracking-wide">
                        <span>Ngày báo cáo</span>
                        <span className="text-gray-800">{nowStr}</span>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[12px] font-black uppercase tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Danh sách ghi nhận
                      </h3>
                      
                      <div className="border border-blue-100 rounded-2xl overflow-hidden shadow-sm bg-blue-50/20">
                        {studentsWithRecords.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 italic text-sm">
                            Chưa có ghi nhận đặc biệt nào.
                          </div>
                        ) : (
                          <div className="divide-y divide-blue-50">
                            {studentsWithRecords.map((s, idx) => (
                              <div key={s.id} className="p-3 flex items-start gap-3">
                                <span className="text-[10px] font-black text-blue-400 mt-1">{String(idx + 1).padStart(2, '0')}</span>
                                <div className="flex-1">
                                  <div className="text-[13px] font-black text-gray-800">{s.name}</div>
                                  <div className="text-[11px] text-blue-600 font-medium mt-0.5 italic">
                                    {data.frequency === 'period' ? (
                                      data.subPeriods?.map(sp => {
                                        const val = s.records[sp.id];
                                        return val ? `${sp.label}: ${fmtVal(val)}` : null;
                                      }).filter(Boolean).join(' • ')
                                    ) : (
                                      s.records['status'] === 'done' ? "Đã hoàn thành" : s.records['value']
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-10 pt-6 border-t border-dashed border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                          <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Sĩ số</div>
                          <div className="text-xl font-black text-gray-800">{data.students.length}</div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                          <div className="text-[10px] uppercase font-black text-blue-500 mb-1">Ghi nhận</div>
                          <div className="text-xl font-black text-blue-700">{studentsWithRecords.length}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-16 pb-2">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Tạo bởi App Điểm Danh</div>
                      <div className="text-center px-4">
                        <p className="text-[10px] font-black uppercase mb-12 text-gray-500">Giáo viên chủ nhiệm</p>
                        <p className="text-sm font-black text-gray-800 border-b-2 border-gray-800 pb-1">LỚP {data.className}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full max-w-[400px]">
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
      </div>
    </div>
  );
}
