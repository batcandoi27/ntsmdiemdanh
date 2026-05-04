'use client';

import { useAuth } from '@/context/auth-context';
import QRScanner from '@/components/events/qr-scanner';
import { ChevronLeft, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function CheckInPage() {
  const { appUser, loading } = useAuth();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(true);

  useEffect(() => {
    async function findTeacher() {
      if (appUser?.uid) {
        // Tìm bản ghi teacher tương ứng với profile_id
        const { data, error } = await supabase
          .from('teachers')
          .select('id')
          .eq('profile_id', appUser.uid)
          .maybeSingle();

        if (data) setTeacherId(data.id);
        setIsSearching(false);
      } else if (!loading) {
        setIsSearching(false);
      }
    }
    findTeacher();
  }, [appUser, loading]);

  if (loading || isSearching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto" />
          <p className="font-bold text-gray-500">Đang kiểm tra thông tin nhân sự...</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <LogIn className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-800">Yêu cầu đăng nhập</h2>
          <p className="text-gray-500 font-medium">Vui lòng đăng nhập vào hệ thống để thực hiện điểm danh giáo viên.</p>
          <Link 
            href="/login" 
            className="block w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
          >
            ĐĂNG NHẬP NGAY
          </Link>
        </div>
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-800">Chưa có hồ sơ</h2>
          <p className="text-gray-500 font-medium">
            Tài khoản của bạn chưa được liên kết với hồ sơ giáo viên nào. Vui lòng liên hệ Admin để cập nhật.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Quay lại Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md flex items-center justify-between mb-12">
        <Link href="/" className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-400" />
        </Link>
        <div className="text-right">
          <p className="text-xs font-black text-orange-500 uppercase tracking-widest">Đang đăng nhập</p>
          <p className="font-bold text-gray-800">{appUser.displayName}</p>
        </div>
      </div>

      <QRScanner teacherId={teacherId} />

      <p className="mt-12 text-center text-xs text-gray-400 font-medium px-10">
        Giữ camera ổn định và hướng về mã QR để điểm danh. Hệ thống sẽ tự động xác nhận sau khi quét thành công.
      </p>
    </div>
  );
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
