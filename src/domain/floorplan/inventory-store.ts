import {
  FurnitureDefinition,
  FurnitureDefinitionId,
  InventoryItem,
  PlacedFurniture,
  RoomFloorPlan,
  Rotation,
  FurnitureTier
} from './types';

export const FURNITURE_DEFINITIONS: Record<FurnitureDefinitionId, FurnitureDefinition> = {
  cosmic_bed: {
    id: 'cosmic_bed',
    name: 'Giường Ngủ Phi Thuyền',
    category: 'furniture',
    icon: '🛏️',
    topDownSvg: 'bed',
    defaultWidth: 2,
    defaultHeight: 2,
    priceCoins: 280,
    requiredLevel: 2,
    availableColors: ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'],
    baseBuff: 'Hồi phục sinh lực nhanh chóng'
  },
  wood_bed: {
    id: 'wood_bed',
    name: 'Giường Gỗ Sồi Ấm Áp',
    category: 'furniture',
    icon: '🛏️',
    topDownSvg: 'bed',
    defaultWidth: 2,
    defaultHeight: 2,
    priceCoins: 120,
    requiredLevel: 1,
    availableColors: ['#78350f', '#92400e', '#b45309', '#a16207', '#451a03', '#d97706'],
    baseBuff: 'Tăng cường sức khỏe mỗi sớm mai'
  },
  study_desk: {
    id: 'study_desk',
    name: 'Bàn Học Thông Thái',
    category: 'furniture',
    icon: '🪑',
    topDownSvg: 'desk',
    defaultWidth: 2,
    defaultHeight: 1,
    priceCoins: 140,
    requiredLevel: 1,
    availableColors: ['#3b82f6', '#6366f1', '#06b6d4', '#10b981', '#64748b', '#f59e0b'],
    baseBuff: 'Góc học tập sáng sủa, tạo cảm hứng sáng tạo'
  },
  wood_desk: {
    id: 'wood_desk',
    name: 'Bàn Trà Cổ Thụ',
    category: 'furniture',
    icon: '🪵',
    topDownSvg: 'table',
    defaultWidth: 2,
    defaultHeight: 2,
    priceCoins: 130,
    requiredLevel: 1,
    availableColors: ['#78350f', '#92400e', '#b45309', '#451a03', '#1e293b', '#10b981'],
    baseBuff: 'Không gian tĩnh lặng, thoáng đãng khi tự học'
  },
  gaming_sofa: {
    id: 'gaming_sofa',
    name: 'Ghế Gaming Siêu Cấp',
    category: 'furniture',
    icon: '🛋️',
    topDownSvg: 'sofa',
    defaultWidth: 2,
    defaultHeight: 1,
    priceCoins: 240,
    requiredLevel: 3,
    availableColors: ['#ef4444', '#8b5cf6', '#06b6d4', '#eab308', '#22c55e', '#ec4899'],
    baseBuff: 'Thư giãn thoải mái sau giờ sinh hoạt lớp'
  },
  magic_bookshelf: {
    id: 'magic_bookshelf',
    name: 'Tủ Sách Thần Kỳ',
    category: 'furniture',
    icon: '📚',
    topDownSvg: 'shelf',
    defaultWidth: 2,
    defaultHeight: 1,
    priceCoins: 180,
    requiredLevel: 2,
    availableColors: ['#854d0e', '#1e293b', '#4c1d95', '#065f46', '#7f1d1d', '#312e81'],
    baseBuff: 'Trưng bày sách vở và tài liệu ngăn nắp'
  },
  magic_carpet: {
    id: 'magic_carpet',
    name: 'Thảm Lông Thần Thoại',
    category: 'decor',
    icon: '🧶',
    topDownSvg: 'rug',
    defaultWidth: 3,
    defaultHeight: 2,
    priceCoins: 90,
    requiredLevel: 1,
    availableColors: ['#7c2d12', '#4c1d95', '#1e3a8a', '#064e3b', '#831843', '#713f12'],
    baseBuff: 'Bàn chân êm ái, giữ ấm căn phòng'
  },
  neon_lamp: {
    id: 'neon_lamp',
    name: 'Đèn Neon Ma Thuật',
    category: 'decor',
    icon: '🏮',
    topDownSvg: 'lamp',
    defaultWidth: 1,
    defaultHeight: 1,
    priceCoins: 110,
    requiredLevel: 1,
    availableColors: ['#a855f7', '#06b6d4', '#f43f5e', '#eab308', '#10b981', '#6366f1'],
    baseBuff: 'Chiếu sáng góc học tập lung linh'
  },
  galaxy_frame: {
    id: 'galaxy_frame',
    name: 'Tranh Treo Tường Ngân Hà',
    category: 'decor',
    icon: '🖼️',
    topDownSvg: 'frame',
    defaultWidth: 2,
    defaultHeight: 1,
    priceCoins: 160,
    requiredLevel: 2,
    availableColors: ['#312e81', '#4c1d95', '#0284c7', '#0f766e', '#881337', '#172554'],
    baseBuff: 'Khơi nguồn cảm hứng sáng tạo'
  },
  magic_tree: {
    id: 'magic_tree',
    name: 'Cây Tri Thức Phát Sáng',
    category: 'decor',
    icon: '🌳',
    topDownSvg: 'plant',
    defaultWidth: 2,
    defaultHeight: 2,
    priceCoins: 260,
    requiredLevel: 3,
    availableColors: ['#15803d', '#047857', '#0d9488', '#0284c7', '#6d28d9', '#b91c1c'],
    baseBuff: 'Thanh lọc không khí trong lành'
  },
  star_crown: {
    id: 'star_crown',
    name: 'Vương Miện Tinh Tú',
    category: 'jewelry',
    icon: '👑',
    topDownSvg: 'pedestal',
    defaultWidth: 1,
    defaultHeight: 1,
    priceCoins: 380,
    requiredLevel: 4,
    availableColors: ['#eab308', '#f59e0b', '#fbbf24', '#fde047', '#facc15', '#ffffff'],
    baseBuff: 'Vinh quang học sinh tiêu biểu'
  },
  quantum_pc: {
    id: 'quantum_pc',
    name: 'Máy Tính Lượng Tử',
    category: 'furniture',
    icon: '💻',
    topDownSvg: 'pc',
    defaultWidth: 2,
    defaultHeight: 1,
    priceCoins: 340,
    requiredLevel: 3,
    availableColors: ['#06b6d4', '#3b82f6', '#6366f1', '#10b981', '#f43f5e', '#a855f7'],
    baseBuff: 'Xử lý tính toán logic thần tốc'
  },
  crystal_throne: {
    id: 'crystal_throne',
    name: 'Bục Ngai Vàng Pha Lê',
    category: 'furniture',
    icon: '🪑',
    topDownSvg: 'throne',
    defaultWidth: 2,
    defaultHeight: 2,
    priceCoins: 450,
    requiredLevel: 4,
    availableColors: ['#9333ea', '#a855f7', '#c084fc', '#e879f9', '#ec4899', '#f43f5e'],
    baseBuff: 'Tỏa sáng hào quang lãnh đạo'
  }
};

