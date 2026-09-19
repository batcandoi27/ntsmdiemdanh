'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { UserRole, ROLE_DISPLAY } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Check, 
  ShieldAlert, 
  Sparkles, 
  School, 
  Compass, 
  ArrowRight,
  Eye,
  RotateCcw,
  BookOpen,
  Users,
  Gamepad2,
  HeartHandshake
} from 'lucide-react';
import toast from 'react-hot-toast';

interface RoleOption {
  role: UserRole | 'student_portal' | 'parent_portal';
  label: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  desc: string;
  needsClass: boolean;
  defaultPath?: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'admin',
    label: 'Quản trị viên',
    badge: '👑',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    desc: 'Quyền IT cao nhất, toàn quyền cấu hình và quản trị hệ thống',
    needsClass: false,
    defaultPath: '/'
  },
  {
    role: 'principal',
    label: 'Hiệu trưởng / BGH',
    badge: '⭐',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    desc: 'Xem báo cáo thống kê, chuyên cần toàn trường và quản lý vĩ mô',
    needsClass: false,
    defaultPath: '/reports'
  },
  {
    role: 'supervisor',
    label: 'Giám thị',
    badge: '👁️',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    desc: 'Điểm danh nề nếp, sổ theo dõi tác nghiệp và kiểm tra chuyên cần',
    needsClass: false,
    defaultPath: '/monitor'
  },
  {
    role: 'teacher',
    label: 'Giáo viên chủ nhiệm (GVCN)',
    badge: '👨‍🏫',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    desc: 'Quản lý lớp chủ nhiệm, trợ lý SYLL, xuất Word & chuyên cần lớp',
    needsClass: true,
    defaultPath: '/homeroom/students'
  },
  {
    role: 'gvbm',
    label: 'Giáo viên bộ môn',
    badge: '📘',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    desc: 'Giao diện phân công giảng dạy và điểm danh theo tiết',
    needsClass: true,
    defaultPath: '/quick-attendance'
  },
  {
    role: 'class_monitor',
    label: 'Ban Cán Sự Lớp',
    badge: '📋',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    desc: 'Học sinh lớp trưởng/cán sự điểm danh sĩ số lớp đầu giờ (30 phút)',
    needsClass: true,
    defaultPath: '/quick-attendance'
  },
  {
    role: 'student_portal',
    label: 'Cổng Học Sinh',
    badge: '🎮',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    desc: 'Thế giới 2.5D, Thú cưng SVG, Làng học tập, Nhiệm vụ & Phi thuyền',
    needsClass: false,
    defaultPath: '/student'
  },
  {
    role: 'parent_portal',
    label: 'Cổng Phụ Huynh',
    badge: '👨‍👩‍👧',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    desc: 'Tra cứu chuyên cần học sinh, Sơ Yếu Lý Lịch & liên lạc nhà trường',
    needsClass: false,
    defaultPath: '/portal'
  }
];

