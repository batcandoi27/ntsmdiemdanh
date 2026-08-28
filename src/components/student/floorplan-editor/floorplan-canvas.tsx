'use client';

import React, { useState } from 'react';
import { PlacedFurniture, RoomFloorPlan, Rotation, FurnitureTier, TIER_CONFIGS, FurnitureDefinitionId } from '@/domain/floorplan/types';
import { FurnitureSvgRenderer } from './furniture-svg-renderer';
import { SvgPet } from '../svg-pet';
import { StudentGender } from '@/domain/classroom-world/types';
import { FURNITURE_DEFINITIONS } from '@/domain/floorplan/inventory-store';

interface FloorPlanCanvasProps {
  floorPlan: RoomFloorPlan;
  selectedPlacementId?: string | null;
  onSelectItem?: (placementId: string | null) => void;
  onCellClick?: (x: number, y: number) => void;
  hoveredCell?: { x: number; y: number } | null;
  onCellHover?: (x: number, y: number) => void;
  placingItemFootprint?: { width: number; height: number; color: string; definitionId: FurnitureDefinitionId; rotation?: Rotation; tier?: FurnitureTier } | null;
  isReadOnly?: boolean;
  petEvolutionBranch?: 'cosmic' | 'nature' | 'cyber';
  petLevel?: number;
  petEggBaseColor?: string;
  petGender?: StudentGender;
  onOpenUpgradeForge?: (item: PlacedFurniture) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  floorPlan,
  selectedPlacementId = null,
  onSelectItem,
  onCellClick,
  hoveredCell = null,
  onCellHover,
  placingItemFootprint,
  isReadOnly = false,
  petEvolutionBranch = 'cosmic',
  petLevel = 1,
  petEggBaseColor = '#9d4edd',
  petGender = 'female',
  onOpenUpgradeForge
}) => {
  const [hoveredFurniture, setHoveredFurniture] = useState<PlacedFurniture | null>(null);

  const getRotationLabel = (rot: Rotation) => {
    switch (rot) {
      case 0: return '0° (Bắc)';
      case 90: return '90° (Đông)';
      case 180: return '180° (Nam)';
      case 270: return '270° (Tây)';
      default: return '0°';
    }
  };

  return (
    <div className="relative select-none flex flex-col items-center justify-center p-2 sm:p-4 rounded-3xl bg-slate-950 border-2 border-indigo-500/50 shadow-2xl overflow-hidden">
      
      {/* Blueprint Grid SVG Viewport */}
      <svg
        viewBox="0 0 520 520"
        className="w-full max-w-[480px] h-auto block"
        style={{ filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.8))' }}
      >
        <defs>
          {/* Blueprint Grid Pattern */}
          <pattern id="cadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="#090d16" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx="30" cy="30" r="1.5" fill="#334155" />
          </pattern>

          {/* Pedestal Aura Glow Filter */}
          <filter id="pedestalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial Light on Center Stage */}
          <radialGradient id="centerAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#090d16" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Background */}
        <rect x="0" y="0" width="520" height="520" fill="#040711" />

        {/* Main Floor Grid (x: 20..500, y: 20..500) */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="480" height="480" fill="url(#cadGrid)" />

          {/* Perimeter Architectural Thick Walls */}
          <rect x="0" y="0" width="480" height="480" fill="none" stroke="#6366f1" strokeWidth="8" />

          {/* Top Window 1 & 2 */}
          <rect x="100" y="-4" width="80" height="8" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
          <rect x="300" y="-4" width="80" height="8" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />

          {/* Bottom Doorway & Swing Arc (Entry Door) */}
          <rect x="210" y="476" width="60" height="8" fill="#090d16" />
          <path d="M 210,480 A 60 60 0 0 1 270,420" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" fill="none" />
          <line x1="210" y1="480" x2="270" y2="420" stroke="#f59e0b" strokeWidth="3" />

          {/* ============================================================ */}
          {/* CENTER STAGE: CARVED PEDESTAL & LIVE 2D/3D SVGPET AVATAR */}
          {/* ============================================================ */}
          <g id="centerPetStage" transform="translate(180, 180)">
            <circle cx="60" cy="60" r="58" fill="url(#centerAura)" filter="url(#pedestalGlow)" />
            <circle cx="60" cy="60" r="44" fill="#0f172a" stroke="#818cf8" strokeWidth="2.5" strokeDasharray="6,3" />
            <circle cx="60" cy="60" r="32" fill="#1e1b4b" stroke="#c084fc" strokeWidth="1.5" />

            <foreignObject x="12" y="12" width="96" height="96" className="pointer-events-none">
              <div className="w-full h-full flex items-center justify-center filter drop-shadow-[0_0_15px_rgba(192,132,252,0.8)] animate-pulse">
                <SvgPet
                  branch={petEvolutionBranch}
                  level={petLevel}
                  customColor={petEggBaseColor}
                  gender={petGender}
                  size={76}
                />
              </div>
            </foreignObject>

            <rect x="22" y="98" width="76" height="16" rx="6" fill="#020617" stroke="#818cf8" strokeWidth="1" />
            <text x="60" y="110" fill="#e0e7ff" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">
              👑 LINH VẬT
            </text>
          </g>

          {/* Interactive Grid Hover & Click Cells */}
          {Array.from({ length: 8 }).map((_, rIdx) =>
            Array.from({ length: 8 }).map((_, cIdx) => {
              const x = cIdx * 60;
              const y = rIdx * 60;
              const isHovered = hoveredCell?.x === cIdx && hoveredCell?.y === rIdx;

              return (
                <rect
                  key={`cell-${cIdx}-${rIdx}`}
                  x={x}
                  y={y}
                  width="60"
                  height="60"
                  fill={isHovered && !isReadOnly ? 'rgba(99, 102, 241, 0.15)' : 'transparent'}
                  stroke={isHovered && !isReadOnly ? '#818cf8' : 'transparent'}
                  strokeWidth="1.5"
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => onCellHover?.(cIdx, rIdx)}
                  onClick={() => onCellClick?.(cIdx, rIdx)}
                />
              );
            })
          )}

          {/* ============================================================ */}
          {/* PLACED FURNITURE: DETAILED VECTOR SVG GRAPHICS + ROTATION + TIER */}
          {/* ============================================================ */}
          {floorPlan.placedItems.map((item) => {
            const px = item.x * 60;
            const py = item.y * 60;
            const pw = item.width * 60;
            const ph = item.height * 60;
            const isSelected = selectedPlacementId === item.placementId;
            const tierConfig = TIER_CONFIGS[item.tier || 1];

            return (
              <g
                key={item.placementId}
                transform={`translate(${px}, ${py})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem?.(item.placementId);
                }}
                onMouseEnter={() => setHoveredFurniture(item)}
                onMouseLeave={() => setHoveredFurniture(null)}
                className="cursor-pointer group"
              >
                {/* Selection Glow Indicator */}
                {isSelected && (
                  <rect
                    x="-4"
                    y="-4"
                    width={pw + 8}
                    height={ph + 8}
                    rx="10"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    strokeDasharray="6,3"
                    className="animate-pulse"
                  />
                )}

                {/* Top-Down Vector Artwork with Rotation and Tier Evolution */}
                <FurnitureSvgRenderer
                  definitionId={item.definitionId}
                  width={pw}
                  height={ph}
                  primaryColor={item.primaryColor}
                  rotation={item.rotation || 0}
                  tier={item.tier || 1}
                  isSelected={isSelected}
                />

                {/* Tier Stars Badge on Furniture */}
                <g transform={`translate(4, 4)`}>
                  <rect x="0" y="0" width={Math.max(28, (item.tier || 1) * 9)} height="13" rx="4" fill="#020617" stroke="#fbbf24" strokeWidth="0.8" opacity="0.9" />
                  <text x={Math.max(14, (item.tier || 1) * 4.5)} y="9.5" fill="#facc15" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">
                    {tierConfig.stars}
                  </text>
                </g>

                {/* Coordinate & Rotation Badge on Selected Item */}
                {isSelected && (
                  <g transform={`translate(${pw / 2 - 32}, -18)`}>
                    <rect x="0" y="0" width="64" height="16" rx="4" fill="#020617" stroke="#f59e0b" strokeWidth="1" />
                    <text x="32" y="11.5" fill="#fbbf24" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      ({item.x},{item.y}) • {item.rotation || 0}°
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ============================================================ */}
          {/* PLACEMENT GHOST PREVIEW ON CELL HOVER */}
          {/* ============================================================ */}
          {placingItemFootprint && hoveredCell && (
            <g transform={`translate(${hoveredCell.x * 60}, ${hoveredCell.y * 60})`} className="pointer-events-none opacity-85">
              <FurnitureSvgRenderer
                definitionId={placingItemFootprint.definitionId}
                width={placingItemFootprint.width * 60}
                height={placingItemFootprint.height * 60}
                primaryColor={placingItemFootprint.color}
                rotation={placingItemFootprint.rotation || 0}
                tier={placingItemFootprint.tier || 1}
              />
              <rect
                x="2"
                y="2"
                width={placingItemFootprint.width * 60 - 4}
                height={placingItemFootprint.height * 60 - 4}
                rx="8"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="4,2"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Coordinate Axis Labels */}
          {Array.from({ length: 8 }).map((_, i) => (
            <React.Fragment key={`coords-${i}`}>
              <text x={i * 60 + 30} y="-10" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                X:{i}
              </text>
              <text x="-12" y={i * 60 + 34} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                Y:{i}
              </text>
            </React.Fragment>
          ))}
        </g>
      </svg>

      {/* ============================================================ */}
      {/* SMART HOVER TOOLTIP CARD */}
      {/* ============================================================ */}
      {hoveredFurniture && (
        <div className="absolute top-4 left-4 z-40 p-3 rounded-2xl bg-slate-900/95 border-2 border-amber-400/80 shadow-2xl backdrop-blur-md max-w-[260px] animate-in fade-in zoom-in-95 pointer-events-none text-slate-100 space-y-1">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{hoveredFurniture.icon}</span>
              <span className="font-black text-xs text-white">{hoveredFurniture.name}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
              {TIER_CONFIGS[hoveredFurniture.tier || 1].stars} Cấp {hoveredFurniture.tier || 1}
            </span>
          </div>

          <div className="text-[10px] text-indigo-300 space-y-0.5 pt-0.5">
            <div>📐 Vị trí: <span className="font-mono font-bold text-white">({hoveredFurniture.x}, {hoveredFurniture.y})</span> • Hướng: <span className="font-bold text-amber-300">{getRotationLabel(hoveredFurniture.rotation || 0)}</span></div>
            <div className="text-emerald-400 font-medium pt-0.5">
              ⚡ {TIER_CONFIGS[hoveredFurniture.tier || 1].buffDescription}
            </div>
          </div>
        </div>
      )}

      {/* Blueprint Legend */}
      <div className="mt-2 text-center text-[11px] text-slate-400 font-mono flex items-center justify-center gap-3 flex-wrap">
        <span>📐 Mặt Bằng 8x8 Ô</span>
        <span>•</span>
        <span>🔄 Phím R: Xoay Đồ</span>
        <span>•</span>
        <span>⚡ Lò Rèn Cấp 1-5</span>
      </div>

    </div>
  );
};
