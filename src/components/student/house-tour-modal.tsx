'use client';

import React, { useState } from 'react';
import { HouseTourData } from '@/domain/classroom-world/types';
import { IsometricRoomView } from './isometric-room-view';
import { FloorPlanCanvas } from './floorplan-editor/floorplan-canvas';
import { RoomEditorModal } from './floorplan-editor/room-editor-modal';
import { getInitialFloorPlan } from '@/domain/floorplan/inventory-store';
import { VirtualShopModal } from './virtual-shop-modal';
import { TimeOfDay, resolveTimeOfDay, SCENE_THEMES } from '@/domain/floorplan/scene-time';
import {
  Heart,
  Sparkles,
  Trophy,
  Users,
  X,
  MapPin,
  Compass,
  Edit3,
  ShoppingBag,
  Layers,
  Eye,
  Sun,
  Sunset,
  Moon,
  Clock
} from 'lucide-react';

interface HouseTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HouseTourData | null;
  isOwner?: boolean;
  userCoins?: number;
  userLevel?: number;
  onCoinsUpdated?: (coins: number) => void;
}

export const HouseTourModal: React.FC<HouseTourModalProps> = ({
  isOpen,
  onClose,
  data,
  isOwner = false,
  userCoins = 35,
  userLevel = 1,
  onCoinsUpdated
}) => {
  const [hasHearted, setHasHearted] = useState(false);
  const [heartCount, setHeartCount] = useState(data ? data.heartsCount : 0);
  const [viewMode, setViewMode] = useState<'isometric' | 'blueprint'>('blueprint'); // Default to Blueprint top-down!
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

  if (!isOpen || !data) return null;

  const handleHeartClick = () => {
    if (hasHearted) {
      setHeartCount((prev) => prev - 1);
      setHasHearted(false);
    } else {
      setHeartCount((prev) => prev + 1);
      setHasHearted(true);
    }
  };

  // Get floor plan data for top-down canvas & isometric view
  const { floorPlan } = getInitialFloorPlan(data.ownerStudentId, data.ownerStudentCode);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-gradient-to-b from-slate-900 via-indigo-950/80 to-slate-950 rounded-t-3xl sm:rounded-3xl border border-indigo-500/50 shadow-2xl p-4 sm:p-6 space-y-4 text-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-md text-2xl shrink-0">
              {data.themeIcon || '🏠'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  {data.ownerStudentCode} — {data.themeName}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700 font-bold">
                  {data.gender === 'female' ? '🌸 Nữ' : '⚡ Nam'}
                </span>
                {isOwner && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-sm">
                    Góc Tự Học Của Bạn
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-300 font-bold mt-0.5">{data.anonymousName} • Góc Học Tập Sáng Tạo</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Clock Lighting Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-indigo-900/80 text-xs text-amber-300 font-mono shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-bold">
                {resolveTimeOfDay() === 'day' ? '🌅 Buổi Sáng' : resolveTimeOfDay() === 'dusk' ? '🌇 Buổi Chiều' : '🌙 Buổi Tối'} (Tự Động)
              </span>
            </div>

            {/* View Mode Toggle: Blueprint Top-Down vs Isometric */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-indigo-900/80 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('blueprint')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                  viewMode === 'blueprint'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mặt Bằng 2D</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('isometric')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                  viewMode === 'isometric'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phối Cảnh 3D</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Room Content View */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          {viewMode === 'isometric' ? (
            /* Isometric 2.5D View with Synchronized Placed Items & Day/Dusk/Night Lighting */
            <IsometricRoomView
              theme={data.theme}
              level={data.petLevel}
              evolutionBranch={data.evolutionBranch}
              eggBaseColor={data.eggBaseColor}
              gender={data.gender}
              anonymousName={data.anonymousName}
              welcomeMessage={data.welcomeMessage}
              placedItems={floorPlan.placedItems}
            />
          ) : (
            /* Blueprint 2D CAD Top-Down View */
            <div className="space-y-3">
              <div className="bg-slate-950/90 rounded-2xl border border-indigo-500/30 p-2 sm:p-4 flex flex-col items-center">
                <div className="w-full flex items-center justify-between px-2 pb-2 text-xs text-indigo-300 border-b border-slate-800 mb-2">
                  <span className="font-bold">📐 Bản Vẽ Phối Cảnh Mặt Bằng Kiến Trúc (Lưới CAD 8x8)</span>
                  <span className="font-mono text-[11px] text-amber-400">
                    {floorPlan.placedItems.length} Món Đồ Đã Đặt
                  </span>
                </div>
                <FloorPlanCanvas
                  floorPlan={floorPlan}
                  petEvolutionBranch={data.evolutionBranch}
                  petLevel={data.petLevel}
                  petEggBaseColor={data.eggBaseColor}
                  petGender={data.gender}
                />
              </div>
            </div>
          )}

          {/* 3. Action Toolbar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {/* Thả tim */}
              <button
                type="button"
                onClick={handleHeartClick}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-md ${
                  hasHearted
                    ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-400'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-rose-500/50'
                }`}
              >
                <Heart className={`w-4 h-4 ${hasHearted ? 'fill-white' : 'text-rose-400'}`} />
                <span>Thả Tim ({heartCount})</span>
              </button>

              {/* Mua Sắm Nội Thất */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsShopOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-200 flex items-center gap-2 transition active:scale-95 shadow-md"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                  <span>Cửa Hàng Nội Thất</span>
                </button>
              )}
            </div>

            {/* Chỉnh Sửa / Thiết Kế Nhà Của Bạn */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Mở Bộ Thiết Kế Căn Cứ</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 4. Room Editor Modal */}
      {isEditorOpen && (
        <RoomEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          studentId={data.ownerStudentId}
          studentCode={data.ownerStudentCode}
          userCoins={userCoins}
          userLevel={userLevel}
          petEvolutionBranch={data.evolutionBranch}
          petLevel={data.petLevel}
          petEggBaseColor={data.eggBaseColor}
          petGender={data.gender}
        />
      )}

      {/* 5. Virtual Shop Modal */}
      {isShopOpen && (
        <VirtualShopModal
          isOpen={isShopOpen}
          onClose={() => setIsShopOpen(false)}
          userCoins={userCoins}
          userLevel={userLevel}
          onPurchase={async (itemCode) => {
            return { success: true, message: 'Đã mua thành công vật phẩm vào kho đồ!' };
          }}
        />
      )}
    </div>
  );
};
