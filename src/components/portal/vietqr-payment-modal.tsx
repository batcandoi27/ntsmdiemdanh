'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { BankInfo } from '@/types/models';
import { buildVietQRImageUrl, generateCanonicalOrderInfo } from '@/lib/vietqr-banks';
import {
  QrCode,
  Copy,
  Check,
  Download,
  AlertCircle,
  Building2,
  CreditCard,
  User,
  DollarSign,
  FileText,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PaymentNotifyModal } from './payment-notify-modal';

interface VietQRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string; // Tên khoản thu (VD: Quỹ lớp Tháng 9, Tiền BHYT)
  amount: number;
  className: string;
  studentCode: string;
  studentName: string;
  columnId: string;
  periodKey?: string;
  periodLabel?: string;
  bankInfo: BankInfo;
}

export function VietQRPaymentModal({
  isOpen,
  onClose,
  title,
  amount,
  className,
  studentCode,
  studentName,
  columnId,
  periodKey,
  periodLabel,
  bankInfo
}: VietQRPaymentModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Đếm ngược 10s để phụ huynh quét mã trước khi kích hoạt nút báo Zalo
  React.useEffect(() => {
    if (isOpen) {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  // Chuỗi nội dung đơn hàng chuẩn hóa
  const orderInfo = generateCanonicalOrderInfo(className, studentCode, columnId, periodKey);

  // Link ảnh mã VietQR Napas 247
  const qrUrl = buildVietQRImageUrl({
    bankId: bankInfo.bankId || 'MB',
    accountNumber: bankInfo.accountNumber,
    accountName: bankInfo.accountName,
    amount: amount,
    orderInfo: orderInfo,
    template: 'compact2'
  });

  const handleCopy = (text: string, fieldName: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadQR = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `VietQR_${orderInfo.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Đã tải ảnh mã QR về thiết bị!');
    } catch (err) {
      window.open(qrUrl, '_blank');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thanh Toán: ${title}`}
    >
      <div className="space-y-5 text-slate-900 text-xs sm:text-sm">
        {/* Banner Học sinh & Khoản thu */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
              {className} • {studentCode}
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              {studentName}
            </div>
            {periodLabel && (
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Kỳ áp dụng: <span className="font-bold text-slate-700">{periodLabel}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500 font-medium">Số tiền cần đóng</div>
            <div className="text-base sm:text-lg font-black text-indigo-600">
              {amount.toLocaleString('vi-VN')} đ
            </div>
          </div>
        </div>

        {/* Khung Mã QR VietQR Napas 247 */}
        <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white rounded-2xl border-2 border-dashed border-indigo-200 shadow-sm space-y-2.5">
          <div className="relative group">
            <img
              src={qrUrl}
              alt="Mã VietQR Thanh Toán"
              className="w-44 sm:w-52 h-auto max-w-full rounded-xl border border-slate-200 shadow-sm transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadQR}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tải ảnh QR về máy</span>
          </button>
        </div>

        {/* Bảng Chi Tiết Thông Tin Chuyển Khoản & Nút Copy */}
        <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          {/* Ngân hàng */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Ngân hàng:</span>
            </div>
            <div className="font-bold text-slate-900">{bankInfo.bankName || bankInfo.bankId}</div>
          </div>

          {/* Số tài khoản */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Số tài khoản:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-indigo-600 text-sm">{bankInfo.accountNumber}</span>
              <button
                type="button"
                onClick={() => handleCopy(bankInfo.accountNumber, 'acc', 'Số tài khoản')}
                className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 transition-colors"
                title="Sao chép STK"
              >
                {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Chủ tài khoản */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Chủ tài khoản:</span>
            </div>
            <div className="font-bold text-slate-900 uppercase">{bankInfo.accountName}</div>
          </div>

          {/* Số tiền */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <span>Số tiền:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-rose-600">{amount.toLocaleString('vi-VN')} đ</span>
              <button
                type="button"
                onClick={() => handleCopy(amount.toString(), 'amount', 'Số tiền')}
                className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 transition-colors"
                title="Sao chép số tiền"
              >
                {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Nội dung chuyển khoản */}
          <div className="flex items-start justify-between pt-1 border-t border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 font-medium pt-1">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Nội dung CK:</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 px-2 py-1 rounded-lg border border-amber-200 select-all">
                {orderInfo}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(orderInfo, 'info', 'Nội dung chuyển khoản')}
                className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 transition-colors shrink-0"
                title="Sao chép nội dung chuyển khoản"
              >
                {copiedField === 'info' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Cảnh báo quan trọng */}
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Lưu ý quan trọng:</span> Quý phụ huynh vui lòng quét mã QR hoặc giữ chính xác{' '}
            <span className="font-bold underline">Nội dung chuyển khoản</span> để hệ thống tự động đối soát và gạch nợ tức thì.
          </div>
        </div>

        {/* Footer Actions: Đã hiểu & Đóng + Báo GV đã nộp (Đếm ngược 10s) */}
        <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
          <div className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl text-center font-medium">
            💡 Quét mã xong, bấm <span className="font-bold text-teal-900 underline">"Báo GV đã nộp"</span> để gửi Zalo cho thầy/cô.
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => setShowNotifyModal(true)}
              className={cn(
                "w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm",
                countdown > 0
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-emerald-500/20 active:scale-95 animate-pulse"
              )}
              title={countdown > 0 ? `Vui lòng quét mã QR trước (${countdown}s)` : "Soạn tin nhắn / gửi ảnh báo GVCN qua Zalo"}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{countdown > 0 ? `Báo GV (${countdown}s)` : 'Báo GV đã nộp'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors text-center"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modal: Báo nộp tiền cho GVCN (Text + Ảnh Zalo) */}
      <PaymentNotifyModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        title={title}
        amount={amount}
        className={className}
        studentCode={studentCode}
        studentName={studentName}
        orderInfo={orderInfo}
        periodLabel={periodLabel}
        bankInfo={bankInfo}
      />
    </Modal>
  );
}