const DEFAULT_STARTER_ITEMS: {
  defId: FurnitureDefinitionId;
  color: string;
  rotation?: Rotation;
  tier?: FurnitureTier;
  defaultPlaced?: { x: number; y: number };
}[] = [
  { defId: 'cosmic_bed', color: '#6366f1', rotation: 0, tier: 1, defaultPlaced: { x: 1, y: 1 } },
  { defId: 'study_desk', color: '#3b82f6', rotation: 0, tier: 1, defaultPlaced: { x: 5, y: 1 } },
  { defId: 'magic_carpet', color: '#7c2d12', rotation: 0, tier: 1, defaultPlaced: { x: 2, y: 4 } },
  { defId: 'neon_lamp', color: '#a855f7', rotation: 0, tier: 1, defaultPlaced: { x: 1, y: 3 } },
  { defId: 'magic_bookshelf', color: '#854d0e', rotation: 0, tier: 1, defaultPlaced: { x: 5, y: 5 } }
];

export function getInitialFloorPlan(
  studentId: string,
  studentCode: string
): { inventory: InventoryItem[]; floorPlan: RoomFloorPlan } {
  // Check localStorage in browser
  if (typeof window !== 'undefined') {
    try {
      const invRaw = localStorage.getItem(`inv_${studentId}`);
      const fpRaw = localStorage.getItem(`fp_${studentId}`);
      if (invRaw && fpRaw) {
        const inventory: InventoryItem[] = JSON.parse(invRaw);
        const floorPlan: RoomFloorPlan = JSON.parse(fpRaw);
        // Normalize rotation & tier for backwards compatibility
        floorPlan.placedItems = floorPlan.placedItems.map((p) => ({
          ...p,
          rotation: p.rotation ?? 0,
          tier: p.tier ?? 1
        }));
        return { inventory, floorPlan };
      }
    } catch {
      // Fallback
    }
  }

  // Create initial demo state
  const inventory: InventoryItem[] = DEFAULT_STARTER_ITEMS.map((item, idx) => {
    const def = FURNITURE_DEFINITIONS[item.defId];
    return {
      instanceId: `item_${studentId}_${idx + 1}`,
      definitionId: item.defId,
      name: def.name,
      icon: def.icon,
      category: def.category,
      primaryColor: item.color,
      isPlaced: true,
      rotation: item.rotation ?? 0,
      tier: item.tier ?? 1,
      acquiredAt: new Date().toISOString()
    };
  });

  const placedItems: PlacedFurniture[] = inventory
    .filter((_, idx) => DEFAULT_STARTER_ITEMS[idx].defaultPlaced)
    .map((i, idx) => {
      const def = FURNITURE_DEFINITIONS[i.definitionId];
      const pos = DEFAULT_STARTER_ITEMS[idx].defaultPlaced!;
      return {
        placementId: `place_${i.instanceId}`,
        instanceId: i.instanceId,
        definitionId: i.definitionId,
        name: def.name,
        icon: def.icon,
        x: pos.x,
        y: pos.y,
        width: def.defaultWidth,
        height: def.defaultHeight,
        primaryColor: i.primaryColor,
        rotation: i.rotation,
        tier: i.tier
      };
    });

  const floorPlan: RoomFloorPlan = {
    id: `room_${studentId}`,
    studentId,
    studentCode,
    gridWidth: 8,
    gridHeight: 8,
    placedItems,
    updatedAt: new Date().toISOString()
  };

  return { inventory, floorPlan };
}

export function saveFloorPlanToStorage(
  studentId: string,
  inventory: InventoryItem[],
  floorPlan: RoomFloorPlan
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`inv_${studentId}`, JSON.stringify(inventory));
    localStorage.setItem(`fp_${studentId}`, JSON.stringify(floorPlan));
  } catch (err) {
    console.warn('Failed to save floorplan to localStorage:', err);
  }
}