interface ClassItem {
  id: string;
  name: string;
  grade: number;
}

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSwitcherModal({ isOpen, onClose }: RoleSwitcherModalProps) {
  const router = useRouter();
  const { 
    realAppUser, 
    effectiveRole, 
    effectiveClassId, 
    isImpersonating, 
    startImpersonation, 
    stopImpersonation 
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole | 'student_portal' | 'parent_portal'>(
    isImpersonating ? effectiveRole : 'admin'
  );
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(effectiveClassId || '');
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(isImpersonating ? effectiveRole : 'admin');
      if (effectiveClassId) {
        setSelectedClassId(effectiveClassId);
      }
    }
  }, [isOpen, isImpersonating, effectiveRole, effectiveClassId]);

  // Fetch classes from Supabase
  useEffect(() => {
    async function loadActiveClasses() {
      setLoadingClasses(true);
      try {
        const { data: activeYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_active', true)
          .maybeSingle();

        let query = supabase
          .from('classes')
          .select('id, name, grade')
          .order('name');

        if (activeYear?.id) {
          query = query.eq('year_id', activeYear.id);
        }

        const { data } = await query;
        if (data && data.length > 0) {
          setClasses(data);
          if (!selectedClassId) {
            // Default to 7A10 or first class
            const defaultCls = data.find(c => c.name === '7A10') || data[0];
            setSelectedClassId(defaultCls.id);
          }
        }
      } catch (e) {
        console.error('Lỗi tải danh sách lớp:', e);
      } finally {
        setLoadingClasses(false);
      }
    }

    if (isOpen) {
      loadActiveClasses();
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentOption = ROLE_OPTIONS.find(o => o.role === selectedRole);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleApply = () => {
    if (selectedRole === 'admin') {
      stopImpersonation();
      toast.success('Đã trở về toàn quyền Quản trị viên (Admin) 👑');
      onClose();
      return;
    }

    // Portal redirects
    if (selectedRole === 'student_portal') {
      onClose();
      router.push('/student');
      toast.success('Đang chuyển đến Cổng Học Sinh 🎮');
      return;
    }

    if (selectedRole === 'parent_portal') {
      onClose();
      router.push('/portal');
      toast.success('Đang chuyển đến Cổng Phụ Huynh 👨‍👩‍👧');
      return;
    }

    // Role impersonation
    const roleTarget = selectedRole as UserRole;
    const clsName = selectedClass?.name;
    startImpersonation(roleTarget, selectedClassId, clsName);

    const roleName = currentOption?.label || roleTarget;
    const classDetail = clsName ? ` · Lớp ${clsName}` : '';
    toast.success(`Đang kiểm tra giao diện: ${roleName}${classDetail}`, {
      icon: currentOption?.badge || '👁️',
      duration: 4000
    });

    onClose();

    if (autoNavigate && currentOption?.defaultPath) {
      router.push(currentOption.defaultPath);
    }
  };

  const handleResetToAdmin = () => {
    stopImpersonation();
    toast.success('Đã trở về toàn quyền Quản trị viên (Admin) 👑');
    onClose();
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shadow-inner">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Chuyển Đổi Góc Nhìn Kiểm Tra Giao Diện
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Admin Tool
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Tài khoản: <strong className="text-white">{realAppUser?.displayName || 'thcstbc'}</strong> (Quản trị viên)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Currently Impersonating Notice */}
          {isImpersonating && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 text-amber-900 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">👀</span>
                <div>
                  <span className="font-bold">Đang xem với vai trò: </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 font-bold text-amber-950">
                    {ROLE_DISPLAY[effectiveRole]?.label || effectiveRole}
                  </span>
                  {selectedClass && (
                    <span className="ml-1 font-semibold text-amber-800">
                      (Lớp {selectedClass.name})
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleResetToAdmin}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl font-bold text-xs hover:bg-amber-100 transition shadow-2xs flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                Về Admin ngay
              </button>
            </div>
          )}

          {/* Section: Select Role */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Chọn vai trò muốn kiểm tra giao diện
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Click để chọn
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = selectedRole === opt.role;
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setSelectedRole(opt.role)}
                    className={`text-left p-3 rounded-2xl border transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? `ring-2 ring-indigo-500 border-indigo-400 shadow-md ${opt.bgColor}`
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{opt.badge}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Class Scope Selection (If role requires class) */}
          {currentOption?.needsClass && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <School size={15} className="text-indigo-600" />
                  <span>2. Chọn lớp phụ trách (Phạm vi dữ liệu)</span>
                </label>
                <span className="text-[11px] text-indigo-600 font-semibold">
                  {classes.length} lớp học (2026-2027)
                </span>
              </div>

              {loadingClasses ? (
                <div className="text-xs text-slate-400 italic py-2">Đang tải danh sách lớp...</div>
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp {cls.name} (Khối {cls.grade})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-500 italic leading-normal">
                * Khi chọn lớp, toàn bộ dữ liệu điểm danh, danh sách học sinh và báo cáo sẽ tự động lọc theo đúng lớp này.
              </p>
            </div>
          )}

          {/* Safe Mode Assurance */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-900">
            <span className="text-emerald-600 text-sm mt-0.5">🔒</span>
            <div className="text-xs leading-relaxed">
              <span className="font-bold">Chế độ Kiểm tra An Toàn (Read-Only Simulation):</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Dữ liệu thực tế của trường được bảo vệ 100%. Quản trị viên có thể kiểm tra toàn bộ luồng hiển thị giao diện mà không lo vô tình xóa sửa dữ liệu của thầy cô và học sinh.
              </p>
            </div>
          </div>

          {/* Auto Navigation Option */}
          {currentOption?.defaultPath && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={autoNavigate}
                onChange={(e) => setAutoNavigate(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Tự động chuyển ngay đến màn hình chính của vai trò này ({currentOption.defaultPath})</span>
            </label>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Phím tắt: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Ctrl + Shift + A</kbd> để thoát nhanh
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
            >
              Hủy bỏ
            </button>

            {isImpersonating && selectedRole !== 'admin' && (
              <button
                type="button"
                onClick={handleResetToAdmin}
                className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition flex items-center gap-1.5"
              >
                <span>👑</span>
                <span>Về Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Bắt Đầu Kiểm Tra</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
