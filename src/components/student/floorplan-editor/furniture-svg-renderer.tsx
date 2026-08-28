'use client';

import React from 'react';
import { FurnitureDefinitionId, Rotation, FurnitureTier } from '@/domain/floorplan/types';
import { FURNITURE_DEFINITIONS } from '@/domain/floorplan/inventory-store';

interface FurnitureSvgRendererProps {
  definitionId: FurnitureDefinitionId;
  width?: number; // fallback or canonical width
  height?: number; // fallback or canonical height
  primaryColor: string;
  rotation?: Rotation;
  tier?: FurnitureTier;
  isSelected?: boolean;
}

export const FurnitureSvgRenderer: React.FC<FurnitureSvgRendererProps> = ({
  definitionId,
  width,
  height,
  primaryColor,
  rotation = 0,
  tier = 1,
  isSelected = false
}) => {
  const def = FURNITURE_DEFINITIONS[definitionId];
  // Base canonical dimensions (Unrotated)
  const cw = (def?.defaultWidth || 2) * 60;
  const ch = (def?.defaultHeight || 2) * 60;

  // Effective footprint dimensions in current rotation
  const isPerpendicular = rotation === 90 || rotation === 270;
  const fpW = isPerpendicular ? ch : cw;
  const fpH = isPerpendicular ? cw : ch;

  // Render individual furniture base geometry in canonical coordinate space [0..cw, 0..ch]
  const renderBaseSvg = () => {
    // 1. GIƯỜNG NGỦ (BED)
    if (definitionId.includes('bed')) {
      return (
        <g>
          {/* Drop shadow underneath */}
          <rect x="4" y="6" width={cw - 8} height={ch - 8} rx="10" fill="#000000" opacity="0.4" />
          
          {/* Bed Solid Headboard & Outer Frame */}
          <rect x="2" y="2" width={cw - 4} height={ch - 4} rx="8" fill="#1c120c" stroke="#3d2215" strokeWidth="2.5" />
          <rect x="2" y="2" width={cw - 4} height="12" rx="4" fill="#2d180f" />
          <line x1="2" y1="14" x2={cw - 2} y2="14" stroke="#0f0804" strokeWidth="2" />

          {/* Mattress Body */}
          <rect x="6" y="16" width={cw - 12} height={ch - 20} rx="6" fill="#f1f5f9" />

          {/* 2 Fluffy White Pillows with Shading */}
          <rect x="10" y="20" width={(cw - 28) / 2} height="28" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x={10 + (cw - 28) / 2 + 8} y="20" width={(cw - 28) / 2} height="28" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Customized Quilt / Duvet with Primary Color */}
          <rect x="6" y="52" width={cw - 12} height={ch - 56} rx="6" fill={primaryColor} />
          
          {/* Folded Top Hem of Blanket */}
          <rect x="6" y="52" width={cw - 12} height="16" rx="4" fill="#000000" opacity="0.2" />
          <line x1="6" y1="68" x2={cw - 6} y2="68" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.6" />

          {/* Quilt Decorative Grid Stitch Pattern */}
          <line x1={cw / 2} y1="68" x2={cw / 2} y2={ch - 4} stroke="#ffffff" strokeWidth="1" opacity="0.3" />
          <line x1="6" y1={(ch + 68) / 2} x2={cw - 6} y2={(ch + 68) / 2} stroke="#ffffff" strokeWidth="1" opacity="0.3" />
        </g>
      );
    }

    // 2. BÀN HỌC / BÀN TRÀ (DESK / TABLE)
    if (definitionId.includes('desk') || definitionId.includes('table')) {
      return (
        <g>
          <rect x="3" y="4" width={cw - 6} height={ch - 8} rx="8" fill="#000000" opacity="0.4" />
          
          {/* Solid Wooden / Modern Desk Surface */}
          <rect x="2" y="2" width={cw - 4} height={ch - 4} rx="8" fill={primaryColor} stroke="#0f172a" strokeWidth="2.5" />
          <rect x="5" y="5" width={cw - 10} height={ch - 10} rx="6" fill="#000000" opacity="0.15" />

          {/* Open Laptop in Center */}
          <rect x={cw / 2 - 20} y={ch / 2 - 16} width="40" height="26" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <rect x={cw / 2 - 17} y={ch / 2 - 14} width="34" height="12" rx="2" fill="#38bdf8" />
          <line x1={cw / 2 - 14} y1={ch / 2 - 8} x2={cw / 2 + 10} y2={ch / 2 - 8} stroke="#ffffff" strokeWidth="1" />
          <rect x={cw / 2 - 16} y={ch / 2 + 1} width="32" height="7" rx="1" fill="#0f172a" />

          {/* Open Notebook on Left */}
          {cw >= 100 && (
            <g transform={`translate(12, ${ch / 2 - 12})`}>
              <rect x="0" y="0" width="22" height="24" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="11" y1="0" x2="11" y2="24" stroke="#94a3b8" strokeWidth="1" />
            </g>
          )}

          {/* Coffee Mug on Right */}
          {cw >= 100 && (
            <g transform={`translate(${cw - 24}, ${ch / 2 - 10})`}>
              <circle cx="8" cy="8" r="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="5" fill="#78350f" />
            </g>
          )}
        </g>
      );
    }

    // 3. GHẾ SOFA / GHẾ GAMING (GAMING SOFA)
    if (definitionId.includes('sofa')) {
      return (
        <g>
          <rect x="4" y="6" width={cw - 8} height={ch - 8} rx="12" fill="#000000" opacity="0.4" />
          <rect x="2" y="2" width={cw - 4} height={ch - 4} rx="12" fill="#0f172a" stroke="#1e293b" strokeWidth="2.5" />
          <rect x="6" y="4" width={cw - 12} height="16" rx="6" fill={primaryColor} />
          
          <rect x="4" y="6" width="12" height={ch - 12} rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <rect x={cw - 16} y="6" width="12" height={ch - 12} rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          <rect x="18" y="22" width={cw - 36} height={ch - 28} rx="8" fill={primaryColor} stroke="#0f172a" strokeWidth="1.5" />
          <line x1={cw / 2} y1="24" x2={cw / 2} y2={ch - 8} stroke="#000000" strokeWidth="1.5" opacity="0.4" />
        </g>
      );
    }

    // 4. TỦ SÁCH (BOOKSHELF)
    if (definitionId.includes('bookshelf') || definitionId.includes('shelf')) {
      return (
        <g>
          <rect x="3" y="4" width={cw - 6} height={ch - 8} rx="6" fill="#000000" opacity="0.4" />
          <rect x="2" y="2" width={cw - 4} height={ch - 4} rx="6" fill="#2d1a10" stroke="#4a2c1b" strokeWidth="2.5" />
          <rect x="6" y="6" width={cw - 12} height={ch - 12} rx="4" fill={primaryColor} />

          <g transform={`translate(10, 8)`}>
            <rect x="0" y="0" width="8" height={ch - 16} rx="2" fill="#ef4444" />
            <rect x="10" y="0" width="7" height={ch - 16} rx="2" fill="#3b82f6" />
            <rect x="19" y="0" width="9" height={ch - 16} rx="2" fill="#eab308" />
            <rect x="30" y="0" width="8" height={ch - 16} rx="2" fill="#10b981" />
            <rect x="40" y="0" width="7" height={ch - 16} rx="2" fill="#a855f7" />
            <rect x="49" y="0" width="9" height={ch - 16} rx="2" fill="#ec4899" />
            {cw >= 100 && (
              <>
                <rect x="60" y="0" width="8" height={ch - 16} rx="2" fill="#06b6d4" />
                <rect x="70" y="0" width="7" height={ch - 16} rx="2" fill="#f97316" />
                <rect x="79" y="0" width="10" height={ch - 16} rx="2" fill="#6366f1" />
              </>
            )}
          </g>
        </g>
      );
    }

    // 5. THẢM LÔNG (CARPET)
    if (definitionId.includes('carpet') || definitionId.includes('rug')) {
      return (
        <g>
          <rect x="6" y="8" width={cw - 12} height={ch - 16} rx="12" fill="#000000" opacity="0.3" />
          <rect x="4" y="6" width={cw - 8} height={ch - 12} rx="10" fill={primaryColor} stroke="#f59e0b" strokeWidth="2.5" />
          <rect x="12" y="14" width={cw - 24} height={ch - 28} rx="6" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7" />
          <circle cx={cw / 2} cy={ch / 2} r="18" fill="#000000" opacity="0.25" />
          <circle cx={cw / 2} cy={ch / 2} r="14" fill="#f59e0b" opacity="0.8" />
          <circle cx={cw / 2} cy={ch / 2} r="8" fill="#ffffff" opacity="0.9" />
        </g>
      );
    }

    // 6. ĐÈN NEON (LAMP)
    if (definitionId.includes('lamp')) {
      return (
        <g>
          <circle cx={cw / 2} cy={ch / 2} r={cw * 0.45} fill={primaryColor} opacity="0.25" />
          <circle cx={cw / 2} cy={ch / 2} r={cw * 0.3} fill={primaryColor} opacity="0.4" />
          <circle cx={cw / 2} cy={ch / 2} r={cw * 0.22} fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx={cw / 2} cy={ch / 2} r={cw * 0.14} fill={primaryColor} stroke="#ffffff" strokeWidth="2" />
          <circle cx={cw / 2} cy={ch / 2} r={cw * 0.06} fill="#ffffff" />
        </g>
      );
    }

    // 7. CÂY TRI THỨC (TREE / PLANT)
    if (definitionId.includes('tree') || definitionId.includes('plant')) {
      return (
        <g>
          <circle cx={cw / 2} cy={ch / 2 + 4} r={cw * 0.4} fill="#000000" opacity="0.4" />
          <circle cx={cw / 2} cy={ch / 2} r={cw * 0.4} fill={primaryColor} opacity="0.8" />
          <circle cx={cw / 2 - 10} cy={ch / 2 - 8} r={cw * 0.22} fill="#22c55e" />
          <circle cx={cw / 2 + 10} cy={ch / 2 - 6} r={cw * 0.2} fill="#16a34a" />
          <circle cx={cw / 2} cy={ch / 2 + 10} r={cw * 0.24} fill="#15803d" />
          <circle cx={cw / 2 - 8} cy={ch / 2} r="3" fill="#facc15" />
          <circle cx={cw / 2 + 8} cy={ch / 2 + 4} r="3" fill="#facc15" />
        </g>
      );
    }

    // 8. MÁY TÍNH LƯỢNG TỬ (QUANTUM PC)
    if (definitionId.includes('pc')) {
      return (
        <g>
          <rect x="3" y="4" width={cw - 6} height={ch - 8} rx="6" fill="#000000" opacity="0.4" />
          <rect x="2" y="2" width={cw - 4} height={ch - 4} rx="6" fill="#090d16" stroke={primaryColor} strokeWidth="2.5" />
          <path d={`M 14,8 Q ${cw / 2},12 ${cw - 14},8 L ${cw - 14},16 Q ${cw / 2},20 14,16 Z`} fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
          <rect x={cw / 2 - 22} y={ch / 2} width="44" height="18" rx="2" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          <rect x={cw - 20} y={ch / 2 - 6} width="14" height="24" rx="3" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5" />
        </g>
      );
    }

    // DEFAULT / JEWELRY / THRONE
    return (
      <g>
        <rect x="4" y="6" width={cw - 8} height={ch - 8} rx="10" fill="#000000" opacity="0.4" />
        <rect x="2" y="2" width={cw - 4} height={ch - 4} rx="10" fill={primaryColor} stroke="#f59e0b" strokeWidth="2.5" />
        <circle cx={cw / 2} cy={ch / 2} r={Math.min(cw, ch) * 0.28} fill="#ffffff" opacity="0.2" />
        <circle cx={cw / 2} cy={ch / 2} r={Math.min(cw, ch) * 0.18} fill="#f59e0b" />
        <circle cx={cw / 2} cy={ch / 2} r="4" fill="#ffffff" />
      </g>
    );
  };

  return (
    <g>
      {/* CANONICAL 2D SPRITE ROTATION MATRIX:
          1. Translate to center of occupied footprint [fpW/2, fpH/2]
          2. Rotate by rotation degrees
          3. Translate back by [-cw/2, -ch/2]
          => Renders canonical [0..cw, 0..ch] perfectly inside [0..fpW, 0..fpH] with ZERO overflow! */}
      <g transform={`translate(${fpW / 2}, ${fpH / 2}) rotate(${rotation}) translate(${-cw / 2}, ${-ch / 2})`}>
        
        {/* Tier 4 & 5 Glowing Aura Halo Filter */}
        {tier >= 4 && (
          <rect
            x="-6"
            y="-6"
            width={cw + 12}
            height={ch + 12}
            rx="14"
            fill={primaryColor}
            opacity={tier === 5 ? 0.45 : 0.25}
            className="animate-pulse"
          />
        )}

        {/* Canonical Base SVG Geometry */}
        {renderBaseSvg()}

        {/* TIER 2 EVOLUTION: Metal Beveled Trims & Deep Shadow */}
        {tier >= 2 && (
          <rect
            x="3"
            y="3"
            width={cw - 6}
            height={ch - 6}
            rx="8"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="8,4"
            opacity="0.85"
          />
        )}

        {/* TIER 3 EVOLUTION: Gold Filigree Embroidery & Gemstone Accents */}
        {tier >= 3 && (
          <g>
            <rect
              x="2"
              y="2"
              width={cw - 4}
              height={ch - 4}
              rx="8"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            {/* Corner Golden Studs */}
            <circle cx="6" cy="6" r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx={cw - 6} cy="6" r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="6" cy={ch - 6} r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx={cw - 6} cy={ch - 6} r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}

        {/* TIER 5 EVOLUTION: Cosmic Star Dust Particles */}
        {tier >= 5 && (
          <g className="pointer-events-none">
            <circle cx="12" cy={ch / 2 - 10} r="3" fill="#fef08a" className="animate-ping" style={{ animationDuration: '2s' }} />
            <circle cx={cw - 12} cy={ch / 2 + 10} r="2.5" fill="#38bdf8" className="animate-ping" style={{ animationDuration: '2.5s' }} />
            <circle cx={cw / 2 + 10} cy="10" r="3" fill="#c084fc" className="animate-ping" style={{ animationDuration: '1.8s' }} />
            <circle cx={cw / 2 - 10} cy={ch - 10} r="2.5" fill="#f43f5e" className="animate-ping" style={{ animationDuration: '2.2s' }} />
            <polygon
              points={`${cw / 2},${ch / 2 - 8} ${cw / 2 + 2.5},${ch / 2 - 2} ${cw / 2 + 8},${ch / 2 - 2} ${cw / 2 + 3.5},${ch / 2 + 2} ${cw / 2 + 5.5},${ch / 2 + 8} ${cw / 2},${ch / 2 + 4} ${cw / 2 - 5.5},${ch / 2 + 8} ${cw / 2 - 3.5},${ch / 2 + 2} ${cw / 2 - 8},${ch / 2 - 2} ${cw / 2 - 2.5},${ch / 2 - 2}`}
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          </g>
        )}

      </g>
    </g>
  );
};
