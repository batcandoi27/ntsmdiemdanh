'use client';

import React from 'react';
import { PetEvolutionBranch } from '@/types/student-portal';

interface SvgPetProps {
  branch?: PetEvolutionBranch;
  level?: number;
  vitality?: number;
  isHibernating?: boolean;
  customColor?: string;
  gender?: 'male' | 'female';
  className?: string;
  size?: number;
  showRankInsignia?: boolean;
}

export const SvgPet: React.FC<SvgPetProps> = ({
  branch = 'cosmic',
  level = 1,
  vitality = 100,
  isHibernating = false,
  customColor,
  gender = 'female',
  className = '',
  size = 120,
  showRankInsignia = true
}) => {
  // Bảng màu theo nhánh tiến hóa
  const branchColors = {
    cosmic: {
      primary: '#9d4edd',
      secondary: '#c77dff',
      accent: '#00f5d4',
      glow: 'rgba(157, 78, 221, 0.6)'
    },
    nature: {
      primary: '#2b9348',
      secondary: '#55a630',
      accent: '#ffd166',
      glow: 'rgba(43, 147, 72, 0.6)'
    },
    cyber: {
      primary: '#e85d04',
      secondary: '#f48c06',
      accent: '#00b4d8',
      glow: 'rgba(232, 93, 4, 0.6)'
    }
  }[branch];

  // Màu sắc chủ đạo (ưu tiên customColor nếu có cho giai đoạn Trứng)
  const eggFill = customColor || branchColors.primary;
  const eggSecondary = customColor ? '#ffffff' : branchColors.secondary;

  const isSluggish = vitality < 60;
  const filterStyle = isHibernating
    ? 'grayscale(100%) opacity(70%)'
    : isSluggish
    ? 'saturate(50%) brightness(85%)'
    : 'none';

  // Tính số sao cấp bậc (1..5 Stars)
  const starCount = level <= 1 ? 1 : level <= 4 ? 2 : level <= 9 ? 3 : level <= 19 ? 4 : 5;

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-500 ${className}`}
      style={{
        width: size,
        height: size,
        filter: filterStyle
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full ${
          !isHibernating && !isSluggish
            ? level === 0
              ? 'animate-pulse hover:rotate-6 transition-transform'
              : 'animate-bounce'
            : ''
        }`}
        style={{ animationDuration: level === 0 ? '2.5s' : '3s' }}
      >
        <defs>
          <radialGradient id={`glow-${branch}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={branchColors.secondary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={branchColors.primary} stopOpacity="0" />
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={eggFill} floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Hào quang nền */}
        {level >= 5 && !isHibernating && (
          <circle cx="50" cy="50" r="45" fill={`url(#glow-${branch})`} className="animate-pulse" />
        )}

        {/* GIAI ĐOẠN 0 & 1: TRỨNG / MẦM NON (Level <= 1) */}
        {level <= 1 && (
          <g filter="url(#shadow)">
            <ellipse cx="50" cy="52" rx="26" ry="34" fill={eggFill} />
            <ellipse cx="44" cy="42" rx="8" ry="12" fill={eggSecondary} opacity="0.5" />
            <circle cx="58" cy="58" r="4" fill={branchColors.accent} />
            <circle cx="42" cy="64" r="3" fill={branchColors.accent} opacity="0.8" />
            {/* Đốm sáng ma thuật */}
            <circle cx="48" cy="36" r="2" fill="#ffffff" />
            <circle cx="56" cy="46" r="1.5" fill="#ffffff" />
          </g>
        )}

        {/* GIAI ĐOẠN 2: THÚ NHỎ SƠ SINH (Level 2..4) */}
        {level >= 2 && level < 5 && (
          <g filter="url(#shadow)">
            {/* Đôi tai nhỏ */}
            <path d="M 32 30 Q 25 10 40 22 Z" fill={branchColors.primary} />
            <path d="M 68 30 Q 75 10 60 22 Z" fill={branchColors.primary} />
            {/* Thân tròn */}
            <ellipse cx="50" cy="54" rx="26" ry="24" fill={eggFill} />
            <ellipse cx="50" cy="58" rx="16" ry="14" fill={branchColors.secondary} opacity="0.7" />
            {/* Mắt to tròn long lanh */}
            <circle cx="40" cy="50" r="5" fill="#ffffff" />
            <circle cx="41" cy="50" r="2.5" fill="#1e1b4b" />
            <circle cx="39" cy="48" r="1" fill="#ffffff" />
            <circle cx="60" cy="50" r="5" fill="#ffffff" />
            <circle cx="59" cy="50" r="2.5" fill="#1e1b4b" />
            <circle cx="58" cy="48" r="1" fill="#ffffff" />
            {/* Má hồng */}
            <circle cx="34" cy="56" r="3" fill="#ff70a6" opacity="0.6" />
            <circle cx="66" cy="56" r="3" fill="#ff70a6" opacity="0.6" />
          </g>
        )}

        {/* GIAI ĐOẠN 3: CHIẾN THÚ TRƯỞNG THÀNH (Level 5..19) */}
        {level >= 5 && level < 20 && (
          <g filter="url(#shadow)">
            {/* Đôi cánh năng lượng */}
            <path d="M 28 50 Q 5 28 20 20 Q 32 30 32 45" fill={branchColors.accent} />
            <path d="M 72 50 Q 95 28 80 20 Q 68 30 68 45" fill={branchColors.accent} />
            {/* Sừng / Tai chiến binh */}
            <polygon points="35,28 28,12 42,24" fill={branchColors.primary} />
            <polygon points="65,28 72,12 58,24" fill={branchColors.primary} />
            {/* Thân */}
            <ellipse cx="50" cy="55" rx="24" ry="26" fill={eggFill} />
            {/* Lớp giáp ngực */}
            <polygon points="50,44 60,56 50,66 40,56" fill={branchColors.secondary} />
            <circle cx="50" cy="55" r="3" fill="#ffffff" />
            {/* Mắt dũng mãnh */}
            <circle cx="42" cy="50" r="4.5" fill="#ffffff" />
            <circle cx="43" cy="50" r="2" fill="#1e1b4b" />
            <circle cx="58" cy="50" r="4.5" fill="#ffffff" />
            <circle cx="57" cy="50" r="2" fill="#1e1b4b" />
          </g>
        )}

        {/* GIAI ĐOẠN 4..5: THẦN THÚ TỐI THƯỢNG (Level 20+) */}
        {level >= 20 && (
          <g filter="url(#shadow)">
            {/* Cánh đại bàng/rồng lớn */}
            <path d="M 22 55 Q 0 30 10 15 Q 32 25 35 48" fill={branchColors.accent} />
            <path d="M 78 55 Q 100 30 90 15 Q 68 25 65 48" fill={branchColors.accent} />
            {/* Giáp ngực */}
            <ellipse cx="50" cy="54" rx="25" ry="30" fill={branchColors.primary} />
            <polygon points="50,42 62,56 50,70 38,56" fill={branchColors.secondary} />
            <circle cx="50" cy="56" r="4" fill="#ffffff" />
            {/* Vương miện hoàng gia */}
            <polygon points="35,22 42,12 50,20 58,12 65,22 50,26" fill="#ffd166" />
            {/* Mắt rực sáng */}
            <circle cx="42" cy="48" r="4" fill={branchColors.accent} />
            <circle cx="58" cy="48" r="4" fill={branchColors.accent} />
          </g>
        )}

        {/* PHÂN BIỆT GIỚI TÍNH SVG: NƠ HỒNG NỮ / HUY HIỆU CHIẾN BINH NAM */}
        {!isHibernating && (
          <g className="filter drop-shadow-sm">
            {gender === 'female' ? (
              <g transform="translate(50, 16) scale(0.65)">
                <ellipse cx="-7" cy="0" rx="6" ry="4" fill="#ff70a6" opacity="0.9" />
                <ellipse cx="7" cy="0" rx="6" ry="4" fill="#ff70a6" opacity="0.9" />
                <circle cx="0" cy="0" r="3" fill="#ffffff" />
                <circle cx="0" cy="0" r="1.5" fill="#ffd166" />
              </g>
            ) : (
              <g transform="translate(50, 16) scale(0.55)">
                <polygon points="0,-7 2,-2 7,-2 3,1 5,6 0,3 -5,6 -3,1 -7,-2 -2,-2" fill="#ffd166" />
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
              </g>
            )}
          </g>
        )}

        {/* ========================================================================= */}
        {/* HUY HIỆU SAO / VẠCH THỂ HIỆN CẤP BẬC (RANK INSIGNIA) */}
        {/* ========================================================================= */}
        {showRankInsignia && (
          <g className="rank-insignia filter drop-shadow" transform="translate(50, 88)">
            {/* Nền huy hiệu cấp bậc */}
            <rect
              x="-22"
              y="-7"
              width="44"
              height="14"
              rx="7"
              fill="#090d16"
              stroke="#ffd166"
              strokeWidth="1.2"
              opacity="0.95"
            />
            {/* Vẽ dãy sao vàng tương ứng với cấp bậc (1..5 Sao) */}
            {Array.from({ length: starCount }).map((_, sIdx) => {
              const startX = -((starCount - 1) * 7) / 2;
              const posX = startX + sIdx * 7;
              return (
                <g key={sIdx} transform={`translate(${posX}, 0) scale(0.42)`}>
                  <polygon
                    points="0,-6 1.8,-1.8 6.3,-1.8 2.7,1 4.1,5.4 0,2.7 -4.1,5.4 -2.7,1 -6.3,-1.8 -1.8,-1.8"
                    fill="#ffd166"
                  />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* Hiệu ứng trạng thái: Ngủ đông hoặc Đói bụng */}
      {isHibernating && (
        <span className="absolute bottom-0 text-xs px-2 py-0.5 rounded-full bg-blue-900/90 text-blue-200 border border-blue-400 font-semibold shadow">
          ❄️ Ngủ Đông
        </span>
      )}
      {!isHibernating && isSluggish && (
        <span className="absolute bottom-0 text-xs px-2 py-0.5 rounded-full bg-amber-900/90 text-amber-200 border border-amber-400 font-semibold shadow">
          🍖 Đói Bụng ({vitality}%)
        </span>
      )}
    </div>
  );
};
