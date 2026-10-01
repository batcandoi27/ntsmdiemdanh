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
/** Format giá trị / số tiền: 30000 hoặc "30.000" → 30 000 */
export const formatReportValue = (v: any, colLabel?: string): string => {
    if (v === undefined || v === null || v === '') return '';
    const str = String(v).trim();
    if (str === 'X' || str === 'x' || str === 'true' || v === true) return 'X';
    if (str === 'false' || v === false) return '';

    const lowerCol = (colLabel || '').toLowerCase();
    const isAmountCol = lowerCol.includes('tiền') || lowerCol.includes('phí') || lowerCol.includes('giá');

    // Trường hợp 1: Có dấu chấm phân cách ngàn như "30.000" hoặc "60.000"
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
        const rawNum = parseInt(str.replace(/\./g, ''), 10);
        return rawNum.toLocaleString('fr-FR').replace(/\u202F/g, ' ');
    }

    // Trường hợp 2: Số nguyên liền nhau
    if (/^\d+$/.test(str)) {
        let num = parseInt(str, 10);
        // Nếu số nhỏ như 30, 60 trong cột tiền, tự hiểu là hàng ngàn (30 000)
        if (num <= 500 && isAmountCol) {
            num = num * 1000;
        }
        return num.toLocaleString('fr-FR').replace(/\u202F/g, ' ');
    }

    return str;
};

export interface ReportBadgeStyle {
    className: string;
    icon: string;
    displayVal: string;
}

