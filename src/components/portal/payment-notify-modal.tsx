'use client';

import React, { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import {
  Copy,
  Download,
  Image as ImageIcon,
  MessageSquare,
  Check,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Building2,
  CreditCard,
  User,
  School,
  Sparkles,
  DollarSign,
  FileText,
  Clock,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BankInfo } from '@/types/models';
import { Modal } from '@/components/ui/modal';
import toast from 'react-hot-toast';

interface PaymentNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  className: string;
  studentCode: string;
  studentName: string;
  orderInfo: string;
  periodLabel?: string;
  bankInfo: BankInfo;
}

export function PaymentNotifyModal({
  isOpen,
  onClose,
  title,
  amount,
  className,
  studentCode,
  studentName,
  orderInfo,
  periodLabel,
  bankInfo
}: PaymentNotifyModalProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const nowFormatted = useMemo(() => {
    return format(new Date(), 'HH:mm - dd/MM/yyyy');
  }, [isOpen]);

  // Tạo mẫu tin nhắn Zalo chuẩn mực
  const messageTemplate = useMemo(() => {
    return `🌸 Kính gửi Thầy/Cô Chủ nhiệm lớp ${className},

Phụ huynh em: ${studentName} (Mã số: ${studentCode})
Em xin thông báo đã hoàn tất chuyển khoản:
📌 Khoản thu: ${title}${periodLabel ? ` (${periodLabel})` : ''}
💰 Số tiền: ${amount.toLocaleString('vi-VN')} đ
📝 Nội dung CK: ${orderInfo}
🏦 Chuyển đến: ${bankInfo.bankName || bankInfo.bankId} - STK: ${bankInfo.accountNumber} (${bankInfo.accountName})
⏰ Thời gian: ${nowFormatted}

Kính nhờ Thầy/Cô kiểm tra và cập nhật vào sổ theo dõi giúp em ạ. Em xin chân thành cảm ơn Thầy/Cô!`;
  }, [className, studentName, studentCode, title, periodLabel, amount, orderInfo, bankInfo, nowFormatted]);

  const handleCopyText = () => {
    try {
      navigator.clipboard.writeText(messageTemplate);
      setCopiedText(true);
      toast.success('Đã sao chép nội dung tin nhắn báo GV!');
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      toast.error('Không thể copy tự động. Vui lòng chọn text để copy.');
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    setImageLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        cacheBust: true,
        style: { transform: 'scale(1)' }
      });
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedImage(true);
      toast.success('Đã sao chép ảnh phiếu báo nộp tiền!');
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (err) {
      toast.error('Trình duyệt không hỗ trợ copy ảnh trực tiếp. Vui lòng bấm Tải ảnh.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setImageLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        cacheBust: true,
        style: { transform: 'scale(1)' }
      });
      const link = document.createElement('a');
      link.download = `Phieu-Bao-Nop-Tien-${studentCode}-${orderInfo.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Đã tải ảnh phiếu báo về thiết bị!');
    } catch (err) {
      toast.error('Không thể tạo ảnh phiếu báo. Vui lòng thử lại.');
    } finally {
      setImageLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Báo Đã Chuyển Khoản Cho Giáo Viên"
    >
      <div className="space-y-4 text-slate-900 text-xs sm:text-sm">
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
              activeTab === 'text'
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tin nhắn văn bản (Zalo)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
              activeTab === 'image'
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Ảnh Phiếu Báo Nộp Tiền (Sáng)</span>
          </button>
        </div>

        {/* Tab 1: Text Mode (Đa Màu Sắc) */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            {/* Khung trực quan đa sắc */}
            <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-emerald-50/90 border border-indigo-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <span className="text-base">🌸</span>
                <span>Kính gửi Thầy/Cô Chủ nhiệm lớp <span className="text-indigo-700 font-black">{className}</span></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100/80 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Học sinh</span>
                    <span className="font-bold text-slate-800">{studentName} ({studentCode})</span>
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100/80 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Khoản thu & Số tiền</span>
                    <span className="font-black text-emerald-700">{title} • {amount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100/80 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Nội dung chuyển khoản</span>
                    <span className="font-mono font-bold text-amber-800">{orderInfo}</span>
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100/80 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Ngân hàng thụ hưởng</span>
                    <span className="font-bold text-blue-900">{bankInfo.accountNumber} ({bankInfo.bankId})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Khung nội dung soạn sẵn */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text text-slate-800 shadow-inner max-h-[160px] overflow-y-auto">
              {messageTemplate}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyText}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 text-xs",
                  copiedText
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                )}
              >
                {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? 'Đã chép nội dung!' : 'Sao chép tin nhắn'}</span>
              </button>

              <a
                href="https://chat.zalo.me"
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <span>Mở Zalo nhắn GV</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Image Receipt Card (Nền Sáng Đa Sắc Rực Rỡ) */}
        {activeTab === 'image' && (
          <div className="space-y-3 flex flex-col items-center">
            {/* Thẻ đồ họa phiếu báo nộp tiền NỀN SÁNG ĐA SẮC */}
            <div className="overflow-x-auto w-full flex justify-center py-1">
              <div
                ref={cardRef}
                className="w-full max-w-[380px] bg-gradient-to-br from-indigo-50/90 via-white to-emerald-50/90 text-slate-900 rounded-3xl p-6 shadow-xl border-2 border-indigo-200/80 relative overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-200/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-200/30 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

                {/* Header */}
                <div className="text-center relative z-10 border-b border-indigo-100 pb-3.5">
                  <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs uppercase tracking-widest text-indigo-700 font-extrabold">
                    Trường THCS Trần Bội Cơ
                  </h3>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5 tracking-tight">
                    PHIẾU BÁO CHUYỂN KHOẢN
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{nowFormatted}</p>
                </div>

                {/* Body Details */}
                <div className="py-3.5 space-y-2.5 relative z-10 text-xs">
                  {/* Học sinh */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-indigo-100 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-[10px] text-indigo-600 uppercase font-bold">Học sinh</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">{studentName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Lớp / Mã số</div>
                      <div className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 mt-0.5 shadow-2xs">
                        {className} • {studentCode}
                      </div>
                    </div>
                  </div>

                  {/* Khoản thu & Số tiền */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/80 to-emerald-50 border border-emerald-200 shadow-sm space-y-1">
                    <div className="text-[10px] text-emerald-800 font-bold uppercase">Khoản thu nộp</div>
                    <div className="font-black text-sm text-slate-900">{title}</div>
                    {periodLabel && (
                      <div className="text-[11px] text-slate-600 font-medium">Kỳ áp dụng: <span className="font-bold text-slate-800">{periodLabel}</span></div>
                    )}
                    <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between mt-2">
                      <span className="text-[11px] text-emerald-900 font-bold">Số tiền đã chuyển</span>
                      <span className="text-lg font-black text-emerald-700">
                        {amount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết người nhận & Nội dung */}
                  <div className="space-y-1.5 text-[11px] text-slate-700 bg-white/90 p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Tài khoản nhận:</span>
                      <span className="font-bold text-slate-900">{bankInfo.accountNumber} ({bankInfo.bankId})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                      <span className="font-bold text-slate-900 uppercase">{bankInfo.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Nội dung CK:</span>
                      <span className="font-mono font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">{orderInfo}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Stamp */}
                <div className="text-center pt-2 border-t border-indigo-100 relative z-10">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black shadow-xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Kính nhờ Thầy/Cô đối soát & gạch nợ
                  </span>
                </div>
              </div>
            </div>

            {/* Actions for Image */}
            <div className="flex flex-wrap w-full gap-2 pt-1">
              <button
                type="button"
                disabled={imageLoading}
                onClick={handleCopyImage}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 text-xs",
                  copiedImage
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                )}
              >
                {imageLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiedImage ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedImage ? 'Đã sao chép ảnh!' : 'Copy ảnh'}</span>
              </button>

              <button
                type="button"
                disabled={imageLoading}
                onClick={handleDownloadImage}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải ảnh về</span>
              </button>

              <a
                href="https://chat.zalo.me"
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5 text-xs"
              >
                <span>Mở Zalo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
