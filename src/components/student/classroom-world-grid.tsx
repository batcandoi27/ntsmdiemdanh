'use client';

import React, { useState, useMemo } from 'react';
import { SvgPet } from './svg-pet';
import { EggCustomizationModal } from './egg-customization-modal';
import { AvatarDetailCard } from './avatar-detail-card';
import { LockedZoneModal } from './locked-zone-modal';
import { HouseTourModal } from './house-tour-modal';
import { HouseDirectoryModal } from './house-directory-modal';
import { useWanderingPets } from '@/hooks/use-wandering-pets';
import { ZONE_DEFINITIONS } from '@/domain/classroom-world/constants';
import { getZoneAtCoordinate, isBorderCoordinate, canPetEnterZone } from '@/domain/classroom-world/zoning';
import { PetWorldSnapshot, StudentRosterItem, ZoneDefinition, HouseTourData } from '@/domain/classroom-world/types';
import {
  generateClassroomRoster,
  buildAvatarRoster,
  buildAvatarDetailVM,
  generateHouseTourData
} from '@/domain/classroom-world/roster-builder';
import { Palette, Compass, Lock, Home } from 'lucide-react';

interface ClassroomWorldGridProps {
  className?: string; // Tên lớp hoặc CSS className
  classCode?: string; // Tên lớp (VD: '8A13')
  students?: StudentRosterItem[]; // Roster từ database (nếu có)
  currentUserLevel?: number;
  currentPetId?: string;
  myEggColor?: string;
  onEggColorChanged?: (colorHex: string) => void;
}

