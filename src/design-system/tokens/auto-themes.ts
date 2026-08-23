/**
 * Design System - Pedagogical Auto-Theming Tokens
 * Bảng màu Pastel sư phạm tự động phân cấp theo bộ đếm index (0, 1, 2, 3...)
 * Tự động xoay vòng tuần hoàn (Cyclic Palette) cho cả Tabs, Cards, Badges, và Forms.
 */

export interface AutoTheme {
  id: string;
  name: string;
  
  // 1. Outer Box / Card Container (Tier 2/3)
  bg: string;
  border: string;
  hoverBorder: string;
  shadow: string;
  
  // 2. Badges & Numbers & Headers
  numberBadge: string;
  pillBadge: string;
  iconColor: string;
  titleColor: string;
  
  // 3. Inner Content Container (Tier 3/4 - High Contrast Solid White)
  innerBg: string;
  innerBorder: string;
  
  // 4. Form Controls (Input, Select, Textarea)
  inputBorder: string;
  inputFocus: string;
  
  // 5. Tabs (Nav Bar & Sub Tabs)
  // Inactive: Nền pastel có sẵn + viền màu dịu + chữ đậm tương phản
  tabInactive: string;
  // Active: Nền màu đậm rực rỡ + chữ trắng tinh + bóng đổ glow
  tabActive: string;
  
  // 6. Solid Vibrant
  solidBg: string;
  solidText: string;
  solidShadow: string;
}

