'use client';

import React from 'react';
import { HouseThemeType, StudentGender } from '@/domain/classroom-world/types';
import { PlacedFurniture, FurnitureDefinitionId } from '@/domain/floorplan/types';
import { SvgPet } from './svg-pet';
import {
  TimeOfDay,
  resolveTimeOfDay,
  SCENE_THEMES,
  projectToIsometric
} from '@/domain/floorplan/scene-time';
import { FURNITURE_DEFINITIONS } from '@/domain/floorplan/inventory-store';

interface IsometricRoomViewProps {
  theme: HouseThemeType;
  level: number;
  evolutionBranch: 'cosmic' | 'nature' | 'cyber';
  eggBaseColor?: string;
  gender: StudentGender;
  anonymousName: string;
  welcomeMessage: string;
  placedItems?: PlacedFurniture[];
  className?: string;
}

export const IsometricRoomView: React.FC<IsometricRoomViewProps> = ({
  theme,
  level,
  evolutionBranch,
  eggBaseColor = '#9d4edd',
  gender,
  anonymousName,
  welcomeMessage,
  placedItems = [],
  className = ''
}) => {
  // 100% Tự động xác định buổi theo giờ thực tế của thiết bị
  const timeOfDay: TimeOfDay = resolveTimeOfDay();
  const currentScene = SCENE_THEMES[timeOfDay] || SCENE_THEMES.day;

  // Theme Color Tokens
  const themeStyles = {
    cozy_wood: {
      wallFill: '#24140e',
      wallEdge: '#3b2216',
      plankColor: '#2f1a10',
      plankLine: '#1a0d08',
      floorColor: '#361e12',
      floorPlanks: ['#301b10', '#3b2114', '#2b180f', '#382013'],
      windowBg: '#0f172a',
      windowMoon: '#38bdf8',
      windowFrame: '#5c3a21',
      rugFill: '#502a18',
      rugBorder: '#78350f',
      bedWood: '#452210',
      bedSheet: '#6b21a8',
      bedPillow: '#f8fafc',
      tableWood: '#452210',
      tableTop: '#5a2d15',
      pedestalBase: '#33231a',
      pedestalTop: '#4a3327',
      pedestalRune: '#f59e0b',
      auraColor: '#a855f7',
      foliageColor: '#15803d',
      runeColor: '#60a5fa'
    },
    space_pod: {
      wallFill: '#090d16',
      wallEdge: '#1e293b',
      plankColor: '#0f172a',
      plankLine: '#020617',
      floorColor: '#090e17',
      floorPlanks: ['#0f172a', '#1e293b', '#0b1329', '#111c38'],
      windowBg: '#020617',
      windowMoon: '#818cf8',
      windowFrame: '#38bdf8',
      rugFill: '#1e1b4b',
      rugBorder: '#6366f1',
      bedWood: '#1e293b',
      bedSheet: '#0284c7',
      bedPillow: '#e0e7ff',
      tableWood: '#1e293b',
      tableTop: '#0f172a',
      pedestalBase: '#1e293b',
      pedestalTop: '#334155',
      pedestalRune: '#38bdf8',
      auraColor: '#38bdf8',
      foliageColor: '#06b6d4',
      runeColor: '#38bdf8'
    },
    crystal_castle: {
      wallFill: '#1e102a',
      wallEdge: '#3b1d54',
      plankColor: '#2d1440',
      plankLine: '#160820',
      floorColor: '#2b133d',
      floorPlanks: ['#2e1642', '#391b52', '#240f36', '#35194d'],
      windowBg: '#0f051d',
      windowMoon: '#e879f9',
      windowFrame: '#c084fc',
      rugFill: '#4c1d95',
      rugBorder: '#a855f7',
      bedWood: '#581c87',
      bedSheet: '#9333ea',
      bedPillow: '#faf5ff',
      tableWood: '#581c87',
      tableTop: '#6b21a8',
      pedestalBase: '#4c1d95',
      pedestalTop: '#6b21a8',
      pedestalRune: '#f472b6',
      auraColor: '#c084fc',
      foliageColor: '#d946ef',
      runeColor: '#e879f9'
    },
    fairy_garden: {
      wallFill: '#062015',
      wallEdge: '#0f3925',
      plankColor: '#0b2b1d',
      plankLine: '#03140d',
      floorColor: '#0d3322',
      floorPlanks: ['#0e3825', '#144730', '#0a291c', '#113e2a'],
      windowBg: '#021e14',
      windowMoon: '#34d399',
      windowFrame: '#10b981',
      rugFill: '#064e3b',
      rugBorder: '#10b981',
      bedWood: '#14532d',
      bedSheet: '#059669',
      bedPillow: '#ecfdf5',
      tableWood: '#14532d',
      tableTop: '#166534',
      pedestalBase: '#064e3b',
      pedestalTop: '#047857',
      pedestalRune: '#34d399',
      auraColor: '#10b981',
      foliageColor: '#22c55e',
      runeColor: '#6ee7b7'
    }
  }[theme] || {
    wallFill: '#24140e',
    wallEdge: '#3b2216',
    plankColor: '#2f1a10',
    plankLine: '#1a0d08',
    floorColor: '#361e12',
    floorPlanks: ['#301b10', '#3b2114', '#2b180f', '#382013'],
    windowBg: '#0f172a',
    windowMoon: '#38bdf8',
    windowFrame: '#5c3a21',
    rugFill: '#502a18',
    rugBorder: '#78350f',
    bedWood: '#452210',
    bedSheet: '#6b21a8',
    bedPillow: '#f8fafc',
    tableWood: '#452210',
    tableTop: '#5a2d15',
    pedestalBase: '#33231a',
    pedestalTop: '#4a3327',
    pedestalRune: '#f59e0b',
    auraColor: '#a855f7',
    foliageColor: '#15803d',
    runeColor: '#60a5fa'
  };

  // Sắp xếp các món đồ nội thất theo chiều sâu Isometric (z-index = x + y)
  // Các món có x + y < 7 sẽ nằm phía sau bục đá, x + y > 7 sẽ nằm phía trước bục đá
  const backgroundItems = placedItems.filter((i) => i.x + i.y < 7).sort((a, b) => a.x + a.y - (b.x + b.y));
  const foregroundItems = placedItems.filter((i) => i.x + i.y >= 7).sort((a, b) => a.x + a.y - (b.x + b.y));

  // Helper hàm vẽ khối 2.5D Isometric cho 1 món đồ nội thất
  const renderIsometricFurnitureBlock = (item: PlacedFurniture) => {
    const def = FURNITURE_DEFINITIONS[item.definitionId];
    const w = item.width;
    const h = item.height;
    const color = item.primaryColor || '#6366f1';

    // Tính toán 4 đỉnh của mặt đáy sàn hình thoi Isometric
    // Grid 8x8: tile stepX = 35px, tile stepY = 17.5px
    const startX = 400 + (item.x - item.y) * 35;
    const startY = 190 + (item.x + item.y) * 17.5;

    const v1 = { x: 0, y: 0 };
    const v2 = { x: w * 35, y: w * 17.5 };
    const v3 = { x: (w - h) * 35, y: (w + h) * 17.5 };
    const v4 = { x: -h * 35, y: h * 17.5 };

    const blockHeight = item.definitionId.includes('bed') || item.definitionId.includes('pc') ? 22 : 16;

    return (
      <g
        key={item.placementId || item.instanceId}
        transform={`translate(${startX}, ${startY})`}
        className="filter drop-shadow-lg transition-all duration-300"
      >
        {/* 1. Mặt Đáy Bóng Đổ Trên Sàn */}
        <polygon
          points={`${v1.x},${v1.y} ${v2.x},${v2.y} ${v3.x},${v3.y} ${v4.x},${v4.y}`}
          fill="#000000"
          opacity="0.5"
          filter="url(#isoAuraGlow)"
        />

        {/* 2. Mặt Bên Trái (Left Face) */}
        <polygon
          points={`${v4.x},${v4.y} ${v3.x},${v3.y} ${v3.x},${v3.y - blockHeight} ${v4.x},${v4.y - blockHeight}`}
          fill="#1e1b4b"
          stroke="#0f172a"
          strokeWidth="1.5"
        />

        {/* 3. Mặt Phía Trước (Front Right Face) */}
        <polygon
          points={`${v3.x},${v3.y} ${v2.x},${v2.y} ${v2.x},${v2.y - blockHeight} ${v3.x},${v3.y - blockHeight}`}
          fill="#0f172a"
          stroke="#020617"
          strokeWidth="1.5"
        />

        {/* 4. Mặt Trên Phẳng Nghiêng Theo Sàn Isometric (Top Surface Diamond) */}
        <polygon
          points={`${v1.x},${v1.y - blockHeight} ${v2.x},${v2.y - blockHeight} ${v3.x},${v3.y - blockHeight} ${v4.x},${v4.y - blockHeight}`}
          fill={color}
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.92"
        />

        {/* Biểu Tượng & Tên Đồ Vật Chiếu Nghiêng Trên Mặt Trên */}
        <g transform={`translate(${v3.x / 2}, ${v3.y / 2 - blockHeight})`}>
          <circle cx="0" cy="0" r="14" fill="#090d16" stroke="#fbbf24" strokeWidth="1" opacity="0.9" />
          <text x="0" y="4" fontSize="13" textAnchor="middle" fill="#ffffff">
            {def?.icon || '📦'}
          </text>
          {/* Cấp sao */}
          <text x="0" y="16" fontSize="8" fontWeight="bold" fill="#facc15" textAnchor="middle" fontFamily="sans-serif">
            {'⭐'.repeat(item.tier || 1)}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-b ${currentScene.skyGradient} shadow-2xl ${className}`}>
      
      {/* 1. Vector Isometric Room SVG */}
      <svg
        viewBox="0 0 800 460"
        className="w-full h-auto block select-none"
        style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.6))' }}
      >
        <defs>
          {/* Aura Glowing Filter */}
          <filter id="isoAuraGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Moonlight / Sunlight Window Gradient */}
          <radialGradient id="windowLight" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={timeOfDay === 'day' ? '#fef08a' : timeOfDay === 'dusk' ? '#fb923c' : themeStyles.windowMoon}
              stopOpacity="0.85"
            />
            <stop offset="60%" stopColor={themeStyles.windowBg} stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>

          {/* Pedestal Aura Radial Gradient */}
          <radialGradient id="pedestalAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={themeStyles.auraColor} stopOpacity="0.9" />
            <stop offset="40%" stopColor={themeStyles.auraColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={themeStyles.auraColor} stopOpacity="0" />
          </radialGradient>

          {/* Floor Shine */}
          <linearGradient id="floorShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* ============================================================ */}
        {/* LAYER 1: BACK WALLS (CORNER ISOMETRIC) */}
        {/* ============================================================ */}
        {/* Left Wall */}
        <polygon points="0,0 400,140 400,280 0,160" fill={themeStyles.wallFill} />
        <polygon points="0,0 400,140 400,144 0,4" fill={themeStyles.wallEdge} opacity="0.8" />
        
        {/* Left Wall Vertical Planks / Seams */}
        <line x1="80" y1="28" x2="80" y2="184" stroke={themeStyles.plankLine} strokeWidth="2" />
        <line x1="160" y1="56" x2="160" y2="212" stroke={themeStyles.plankLine} strokeWidth="2" />
        <line x1="240" y1="84" x2="240" y2="240" stroke={themeStyles.plankLine} strokeWidth="2" />
        <line x1="320" y1="112" x2="320" y2="268" stroke={themeStyles.plankLine} strokeWidth="2" />

        {/* Right Wall */}
        <polygon points="800,0 400,140 400,280 800,160" fill={themeStyles.wallFill} />
        <polygon points="800,0 400,140 400,144 800,4" fill={themeStyles.wallEdge} opacity="0.8" />

        {/* Right Wall Vertical Planks / Seams */}
        <line x1="720" y1="28" x2="720" y2="184" stroke={themeStyles.plankLine} strokeWidth="2" />
        <line x1="640" y1="56" x2="640" y2="212" stroke={themeStyles.plankLine} strokeWidth="2" />
        <line x1="560" y1="84" x2="560" y2="240" stroke={themeStyles.plankLine} strokeWidth="2" />
        <line x1="480" y1="112" x2="480" y2="268" stroke={themeStyles.plankLine} strokeWidth="2" />

        {/* Center Corner Seam */}
        <line x1="400" y1="140" x2="400" y2="280" stroke="#000000" strokeWidth="4" opacity="0.6" />

        {/* ============================================================ */}
        {/* LAYER 2: WINDOWS WITH LIGHTING & IVY / RUNES */}
        {/* ============================================================ */}
        {/* Left Arched Window */}
        <g transform="translate(180, 50) skewY(19.2) scale(0.9)">
          <path
            d="M 0,35 Q 35,-15 70,35 L 70,110 L 0,110 Z"
            fill="url(#windowLight)"
            stroke={themeStyles.windowFrame}
            strokeWidth="6"
          />
          <line x1="35" y1="0" x2="35" y2="110" stroke={themeStyles.windowFrame} strokeWidth="3" />
          <line x1="0" y1="60" x2="70" y2="60" stroke={themeStyles.windowFrame} strokeWidth="3" />
          <circle cx="25" cy="30" r="4" fill="#ffffff" opacity="0.8" />
          <circle cx="50" cy="45" r="2" fill="#ffffff" opacity="0.6" />
        </g>

        {/* Right Arched Window */}
        <g transform="translate(540, 75) skewY(-19.2) scale(0.9)">
          <path
            d="M 0,35 Q 35,-15 70,35 L 70,110 L 0,110 Z"
            fill="url(#windowLight)"
            stroke={themeStyles.windowFrame}
            strokeWidth="6"
          />
          <line x1="35" y1="0" x2="35" y2="110" stroke={themeStyles.windowFrame} strokeWidth="3" />
          <line x1="0" y1="60" x2="70" y2="60" stroke={themeStyles.windowFrame} strokeWidth="3" />
          <circle cx="45" cy="25" r="4" fill="#ffffff" opacity="0.8" />
          <circle cx="20" cy="50" r="2" fill="#ffffff" opacity="0.6" />
        </g>

        {/* Climbing Ivy & Magical Runes on Walls */}
        <g opacity="0.85">
          <text x="120" y="90" fill={themeStyles.runeColor} fontSize="14" fontFamily="monospace" fontWeight="bold" transform="skewY(19.2)" opacity="0.7">ᚠ ᚱ ᛟ</text>
          <text x="120" y="140" fill={themeStyles.runeColor} fontSize="14" fontFamily="monospace" fontWeight="bold" transform="skewY(19.2)" opacity="0.7">ᛊ ᛏ ᛚ</text>
          <text x="660" y="245" fill={themeStyles.runeColor} fontSize="14" fontFamily="monospace" fontWeight="bold" transform="skewY(-19.2)" opacity="0.7">ᚦ ᚨ ᚱ</text>
          <text x="660" y="295" fill={themeStyles.runeColor} fontSize="14" fontFamily="monospace" fontWeight="bold" transform="skewY(-19.2)" opacity="0.7">ᚹ ᚷ ᛞ</text>

          <path d="M 140,65 Q 155,100 145,140 Q 155,180 135,210" stroke={themeStyles.foliageColor} strokeWidth="3" fill="none" />
          <circle cx="148" cy="85" r="5" fill={themeStyles.foliageColor} />
          <circle cx="152" cy="120" r="5" fill={themeStyles.foliageColor} />
          <circle cx="140" cy="165" r="5" fill={themeStyles.foliageColor} />

          <path d="M 650,110 Q 640,150 655,190 Q 645,230 660,260" stroke={themeStyles.foliageColor} strokeWidth="3" fill="none" />
          <circle cx="646" cy="130" r="5" fill={themeStyles.foliageColor} />
          <circle cx="658" cy="170" r="5" fill={themeStyles.foliageColor} />
          <circle cx="650" cy="210" r="5" fill={themeStyles.foliageColor} />
        </g>

        {/* ============================================================ */}
        {/* LAYER 3: ISOMETRIC FLOOR & WOODEN PLANKS */}
        {/* ============================================================ */}
        <polygon points="400,280 800,160 800,320 400,440 0,320 0,160" fill={themeStyles.floorColor} />
        <polygon points="400,280 800,160 400,440 0,160" fill="url(#floorShine)" />

        {/* Floor Plank Seams (Isometric Lines) */}
        <line x1="100" y1="190" x2="500" y2="410" stroke={themeStyles.plankLine} strokeWidth="1.5" opacity="0.5" />
        <line x1="200" y1="220" x2="600" y2="380" stroke={themeStyles.plankLine} strokeWidth="1.5" opacity="0.5" />
        <line x1="300" y1="250" x2="700" y2="350" stroke={themeStyles.plankLine} strokeWidth="1.5" opacity="0.5" />

        <line x1="700" y1="190" x2="300" y2="410" stroke={themeStyles.plankLine} strokeWidth="1.5" opacity="0.5" />
        <line x1="600" y1="220" x2="200" y2="380" stroke={themeStyles.plankLine} strokeWidth="1.5" opacity="0.5" />
        <line x1="500" y1="250" x2="100" y2="350" stroke={themeStyles.plankLine} strokeWidth="1.5" opacity="0.5" />

        {/* Cozy Oval Carpet on Center Floor */}
        <ellipse
          cx="400"
          cy="365"
          rx="170"
          ry="65"
          fill={themeStyles.rugFill}
          stroke={themeStyles.rugBorder}
          strokeWidth="6"
          strokeDasharray="8,4"
          opacity="0.95"
        />

        {/* ============================================================ */}
        {/* LAYER 4: BACKGROUND ISOMETRIC FURNITURE (x + y < 7) */}
        {/* ============================================================ */}
        {backgroundItems.length > 0 ? (
          backgroundItems.map(renderIsometricFurnitureBlock)
        ) : (
          /* Fallback Artwork: Cozy Wood Bed on Left Back */
          <g id="isoBed" transform="translate(140, 210)">
            <polygon points="0,70 120,30 200,60 80,100" fill={themeStyles.bedWood} stroke="#170c06" strokeWidth="2" />
            <polygon points="-5,35 15,30 15,80 -5,85" fill={themeStyles.bedWood} stroke="#170c06" strokeWidth="2" />
            <polygon points="105,-5 125,-10 125,40 105,45" fill={themeStyles.bedWood} stroke="#170c06" strokeWidth="2" />
            <polygon points="-5,35 105,-5 125,10 15,50" fill="#4a2612" />
            <polygon points="15,60 115,25 185,50 85,85" fill={themeStyles.bedSheet} />
            <polygon points="25,50 65,35 95,45 55,60" fill={themeStyles.bedPillow} stroke="#cbd5e1" strokeWidth="1.5" />
            <polygon points="65,70 145,40 185,50 105,80" fill="#431407" opacity="0.85" />
            <polygon points="65,70 105,55 185,50 145,65" fill="#7c2d12" />
          </g>
        )}

        {/* ============================================================ */}
        {/* LAYER 5: CENTER STAGE — ISOMETRIC CARVED PEDESTAL */}
        {/* ============================================================ */}
        <g id="isoPedestal" transform="translate(340, 230)">
          {/* Pedestal Bottom Base */}
          <polygon points="60,140 0,115 60,90 120,115" fill={themeStyles.pedestalBase} stroke="#170c06" strokeWidth="3" />
          
          {/* Pedestal Column Body */}
          <polygon points="15,100 15,50 60,70 60,120" fill="#2d1b12" stroke="#170c06" strokeWidth="2" />
          <polygon points="60,120 60,70 105,50 105,100" fill="#3d2519" stroke="#170c06" strokeWidth="2" />

          {/* Carved Rune on Pedestal Column */}
          <text x="50" y="95" fill={themeStyles.pedestalRune} fontSize="18" fontWeight="bold" fontFamily="monospace">⚡</text>

          {/* Pedestal Top Platform */}
          <polygon points="60,70 0,45 60,20 120,45" fill={themeStyles.pedestalTop} stroke={themeStyles.pedestalRune} strokeWidth="3" />
          <polygon points="60,65 10,43 60,24 110,43" fill="#5a3d2e" />

          {/* Glowing Aura Disk on Pedestal Top */}
          <ellipse cx="60" cy="38" rx="55" ry="24" fill="url(#pedestalAura)" filter="url(#isoAuraGlow)" />
        </g>

        {/* ============================================================ */}
        {/* LAYER 6: CENTRAL EGG / PET IN ROOM (WITH RANK INSIGNIA) */}
        {/* ============================================================ */}
        <g transform="translate(340, 150)">
          {/* Glowing Backlight Circle */}
          <circle cx="60" cy="50" r="50" fill="url(#pedestalAura)" filter="url(#isoAuraGlow)" />

          {/* SvgPet Avatar Element */}
          <foreignObject x="0" y="0" width="120" height="120">
            <div className="w-full h-full flex items-center justify-center filter drop-shadow-[0_0_20px_rgba(234,179,8,0.7)]">
              <SvgPet
                branch={evolutionBranch}
                level={level}
                customColor={eggBaseColor}
                gender={gender}
                size={96}
                showRankInsignia={true}
              />
            </div>
          </foreignObject>
        </g>

        {/* ============================================================ */}
        {/* LAYER 7: FOREGROUND ISOMETRIC FURNITURE (x + y >= 7) */}
        {/* ============================================================ */}
        {foregroundItems.length > 0 ? (
          foregroundItems.map(renderIsometricFurnitureBlock)
        ) : (
          /* Fallback Artwork: Tea Table on Right Front */
          <g id="isoTable" transform="translate(540, 240)">
            <rect x="25" y="45" width="8" height="35" fill={themeStyles.tableWood} />
            <rect x="75" y="55" width="8" height="35" fill={themeStyles.tableWood} />
            <rect x="125" y="40" width="8" height="35" fill={themeStyles.tableWood} />
            <ellipse cx="80" cy="45" rx="60" ry="24" fill={themeStyles.tableTop} stroke={themeStyles.tableWood} strokeWidth="3" />
            <ellipse cx="80" cy="42" rx="55" ry="20" fill="#6c3619" />
            <ellipse cx="78" cy="38" rx="16" ry="7" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
            <ellipse cx="78" cy="37" rx="11" ry="4" fill="#b45309" />
            <path d="M 75,32 Q 72,22 76,14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
            <path d="M 82,30 Q 86,20 81,12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
          </g>
        )}

        {/* Ambient Sparkles */}
        <circle cx="360" cy="180" r="3" fill="#fef08a" opacity="0.9" />
        <circle cx="440" cy="160" r="2.5" fill="#fef08a" opacity="0.9" />
        <circle cx="390" cy="140" r="3" fill="#ffffff" opacity="0.95" />
      </svg>

      {/* 2. Floating Welcome Speech Bubble & Auto Real-Time Clock Badge */}
      <div className="absolute inset-x-4 sm:inset-x-8 bottom-3 z-30 flex flex-col gap-2">
        <div className="bg-slate-950/85 backdrop-blur-md border border-indigo-500/50 rounded-2xl px-4 py-2.5 shadow-2xl text-center flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="text-amber-300 text-sm shrink-0">💬</span>
            <p className="text-xs sm:text-sm text-indigo-100 italic font-medium truncate">
              &ldquo;{welcomeMessage}&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-amber-300 font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
            <span>{currentScene.icon}</span>
            <span className="font-bold">Tự Động: {currentScene.label}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