export const ClassroomWorldGrid: React.FC<ClassroomWorldGridProps> = ({
  className: classNameProp,
  classCode: classCodeProp,
  students,
  currentUserLevel = 1,
  currentPetId = 'std-8A13-01',
  myEggColor = '#9d4edd',
  onEggColorChanged
}) => {
  const classCode = classCodeProp || classNameProp || '8A13';
  const [hoveredPet, setHoveredPet] = useState<PetWorldSnapshot | null>(null);
  const [selectedPet, setSelectedPet] = useState<PetWorldSnapshot | null>(null);
  const [lockedZoneModalData, setLockedZoneModalData] = useState<ZoneDefinition | null>(null);
  const [houseTourData, setHouseTourData] = useState<HouseTourData | null>(null);
  const [isHouseDirectoryOpen, setIsHouseDirectoryOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [customEggColor, setCustomEggColor] = useState<string>(myEggColor);

  // 1. Roster 100% học sinh (Toàn bộ bắt đầu Level 1)
  const fullRoster = useMemo(() => {
    if (students && students.length > 0) return students;
    return generateClassroomRoster(classCode, 43);
  }, [students, classCode]);

  // 2. Chuyển đổi thành các plots và avatar state
  const initialAvatars = useMemo(() => {
    return buildAvatarRoster(fullRoster, currentPetId, customEggColor);
  }, [fullRoster, currentPetId, customEggColor]);

  // Convert sang plots cho useWanderingPets
  const plotsForHook = useMemo(() => {
    return initialAvatars.map(av => ({
      id: av.studentId,
      class_id: av.classId,
      pet_id: av.petId,
      grid_x: av.currentPosition.x,
      grid_y: av.currentPosition.y,
      plot_theme: 'meadow',
      building_item_code: 'cozy_cabin',
      decorations: [],
      updated_at: new Date().toISOString(),
      anonymous_name: av.anonymousName,
      pet_level: av.level,
      pet_branch: av.evolutionBranch,
      egg_base_color: av.eggBaseColor,
      is_hatched: av.isHatched,
      gender: av.gender
    }));
  }, [initialAvatars]);

  // 3. Hook Wandering AI
  const { pets } = useWanderingPets({
    plots: plotsForHook,
    currentPetId,
    myEggColor: customEggColor,
    intervalMs: 3500
  });

  // Gắn lại các thuộc tính stats giàu có từ fullRoster vào pets sau khi move
  const enrichedPets = useMemo(() => {
    return pets.map((p, idx) => {
      const original = initialAvatars[idx] || initialAvatars[0];
      return {
        ...p,
        studentCode: original.studentCode,
        displayCode: original.displayCode, // Rút gọn '8A13_XX'
        studentName: original.studentName,
        gender: original.gender,
        currentXp: original.currentXp,
        vitalityPercent: original.vitalityPercent,
        streakDays: original.streakDays,
        totalCoins: original.totalCoins,
        competitionScore: original.competitionScore,
        completedQuestsCount: original.completedQuestsCount,
        nicknameChangesLeft: original.nicknameChangesLeft,
        evolutionChangesLeft: original.evolutionChangesLeft,
        eggColorChangesMonth: original.eggColorChangesMonth,
        rebirthTokensCount: original.rebirthTokensCount
      };
    });
  }, [pets, initialAvatars]);

  // Map Pet theo tọa độ hiện tại: `x,y` -> PetWorldSnapshot[]
  const petsByCoordinate = useMemo(() => {
    const map = new Map<string, PetWorldSnapshot[]>();
    enrichedPets.forEach(p => {
      const key = `${p.currentPosition.x},${p.currentPosition.y}`;
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    });
    return map;
  }, [enrichedPets]);

  // Map Home Base theo tọa độ viền: `x,y` -> PetWorldSnapshot
  const homeBasesByCoordinate = useMemo(() => {
    const map = new Map<string, PetWorldSnapshot>();
    initialAvatars.forEach(av => {
      const key = `${av.homePosition.x},${av.homePosition.y}`;
      if (!map.has(key)) {
        map.set(key, av);
      }
    });
    return map;
  }, [initialAvatars]);

  const handleTileClick = (x: number, y: number) => {
    const isBorder = isBorderCoordinate({ x, y });
    const zone = getZoneAtCoordinate({ x, y });

    // A. Nếu là ô Khu Dân Cư (Nhà Riêng ở viền) -> Bật Modal Tham Quan Nhà Riêng (House Tour)
    if (isBorder) {
      const key = `${x},${y}`;
      const owner = homeBasesByCoordinate.get(key) || initialAvatars[0];
      setHouseTourData(generateHouseTourData(owner));
      return;
    }

    // B. Nếu là ô thuộc phân khu bị khóa đối với người dùng hiện tại
    if (!canPetEnterZone(currentUserLevel, zone.type)) {
      setLockedZoneModalData(zone);
      return;
    }

    // C. Nếu có thú cưng tại ô đó -> Mở xem chi tiết
    const key = `${x},${y}`;
    const petsHere = petsByCoordinate.get(key);
    if (petsHere && petsHere.length > 0) {
      setSelectedPet(petsHere[0]);
    }
  };

  const handleSaveEggColor = (colorHex: string) => {
    setCustomEggColor(colorHex);
    if (onEggColorChanged) onEggColorChanged(colorHex);
  };

  const myPet = enrichedPets.find(p => p.petId === currentPetId) || enrichedPets[0];
  const activeInspectionPet = hoveredPet || selectedPet;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-slate-950 via-indigo-950/30 to-slate-950 p-4 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
      
      {/* 1. Header Bản đồ & Thống kê Roster */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-tight">
              🏡 Metaverse Làng Lớp Học 2D ({classCode})
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700 animate-pulse">
                {fullRoster.length} Học Sinh
              </span>
            </h3>
            <p className="text-xs text-indigo-300 font-medium">
              Khởi tạo Level 1 Baseline • Nhấp vào Ô Nhà để Tham Quan Căn Cứ Học Sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Thiết Kế Mặt Bằng Nhà Riêng Của Tôi */}
          <button
            type="button"
            onClick={() => {
              const myHouse = initialAvatars.find(a => a.studentId === currentPetId) || initialAvatars[0];
              setHouseTourData(generateHouseTourData(myHouse));
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Thiết Kế Nhà Tôi</span>
          </button>

          {/* Nút Xem Danh Sách Toàn Bộ Căn Cứ Lớp */}
          <button
            type="button"
            onClick={() => setIsHouseDirectoryOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-200 font-bold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Compass className="w-3.5 h-3.5 text-amber-300" />
            <span>{fullRoster.length} Căn Cứ Lớp</span>
          </button>

          {/* Nút Tùy Biến Màu Trứng */}
          <button
            type="button"
            onClick={() => setIsColorModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Palette className="w-3.5 h-3.5 text-amber-300" />
            <span>Đổi Màu Trứng</span>
          </button>
        </div>
      </div>

      {/* 2. Zone Legend Chips (Clickable: Mở Directory cho Nhà Riêng hoặc Modal Khóa) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
        {Object.values(ZONE_DEFINITIONS).map(zone => {
          const isUnlocked = canPetEnterZone(currentUserLevel, zone.type);
          return (
            <div
              key={zone.type}
              onClick={() => {
                if (zone.type === 'residential') {
                  setIsHouseDirectoryOpen(true);
                } else if (!isUnlocked) {
                  setLockedZoneModalData(zone);
                }
              }}
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                zone.bgColorClass
              } ${zone.borderColorClass} ${
                zone.type === 'residential'
                  ? 'hover:border-amber-400 hover:bg-indigo-950/60 shadow-sm'
                  : !isUnlocked
                  ? 'opacity-65 hover:opacity-100 hover:border-rose-500/60'
                  : 'hover:brightness-110'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-base">{zone.icon}</span>
                <div className="truncate">
                  <span className="font-bold text-white block truncate">{zone.vietnameseName.split('(')[0]}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {zone.minLevel === 0 ? 'Nhà riêng (Click thăm)' : `Lv.${zone.minLevel}+`}
                  </span>
                </div>
              </div>

              {zone.type === 'residential' ? (
                <Home className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              ) : !isUnlocked ? (
                <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* 3. Lưới Bản Đồ Ma Trận 8x8 (64 Ô) (Mobile Scroll-Safe) */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-2">
        <div className="relative aspect-square w-full min-w-[340px] max-w-2xl mx-auto rounded-2xl border-2 border-indigo-500/50 bg-slate-950 p-2 sm:p-3 shadow-inner overflow-hidden">
          
          {/* Background Grid Cells */}
          <div className="grid grid-cols-8 grid-rows-8 gap-1.5 sm:gap-2 w-full h-full">
            {Array.from({ length: 8 }).map((_, rIdx) =>
              Array.from({ length: 8 }).map((_, cIdx) => {
                const zone = getZoneAtCoordinate({ x: cIdx, y: rIdx });
                const isBorder = isBorderCoordinate({ x: cIdx, y: rIdx });
                const isUnlocked = isBorder || canPetEnterZone(currentUserLevel, zone.type);
                const key = `${cIdx},${rIdx}`;

                return (
                  <div
                    key={key}
                    onClick={() => handleTileClick(cIdx, rIdx)}
                    className={`relative rounded-xl border transition-all duration-200 flex flex-col items-center justify-center p-1 cursor-pointer select-none overflow-hidden min-h-[40px] min-w-[40px] ${
                      zone.bgColorClass
                    } ${zone.borderColorClass} ${
                      !isUnlocked
                        ? 'bg-slate-950/90 border-rose-900/40 backdrop-blur-sm'
                        : isBorder
                        ? 'hover:scale-105 hover:z-20 hover:border-amber-400/80 hover:bg-indigo-950/60'
                        : 'hover:scale-105 hover:z-20 hover:brightness-125'
                    }`}
                  >
                    {/* Fog of War & Lock Icon for Locked Zone Cells */}
                    {!isUnlocked ? (
                      <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center pointer-events-none">
                        <Lock className="w-3.5 h-3.5 text-rose-400/80 mb-0.5" />
                        <span className="text-[7px] font-black text-rose-300 uppercase tracking-tighter">
                          Lv.{zone.minLevel}+
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Zone Icon Background Watermark */}
                        {!isBorder ? (
                          <span className="absolute text-slate-800/40 text-xl font-bold pointer-events-none select-none">
                            {zone.icon}
                          </span>
                        ) : (
                          <span className="absolute text-amber-500/30 text-xs font-bold pointer-events-none select-none top-1 right-1">
                            🏠
                          </span>
                        )}

                        {/* Tọa độ nhỏ */}
                        <span className="absolute top-1 left-1 text-[8px] font-mono text-slate-600/80">
                          {cIdx},{rIdx}
                        </span>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Layer Render Toàn Bộ Học Sinh / Linh Vật Di Chuyển Mượt */}
          {enrichedPets.map((pet) => {
            const isMe = pet.petId === currentPetId;
            const leftPercent = (pet.currentPosition.x / 8) * 100;
            const topPercent = (pet.currentPosition.y / 8) * 100;
            const widthPercent = (1 / 8) * 100;

            return (
              <div
                key={pet.petId}
                onMouseEnter={() => setHoveredPet(pet)}
                onMouseLeave={() => setHoveredPet(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPet(pet);
                }}
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${widthPercent}%`,
                  transition: 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1)'
                }}
                className="absolute p-0.5 pointer-events-auto cursor-pointer z-30 flex flex-col items-center justify-center group"
              >
                <div
                  style={{
                    transform: `scaleX(${pet.facingDirection})`,
                    transition: 'transform 0.3s ease'
                  }}
                  className="flex flex-col items-center justify-center relative"
                >
                  {/* Indicator 'Tôi' */}
                  {isMe && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[8px] shadow-md animate-bounce whitespace-nowrap z-40">
                      Tôi
                    </div>
                  )}

                  <SvgPet
                    branch={pet.evolutionBranch}
                    level={pet.level}
                    customColor={pet.eggBaseColor}
                    gender={pet.gender}
                    size={28}
                    className="filter drop-shadow-md group-hover:scale-125 transition-transform"
                  />

                  {/* Nhãn định danh rút gọn trực quan: 8A13_XX */}
                  <span
                    style={{ transform: `scaleX(${pet.facingDirection})` }}
                    className={`text-[8px] font-black truncate max-w-[54px] text-center leading-tight px-1 rounded-md mt-0.5 shadow-sm ${
                      isMe
                        ? 'text-amber-300 bg-slate-950 border border-amber-400/60'
                        : pet.level === 0
                        ? 'text-purple-300 bg-slate-950/90 border border-purple-800/60'
                        : 'text-slate-200 bg-slate-950/85 border border-slate-800'
                    }`}
                  >
                    {pet.displayCode}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Responsive Popover / Mobile Bottom Sheet Drawer */}
      {activeInspectionPet && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 p-2 sm:p-0 flex justify-center animate-in fade-in">
          <AvatarDetailCard
            vm={buildAvatarDetailVM(activeInspectionPet)}
            isCurrentUser={activeInspectionPet.petId === currentPetId}
            isMobileDrawer={true}
            onClose={() => {
              setHoveredPet(null);
              setSelectedPet(null);
            }}
          />
        </div>
      )}

      {/* 6. Modal Danh Sách 28 Căn Hộ Lớp Học (House Directory) */}
      <HouseDirectoryModal
        isOpen={isHouseDirectoryOpen}
        onClose={() => setIsHouseDirectoryOpen(false)}
        houses={initialAvatars}
        currentPetId={currentPetId}
        onSelectHouse={(selectedHouse) => {
          setHouseTourData(generateHouseTourData(selectedHouse));
        }}
      />

      {/* 7. Modal Tham Quan Bản Thiết Kế Nhà Riêng (House Tour) */}
      <HouseTourModal
        isOpen={houseTourData !== null}
        onClose={() => setHouseTourData(null)}
        data={houseTourData}
        isOwner={houseTourData?.ownerStudentId === currentPetId}
        userCoins={35}
        userLevel={currentUserLevel}
      />

      {/* 8. Modal Cảnh Báo Phân Khu Đang Bị Khóa (Level-gating Feedback) */}
      <LockedZoneModal
        isOpen={lockedZoneModalData !== null}
        onClose={() => setLockedZoneModalData(null)}
        zone={lockedZoneModalData}
        currentUserLevel={currentUserLevel}
      />

      {/* 9. Modal Tùy Biến Màu Sắc Quả Trứng */}
      <EggCustomizationModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        currentColor={customEggColor}
        branch={myPet?.evolutionBranch || 'cosmic'}
        onSaveColor={handleSaveEggColor}
      />
    </div>
  );
};
