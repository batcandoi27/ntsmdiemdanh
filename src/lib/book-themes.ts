/**
 * Hệ thống bảng màu chuẩn tự động phân bổ theo thứ tự index / ID cho từng sổ theo dõi
 * Hoàn toàn động và tự xoay vòng màu sắc riêng biệt cho từng sổ
 */

export interface BookTheme {
  id: string;
  bgGradient: string;
  borderColor: string;
  borderLeftAccent: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  tagClass: string;
  ringFocus: string;
  accentBg: string;
}

export const BOOK_THEMES: BookTheme[] = [
  // 1. Theme Emerald
  {
    id: 'theme-emerald',
    bgGradient: 'bg-gradient-to-r from-emerald-50/90 via-teal-50/30 to-white hover:from-emerald-100/80',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    borderLeftAccent: 'border-l-[5px] border-l-emerald-500',
    iconBg: 'bg-emerald-100 text-emerald-700',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-950',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-800 font-bold',
    badgeBorder: 'border-emerald-300',
    tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ringFocus: 'focus:ring-emerald-500/20',
    accentBg: 'bg-emerald-500',
  },
  // 2. Theme Indigo
  {
    id: 'theme-indigo',
    bgGradient: 'bg-gradient-to-r from-indigo-50/90 via-purple-50/30 to-white hover:from-indigo-100/80',
    borderColor: 'border-indigo-200 hover:border-indigo-400',
    borderLeftAccent: 'border-l-[5px] border-l-indigo-600',
    iconBg: 'bg-indigo-100 text-indigo-700',
    iconColor: 'text-indigo-600',
    titleColor: 'text-indigo-950',
    badgeBg: 'bg-indigo-100/90',
    badgeText: 'text-indigo-800 font-bold',
    badgeBorder: 'border-indigo-300',
    tagClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ringFocus: 'focus:ring-indigo-500/20',
    accentBg: 'bg-indigo-600',
  },
  // 3. Theme Amber
  {
    id: 'theme-amber',
    bgGradient: 'bg-gradient-to-r from-amber-50/90 via-orange-50/30 to-white hover:from-amber-100/80',
    borderColor: 'border-amber-200 hover:border-amber-400',
    borderLeftAccent: 'border-l-[5px] border-l-amber-500',
    iconBg: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-950',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-800 font-bold',
    badgeBorder: 'border-amber-300',
    tagClass: 'bg-amber-50 text-amber-700 border-amber-200',
    ringFocus: 'focus:ring-amber-500/20',
    accentBg: 'bg-amber-500',
  },
  // 4. Theme Sky
  {
    id: 'theme-sky',
    bgGradient: 'bg-gradient-to-r from-sky-50/90 via-cyan-50/30 to-white hover:from-sky-100/80',
    borderColor: 'border-sky-200 hover:border-sky-400',
    borderLeftAccent: 'border-l-[5px] border-l-sky-500',
    iconBg: 'bg-sky-100 text-sky-700',
    iconColor: 'text-sky-600',
    titleColor: 'text-sky-950',
    badgeBg: 'bg-sky-100/90',
    badgeText: 'text-sky-800 font-bold',
    badgeBorder: 'border-sky-300',
    tagClass: 'bg-sky-50 text-sky-700 border-sky-200',
    ringFocus: 'focus:ring-sky-500/20',
    accentBg: 'bg-sky-500',
  },
  // 5. Theme Rose
  {
    id: 'theme-rose',
    bgGradient: 'bg-gradient-to-r from-rose-50/90 via-pink-50/30 to-white hover:from-rose-100/80',
    borderColor: 'border-rose-200 hover:border-rose-400',
    borderLeftAccent: 'border-l-[5px] border-l-rose-500',
    iconBg: 'bg-rose-100 text-rose-700',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-950',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-800 font-bold',
    badgeBorder: 'border-rose-300',
    tagClass: 'bg-rose-50 text-rose-700 border-rose-200',
    ringFocus: 'focus:ring-rose-500/20',
    accentBg: 'bg-rose-500',
  },
  // 6. Theme Violet
  {
    id: 'theme-violet',
    bgGradient: 'bg-gradient-to-r from-violet-50/90 via-fuchsia-50/30 to-white hover:from-violet-100/80',
    borderColor: 'border-violet-200 hover:border-violet-400',
    borderLeftAccent: 'border-l-[5px] border-l-violet-500',
    iconBg: 'bg-violet-100 text-violet-700',
    iconColor: 'text-violet-600',
    titleColor: 'text-violet-950',
    badgeBg: 'bg-violet-100/90',
    badgeText: 'text-violet-800 font-bold',
    badgeBorder: 'border-violet-300',
    tagClass: 'bg-violet-50 text-violet-700 border-violet-200',
    ringFocus: 'focus:ring-violet-500/20',
    accentBg: 'bg-violet-500',
  },
  // 7. Theme Teal
  {
    id: 'theme-teal',
    bgGradient: 'bg-gradient-to-r from-teal-50/90 via-cyan-50/30 to-white hover:from-teal-100/80',
    borderColor: 'border-teal-200 hover:border-teal-400',
    borderLeftAccent: 'border-l-[5px] border-l-teal-500',
    iconBg: 'bg-teal-100 text-teal-700',
    iconColor: 'text-teal-600',
    titleColor: 'text-teal-950',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-800 font-bold',
    badgeBorder: 'border-teal-300',
    tagClass: 'bg-teal-50 text-teal-700 border-teal-200',
    ringFocus: 'focus:ring-teal-500/20',
    accentBg: 'bg-teal-500',
  },
  // 8. Theme Orange
  {
    id: 'theme-orange',
    bgGradient: 'bg-gradient-to-r from-orange-50/90 via-amber-50/30 to-white hover:from-orange-100/80',
    borderColor: 'border-orange-200 hover:border-orange-400',
    borderLeftAccent: 'border-l-[5px] border-l-orange-500',
    iconBg: 'bg-orange-100 text-orange-700',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-950',
    badgeBg: 'bg-orange-100/90',
    badgeText: 'text-orange-800 font-bold',
    badgeBorder: 'border-orange-300',
    tagClass: 'bg-orange-50 text-orange-700 border-orange-200',
    ringFocus: 'focus:ring-orange-500/20',
    accentBg: 'bg-orange-500',
  }
];

/**
 * Lấy theme màu tự động:
 * Ưu tiên lấy theo thứ tự index xuất hiện, hoặc hash theo ID để đảm bảo mỗi sổ một màu sắc riêng biệt
 */
export function getBookTheme(index: number, id?: string): BookTheme {
  if (typeof index === 'number' && index >= 0) {
    return BOOK_THEMES[index % BOOK_THEMES.length];
  }
  if (id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % BOOK_THEMES.length;
    return BOOK_THEMES[idx];
  }
  return BOOK_THEMES[0];
}