export const AUTO_THEMES: AutoTheme[] = [
  // 0. Sky Blue (Biển Xanh)
  {
    id: 'sky',
    name: 'Sky Blue',
    bg: 'bg-sky-50/75',
    border: 'border-2 border-sky-400',
    hoverBorder: 'hover:border-sky-500',
    shadow: 'shadow-sky-500/10',
    numberBadge: 'bg-sky-200 text-sky-950 font-black',
    pillBadge: 'bg-sky-100/90 text-sky-950 border border-sky-300 font-extrabold',
    iconColor: 'text-sky-700',
    titleColor: 'text-sky-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-sky-200/90',
    inputBorder: 'border-sky-300',
    inputFocus: 'focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500',
    tabInactive: 'bg-sky-50 hover:bg-sky-100/80 text-sky-950 border border-sky-300/80 font-bold',
    tabActive: 'bg-sky-600 text-white border-2 border-sky-600 shadow-md shadow-sky-600/30 font-black scale-[1.02]',
    solidBg: 'bg-sky-600',
    solidText: 'text-white',
    solidShadow: 'shadow-sky-600/30',
  },

  // 1. Emerald Mint (Xanh Ngọc)
  {
    id: 'emerald',
    name: 'Emerald Mint',
    bg: 'bg-emerald-50/75',
    border: 'border-2 border-emerald-400',
    hoverBorder: 'hover:border-emerald-500',
    shadow: 'shadow-emerald-500/10',
    numberBadge: 'bg-emerald-200 text-emerald-950 font-black',
    pillBadge: 'bg-emerald-100/90 text-emerald-950 border border-emerald-300 font-extrabold',
    iconColor: 'text-emerald-700',
    titleColor: 'text-emerald-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-emerald-200/90',
    inputBorder: 'border-emerald-300',
    inputFocus: 'focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500',
    tabInactive: 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 border border-emerald-300/80 font-bold',
    tabActive: 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-md shadow-emerald-600/30 font-black scale-[1.02]',
    solidBg: 'bg-emerald-600',
    solidText: 'text-white',
    solidShadow: 'shadow-emerald-600/30',
  },

  // 2. Amber Golden (Vàng Hổ Phách)
  {
    id: 'amber',
    name: 'Amber Golden',
    bg: 'bg-amber-50/75',
    border: 'border-2 border-amber-400',
    hoverBorder: 'hover:border-amber-500',
    shadow: 'shadow-amber-500/10',
    numberBadge: 'bg-amber-200 text-amber-950 font-black',
    pillBadge: 'bg-amber-100/90 text-amber-950 border border-amber-300 font-extrabold',
    iconColor: 'text-amber-700',
    titleColor: 'text-amber-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-amber-200/90',
    inputBorder: 'border-amber-300',
    inputFocus: 'focus:ring-4 focus:ring-amber-500/15 focus:border-amber-500',
    tabInactive: 'bg-amber-50 hover:bg-amber-100/80 text-amber-950 border border-amber-300/80 font-bold',
    tabActive: 'bg-amber-600 text-white border-2 border-amber-600 shadow-md shadow-amber-600/30 font-black scale-[1.02]',
    solidBg: 'bg-amber-600',
    solidText: 'text-white',
    solidShadow: 'shadow-amber-600/30',
  },

  // 3. Purple Violet (Tím Violet)
  {
    id: 'purple',
    name: 'Purple Violet',
    bg: 'bg-purple-50/75',
    border: 'border-2 border-purple-400',
    hoverBorder: 'hover:border-purple-500',
    shadow: 'shadow-purple-500/10',
    numberBadge: 'bg-purple-200 text-purple-950 font-black',
    pillBadge: 'bg-purple-100/90 text-purple-950 border border-purple-300 font-extrabold',
    iconColor: 'text-purple-700',
    titleColor: 'text-purple-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-purple-200/90',
    inputBorder: 'border-purple-300',
    inputFocus: 'focus:ring-4 focus:ring-purple-500/15 focus:border-purple-500',
    tabInactive: 'bg-purple-50 hover:bg-purple-100/80 text-purple-950 border border-purple-300/80 font-bold',
    tabActive: 'bg-purple-600 text-white border-2 border-purple-600 shadow-md shadow-purple-600/30 font-black scale-[1.02]',
    solidBg: 'bg-purple-600',
    solidText: 'text-white',
    solidShadow: 'shadow-purple-600/30',
  },

  // 4. Rose Coral (Hồng San Hô)
  {
    id: 'rose',
    name: 'Rose Coral',
    bg: 'bg-rose-50/75',
    border: 'border-2 border-rose-400',
    hoverBorder: 'hover:border-rose-500',
    shadow: 'shadow-rose-500/10',
    numberBadge: 'bg-rose-200 text-rose-950 font-black',
    pillBadge: 'bg-rose-100/90 text-rose-950 border border-rose-300 font-extrabold',
    iconColor: 'text-rose-700',
    titleColor: 'text-rose-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-rose-200/90',
    inputBorder: 'border-rose-300',
    inputFocus: 'focus:ring-4 focus:ring-rose-500/15 focus:border-rose-500',
    tabInactive: 'bg-rose-50 hover:bg-rose-100/80 text-rose-950 border border-rose-300/80 font-bold',
    tabActive: 'bg-rose-600 text-white border-2 border-rose-600 shadow-md shadow-rose-600/30 font-black scale-[1.02]',
    solidBg: 'bg-rose-600',
    solidText: 'text-white',
    solidShadow: 'shadow-rose-600/30',
  },

  // 5. Indigo Royal (Xanh Lam Đậm)
  {
    id: 'indigo',
    name: 'Indigo Royal',
    bg: 'bg-indigo-50/75',
    border: 'border-2 border-indigo-400',
    hoverBorder: 'hover:border-indigo-500',
    shadow: 'shadow-indigo-500/10',
    numberBadge: 'bg-indigo-200 text-indigo-950 font-black',
    pillBadge: 'bg-indigo-100/90 text-indigo-950 border border-indigo-300 font-extrabold',
    iconColor: 'text-indigo-700',
    titleColor: 'text-indigo-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-indigo-200/90',
    inputBorder: 'border-indigo-300',
    inputFocus: 'focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500',
    tabInactive: 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 border border-indigo-300/80 font-bold',
    tabActive: 'bg-indigo-600 text-white border-2 border-indigo-600 shadow-md shadow-indigo-600/30 font-black scale-[1.02]',
    solidBg: 'bg-indigo-600',
    solidText: 'text-white',
    solidShadow: 'shadow-indigo-600/30',
  },

  // 6. Teal Aqua (Xanh Mòng Két)
  {
    id: 'teal',
    name: 'Teal Aqua',
    bg: 'bg-teal-50/75',
    border: 'border-2 border-teal-400',
    hoverBorder: 'hover:border-teal-500',
    shadow: 'shadow-teal-500/10',
    numberBadge: 'bg-teal-200 text-teal-950 font-black',
    pillBadge: 'bg-teal-100/90 text-teal-950 border border-teal-300 font-extrabold',
    iconColor: 'text-teal-700',
    titleColor: 'text-teal-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-teal-200/90',
    inputBorder: 'border-teal-300',
    inputFocus: 'focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500',
    tabInactive: 'bg-teal-50 hover:bg-teal-100/80 text-teal-950 border border-teal-300/80 font-bold',
    tabActive: 'bg-teal-600 text-white border-2 border-teal-600 shadow-md shadow-teal-600/30 font-black scale-[1.02]',
    solidBg: 'bg-teal-600',
    solidText: 'text-white',
    solidShadow: 'shadow-teal-600/30',
  },

  // 7. Orange Sunset (Cam Rực Rỡ)
  {
    id: 'orange',
    name: 'Orange Sunset',
    bg: 'bg-orange-50/75',
    border: 'border-2 border-orange-400',
    hoverBorder: 'hover:border-orange-500',
    shadow: 'shadow-orange-500/10',
    numberBadge: 'bg-orange-200 text-orange-950 font-black',
    pillBadge: 'bg-orange-100/90 text-orange-950 border border-orange-300 font-extrabold',
    iconColor: 'text-orange-700',
    titleColor: 'text-orange-950 font-black',
    innerBg: 'bg-white/95',
    innerBorder: 'border-orange-200/90',
    inputBorder: 'border-orange-300',
    inputFocus: 'focus:ring-4 focus:ring-orange-500/15 focus:border-orange-500',
    tabInactive: 'bg-orange-50 hover:bg-orange-100/80 text-orange-950 border border-orange-300/80 font-bold',
    tabActive: 'bg-orange-600 text-white border-2 border-orange-600 shadow-md shadow-orange-600/30 font-black scale-[1.02]',
    solidBg: 'bg-orange-600',
    solidText: 'text-white',
    solidShadow: 'shadow-orange-600/30',
  },
];

/**
 * Lấy cấu hình Theme tự động theo bộ đếm index (0, 1, 2, 3...)
 * Tự động xoay vòng tuần hoàn (Cyclic Palette) không bao giờ bị trùng lặp hay lỗi index
 */
export function getAutoTheme(index: number = 0): AutoTheme {
  const safeIndex = Math.abs(Math.floor(index)) % AUTO_THEMES.length;
  return AUTO_THEMES[safeIndex];
}

/**
 * Trả về class style hoàn chỉnh cho Tab theo index và trạng thái active
 */
export function getThemedTabClass(index: number, isActive: boolean): string {
  const theme = getAutoTheme(index);
  return isActive ? theme.tabActive : theme.tabInactive;
}
