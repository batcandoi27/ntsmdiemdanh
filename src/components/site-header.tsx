'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  School,
  BookOpen,
  BarChart3,
  Menu,
  X,
  Home,
  Smartphone,
  Tablet,
  Monitor,
  Settings,
  Zap,
  LogOut,
  Users,
  HeartHandshake,
  Gamepad2,
  ChevronDown,
  Sparkles,
  Layers,
  CalendarCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ROLE_DISPLAY, UserRole } from '@/types/models';
import { useState, useRef, useEffect } from 'react';
import { useFeatureFlags } from '@/context/feature-flags-context';
import { usePrivacy } from '@/context/privacy-context';
import { useViewMode } from '@/context/view-mode-context';
import { useChat } from '@/context/chat-context';

interface NavLinkItem {
  href: string;
  label: string;
  desc?: string;
  icon: any;
  roles: UserRole[];
  badge?: string;
  flagKey?: string;
}

interface NavGroupItem {
  key: string;
  label: string;
  icon: any;
  roles: UserRole[];
  children: NavLinkItem[];
}

type NavEntry = NavLinkItem | NavGroupItem;

const navigationStructure: NavEntry[] = [
  // 1. Trang Chủ độc lập
  {
    href: '/',
    label: 'Trang Chủ',
    icon: Home,
    roles: ['admin', 'principal', 'supervisor', 'teacher', 'class_monitor'] as UserRole[]
  },

  // 2. GOM NHÓM: CỔNG KẾT NỐI (Phụ Huynh, Học Sinh, Trợ Lý GVCN)
  {
    key: 'portals',
    label: 'Cổng Kết Nối',
    icon: Users,
    roles: ['admin', 'principal', 'supervisor', 'teacher', 'class_monitor'] as UserRole[],
    children: [
      {
        href: '/portal',
        label: 'Cổng Phụ Huynh',
        desc: 'Tra cứu chuyên cần, nộp Sơ Yếu Lý Lịch & liên lạc',
        icon: HeartHandshake,
        roles: ['admin', 'principal', 'supervisor', 'teacher', 'class_monitor'] as UserRole[],
        badge: 'Gia đình',
        flagKey: 'parentPortal'
      },
      {
        href: '/student',
        label: 'Cổng Học Sinh',
        desc: 'Thú cưng SVG, Làng 2.5D, Nhiệm vụ & Phi thuyền Co-op',
        icon: Gamepad2,
        roles: ['admin', 'principal', 'supervisor', 'teacher', 'class_monitor'] as UserRole[],
        badge: '2.5D World',
        flagKey: 'studentPortal'
      },
      {
        href: '/homeroom/students',
        label: 'Trợ Lý GVCN & SYLL',
        desc: 'Quản lý học sinh, duyệt hồ sơ lý lịch & in ấn xuất Word',
        icon: Users,
        roles: ['admin', 'principal', 'teacher'] as UserRole[],
        badge: 'Chủ nhiệm',
        flagKey: 'homeroomAssistant'
      }
    ]
  },

  // 3. GOM NHÓM: NGHIỆP VỤ ĐIỂM DANH (Điểm danh nhanh, Sổ theo dõi, Quản lý lớp)
  {
    key: 'attendance_ops',
    label: 'Nghiệp Vụ',
    icon: Zap,
    roles: ['admin', 'principal', 'supervisor', 'teacher', 'class_monitor'] as UserRole[],
    children: [
      {
        href: '/quick-attendance',
        label: 'Điểm Danh Nhanh',
        desc: 'Quét QR & điểm danh sĩ số theo tiết/buổi',
        icon: Zap,
        roles: ['admin', 'supervisor', 'teacher', 'class_monitor'] as UserRole[],
        flagKey: 'quickAttendance'
      },
      {
        href: '/monitor',
        label: 'Sổ Theo Dõi',
        desc: 'Nhật ký nề nếp, chuyên cần và ghi chú tác nghiệp',
        icon: BookOpen,
        roles: ['admin', 'principal', 'supervisor', 'teacher'] as UserRole[],
        flagKey: 'monitor'
      },
      {
        href: '/classes',
        label: 'Quản Lý Lớp Học',
        desc: 'Danh sách các lớp và sơ đồ phân công giảng dạy',
        icon: School,
        roles: ['admin', 'principal', 'supervisor', 'teacher'] as UserRole[]
      }
    ]
  },

  // 4. Báo Cáo
  {
    href: '/reports',
    label: 'Báo Cáo',
    icon: BarChart3,
    roles: ['admin', 'principal', 'supervisor', 'teacher'] as UserRole[],
    flagKey: 'reports'
  },

  // 5. Cài Đặt Hệ Thống
  {
    href: '/settings',
    label: 'Cài Đặt',
    icon: Settings,
    roles: ['admin', 'principal'] as UserRole[]
  }
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedMobileGroups, setExpandedMobileGroups] = useState<Record<string, boolean>>({
    portals: true,
    attendance_ops: true
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { viewDevice, setViewDevice } = useViewMode();
  const { appUser, signOut } = useAuth();
  const { systemUnreadCount } = useChat();
  const { flags } = useFeatureFlags();
  const { isPrivacyMode, togglePrivacyMode, maskSchoolName, maskUserName } = usePrivacy();

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lọc navigation theo role người dùng và trạng thái Feature Flags
  const userRole = appUser?.role || 'admin';
  const roleInfo = appUser ? ROLE_DISPLAY[appUser.role] : null;

  const isFlagAllowed = (item: NavLinkItem) => {
    if (!item.flagKey) return true;
    return flags[item.flagKey] ?? true;
  };

  const filteredNav = navigationStructure
    .filter(entry => entry.roles.includes(userRole))
    .filter(entry => {
      if (!('children' in entry)) {
        return isFlagAllowed(entry);
      }
      return true;
    })
    .map(entry => {
      if ('children' in entry) {
        return {
          ...entry,
          children: entry.children
            .filter(child => child.roles.includes(userRole))
            .filter(child => isFlagAllowed(child))
        };
      }
      return entry;
    })
    .filter(entry => !('children' in entry) || (entry.children && entry.children.length > 0));

  return (
    <header className="bg-surface-card border-b border-border-subtle sticky top-0 z-50 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Logo Area */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="bg-primary-soft text-primary p-2.5 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0 border border-primary/20 shadow-xs">
                <School size={24} />
              </div>
              <div className="flex flex-col whitespace-nowrap shrink-0">
                <span className="text-base sm:text-lg font-bold text-text-primary tracking-tight leading-tight group-hover:text-primary transition-colors whitespace-nowrap">
                  {maskSchoolName('THCS TRẦN BỘI CƠ')}
                </span>
                <span className="text-[10px] text-text-tertiary font-semibold tracking-wider uppercase mt-0.5 whitespace-nowrap">
                  Hệ Thống Điểm Danh & Sổ Chủ Nhiệm
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation (Gom nhóm Sub-menu Tinh Gọn) */}
          <nav ref={dropdownRef} className="hidden lg:flex items-center space-x-1 flex-1 px-4">
            {filteredNav.map((entry) => {
              // 1. Dạng Menu Group có Sub-menu Dropdown
              if ('children' in entry) {
                const isGroupActive = entry.children.some(child =>
                  pathname === child.href || (child.href !== '/' && pathname.startsWith(child.href))
                );
                const isOpen = openDropdown === entry.key;

                return (
                  <div
                    key={entry.key}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(entry.key)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(isOpen ? null : entry.key)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap select-none",
                        isGroupActive
                          ? "bg-primary-soft text-primary border border-primary/20 shadow-xs"
                          : isOpen
                          ? "bg-surface-hover text-text-primary"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      )}
                    >
                      <entry.icon size={17} />
                      <span>{entry.label}</span>
                      <ChevronDown
                        size={14}
                        className={cn("transition-transform duration-200 text-text-tertiary", isOpen && "rotate-180 text-primary")}
                      />
                    </button>

                    {/* Sub-menu Dropdown */}
                    {isOpen && (
                      <div className="absolute left-0 mt-1.5 w-64 bg-surface-card rounded-2xl shadow-dropdown border border-border-subtle p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                        <div className="space-y-1">
                          {entry.children.map((child) => {
                            const isChildActive = pathname === child.href || (child.href !== '/' && pathname.startsWith(child.href));
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setOpenDropdown(null)}
                                className={cn(
                                  "flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 group select-none",
                                  isChildActive
                                    ? "bg-primary-soft text-primary font-bold shadow-xs border border-primary/20"
                                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                                )}
                              >
                                <div className={cn(
                                  "p-1.5 rounded-lg shrink-0 mt-0.5",
                                  isChildActive ? "bg-primary text-white" : "bg-surface-section text-text-tertiary group-hover:text-primary group-hover:bg-primary-soft"
                                )}>
                                  <child.icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs truncate">{child.label}</span>
                                    {child.badge && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 text-indigo-700">
                                        {child.badge}
                                      </span>
                                    )}
                                  </div>
                                  {child.desc && (
                                    <p className="text-[11px] text-slate-400 group-hover:text-slate-500 line-clamp-1 mt-0.5">
                                      {child.desc}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // 2. Dạng Single Nav Link
              const isActive = pathname === entry.href || (entry.href !== '/' && pathname.startsWith(entry.href));
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap select-none",
                    isActive
                      ? "bg-primary-soft text-primary border border-primary/20 shadow-xs"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  <entry.icon size={17} />
                  <span>{entry.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side: Demo Privacy Toggle + View Device + User Info + Mobile Toggle */}
          <div className="flex items-center gap-2 ml-auto">

            {/* Minimalist Privacy Toggle Button (Icon Only) */}
            <button
              type="button"
              onClick={togglePrivacyMode}
              className={cn(
                "p-2 rounded-xl transition-all shadow-xs border select-none",
                isPrivacyMode 
                  ? "bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-300 shadow-amber-500/20" 
                  : "bg-surface-section text-text-tertiary border-border-subtle hover:text-text-primary hover:bg-surface-hover"
              )}
              title={isPrivacyMode ? "Đang ẩn danh (Bấm để hiện)" : "Bấm để ẩn danh"}
            >
              {isPrivacyMode ? <EyeOff size={17} className="text-slate-950" /> : <Eye size={17} />}
            </button>

            {/* View Mode Toggles */}
            <div className="hidden lg:flex items-center gap-1 bg-surface-section p-1 rounded-xl border border-border-subtle shadow-xs mr-2">
              <button
                onClick={() => setViewDevice('mobile')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-150",
                  viewDevice === 'mobile' ? "bg-surface-card text-primary shadow-xs border border-border-subtle" : "text-text-tertiary hover:text-text-primary hover:bg-surface-card/60"
                )}
                title="Giao diện điện thoại"
              >
                <Smartphone size={17} />
              </button>
              <button
                onClick={() => setViewDevice('tablet')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-150",
                  viewDevice === 'tablet' ? "bg-surface-card text-primary shadow-xs border border-border-subtle" : "text-text-tertiary hover:text-text-primary hover:bg-surface-card/60"
                )}
                title="Giao diện máy tính bảng"
              >
                <Tablet size={17} />
              </button>
              <button
                onClick={() => setViewDevice('desktop')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-150",
                  viewDevice === 'desktop' ? "bg-surface-card text-primary shadow-xs border border-border-subtle" : "text-text-tertiary hover:text-text-primary hover:bg-surface-card/60"
                )}
                title="Giao diện máy tính"
              >
                <Monitor size={17} />
              </button>
            </div>

            {/* User Info (Desktop) */}
            {appUser && (
              <div className="hidden lg:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-section rounded-xl border border-border-subtle shadow-xs">
                  <span className="text-base">{roleInfo?.badge}</span>
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-bold text-text-primary truncate max-w-[120px]">
                      {maskUserName(appUser.displayName || appUser.studentCode || appUser.email || 'User')}
                    </span>
                    <span className={cn('text-[10px] font-semibold mt-0.5', roleInfo?.color)}>
                      {roleInfo?.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-text-tertiary hover:text-danger hover:bg-rose-50 rounded-xl transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut size={17} />
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-text-secondary hover:bg-surface-hover transition-colors"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border-subtle bg-surface-card absolute w-full shadow-dropdown animate-in slide-in-from-top-2 z-50 max-h-[85vh] overflow-y-auto">
          <div className="px-4 pt-3 pb-6 space-y-2">
            
            {/* View Device Switcher */}
            <div className="flex gap-2 justify-center p-2 mb-3 bg-surface-section rounded-xl border border-border-subtle">
              <button onClick={() => setViewDevice('mobile')} className={cn("p-2 rounded-lg transition-all", viewDevice === 'mobile' ? "bg-surface-card shadow-xs text-primary font-bold border border-border-subtle" : "text-text-tertiary")}><Smartphone size={18} /></button>
              <button onClick={() => setViewDevice('tablet')} className={cn("p-2 rounded-lg transition-all", viewDevice === 'tablet' ? "bg-surface-card shadow-xs text-primary font-bold border border-border-subtle" : "text-text-tertiary")}><Tablet size={18} /></button>
              <button onClick={() => setViewDevice('desktop')} className={cn("p-2 rounded-lg transition-all", viewDevice === 'desktop' ? "bg-surface-card shadow-xs text-primary font-bold border border-border-subtle" : "text-text-tertiary")}><Monitor size={18} /></button>
            </div>

            {filteredNav.map((entry) => {
              // Grouped Mobile Accordion
              if ('children' in entry) {
                const isGroupExpanded = expandedMobileGroups[entry.key] ?? true;
                const isGroupActive = entry.children.some(child => pathname === child.href || (child.href !== '/' && pathname.startsWith(child.href)));

                return (
                  <div key={entry.key} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedMobileGroups(prev => ({ ...prev, [entry.key]: !isGroupExpanded }))}
                      className={cn(
                        "w-full px-4 py-3 font-bold text-sm flex items-center justify-between transition",
                        isGroupActive ? "text-primary bg-primary-soft/50" : "text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <entry.icon size={18} />
                        <span>{entry.label}</span>
                      </div>
                      <ChevronDown size={16} className={cn("transition-transform duration-200", isGroupExpanded && "rotate-180")} />
                    </button>

                    {isGroupExpanded && (
                      <div className="p-2 pt-0 space-y-1 bg-white border-t border-slate-200/60">
                        {entry.children.map((child) => {
                          const isChildActive = pathname === child.href || (child.href !== '/' && pathname.startsWith(child.href));
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsMenuOpen(false)}
                              className={cn(
                                "px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition",
                                isChildActive
                                  ? "bg-primary text-white shadow-xs"
                                  : "text-slate-700 hover:bg-slate-100"
                              )}
                            >
                              <child.icon size={16} />
                              <span className="flex-1">{child.label}</span>
                              {child.badge && (
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                                  isChildActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                                )}>
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Single Nav Mobile Link
              const isActive = pathname === entry.href || (entry.href !== '/' && pathname.startsWith(entry.href));
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors",
                    isActive
                      ? "bg-primary-soft text-primary border border-primary/20 shadow-xs"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  <entry.icon size={18} />
                  <span className="flex-1">{entry.label}</span>
                </Link>
              );
            })}

            {/* Mobile User Info & Logout */}
            {appUser && (
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <div className="flex items-center justify-between px-3 py-2 bg-surface-section rounded-xl border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{roleInfo?.badge}</span>
                    <div className="flex flex-col leading-none">
                      <span className="text-sm font-bold text-text-primary">{appUser.displayName}</span>
                      <span className={cn('text-xs font-semibold mt-0.5', roleInfo?.color)}>{roleInfo?.label}</span>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-danger hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                  >
                    <LogOut size={15} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
