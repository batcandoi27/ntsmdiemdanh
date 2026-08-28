'use client';

import React, { useState } from 'react';
import { PlacedFurniture, InventoryItem, FurnitureTier, TIER_CONFIGS, FurnitureDefinitionId } from '@/domain/floorplan/types';
import { FurnitureSvgRenderer } from './furniture-svg-renderer';
import { FURNITURE_DEFINITIONS } from '@/domain/floorplan/inventory-store';
import { Sparkles, Zap, ShieldAlert, ArrowRight, CheckCircle2, X, Star } from 'lucide-react';

interface ItemUpgradeForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PlacedFurniture | InventoryItem | null;
  userXp?: number;
  userCoins?: number;
  onUpgradeSuccess: (instanceId: string, nextTier: FurnitureTier, xpSpent: number, coinsSpent: number) => void;
}

export const ItemUpgradeForgeModal: React.FC<ItemUpgradeForgeModalProps> = ({
  isOpen,
  onClose,
  item,
  userXp = 150,
  userCoins = 45,
  onUpgradeSuccess
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const currentTier: FurnitureTier = item.tier || 1;
  const currentConfig = TIER_CONFIGS[currentTier];
  const isMaxTier = currentTier >= 5;
  const nextTier = (currentTier < 5 ? (currentTier + 1) : 5) as FurnitureTier;
  const nextConfig = TIER_CONFIGS[nextTier];
  const def = FURNITURE_DEFINITIONS[item.definitionId as FurnitureDefinitionId];

  const hasEnoughXp = userXp >= nextConfig.xpCost;
  const hasEnoughCoins = userCoins >= nextConfig.coinCost;
  const canUpgrade = !isMaxTier && hasEnoughXp && hasEnoughCoins;

  const handleExecuteUpgrade = () => {
    if (!canUpgrade || isUpgrading) return;
    setErrorMsg(null);
    setIsUpgrading(true);

    setTimeout(() => {
      onUpgradeSuccess(item.instanceId, nextTier, nextConfig.xpCost, nextConfig.coinCost);
      setIsUpgrading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-indigo-950/80 to-slate-950 rounded-3xl border border-amber-500/50 shadow-2xl p-4 sm:p-6 space-y-4 text-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                ⚒️ Lò Rèn Tiến Hóa Nội Thất
              </h3>
              <p className="text-xs text-amber-300 font-medium">
                Nâng cấp cấp sao 1-5 bằng Điểm Kinh Nghiệm (XP) & Xu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Tier Progress Bar (1..5 Stars) */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold">Cấp Độ Hiện Tại:</span>
            <span className="font-black text-amber-400 flex items-center gap-1">
              {currentConfig.stars} Cấp {currentTier} ({currentConfig.label})
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {([1, 2, 3, 4, 5] as FurnitureTier[]).map((t) => (
              <div
                key={`tier-step-${t}`}
                className={`py-1 rounded-lg text-center font-bold text-[10px] border transition ${
                  t === currentTier
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                    : t < currentTier
                    ? 'bg-indigo-900/60 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Cấp {t}
              </div>
            ))}
          </div>
        </div>

        {/* 3. Evolution Visual Comparison: Current vs Next Tier */}
        <div className="grid grid-cols-2 gap-3 items-center">
          {/* Current Tier Box */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center text-center space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Hình Thái Hiện Tại</span>
            <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2 shadow-inner">
              <svg viewBox="0 0 120 120" className="w-full h-full block">
                <FurnitureSvgRenderer
                  definitionId={item.definitionId as FurnitureDefinitionId}
                  width={120}
                  height={120}
                  primaryColor={item.primaryColor}
                  rotation={item.rotation || 0}
                  tier={currentTier}
                />
              </svg>
            </div>
            <span className="font-bold text-xs text-white truncate max-w-full">{item.name}</span>
            <span className="text-[10px] text-indigo-300">{currentConfig.buffDescription}</span>
          </div>

          {/* Next Tier Box */}
          <div className={`p-3 rounded-2xl border flex flex-col items-center text-center space-y-2 transition ${
            isMaxTier
              ? 'bg-slate-950/40 border-slate-800 opacity-60'
              : 'bg-gradient-to-b from-amber-950/30 via-slate-950/80 to-slate-950 border-amber-500/60 shadow-lg shadow-amber-500/10'
          }`}>
            <span className="text-[10px] uppercase font-black text-amber-400 flex items-center gap-1">
              {isMaxTier ? '👑 Đã Đạt Cực Hạn' : `✨ Cấp Kế Tiếp (${nextConfig.label})`}
            </span>
            <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-amber-500/40 flex items-center justify-center p-2 shadow-inner">
              <svg viewBox="0 0 120 120" className="w-full h-full block">
                <FurnitureSvgRenderer
                  definitionId={item.definitionId as FurnitureDefinitionId}
                  width={120}
                  height={120}
                  primaryColor={item.primaryColor}
                  rotation={item.rotation || 0}
                  tier={nextTier}
                />
              </svg>
            </div>
            <span className="font-bold text-xs text-amber-300 truncate max-w-full">
              {nextConfig.stars} {item.name}
            </span>
            <span className="text-[10px] text-amber-200/90 font-medium">{nextConfig.buffDescription}</span>
          </div>
        </div>

        {/* 4. Upgrade Cost & Requirements */}
        {!isMaxTier ? (
          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-300 font-semibold block">Chi Phí Tiến Hóa:</span>
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold ${hasEnoughXp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ⭐ {nextConfig.xpCost} XP (Bạn có: {userXp})
                </span>
                <span className={`font-mono font-bold ${hasEnoughCoins ? 'text-amber-400' : 'text-rose-400'}`}>
                  💰 {nextConfig.coinCost} Xu (Bạn có: {userCoins})
                </span>
              </div>
            </div>

            <div className="text-[11px] font-bold text-indigo-300">
              +{Math.round((nextConfig.buffMultiplier - currentConfig.buffMultiplier) * 100)}% Chỉ Số
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center text-xs font-bold text-emerald-300">
            🏆 Món đồ này đã đạt phẩm chất Thần Thoại Tối Thượng (Cấp 5) cao nhất!
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <p className="text-xs text-rose-400 text-center font-bold">{errorMsg}</p>
        )}

        {/* 5. Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-indigo-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Hủy Bỏ
          </button>

          {!isMaxTier ? (
            <button
              type="button"
              disabled={!canUpgrade || isUpgrading}
              onClick={handleExecuteUpgrade}
              className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2 transition active:scale-95 ${
                canUpgrade
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isUpgrading ? (
                <>
                  <Zap className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Đang Rèn Đồ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Nâng Lên Cấp {nextTier}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
            >
              Đã Tối Đa
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
