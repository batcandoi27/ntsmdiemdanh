'use client';

import React, { useState, useEffect } from 'react';
import { FloorPlanCanvas } from './floorplan-canvas';
import {
  InventoryItem,
  PlacedFurniture,
  RoomFloorPlan,
  FurnitureDefinitionId,
  Rotation,
  FurnitureTier,
  TIER_CONFIGS,
  getEffectiveFootprint,
  getNextRotation
} from '@/domain/floorplan/types';
import {
  FURNITURE_DEFINITIONS,
  getInitialFloorPlan,
  saveFloorPlanToStorage
} from '@/domain/floorplan/inventory-store';
import { FurnitureSvgRenderer } from './furniture-svg-renderer';
import { VirtualShopModal } from '../virtual-shop-modal';
import { ItemUpgradeForgeModal } from './item-upgrade-forge-modal';
import {
  Layers,
  Sparkles,
  X,
  Plus,
  Trash2,
  Move,
  Palette,
  ShoppingBag,
  CheckCircle2,
  RotateCcw,
  RotateCw,
  Zap,
  Star
} from 'lucide-react';

import { StudentGender } from '@/domain/classroom-world/types';

interface RoomEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentCode: string;
  userCoins?: number;
  userLevel?: number;
  userXp?: number;
  petEvolutionBranch?: 'cosmic' | 'nature' | 'cyber';
  petLevel?: number;
  petEggBaseColor?: string;
  petGender?: StudentGender;
  onCoinsUpdated?: (newCoins: number) => void;
  onXpUpdated?: (newXp: number) => void;
}

const PRESET_PALETTES = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#78350f', // Warm Oak
  '#1e293b'  // Midnight
];