export function getReportBadgeStyle(colLabel: string, formattedVal: string): ReportBadgeStyle {
    const lower = colLabel.toLowerCase().trim();
    const isNotReg = lower.includes('không') || lower.includes('ko');
    const isReg = (lower.includes('đăng ký') || lower.includes('tham gia')) && !isNotReg;
    const isAmount = lower.includes('tiền') || lower.includes('phí');
    const isSig = lower.includes('ký');

    if (isNotReg) {
        return {
            className: "bg-rose-50 text-rose-800 border-rose-200 font-extrabold",
            icon: "❌",
            displayVal: formattedVal === 'X' ? 'X (Không tham gia)' : formattedVal,
        };
    }

    if (isReg) {
        return {
            className: "bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold",
            icon: "✅",
            displayVal: formattedVal === 'X' ? 'X (Đã tham gia)' : formattedVal,
        };
    }

    if (isAmount) {
        const clean = formattedVal.toLowerCase().replace(/[\s.,_đ]/g, '');
        if (clean === '30' || clean === '30000') {
            return {
                className: "bg-teal-50 text-teal-800 border-teal-200 font-black",
                icon: "💵",
                displayVal: formattedVal.includes('đ') ? formattedVal : `${formattedVal}đ`,
            };
        }
        if (clean === '60' || clean === '60000') {
            return {
                className: "bg-purple-50 text-purple-800 border-purple-200 font-black",
                icon: "💵",
                displayVal: formattedVal.includes('đ') ? formattedVal : `${formattedVal}đ`,
            };
        }
        if (clean.includes('miễn') || clean === '0') {
            return {
                className: "bg-amber-50 text-amber-900 border-amber-200 font-black",
                icon: "✨",
                displayVal: formattedVal,
            };
        }
        return {
            className: "bg-blue-50 text-blue-800 border-blue-200 font-black",
            icon: "💵",
            displayVal: formattedVal.includes('đ') ? formattedVal : `${formattedVal}đ`,
        };
    }

    if (isSig) {
        return {
            className: "bg-slate-100 text-slate-800 border-slate-200 font-semibold",
            icon: "✍️",
            displayVal: formattedVal === 'X' ? 'Đã ký' : formattedVal,
        };
    }

    return {
        className: "bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold",
        icon: "📌",
        displayVal: formattedVal,
    };
}

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

    // Tính toán Thống kê phân loại chi tiết (Breakdown statistics)
    const breakdownList: { name: string; count: number; colorClass: string; icon: string }[] = [];

    if (subPeriods && subPeriods.length > 0) {
      subPeriods.forEach(sp => {
        const lowerLabel = sp.label.toLowerCase();
        const isNotReg = lowerLabel.includes('không') || lowerLabel.includes('ko');
        const isReg = (lowerLabel.includes('đăng ký') || lowerLabel.includes('tham gia')) && !isNotReg;
        const isAmount = lowerLabel.includes('tiền') || lowerLabel.includes('phí');

        if (isReg || isNotReg) {
          let count = 0;
          students.forEach(s => {
            const raw = s.records[sp.id];
            if (raw === true || raw === 'X' || raw === 'x' || raw === 'Có' || raw === 1) count++;
          });
          if (count > 0) {
            breakdownList.push({
              name: sp.label,
              count,
              colorClass: isNotReg ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200",
              icon: isNotReg ? "❌" : "✅",
            });
          }
        } else if (isAmount) {
          const amountCounts: Record<string, number> = {};
          students.forEach(s => {
            const raw = s.records[sp.id];
            if (raw !== undefined && raw !== null && raw !== '') {
              const formatted = formatReportValue(raw, sp.label);
              if (formatted) {
                amountCounts[formatted] = (amountCounts[formatted] || 0) + 1;
              }
            }
          });
          Object.entries(amountCounts).forEach(([val, count]) => {
            const style = getReportBadgeStyle(sp.label, val);
            breakdownList.push({
              name: `Mức ${style.displayVal}`,
              count,
              colorClass: style.className,
              icon: style.icon,
            });
          });
        }
      });
    }

    // --- Generate Text Template với format số tiền đúng và màu sắc ký hiệu sinh động ---
    let template = `📢 BÁO CÁO: ${columnName.toUpperCase()}\n🏫 Lớp: ${className}\n📅 Ngày báo cáo: ${nowStr}\n\nKính gửi Quý Phụ huynh, đây là thông tin cập nhật từ sổ theo dõi của lớp:\n`;

    if (studentsWithRecords.length === 0) {
      template += `\n✅ Hiện tại chưa có ghi nhận đặc biệt nào cho các em trong mục này.\n`;
    } else {
      studentsWithRecords.forEach((s, idx) => {
        let recordStr = "";
        if (frequency === 'period' || (subPeriods && subPeriods.length > 0)) {
          recordStr = subPeriods?.map(sp => {
            const val = s.records[sp.id];
            if (val === undefined || val === null || val === '') return null;
            const formatted = formatReportValue(val, sp.label);
            const style = getReportBadgeStyle(sp.label, formatted);
            return `${style.icon} ${sp.label}: ${style.displayVal}`;
          }).filter(Boolean).join(' • ') || "";
        } else {
          recordStr = s.records['status'] === 'done' ? "✅ Hoàn thành" : (s.records['value'] || "");
        }
        
        if (recordStr) {
          template += `${idx + 1}. ${s.name}: ${recordStr}\n`;
        }
      });
    }

    template += `\n📊 TỔNG KẾT:\n• Sĩ số lớp: ${students.length} em\n• Số em có ghi nhận: ${studentsWithRecords.length} em`;
    if (breakdownList.length > 0) {
      template += `\n\n📌 CHI TIẾT SỐ LƯỢNG MỖI LOẠI:`;
      breakdownList.forEach(item => {
        template += `\n• ${item.icon} ${item.name}: ${item.count} em`;
      });
    }
    template += `\n\nTrân trọng, GVCN lớp ${className}`;

    return {
      messageTemplate: template,
      studentsWithRecords,
      breakdownList,
      nowStr
    };
  }, [data]);

  const { messageTemplate, studentsWithRecords, breakdownList, nowStr } = reportData;

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
            <h2 className="text-lg sm:text-xl font-black text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
              Báo cáo nhanh cho phụ huynh
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-bold mt-0.5">{data.columnName} • Lớp {data.className}</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'image' ? (
              <button
                onClick={handleCopyImage}
                disabled={imageLoading}
                className={cn(
                  "hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold transition items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50",
                  copiedImage ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
                title="Copy ảnh báo cáo để dán vào Zalo"
              >
                {imageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (copiedImage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />)}
                <span>{copiedImage ? "Đã copy ảnh" : "Copy ảnh báo cáo"}</span>
              </button>
            ) : (
              <button
                onClick={handleCopy}
                className={cn(
                  "hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold transition items-center gap-1.5 shadow-sm active:scale-95",
                  copied ? "bg-teal-100 text-teal-700 border border-teal-300" : "bg-teal-600 hover:bg-teal-700 text-white"
                )}
                title="Copy nội dung tin nhắn"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Đã copy text" : "Copy nội dung"}</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-4 border-b bg-white">
          <button 
            onClick={() => setActiveTab('text')}
            className={cn(
              "pb-3 px-2 text-sm font-black transition-all relative flex items-center gap-1.5",
              activeTab === 'text' ? "text-teal-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tin nhắn văn bản</span>
            {activeTab === 'text' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('image')}
            className={cn(
              "pb-3 px-2 text-sm font-black transition-all relative flex items-center gap-1.5",
              activeTab === 'image' ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Ảnh báo cáo</span>
            {activeTab === 'image' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          {activeTab === 'text' ? (
            <div className="flex flex-col h-full gap-4">
              <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-2xl text-xs text-teal-800 font-medium flex items-center justify-between">
                <span>💡 Nội dung văn bản đã được định dạng chuẩn số tiền (<strong>30 000đ</strong>) kèm biểu tượng phân loại rõ ràng, sẵn sàng gửi vào nhóm Zalo phụ huynh.</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shrink-0 ml-3 transition shadow-xs"
                >
                  {copied ? "✓ Đã copy" : "Copy text"}
                </button>
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-5 font-mono text-sm leading-relaxed shadow-inner whitespace-pre-wrap select-text overflow-auto min-h-[300px] text-slate-800">
                {messageTemplate}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full pb-4">
              {/* Report Image */}
              <div className="w-full flex justify-center p-0">
                <div 
                  ref={reportRef}
                  className="w-full max-w-[440px] bg-white shadow-2xl p-6 sm:p-8 border border-gray-100 text-gray-800 rounded-2xl"
                  style={{ 
                    backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
                    backgroundSize: '20px 20px',
                  }}
                >
                  <div className="text-center mb-6">
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
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {(data.frequency === 'period' || (data.subPeriods && data.subPeriods.length > 0)) ? (
                                      data.subPeriods?.map(sp => {
                                        const val = s.records[sp.id];
                                        if (val === undefined || val === null || val === '') return null;
                                        const formatted = formatReportValue(val, sp.label);
                                        const style = getReportBadgeStyle(sp.label, formatted);
                                        return (
                                          <span
                                            key={sp.id}
                                            className={cn(
                                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border shadow-2xs",
                                              style.className
                                            )}
                                          >
                                            <span className="opacity-80 font-semibold">{style.icon} {sp.label}:</span>
                                            <span className="font-black">{style.displayVal}</span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        {s.records['status'] === 'done' ? "✅ Đã hoàn thành" : s.records['value']}
                                      </span>
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
                    <div className="mt-6 pt-5 border-t border-dashed border-gray-200 space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-200">
                          <div className="text-[10px] uppercase font-black text-slate-400 mb-0.5">Sĩ số lớp</div>
                          <div className="text-xl font-black text-slate-800">{data.students.length} em</div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-3 text-center border border-blue-200">
                          <div className="text-[10px] uppercase font-black text-blue-500 mb-0.5">Đã ghi nhận</div>
                          <div className="text-xl font-black text-blue-700">{studentsWithRecords.length} em</div>
                        </div>
                      </div>

                      {/* Tổng kết số lượng mỗi loại */}
                      {breakdownList.length > 0 && (
                        <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                          <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>📊 Tổng kết số lượng mỗi loại:</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold lowercase">({breakdownList.length} phân loại)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {breakdownList.map((item, idx) => (
                              <div 
                                key={idx}
                                className={cn(
                                  "flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-2xs",
                                  item.colorClass
                                )}
                              >
                                <span className="truncate mr-1 flex items-center gap-1">
                                  <span>{item.icon}</span>
                                  <span className="truncate">{item.name}</span>
                                </span>
                                <span className="font-black text-xs shrink-0">{item.count} em</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-end mt-12 pb-2">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Tạo bởi App Điểm Danh</div>
                      <div className="text-center px-4">
                        <p className="text-[10px] font-black uppercase mb-8 text-gray-500">Giáo viên chủ nhiệm</p>
                        <p className="text-sm font-black text-gray-800 border-b-2 border-gray-800 pb-1">LỚP {data.className}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Fixed Action Footer - ALWAYS VISIBLE AT BOTTOM */}
        <div className="p-4 sm:px-6 sm:py-4 border-t bg-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-10">
          <div className="text-xs text-gray-500 font-medium hidden sm:block">
            {activeTab === 'image' ? (
              <span>💡 Bấm <strong>Copy ảnh báo cáo</strong> rồi dán trực tiếp (Ctrl+V) vào nhóm Zalo phụ huynh</span>
            ) : (
              <span>💡 Bấm <strong>Copy nội dung tin nhắn</strong> để dán vào Zalo</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {activeTab === 'image' ? (
              <>
                <button 
                  onClick={handleDownloadImage}
                  disabled={imageLoading}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  title="Tải ảnh PNG về máy"
                >
                  {imageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>Tải ảnh về máy</span>
                </button>

                <button 
                  onClick={handleCopyImage}
                  disabled={imageLoading}
                  className={cn(
                    "flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50",
                    copiedImage ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                  )}
                  title="Copy ảnh vào bộ nhớ tạm (Clipboard)"
                >
                  {imageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (copiedImage ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />)}
                  <span>{imageLoading ? "Đang xử lý..." : (copiedImage ? "Đã copy ảnh thành công!" : "Copy ảnh báo cáo")}</span>
                </button>

                <a 
                  href="https://chat.zalo.me" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-100 transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Mở ứng dụng Zalo Web"
                >
                  <span>Mở Zalo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <>
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md active:scale-95",
                    copied ? "bg-teal-100 text-teal-800 border border-teal-300" : "bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-emerald-500/20"
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Đã chép nội dung tin nhắn!" : "Copy nội dung tin nhắn"}</span>
                </button>

                <a 
                  href="https://chat.zalo.me" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-white border border-teal-200 text-teal-700 rounded-xl font-bold text-xs sm:text-sm hover:bg-teal-50 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Mở Zalo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
