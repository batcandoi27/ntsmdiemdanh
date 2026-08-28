'use client';

import React, { useState } from 'react';
import { ClassroomWorldGrid } from '@/components/student/classroom-world-grid';
import { VirtualShopModal } from '@/components/student/virtual-shop-modal';
import { StudentWorldPlot } from '@/types/student-portal';
import { purchaseShopItemAction } from '@/app/actions/student-actions';

export default function StudentMapPage() {
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [userCoins, setUserCoins] = useState(35);
  const [userLevel] = useState(2);

  const [plots, setPlots] = useState<StudentWorldPlot[]>([
    {
      id: 'plot-1',
      class_id: '8A13',
      pet_id: 'mock-pet',
      grid_x: 0,
      grid_y: 2,
      plot_theme: 'meadow',
      building_item_code: 'cozy_cabin',
      decorations: [],
      updated_at: new Date().toISOString(),
      anonymous_name: 'Phượng Hoàng Băng #821',
      pet_level: 2,
      pet_branch: 'cosmic',
      egg_base_color: '#9d4edd',
      is_hatched: true
    },
    {
      id: 'plot-2',
      class_id: '8A13',
      pet_id: 'pet-2',
      grid_x: 7,
      grid_y: 2,
      plot_theme: 'meadow',
      building_item_code: 'space_pod',
      decorations: [],
      updated_at: new Date().toISOString(),
      anonymous_name: 'Rồng Lửa #104',
      pet_level: 5,
      pet_branch: 'cyber',
      egg_base_color: '#e85d04',
      is_hatched: true
    },
    {
      id: 'plot-3',
      class_id: '8A13',
      pet_id: 'pet-3',
      grid_x: 3,
      grid_y: 0,
      plot_theme: 'meadow',
      building_item_code: 'magic_tree',
      decorations: [],
      updated_at: new Date().toISOString(),
      anonymous_name: 'Kỳ Lân Rừng #552',
      pet_level: 3,
      pet_branch: 'nature',
      egg_base_color: '#2b9348',
      is_hatched: true
    },
    {
      id: 'plot-4',
      class_id: '8A13',
      pet_id: 'pet-4',
      grid_x: 0,
      grid_y: 5,
      plot_theme: 'meadow',
      building_item_code: 'cozy_cabin',
      decorations: [],
      updated_at: new Date().toISOString(),
      anonymous_name: 'Trứng Thần Bí #312',
      pet_level: 0,
      pet_branch: 'cosmic',
      egg_base_color: '#ff007f',
      is_hatched: false
    },
    {
      id: 'plot-5',
      class_id: '8A13',
      pet_id: 'pet-5',
      grid_x: 5,
      grid_y: 7,
      plot_theme: 'meadow',
      building_item_code: 'cozy_cabin',
      decorations: [],
      updated_at: new Date().toISOString(),
      anonymous_name: 'Trứng Ngọc Bích #774',
      pet_level: 0,
      pet_branch: 'nature',
      egg_base_color: '#00f5d4',
      is_hatched: false
    },
    {
      id: 'plot-6',
      class_id: '8A13',
      pet_id: 'pet-6',
      grid_x: 7,
      grid_y: 5,
      plot_theme: 'meadow',
      building_item_code: 'space_pod',
      decorations: [],
      updated_at: new Date().toISOString(),
      anonymous_name: 'Sư Tử Điện #901',
      pet_level: 12,
      pet_branch: 'cyber',
      egg_base_color: '#e0a96d',
      is_hatched: true
    }
  ]);

  const handlePurchase = async (itemCode: string) => {
    const res = await purchaseShopItemAction('mock-pet', itemCode);
    if (res.success) {
      setUserCoins(prev => prev - 20); // Giả lập trừ coins
      setPlots(prev => prev.map(p => p.pet_id === 'mock-pet' ? { ...p, building_item_code: itemCode } : p));
    }
    return res;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            🏡 Làng Lớp Học 2D (Classroom Metaverse)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Không gian cộng đồng 64 ô đất của lớp • Xây dựng căn cứ và ghé thăm bạn bè ẩn danh
          </p>
        </div>

        <button
          onClick={() => setIsShopOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
        >
          <span>🛍️</span>
          <span>Mở Cửa Hàng Vật Phẩm</span>
        </button>
      </div>

      {/* Metaverse Grid với 100% Học Sinh Lớp 8A13 */}
      <ClassroomWorldGrid
        className="8A13"
        currentUserLevel={userLevel}
        currentPetId="std-8A13-01"
      />

      {/* Modal Shop */}
      <VirtualShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        userCoins={userCoins}
        userLevel={userLevel}
        onPurchase={handlePurchase}
      />
    </div>
  );
}
