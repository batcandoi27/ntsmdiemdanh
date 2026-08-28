export type FurnitureDefinitionId =
  | 'cosmic_bed'
  | 'wood_bed'
  | 'study_desk'
  | 'wood_desk'
  | 'gaming_sofa'
  | 'magic_bookshelf'
  | 'magic_carpet'
  | 'neon_lamp'
  | 'galaxy_frame'
  | 'magic_tree'
  | 'star_crown'
  | 'quantum_pc'
  | 'crystal_throne';

export type Rotation = 0 | 90 | 180 | 270;
export type FurnitureTier = 1 | 2 | 3 | 4 | 5;

export interface TierConfig {
  tier: FurnitureTier;
  label: string;
  stars: string;
  xpCost: number;
  coinCost: number;
  buffMultiplier: number;
  buffDescription: string;
}

export const TIER_CONFIGS: Record<FurnitureTier, TierConfig> = {
  1: {
    tier: 1,
    label: 'Cơ Bản',
    stars: '⭐',
    xpCost: 0,
    coinCost: 0,
    buffMultiplier: 1.0,
    buffDescription: 'Hiệu quả cơ bản: +10% sinh lực & năng lượng'
  },
  2: {
    tier: 2,
    label: 'Tinh Xảo',
    stars: '⭐⭐',
    xpCost: 25,
    coinCost: 10,
    buffMultiplier: 1.25,
    buffDescription: 'Viền kim loại: +25% tốc độ hồi phục sinh lực'
  },
  3: {
    tier: 3,
    label: 'Cao Cấp',
    stars: '⭐⭐⭐',
    xpCost: 50,
    coinCost: 20,
    buffMultiplier: 1.5,
    buffDescription: 'Hoa văn hoàng gia: +50% thưởng XP nhiệm vụ rèn luyện'
  },
  4: {
    tier: 4,
    label: 'Huyền Thoại',
    stars: '⭐⭐⭐⭐',
    xpCost: 100,
    coinCost: 40,
    buffMultiplier: 1.85,
    buffDescription: 'Hào quang ma thuật: +85% toàn bộ điểm thi đua & may mắn'
  },
  5: {
    tier: 5,
    label: 'Thần Thoại Tối Thượng',
    stars: '⭐⭐⭐⭐⭐',
    xpCost: 200,
    coinCost: 80,
    buffMultiplier: 2.2,
    buffDescription: 'Bụi sao thần thánh: +120% toàn bộ chỉ số & hào quang siêu cấp'
  }
};

export interface FurnitureDefinition {
  id: FurnitureDefinitionId;
  name: string;
  category: 'furniture' | 'decor' | 'jewelry';
  icon: string;
  topDownSvg: string;
  defaultWidth: number;
  defaultHeight: number;
  priceCoins: number;
  requiredLevel: number;
  availableColors: string[];
  baseBuff: string;
}

export interface InventoryItem {
  instanceId: string;
  definitionId: FurnitureDefinitionId;
  name: string;
  icon: string;
  category: 'furniture' | 'decor' | 'jewelry';
  primaryColor: string;
  tier: FurnitureTier;
  rotation: Rotation;
  isPlaced: boolean;
  acquiredAt: string;
}

export interface PlacedFurniture {
  placementId: string;
  instanceId: string;
  definitionId: FurnitureDefinitionId;
  name: string;
  icon: string;
  x: number; // 0..7
  y: number; // 0..7
  width: number;
  height: number;
  rotation: Rotation;
  tier: FurnitureTier;
  primaryColor: string;
}

export interface RoomFloorPlan {
  id: string;
  studentId: string;
  studentCode: string;
  gridWidth: number;
  gridHeight: number;
  placedItems: PlacedFurniture[];
  updatedAt: string;
}

export function getEffectiveFootprint(width: number, height: number, rotation: Rotation): { width: number; height: number } {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

export function getNextRotation(current: Rotation): Rotation {
  switch (current) {
    case 0: return 90;
    case 90: return 180;
    case 180: return 270;
    case 270: return 0;
  }
}
