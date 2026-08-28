import { GridCoordinate, ZoneDefinition, ZoneType } from './types';
import { GRID_SIZE, ZONE_DEFINITIONS } from './constants';

/**
 * Kiểm tra xem tọa độ có nằm ở viền ngoài (Khu Dân Cư 28 ô) hay không
 */
export function isBorderCoordinate(coord: GridCoordinate): boolean {
  return coord.x === 0 || coord.x === GRID_SIZE - 1 || coord.y === 0 || coord.y === GRID_SIZE - 1;
}

/**
 * Lấy định nghĩa Zone cho một tọa độ cụ thể trên lưới 8x8
 */
export function getZoneAtCoordinate(coord: GridCoordinate): ZoneDefinition {
  const { x, y } = coord;

  // 1. Viền 4 cạnh: Khu Dân Cư
  if (isBorderCoordinate(coord)) {
    return ZONE_DEFINITIONS.residential;
  }

  // 2. Không gian trung tâm [1..6, 1..6] chia theo 4 góc phần tư:
  // Góc Tây-Bắc [1..3, 1..3]: Quảng trường Central Plaza (Min Level 1)
  if (x >= 1 && x <= 3 && y >= 1 && y <= 3) {
    return ZONE_DEFINITIONS.central_plaza;
  }

  // Góc Đông-Bắc [4..6, 1..3]: Thư Viện Tri Thức (Min Level 5)
  if (x >= 4 && x <= 6 && y >= 1 && y <= 3) {
    return ZONE_DEFINITIONS.library_hub;
  }

  // Góc Tây-Nam [1..3, 4..6]: Đấu Trường Sáng Tạo (Min Level 10)
  if (x >= 1 && x <= 3 && y >= 4 && y <= 6) {
    return ZONE_DEFINITIONS.arena_lab;
  }

  // Góc Đông-Nam [4..6, 4..6]: Rừng Vũ Trụ Phép Thuật (Min Level 20)
  return ZONE_DEFINITIONS.cosmic_forest;
}

/**
 * Kiểm tra thú cưng có đủ Level để bước vào một Zone hay không
 */
export function canPetEnterZone(petLevel: number, zoneType: ZoneType): boolean {
  const zone = ZONE_DEFINITIONS[zoneType];
  if (!zone) return false;
  return petLevel >= zone.minLevel;
}

/**
 * Lấy danh sách toàn bộ 28 ô viền theo thứ tự vòng kim đồng hồ
 */
export function getAllBorderCoordinates(): GridCoordinate[] {
  const coords: GridCoordinate[] = [];

  // Hàng trên (y=0, x: 0..7)
  for (let x = 0; x < GRID_SIZE; x++) coords.push({ x, y: 0 });
  // Cạnh phải (x=7, y: 1..7)
  for (let y = 1; y < GRID_SIZE; y++) coords.push({ x: 7, y });
  // Hàng dưới (y=7, x: 6..0)
  for (let x = GRID_SIZE - 2; x >= 0; x--) coords.push({ x, y: 7 });
  // Cạnh trái (x=0, y: 6..1)
  for (let y = GRID_SIZE - 2; y >= 1; y--) coords.push({ x: 0, y });

  return coords;
}
