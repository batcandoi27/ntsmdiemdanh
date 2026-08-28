export type TimeOfDay = 'day' | 'dusk' | 'night';

export interface SceneTheme {
  timeOfDay: TimeOfDay;
  label: string;
  icon: string;
  skyGradient: string;
  floorGradient: string;
  wallLeftColor: string;
  wallRightColor: string;
  windowLightColor: string;
  ambientGlow: string;
  description: string;
}

export const SCENE_THEMES: Record<TimeOfDay, SceneTheme> = {
  day: {
    timeOfDay: 'day',
    label: 'Buổi Sáng',
    icon: '🌅',
    skyGradient: 'from-sky-900/40 via-indigo-950/70 to-slate-950',
    floorGradient: 'from-slate-800 via-indigo-950/40 to-slate-900',
    wallLeftColor: '#1e293b',
    wallRightColor: '#0f172a',
    windowLightColor: 'rgba(254, 240, 138, 0.4)',
    ambientGlow: 'rgba(253, 224, 71, 0.15)',
    description: 'Ánh nắng ban mai rực rỡ, khởi đầu ngày học tập tràn đầy năng lượng'
  },
  dusk: {
    timeOfDay: 'dusk',
    label: 'Buổi Chiều',
    icon: '🌇',
    skyGradient: 'from-amber-950/40 via-purple-950/70 to-slate-950',
    floorGradient: 'from-amber-950/30 via-slate-900 to-slate-950',
    wallLeftColor: '#291b2c',
    wallRightColor: '#1a1020',
    windowLightColor: 'rgba(251, 146, 60, 0.45)',
    ambientGlow: 'rgba(249, 115, 22, 0.2)',
    description: 'Ánh hoàng hôn ấm áp, tĩnh lặng sau giờ học tập hăng say'
  },
  night: {
    timeOfDay: 'night',
    label: 'Buổi Tối',
    icon: '🌙',
    skyGradient: 'from-indigo-950/60 via-slate-950 to-slate-950',
    floorGradient: 'from-slate-900 via-indigo-950/30 to-slate-950',
    wallLeftColor: '#0f172a',
    wallRightColor: '#020617',
    windowLightColor: 'rgba(167, 139, 250, 0.35)',
    ambientGlow: 'rgba(139, 92, 246, 0.18)',
    description: 'Ánh trăng sao đêm huyền ảo, linh vật nghỉ ngơi hồi phục sinh lực'
  }
};

/**
 * Tự động xác định buổi trong ngày theo giờ địa phương thực tế:
 * - Sáng (Day): 06h00 - 11h59
 * - Chiều (Dusk): 12h00 - 17h59
 * - Tối (Night): 18h00 - 05h59
 */
export function resolveTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hours = date.getHours();
  if (hours >= 6 && hours < 12) {
    return 'day';
  }
  if (hours >= 12 && hours < 18) {
    return 'dusk';
  }
  return 'night';
}

/**
 * Phép chiếu Isometric 2.5D chuẩn từ tọa độ lưới sàn (x, y):
 */
export function projectToIsometric(
  gridX: number,
  gridY: number,
  tileWidth = 60,
  tileHeight = 30
): { isoX: number; isoY: number; zIndex: number } {
  const isoX = (gridX - gridY) * (tileWidth / 2);
  const isoY = (gridX + gridY) * (tileHeight / 2);
  const zIndex = Math.round((gridX + gridY) * 10);
  return { isoX, isoY, zIndex };
}