export const RoomEditorModal: React.FC<RoomEditorModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentCode,
  userCoins = 100,
  userLevel = 1,
  userXp = 100,
  petEvolutionBranch = 'cosmic',
  petLevel = 1,
  petEggBaseColor = '#9d4edd',
  petGender = 'female',
  onCoinsUpdated,
  onXpUpdated
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [floorPlan, setFloorPlan] = useState<RoomFloorPlan>({
    id: '',
    studentId: '',
    studentCode: '',
    gridWidth: 8,
    gridHeight: 8,
    placedItems: [],
    updatedAt: ''
  });

  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [placingInventoryItem, setPlacingInventoryItem] = useState<InventoryItem | null>(null);
  const [placingRotation, setPlacingRotation] = useState<Rotation>(0);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [forgeItem, setForgeItem] = useState<PlacedFurniture | InventoryItem | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  // Load from storage or default starter kit on open
  useEffect(() => {
    if (isOpen && studentId) {
      const data = getInitialFloorPlan(studentId, studentCode);
      setInventory(data.inventory);
      setFloorPlan(data.floorPlan);
      setSelectedPlacementId(null);
      setPlacingInventoryItem(null);
      setPlacingRotation(0);
    }
  }, [isOpen, studentId, studentCode]);

  // Keyboard shortcut: Press R to Rotate selected item or placing ghost
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRotateActive();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedPlacementId, placingInventoryItem, floorPlan, inventory]);

  if (!isOpen) return null;

  const selectedPlacedItem = floorPlan.placedItems.find(
    (p) => p.placementId === selectedPlacementId
  );

  // Rotate currently selected item or currently placing ghost
  const handleRotateActive = () => {
    if (placingInventoryItem) {
      setPlacingRotation(getNextRotation(placingRotation));
      return;
    }

    if (selectedPlacementId && selectedPlacedItem) {
      const nextRot = getNextRotation(selectedPlacedItem.rotation || 0);
      const def = FURNITURE_DEFINITIONS[selectedPlacedItem.definitionId];
      const baseW = def?.defaultWidth || 2;
      const baseH = def?.defaultHeight || 2;
      const { width: newW, height: newH } = getEffectiveFootprint(baseW, baseH, nextRot);

      // Boundary check with new dimensions
      let newX = selectedPlacedItem.x;
      let newY = selectedPlacedItem.y;
      if (newX + newW > 8) newX = Math.max(0, 8 - newW);
      if (newY + newH > 8) newY = Math.max(0, 8 - newH);

      const updatedPlaced = floorPlan.placedItems.map((p) => {
        if (p.placementId === selectedPlacementId) {
          return {
            ...p,
            rotation: nextRot,
            width: newW,
            height: newH,
            x: newX,
            y: newY
          };
        }
        return p;
      });

      const updatedFp = {
        ...floorPlan,
        placedItems: updatedPlaced,
        updatedAt: new Date().toISOString()
      };

      setFloorPlan(updatedFp);
      saveFloorPlanToStorage(studentId, inventory, updatedFp);
      triggerSaveToast();
    }
  };

  const triggerSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1500);
  };

  // 1. Place an Item from inventory onto the Canvas
  const handlePlaceItem = (cellX: number, cellY: number) => {
    if (!placingInventoryItem) return;

    const def = FURNITURE_DEFINITIONS[placingInventoryItem.definitionId];
    if (!def) return;

    const baseW = def.defaultWidth;
    const baseH = def.defaultHeight;
    const { width: finalW, height: finalH } = getEffectiveFootprint(baseW, baseH, placingRotation);

    // Boundary check
    let targetX = cellX;
    let targetY = cellY;
    if (targetX + finalW > 8) targetX = 8 - finalW;
    if (targetY + finalH > 8) targetY = 8 - finalH;

    const newPlacement: PlacedFurniture = {
      placementId: `placed-${Date.now()}`,
      instanceId: placingInventoryItem.instanceId,
      definitionId: placingInventoryItem.definitionId,
      name: placingInventoryItem.name,
      icon: placingInventoryItem.icon,
      x: targetX,
      y: targetY,
      width: finalW,
      height: finalH,
      rotation: placingRotation,
      tier: placingInventoryItem.tier || 1,
      primaryColor: placingInventoryItem.primaryColor
    };

    const updatedPlaced = [...floorPlan.placedItems, newPlacement];
    const updatedInv = inventory.map((item) =>
      item.instanceId === placingInventoryItem.instanceId
        ? { ...item, isPlaced: true, rotation: placingRotation }
        : item
    );

    const updatedFp = {
      ...floorPlan,
      placedItems: updatedPlaced,
      updatedAt: new Date().toISOString()
    };

    setFloorPlan(updatedFp);
    setInventory(updatedInv);
    saveFloorPlanToStorage(studentId, updatedInv, updatedFp);

    setPlacingInventoryItem(null);
    setSelectedPlacementId(newPlacement.placementId);
    triggerSaveToast();
  };

  // 2. Remove an Item from room back to inventory
  const handleRemoveFromRoom = (placementId: string) => {
    const itemToRemove = floorPlan.placedItems.find((p) => p.placementId === placementId);
    if (!itemToRemove) return;

    const updatedPlaced = floorPlan.placedItems.filter((p) => p.placementId !== placementId);
    const updatedInv = inventory.map((item) =>
      item.instanceId === itemToRemove.instanceId
        ? { ...item, isPlaced: false }
        : item
    );

    const updatedFp = {
      ...floorPlan,
      placedItems: updatedPlaced,
      updatedAt: new Date().toISOString()
    };

    setFloorPlan(updatedFp);
    setInventory(updatedInv);
    saveFloorPlanToStorage(studentId, updatedInv, updatedFp);

    setSelectedPlacementId(null);
    triggerSaveToast();
  };

  // 3. Move Placed Item
  const handleMovePlacedItem = (newX: number, newY: number) => {
    if (!selectedPlacementId || !selectedPlacedItem) return;

    let targetX = newX;
    let targetY = newY;
    if (targetX + selectedPlacedItem.width > 8) {
      targetX = 8 - selectedPlacedItem.width;
    }
    if (targetY + selectedPlacedItem.height > 8) {
      targetY = 8 - selectedPlacedItem.height;
    }

    const updatedPlaced = floorPlan.placedItems.map((p) => {
      if (p.placementId === selectedPlacementId) {
        return { ...p, x: targetX, y: targetY };
      }
      return p;
    });

    const updatedFp = {
      ...floorPlan,
      placedItems: updatedPlaced,
      updatedAt: new Date().toISOString()
    };

    setFloorPlan(updatedFp);
    saveFloorPlanToStorage(studentId, inventory, updatedFp);
    triggerSaveToast();
  };

  // 4. Change Color for Selected Item
  const handleChangeColor = (newColorHex: string) => {
    if (!selectedPlacementId || !selectedPlacedItem) return;

    const updatedPlaced = floorPlan.placedItems.map((p) => {
      if (p.placementId === selectedPlacementId) {
        return { ...p, primaryColor: newColorHex };
      }
      return p;
    });

    const updatedInv = inventory.map((item) => {
      if (item.instanceId === selectedPlacedItem.instanceId) {
        return { ...item, primaryColor: newColorHex };
      }
      return item;
    });

    const updatedFp = {
      ...floorPlan,
      placedItems: updatedPlaced,
      updatedAt: new Date().toISOString()
    };

    setFloorPlan(updatedFp);
    setInventory(updatedInv);
    saveFloorPlanToStorage(studentId, updatedInv, updatedFp);
    triggerSaveToast();
  };

  // 5. Handle Item Upgrade from Forge
  const handleUpgradeSuccess = (instanceId: string, nextTier: FurnitureTier, xpSpent: number, coinsSpent: number) => {
    // Deduct coins & xp
    if (onCoinsUpdated) onCoinsUpdated(userCoins - coinsSpent);
    if (onXpUpdated) onXpUpdated(userXp - xpSpent);

    const updatedInv = inventory.map((item) => {
      if (item.instanceId === instanceId) {
        return { ...item, tier: nextTier };
      }
      return item;
    });

    const updatedPlaced = floorPlan.placedItems.map((p) => {
      if (p.instanceId === instanceId) {
        return { ...p, tier: nextTier };
      }
      return p;
    });

    const updatedFp = {
      ...floorPlan,
      placedItems: updatedPlaced,
      updatedAt: new Date().toISOString()
    };

    setInventory(updatedInv);
    setFloorPlan(updatedFp);
    saveFloorPlanToStorage(studentId, updatedInv, updatedFp);

    setForgeItem(null);
    triggerSaveToast();
  };

  // Cell Click router
  const handleCellClick = (cellX: number, cellY: number) => {
    if (placingInventoryItem) {
      handlePlaceItem(cellX, cellY);
      return;
    }

    if (selectedPlacementId) {
      const clickedItem = floorPlan.placedItems.find(
        (p) =>
          cellX >= p.x &&
          cellX < p.x + p.width &&
          cellY >= p.y &&
          cellY < p.y + p.height
      );

      if (clickedItem) {
        setSelectedPlacementId(clickedItem.placementId);
      } else {
        handleMovePlacedItem(cellX, cellY);
      }
      return;
    }

    const itemAtCell = floorPlan.placedItems.find(
      (p) =>
        cellX >= p.x &&
        cellX < p.x + p.width &&
        cellY >= p.y &&
        cellY < p.y + p.height
    );

    if (itemAtCell) {
      setSelectedPlacementId(itemAtCell.placementId);
    }
  };

  // Shop Purchase
  const handleShopPurchase = async (itemCode: string) => {
    const defKey = itemCode as FurnitureDefinitionId;
    const def = FURNITURE_DEFINITIONS[defKey];

    if (!def) {
      return { success: false, message: 'Vật phẩm không tồn tại trong danh mục!' };
    }

    if (userCoins < def.priceCoins) {
      return { success: false, message: 'Bạn không đủ Xu để mua vật phẩm này!' };
    }

    const newCoins = userCoins - def.priceCoins;
    if (onCoinsUpdated) onCoinsUpdated(newCoins);

    const newItem: InventoryItem = {
      instanceId: `inv-item-${Date.now()}`,
      definitionId: def.id,
      name: def.name,
      icon: def.icon,
      category: def.category,
      primaryColor: def.availableColors[0] || '#6366f1',
      rotation: 0,
      tier: 1,
      isPlaced: false,
      acquiredAt: new Date().toISOString()
    };

    const updatedInv = [...inventory, newItem];
    setInventory(updatedInv);
    saveFloorPlanToStorage(studentId, updatedInv, floorPlan);

    return {
      success: true,
      message: `Đã mua thành công ${def.name}! Đã thêm vào Kho đồ.`
    };
  };

  const availableItems = inventory.filter((item) => !item.isPlaced);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-gradient-to-b from-slate-900 via-indigo-950/70 to-slate-950 rounded-3xl border border-indigo-500/50 shadow-2xl p-4 sm:p-6 space-y-4 text-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* 1. Header with Title, Balances & Shop Trigger */}
        <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                📐 Bản Vẽ Mặt Bằng Kiến Trúc & Thiết Kế Căn Cứ ({studentCode})
              </h3>
              <p className="text-xs text-indigo-300">
                Xoay 4 hướng (Phím R) • Nâng Cấp Cấp 1-5 Bằng XP • Rê chuột xem chỉ số
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* XP & Coin Badges */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold">
              <span className="text-emerald-400">⭐ {userXp} XP</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">💰 {userCoins} Xu</span>
            </div>

            <button
              type="button"
              onClick={() => setIsShopOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cửa Hàng</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Content Split: Left (Canvas) | Right (Inspector & Inventory) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 pr-1 custom-scrollbar items-start">
          
          {/* LEFT: Top-Down Floor Plan Canvas (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <FloorPlanCanvas
              floorPlan={floorPlan}
              selectedPlacementId={selectedPlacementId}
              onSelectItem={(id) => {
                setSelectedPlacementId(id);
                setPlacingInventoryItem(null);
              }}
              onCellClick={handleCellClick}
              hoveredCell={hoveredCell}
              onCellHover={(x, y) => setHoveredCell({ x, y })}
              placingItemFootprint={
                placingInventoryItem
                  ? {
                      definitionId: placingInventoryItem.definitionId,
                      ...getEffectiveFootprint(
                        FURNITURE_DEFINITIONS[placingInventoryItem.definitionId]?.defaultWidth || 2,
                        FURNITURE_DEFINITIONS[placingInventoryItem.definitionId]?.defaultHeight || 2,
                        placingRotation
                      ),
                      color: placingInventoryItem.primaryColor,
                      rotation: placingRotation,
                      tier: placingInventoryItem.tier || 1
                    }
                  : null
              }
              onOpenUpgradeForge={(item) => setForgeItem(item)}
              petEvolutionBranch={petEvolutionBranch}
              petLevel={petLevel}
              petEggBaseColor={petEggBaseColor}
              petGender={petGender}
            />

            {/* Instruction Tip with Shortcut */}
            <p className="text-[11px] text-slate-400 text-center mt-2 italic">
              {placingInventoryItem
                ? '👉 Nhấp ô để đặt. Bấm [Phím R] hoặc nút Xoay để đổi hướng.'
                : selectedPlacementId
                ? '👉 Nhấp ô mới để di chuyển. Bấm [Phím R] để xoay đồ.'
                : '👉 Rê chuột vào đồ vật để xem Tooltip chỉ số • Nhấp để tinh chỉnh.'}
            </p>
          </div>

          {/* RIGHT: Inspector, Upgrade Forge & Inventory Shelf (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* A. Selected Furniture Inspector */}
            {selectedPlacedItem ? (
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 space-y-3 animate-in fade-in">
                
                {/* Header of Inspector */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                      {selectedPlacedItem.icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        {selectedPlacedItem.name}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                          {TIER_CONFIGS[selectedPlacedItem.tier || 1].stars} Cấp {selectedPlacedItem.tier || 1}
                        </span>
                      </h4>
                      <span className="text-[10px] text-indigo-300 font-mono">
                        Vị trí: ({selectedPlacedItem.x}, {selectedPlacedItem.y}) • Hướng: {selectedPlacedItem.rotation || 0}°
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPlacementId(null)}
                    className="text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Bỏ chọn
                  </button>
                </div>

                {/* Buff Stat */}
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-emerald-300 font-medium">
                  ⚡ {TIER_CONFIGS[selectedPlacedItem.tier || 1].buffDescription}
                </div>

                {/* Primary Action Buttons: ROTATE, FORGE UPGRADE, REMOVE */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Rotate Button */}
                  <button
                    type="button"
                    onClick={handleRotateActive}
                    className="px-2 py-2 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-600/50 text-indigo-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-sm"
                  >
                    <RotateCw className="w-4 h-4 text-amber-300" />
                    <span>Xoay 90° (R)</span>
                  </button>

                  {/* Upgrade Forge Button */}
                  <button
                    type="button"
                    onClick={() => setForgeItem(selectedPlacedItem)}
                    className="px-2 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-md shadow-amber-500/20"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Lò Rèn 1-5 ⭐</span>
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromRoom(selectedPlacedItem.placementId)}
                    className="px-2 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Gỡ Về Kho</span>
                  </button>
                </div>

                {/* Color Palette Selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    Đổi Màu Sắc Vật Phẩm Này:
                  </span>
                  
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {PRESET_PALETTES.map((colorHex) => (
                      <button
                        key={colorHex}
                        type="button"
                        onClick={() => handleChangeColor(colorHex)}
                        className={`w-7 h-7 rounded-xl border-2 transition-transform active:scale-90 ${
                          selectedPlacedItem.primaryColor === colorHex
                            ? 'border-white scale-110 shadow-md ring-2 ring-amber-400/80'
                            : 'border-slate-800 hover:scale-105'
                        }`}
                        style={{ backgroundColor: colorHex }}
                      />
                    ))}
                  </div>
                </div>

              </div>
            ) : placingInventoryItem ? (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{placingInventoryItem.icon}</span>
                    <div>
                      <h4 className="font-bold text-xs text-white">Đang Chọn Đặt: {placingInventoryItem.name}</h4>
                      <span className="text-[10px] text-emerald-300">Hướng xoay: {placingRotation}°</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPlacingInventoryItem(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Hủy
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotateActive}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Xoay Hướng (Phím R)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForgeItem(placingInventoryItem)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Rèn Cấp</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* B. Inventory Shelf (Available Items) */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kho Đồ Sẵn Có ({availableItems.length} món)</span>
                </h4>

                <button
                  type="button"
                  onClick={() => setIsShopOpen(true)}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Mua Thêm</span>
                </button>
              </div>

              {availableItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <p>Kho đồ đang trống! Bạn đã bài trí hết các vật phẩm vào phòng.</p>
                  <button
                    type="button"
                    onClick={() => setIsShopOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                  >
                    Ghé Cửa Hàng Sắm Thêm
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                  {availableItems.map((item) => {
                    const isPlacing = placingInventoryItem?.instanceId === item.instanceId;
                    return (
                      <div
                        key={item.instanceId}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                          isPlacing
                            ? 'border-emerald-400 bg-emerald-950/40 shadow-sm'
                            : 'border-slate-800 bg-slate-950/60 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
                            <svg viewBox="0 0 120 120" className="w-full h-full block">
                              <FurnitureSvgRenderer
                                definitionId={item.definitionId}
                                width={120}
                                height={120}
                                primaryColor={item.primaryColor}
                                rotation={item.rotation || 0}
                                tier={item.tier || 1}
                              />
                            </svg>
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-xs text-white block truncate">{item.name}</span>
                            <span className="text-[9px] text-amber-300 font-semibold flex items-center gap-0.5">
                              {TIER_CONFIGS[item.tier || 1].stars} Cấp {item.tier || 1}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setForgeItem(item)}
                            className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-[10px] transition"
                            title="Lò Rèn Nâng Cấp"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isPlacing) {
                                setPlacingInventoryItem(null);
                              } else {
                                setPlacingInventoryItem(item);
                                setSelectedPlacementId(null);
                                setPlacingRotation(item.rotation || 0);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition active:scale-95 ${
                              isPlacing
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {isPlacing ? 'Hủy' : 'Đặt'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* C. Currently Placed Items Summary */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-300">Đang bài trí trong phòng:</span>
              <span className="font-bold text-indigo-300 font-mono">
                {floorPlan.placedItems.length} / 12 vị trí
              </span>
            </div>

          </div>
        </div>

        {/* 3. Footer with Autosave indicator & Close */}
        <div className="flex items-center justify-between pt-2 border-t border-indigo-900/40">
          <div className="flex items-center gap-2">
            {saveToast ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                Đã tự động lưu thành công!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                💡 Dùng phím [R] để xoay đồ nhanh. Mọi thay đổi đều được lưu tức thì.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition active:scale-95"
          >
            Hoàn Tất Thiết Kế
          </button>
        </div>

      </div>

      {/* Virtual Shop Modal */}
      <VirtualShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        userCoins={userCoins}
        userLevel={userLevel}
        onPurchase={handleShopPurchase}
      />

      {/* Item Upgrade Forge Modal */}
      <ItemUpgradeForgeModal
        isOpen={forgeItem !== null}
        onClose={() => setForgeItem(null)}
        item={forgeItem}
        userXp={userXp}
        userCoins={userCoins}
        onUpgradeSuccess={handleUpgradeSuccess}
      />
    </div>
  );
};
