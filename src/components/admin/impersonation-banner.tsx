'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ROLE_DISPLAY } from '@/types/models';
import { RotateCcw, Shuffle, ShieldCheck, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { RoleSwitcherModal } from './role-switcher-modal';

export function ImpersonationBanner() {
  const router = useRouter();
  const { 
    realAppUser, 
    effectiveRole, 
    effectiveClassName, 
    isImpersonating, 
    stopImpersonation 
  } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Global keyboard shortcut: Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isImpersonating) {
          stopImpersonation();
          toast.success('Đã trở về toàn quyền Quản trị viên (Admin) 👑');
          router.push('/');
        } else if (realAppUser?.role === 'admin') {
          setIsModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImpersonating, realAppUser, stopImpersonation, router]);

  if (!isImpersonating || realAppUser?.role !== 'admin') {
    return (
      <RoleSwitcherModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    );
  }

  const roleInfo = ROLE_DISPLAY[effectiveRole];
  const roleLabel = roleInfo?.label || effectiveRole;
  const roleBadge = roleInfo?.badge || '👁️';

  const handleExit = () => {
    stopImpersonation();
    toast.success('Đã trở về toàn quyền Quản trị viên (Admin) 👑');
    router.push('/');
  };

  return (
    <>
      <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-4 py-2 shadow-md flex items-center justify-between gap-3 text-xs z-50 shrink-0 select-none border-b border-amber-600/30">
        
        {/* Left Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Pulsing Beacon */}
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-xs"></span>
          </span>

          <div className="flex items-center gap-1.5 font-bold truncate text-[11px] sm:text-xs">
            <span className="uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/15 text-slate-950 font-black text-[10px]">
              Chế độ kiểm tra
            </span>
            <span className="hidden sm:inline text-black/50">•</span>
            <span className="flex items-center gap-1">
              <span className="text-base leading-none">{roleBadge}</span>
              <strong className="text-slate-950 font-black">{roleLabel}</strong>
            </span>
            {effectiveClassName && (
              <span className="px-1.5 py-0.2 rounded-md bg-white/40 font-black text-slate-950">
                Lớp {effectiveClassName}
              </span>
            )}
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900/80 ml-1">
              <ShieldCheck size={13} className="text-slate-950" />
              <span>Chỉ xem (Read-Only)</span>
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Change Role Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px] active:scale-95"
            title="Đổi sang vai trò khác"
          >
            <Shuffle size={12} />
            <span className="hidden sm:inline">Đổi vai trò</span>
          </button>

          {/* Return to Admin Button */}
          <button
            type="button"
            onClick={handleExit}
            className="px-3 py-1 bg-slate-950 text-amber-400 hover:bg-slate-900 font-extrabold rounded-lg transition-all shadow-xs flex items-center gap-1.5 text-[11px] active:scale-95 hover:ring-2 hover:ring-white/40"
            title="Nhấn để thoát ngay lập tức về toàn quyền Admin (Ctrl + Shift + A)"
          >
            <span>👑</span>
            <span>Về Admin</span>
            <kbd className="hidden lg:inline text-[9px] px-1 py-0.2 rounded-sm bg-white/20 text-white font-mono font-normal">
              Ctrl+Shift+A
            </kbd>
          </button>
        </div>
      </div>

      {/* Role Switcher Modal */}
      <RoleSwitcherModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
