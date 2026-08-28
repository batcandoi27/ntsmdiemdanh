import { ZoneDefinition, ZoneType } from './types';

export const GRID_SIZE = 8;
export const TOTAL_TILES = 64;
export const BORDER_TILES_COUNT = 28;
export const PUBLIC_TILES_COUNT = 36;

export const ZONE_DEFINITIONS: Record<ZoneType, ZoneDefinition> = {
  residential: {
    type: 'residential',
    name: 'Residential Base',
    vietnameseName: 'Khu Dân Cư (Nhà Riêng)',
    icon: '🏡',
    minLevel: 0,
    description: 'Khu đất viền ngoài làm nhà riêng cho từng học sinh. Nơi quả trứng nghỉ ngơi trước khi nở.',
    bgColorClass: 'bg-slate-950/70',
    borderColorClass: 'border-slate-800/80',
    glowColor: 'rgba(148, 163, 184, 0.2)'
  },
  central_plaza: {
    type: 'central_plaza',
    name: 'Central Plaza',
    vietnameseName: 'Quảng Trường Trung Tâm',
    icon: '⛲',
    minLevel: 1,
    description: 'Khu vực công viên giao lưu chung mở khóa ngay khi trứng nở (Level 1+).',
    bgColorClass: 'bg-emerald-950/30',
    borderColorClass: 'border-emerald-500/40',
    glowColor: 'rgba(16, 185, 129, 0.3)'
  },
  library_hub: {
    type: 'library_hub',
    name: 'Library Hub',
    vietnameseName: 'Thư Viện Tri Thức',
    icon: '📚',
    minLevel: 5,
    description: 'Khu nghiên cứu học thuật dành cho thú cưng chăm chỉ (Yêu cầu Level 5+).',
    bgColorClass: 'bg-indigo-950/40',
    borderColorClass: 'border-indigo-500/50',
    glowColor: 'rgba(99, 102, 241, 0.4)'
  },
  arena_lab: {
    type: 'arena_lab',
    name: 'Arena & Innovation Lab',
    vietnameseName: 'Đấu Trường Sáng Tạo',
    icon: '⚡',
    minLevel: 10,
    description: 'Khu thi đấu & phòng lab công nghệ cho thú cưng trưởng thành (Yêu cầu Level 10+).',
    bgColorClass: 'bg-amber-950/30',
    borderColorClass: 'border-amber-500/50',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  },
  cosmic_forest: {
    type: 'cosmic_forest',
    name: 'Cosmic Magic Forest',
    vietnameseName: 'Rừng Vũ Trụ Phép Thuật',
    icon: '🌌',
    minLevel: 20,
    description: 'Vùng đất huyền bí tràn ngập năng lượng vũ trụ cho chiến thú tối thượng (Yêu cầu Level 20+).',
    bgColorClass: 'bg-purple-950/40',
    borderColorClass: 'border-purple-500/50',
    glowColor: 'rgba(168, 85, 247, 0.4)'
  }
};

export const DEFAULT_EGG_COLORS = [
  { name: 'Tím Ngân Hà', hex: '#9d4edd', border: '#c77dff' },
  { name: 'Xanh Ngọc Lục', hex: '#2b9348', border: '#55a630' },
  { name: 'Cam Lửa', hex: '#e85d04', border: '#f48c06' },
  { name: 'Vàng Hoàng Kim', hex: '#e0a96d', border: '#ffd166' },
  { name: 'Xanh Biển Sâu', hex: '#0077b6', border: '#90e0ef' },
  { name: 'Hồng Pha Lê', hex: '#ff007f', border: '#ff70a6' },
  { name: 'Đỏ Ruby', hex: '#d90429', border: '#ef233c' },
  { name: 'Ngọc Lam Huyền Bí', hex: '#00f5d4', border: '#70e000' }
];
