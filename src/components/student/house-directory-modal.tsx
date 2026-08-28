'use client';

import React, { useState } from 'react';
import { PetWorldSnapshot } from '@/domain/classroom-world/types';
import { generateHouseTourData } from '@/domain/classroom-world/roster-builder';
import { SvgPet } from './svg-pet';
import { Home, Sparkles, X, ChevronRight, Heart, Search, Filter, MapPin } from 'lucide-react';

interface HouseDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  houses: PetWorldSnapshot[];
  onSelectHouse: (pet: PetWorldSnapshot) => void;
  currentPetId?: string;
}

export const HouseDirectoryModal: React.FC<HouseDirectoryModalProps> = ({
  isOpen,
  onClose,
  houses,
  onSelectHouse,
  currentPetId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<'all' | 'zoneA' | 'zoneB'>('all');

  if (!isOpen) return null;

  const filteredHouses = houses.filter((h, idx) => {
    const isZoneA = idx < 22;
    const isZoneB = idx >= 22;
    const matchZone =
      selectedZone === 'all' ||
      (selectedZone === 'zoneA' && isZoneA) ||
      (selectedZone === 'zoneB' && isZoneB);

    const matchSearch =
      h.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.anonymousName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchZone && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-gradient-to-b from-slate-900 via-indigo-950/60 to-slate-950 rounded-3xl border border-indigo-500/50 shadow-2xl p-4 sm:p-6 space-y-4 text-slate-100 max-h-[92vh] flex flex-col">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                🏡 Khu Dân Cư — Danh Sách {houses.length} Căn Cứ Lớp Học
              </h3>
              <p className="text-xs text-indigo-300">
                Toàn bộ {houses.length} học sinh đều sở hữu căn cứ riêng biệt • Nhấp để tham quan & thiết kế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Search & Zone Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Zone Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSelectedZone('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedZone === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất Cả ({houses.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedZone('zoneA')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedZone === 'zoneA'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Khu Phố A (Căn 01-22)
            </button>
            <button
              type="button"
              onClick={() => setSelectedZone('zoneB')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedZone === 'zoneB'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Khu Phố B (Căn 23-{houses.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã hoặc bí danh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>
        </div>

        {/* 3. Houses Grid (All 43+ Houses) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pr-1 custom-scrollbar">
          {filteredHouses.map((house, idx) => {
            const tour = generateHouseTourData(house);
            const isMe = house.petId === currentPetId;
            const addressCode = idx < 22 ? `A-${String(idx + 1).padStart(2, '0')}` : `B-${String(idx + 1).padStart(2, '0')}`;

            return (
              <div
                key={house.petId}
                onClick={() => {
                  onSelectHouse(house);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between gap-3 ${
                  isMe
                    ? 'border-amber-400/80 bg-amber-950/30 shadow-lg shadow-amber-950/40'
                    : 'border-slate-800 bg-slate-900/80 hover:border-indigo-500/60 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <SvgPet
                      branch={house.evolutionBranch}
                      level={house.level}
                      customColor={house.eggBaseColor}
                      gender={house.gender}
                      size={44}
                    />
                    {isMe && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[8px]">
                        Tôi
                      </span>
                    )}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-white">{house.studentCode}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold font-mono">
                        {addressCode}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-semibold">
                        {house.gender === 'female' ? '🌸 Nữ' : '⚡ Nam'}
                      </span>
                    </div>
                    <span className="text-[11px] text-indigo-300 font-bold block truncate mt-0.5">
                      {tour.themeIcon} {tour.themeName}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {house.anonymousName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span>Tọa độ ({house.homePosition.x}, {house.homePosition.y})</span>
                  </div>

                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1 hover:text-white transition">
                    <span>Ghé Thăm</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-indigo-900/40 text-xs text-slate-400">
          <span>Đang hiển thị {filteredHouses.length} / {houses.length} căn cứ học sinh</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
