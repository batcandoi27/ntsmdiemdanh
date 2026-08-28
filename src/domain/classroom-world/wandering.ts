import { GridCoordinate, PetWorldSnapshot } from './types';
import { GRID_SIZE } from './constants';
import { canPetEnterZone, getZoneAtCoordinate, isBorderCoordinate } from './zoning';

/**
 * Lấy các ô lân cận (4 hướng: Trên, Dưới, Trái, Phải) hợp lệ
 */
export function getAdjacentCoordinates(current: GridCoordinate): GridCoordinate[] {
  const directions = [
    { dx: 0, dy: -1 }, // Lên
    { dx: 0, dy: 1 },  // Xuống
    { dx: -1, dy: 0 }, // Trái
    { dx: 1, dy: 0 }   // Phải
  ];

  const results: GridCoordinate[] = [];

  for (const dir of directions) {
    const nx = current.x + dir.dx;
    const ny = current.y + dir.dy;

    // Trong phạm vi 8x8
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      results.push({ x: nx, y: ny });
    }
  }

  return results;
}

/**
 * Thuật toán Wandering AI: Tính toán ô đích tiếp theo cho thú cưng
 */
export function calculateNextWanderingStep(
  pet: PetWorldSnapshot,
  occupiedCoordinates: Set<string> = new Set()
): { nextPosition: GridCoordinate; facingDirection: 1 | -1 } {
  // 1. Trứng chưa nở (Level 0) hoặc Thú đang ngủ đông: Luôn ở Home Base
  if (!pet.isHatched || pet.level <= 0 || pet.isHibernating) {
    return {
      nextPosition: pet.homePosition,
      facingDirection: 1
    };
  }

  // 2. Nếu thú đang ở nhà viền và đã nở (Level >= 1): Ưu tiên bước vào trung tâm
  if (isBorderCoordinate(pet.currentPosition)) {
    // Tìm ô trung tâm gần nhất hợp lệ
    const neighbors = getAdjacentCoordinates(pet.currentPosition);
    const validPublicNeighbors = neighbors.filter(coord => {
      if (isBorderCoordinate(coord)) return false; // Tránh đi lòng vòng trên viền
      const zone = getZoneAtCoordinate(coord);
      return canPetEnterZone(pet.level, zone.type);
    });

    if (validPublicNeighbors.length > 0) {
      const chosen = validPublicNeighbors[Math.floor(Math.random() * validPublicNeighbors.length)];
      const facing: 1 | -1 = chosen.x < pet.currentPosition.x ? -1 : 1;
      return { nextPosition: chosen, facingDirection: facing };
    }
  }

  // 3. Nếu thú đang ở vùng công cộng: Lấy các ô lân cận trong vùng công cộng đủ Level
  const adjacent = getAdjacentCoordinates(pet.currentPosition);
  const eligibleCells = adjacent.filter(coord => {
    // Chỉ đi lại trong khu công cộng trung tâm (không tự ý quay lại nhà người khác)
    if (isBorderCoordinate(coord)) return false;

    // Kiểm tra Level-gating của ô đó
    const zone = getZoneAtCoordinate(coord);
    if (!canPetEnterZone(pet.level, zone.type)) return false;

    // Tránh ô đang có thú khác chiếm (nếu có)
    const key = `${coord.x},${coord.y}`;
    if (occupiedCoordinates.has(key)) return false;

    return true;
  });

  if (eligibleCells.length === 0) {
    // Nếu bị kẹt thì đứng yên tại chỗ
    return {
      nextPosition: pet.currentPosition,
      facingDirection: pet.facingDirection
    };
  }

  // Random chọn 1 ô trong các ô hợp lệ
  const target = eligibleCells[Math.floor(Math.random() * eligibleCells.length)];
  const facing: 1 | -1 = target.x < pet.currentPosition.x ? -1 : target.x > pet.currentPosition.x ? 1 : pet.facingDirection;

  return {
    nextPosition: target,
    facingDirection: facing
  };
}
