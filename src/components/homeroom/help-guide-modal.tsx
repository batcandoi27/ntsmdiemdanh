"use client";

import React, { useEffect } from 'react';
import { BookOpen, X, CheckCircle2, School, Users, Award, FileText, Printer, Lock } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = [
    {
      icon: School,
      title: '1. Bảng Tổng Quan Lớp',
      desc: 'Theo dõi nhanh 4 chỉ số chuyên cần hôm nay (Sĩ số, Có mặt, Đi muộn, Vắng). Danh sách "Cần theo dõi & xử lý" tự động cảnh báo học sinh có sự việc tồn đọng.'
    },
    {
      icon: Users,
      title: '2. Danh Sách & Timeline Học Sinh',
      desc: 'Xem hồ sơ chi tiết từng em: Tỷ lệ chuyên cần %, dòng thời gian nề nếp, điểm cộng/trừ và kế hoạch hỗ trợ. Nút Xuất Phiếu liên lạc Word 1-chạm.'
    },
    {
      icon: Award,
      title: '3. Cơ Cấu Lớp & Sơ Đồ Bàn Ghế',
      desc: 'Quản lý Ban cán sự lớp, phân chia 4 Tổ và Sơ đồ chỗ ngồi tương tác 5 dãy x 2 cột (bàn đôi). Kéo chọn và đổi chỗ học sinh dễ dàng.'
    },
    {
      icon: FileText,
      title: '4. Sự Việc, Nề Nếp & Khen Thưởng',
      desc: 'Ghi nhận việc tốt (+2đ, +5đ...) hoặc vi phạm nề nếp (-1đ, -2đ...). Sử dụng nút "Gợi ý tự điền mẫu" để nhập nhanh sự việc chỉ với 1 click.'
    },
    {
      icon: BookOpen,
      title: '5. Sổ Chủ Nhiệm Số & Kế Hoạch Năm',
      desc: 'Số hóa sổ chủ nhiệm: Thuận lợi, khó khăn, chỉ tiêu học lực, hạnh kiểm và biện pháp. Hệ thống có sẵn văn bản mẫu chuẩn THCS.'
    },
    {
      icon: Printer,
      title: '6. Trung Tâm In Ấn & Biểu Mẫu',
      desc: 'Cung cấp 5 biểu mẫu chuẩn: Danh sách lớp, Sổ chủ nhiệm, Phiếu liên lạc, Biên bản sự việc, Biên bản họp PH. Hỗ trợ Live Preview khổ A4 và Tải file Word (.DOCX) về máy.'
    },
    {
      icon: Lock,
      title: '7. Cổng Tra Cứu Phụ Huynh (/portal)',
      desc: 'Phụ huynh tra cứu bằng cách chọn Lớp + Mã HS/CCCD + Mã PIN lớp (mặc định 123456 hoặc do GVCN đổi trong phần cấu hình lớp).'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Hướng Dẫn Sử Dụng Trợ Lý GVCN</h2>
              <p className="text-xs text-slate-500">Cẩm nang vận hành 7 phân hệ nghiệp vụ chủ nhiệm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{sec.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            Đã hiểu & Đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
}
