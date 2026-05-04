'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Camera, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { teacherCheckInAction } from '@/app/actions/event-actions';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function QRScanner({ teacherId }: { teacherId: string }) {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current.render(async (decodedText) => {
        // decodedText expected format: eventId:timestamp:nonce:signature
        await handleCheckIn(decodedText);
      }, (err) => {
        // ignore errors
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const handleCheckIn = async (token: string) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const eventId = token.split(':')[0];
      if (!eventId) throw new Error("Mã QR không đúng định dạng.");

      const res = await teacherCheckInAction(teacherId, eventId, token);
      setResult(res);
      if (res.success) {
        toast.success(res.message);
        setIsScanning(false);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi quét mã.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {!isScanning && !result && (
        <div className="text-center space-y-8 py-12">
          <div className="w-32 h-32 bg-orange-100 rounded-[40px] flex items-center justify-center text-orange-600 mx-auto shadow-2xl shadow-orange-200">
            <QrCode className="w-16 h-16" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">Điểm Danh Ngay</h2>
            <p className="text-gray-500 font-medium px-8">Vui lòng quét mã QR trên màn hình hội trường để ghi nhận sự hiện diện của bạn.</p>
          </div>
          <button 
            onClick={() => setIsScanning(true)}
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl font-black text-xl shadow-2xl shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Camera className="w-7 h-7" />
            BẮT ĐẦU QUÉT
          </button>
        </div>
      )}

      {isScanning && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[40px] border-4 border-orange-500 shadow-2xl bg-black aspect-square relative">
            <div id="qr-reader" className="w-full h-full" />
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-3 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span className="font-bold text-lg">Đang xác thực...</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsScanning(false)}
            className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold transition-all"
          >
            HỦY BỎ
          </button>
        </div>
      )}

      {result && (
        <div className={cn(
          "p-8 rounded-[40px] text-center space-y-6 animate-in zoom-in duration-300 shadow-2xl",
          result.success ? "bg-emerald-50 border-2 border-emerald-100 shadow-emerald-100" : "bg-red-50 border-2 border-red-100 shadow-red-100"
        )}>
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto",
            result.success ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          )}>
            {result.success ? <CheckCircle2 className="w-14 h-14" /> : <AlertCircle className="w-14 h-14" />}
          </div>
          <div>
            <h3 className={cn(
              "text-2xl font-black mb-2",
              result.success ? "text-emerald-800" : "text-red-800"
            )}>
              {result.success ? "THÀNH CÔNG!" : "THẤT BẠI!"}
            </h3>
            <p className={cn(
              "font-bold text-lg",
              result.success ? "text-emerald-600" : "text-red-600"
            )}>
              {result.message}
            </p>
          </div>
          <button 
            onClick={() => {setResult(null); setIsScanning(false);}}
            className="w-full py-4 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl font-bold shadow-sm transition-all"
          >
            QUAY LẠI
          </button>
        </div>
      )}
    </div>
  );
}
