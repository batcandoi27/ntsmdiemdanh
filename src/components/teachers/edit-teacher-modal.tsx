'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, CreditCard, Briefcase, School, Loader2, Save } from 'lucide-react';
import { Teacher } from '@/types/teacher';
import { updateTeacherAction } from '@/app/actions/teacher-actions';
import { toast } from 'react-hot-toast';

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
}

export default function EditTeacherModal({ isOpen, onClose, teacher }: EditTeacherModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We need to re-mount or reset state when teacher changes, 
  // but using defaultValue in the uncontrolled form is easier and performs well.
  
  if (!isOpen || !teacher) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const success = await updateTeacherAction(teacher.id, formData);
      
      if (success) {
        toast.success('Đã cập nhật thông tin thành công');
        onClose();
      } else {
        toast.error('Có lỗi xảy ra khi cập nhật');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-800">Chỉnh sửa Giáo viên</h2>
              <p className="text-xs text-gray-500 font-medium">Cập nhật thông tin cá nhân</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" /> Họ và tên *
              </label>
              <input 
                type="text" 
                name="full_name"
                defaultValue={teacher.full_name}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-900"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Chức danh
              </label>
              <input 
                type="text" 
                name="position"
                defaultValue={teacher.position}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Số CCCD
              </label>
              <input 
                type="text" 
                name="cccd"
                defaultValue={teacher.cccd}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-900 font-mono tracking-wide"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4" /> Điện thoại
              </label>
              <input 
                type="tel" 
                name="phone"
                defaultValue={teacher.phone}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-900 font-mono tracking-wide"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </label>
              <input 
                type="email" 
                name="email"
                defaultValue={teacher.email}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-900"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <School className="w-4 h-4" /> Đơn vị công tác (Nơi trả lương)
              </label>
              <input 
                type="text" 
                name="don_vi_cong_tac"
                defaultValue={teacher.extra_info?.don_vi_cong_tac || ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-900"
              />
            </div>
          </div>

          {/* Sau này có thể thêm tab/phần quản lý Nhóm ở đây nếu cần quản lý chi tiết */}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all border border-gray-100"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
