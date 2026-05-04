'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, RefreshCw, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { generateQRTokenAction } from '@/app/actions/event-actions';
import { cn } from '@/lib/utils';

interface QRDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    qr_secret?: string;
  };
}

export default function QRDisplayModal({ isOpen, onClose, event }: QRDisplayModalProps) {
  const [token, setToken] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    if (!event.qr_secret) {
      setError('Sự kiện này chưa được thiết lập mã bảo mật (Secret Key).');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const newToken = await generateQRTokenAction(event.id, event.qr_secret);
      setToken(newToken);
      setTimeLeft(180); // Reset timer
    } catch (err) {
      setError('Không thể tạo mã QR mới. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [event.id, event.qr_secret]);

  useEffect(() => {
    if (isOpen) {
      refreshToken();
    }
  }, [isOpen, refreshToken]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) {
      if (timeLeft <= 0) refreshToken();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, refreshToken]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-gray-800 leading-tight">Mã QR Điểm Danh</h2>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{event.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-colors shadow-sm">
            <X className="w-7 h-7 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-10 flex flex-col items-center text-center">
          {error ? (
            <div className="py-12 px-6 bg-red-50 rounded-3xl border-2 border-dashed border-red-100 max-w-sm">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-800 font-bold text-lg">{error}</p>
              <button 
                onClick={refreshToken}
                className="mt-6 px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <div className="relative group">
                <div className={cn(
                  "p-8 bg-white rounded-[50px] shadow-2xl border-4 border-orange-50 transition-all duration-500",
                  isLoading ? "opacity-30 scale-95 blur-sm" : "opacity-100 scale-100"
                )}>
                  {token && (
                    <QRCodeSVG 
                      value={token} 
                      size={320}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>
                
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-16 h-16 text-orange-500 animate-spin" />
                  </div>
                )}
              </div>

              <div className="mt-10 space-y-4 w-full max-w-sm">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 font-bold uppercase tracking-wider text-xs">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Làm mới sau
                  </div>
                  <div className={cn(
                    "font-black text-2xl tracking-tighter",
                    timeLeft < 30 ? "text-red-500 animate-pulse" : "text-gray-800"
                  )}>
                    {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                  </div>
                </div>

                <p className="text-gray-400 text-sm font-medium leading-relaxed">
                  Yêu cầu giáo viên sử dụng ứng dụng cá nhân để quét mã này. Mã sẽ tự động thay đổi để đảm bảo tính minh bạch.
                </p>

                <button 
                  onClick={refreshToken}
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl font-black text-orange-600 bg-orange-50 hover:bg-orange-100 transition-all flex items-center justify-center gap-2 border-2 border-orange-100"
                >
                  <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                  LÀM MỚI MÃ NGAY
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-900 p-6 text-center">
           <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
             Hệ thống điểm danh giáo viên thông minh v2.0
           </p>
        </div>
      </div>
    </div>
  );
}
